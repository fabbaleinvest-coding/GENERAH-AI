// Montaggio nel browser con ffmpeg.wasm: prende i clip Higgsfield + il voiceover
// + i sottotitoli (SRT) e produce UN unico spot verticale 9:16.
//
// Scelte tecniche:
// - core SINGLE-THREAD caricato da CDN via @ffmpeg/util.toBlobURL → niente
//   SharedArrayBuffer, quindi nessun header COOP/COEP da configurare su Vercel.
// - i media Higgsfield sono cross-origin: vengono letti tramite il proxy
//   same-origin /api/media/proxy (con il token di sessione).
// - l'imprinting dei sottotitoli dipende da libass nel core: è best-effort.
//   Se non è disponibile, lo spot viene comunque prodotto e l'SRT resta
//   scaricabile come sidecar (caricabile su Meta insieme al video).

import { supabase } from '@/lib/supabase';

const FFMPEG_CORE_VERSION = '0.12.10'; // core single-thread
const CDN = 'https://unpkg.com';

export type AssembleProgress = (msg: string, ratio?: number) => void;

export interface AssembleInput {
  clips: string[];
  audioUrl?: string | null;
  srt?: string;
  onProgress?: AssembleProgress;
}

export interface AssembleResult {
  url: string;
  mime: string;
  subtitlesBurned: boolean;
  srtUrl: string | null;
  bytes: number;
}

// Singleton: il motore si carica una sola volta per sessione di pagina.
let _ff: unknown = null;

async function getFFmpeg(onProgress?: AssembleProgress): Promise<any> {
  if (_ff) return _ff;
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  const ff: any = new FFmpeg();
  ff.on('log', ({ message }: { message: string }) => {
    if (message) console.debug('[ffmpeg]', message);
  });
  ff.on('progress', ({ progress }: { progress: number }) => {
    if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
      onProgress?.('Elaborazione video…', progress);
    }
  });
  onProgress?.('Carico il motore di montaggio…');
  const base = `${CDN}/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  _ff = ff;
  return ff;
}

function extFromContentType(ct: string | null): string {
  if (!ct) return 'mp3';
  if (ct.includes('mpeg') || ct.includes('mp3')) return 'mp3';
  if (ct.includes('wav')) return 'wav';
  if (ct.includes('mp4') || ct.includes('m4a') || ct.includes('aac')) return 'm4a';
  if (ct.includes('ogg')) return 'ogg';
  return 'mp3';
}

async function fetchViaProxy(
  remoteUrl: string,
  token: string
): Promise<{ data: Uint8Array; contentType: string | null }> {
  const proxied = `/api/media/proxy?url=${encodeURIComponent(remoteUrl)}`;
  const res = await fetch(proxied, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const buf = await res.arrayBuffer();
  return { data: new Uint8Array(buf), contentType: res.headers.get('content-type') };
}

export async function assembleSpot(input: AssembleInput): Promise<AssembleResult> {
  const { clips, audioUrl, srt, onProgress } = input;
  if (!clips || clips.length === 0) throw new Error('Nessun clip da montare');

  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Sessione non disponibile');

  const ff = await getFFmpeg(onProgress);

  // 1) clip → filesystem virtuale (via proxy same-origin)
  const clipNames: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    onProgress?.(`Scarico la scena ${i + 1}/${clips.length}…`);
    const { data } = await fetchViaProxy(clips[i], token);
    const name = `in${i}.mp4`;
    await ff.writeFile(name, data);
    clipNames.push(name);
  }

  // 2) voiceover (opzionale)
  let audioName: string | null = null;
  if (audioUrl) {
    try {
      onProgress?.('Scarico il voiceover…');
      const { data, contentType } = await fetchViaProxy(audioUrl, token);
      audioName = `voice.${extFromContentType(contentType)}`;
      await ff.writeFile(audioName, data);
    } catch {
      audioName = null; // se la voce non si scarica, si procede senza
    }
  }

  // 3) sottotitoli (sidecar sempre pronto)
  const hasSrt = !!(srt && srt.trim());
  let srtUrl: string | null = null;
  if (hasSrt) {
    await ff.writeFile('subs.srt', srt as string);
    srtUrl = URL.createObjectURL(new Blob([srt as string], { type: 'application/x-subrip' }));
  }

  // 4) concat delle scene: prima stream-copy, poi re-encode normalizzato
  onProgress?.('Unisco le scene…');
  const list = clipNames.map((n) => `file '${n}'`).join('\n') + '\n';
  await ff.writeFile('list.txt', list);

  let concatName = 'concat.mp4';
  let code: number = await ff.exec([
    '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-c', 'copy', '-movflags', '+faststart', concatName,
  ]);
  if (code !== 0) {
    onProgress?.('Normalizzo le scene…');
    concatName = 'concat_re.mp4';
    code = await ff.exec([
      '-f', 'concat', '-safe', '0', '-i', 'list.txt',
      '-vf',
      'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1',
      '-r', '30', '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', concatName,
    ]);
    if (code !== 0) throw new Error('Unione delle scene non riuscita');
  }

  // 5) voiceover mux (opzionale)
  let baseName = concatName;
  if (audioName) {
    onProgress?.('Aggiungo la voce…');
    const muxName = 'mux.mp4';
    const c: number = await ff.exec([
      '-i', concatName, '-i', audioName,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
      '-shortest', '-movflags', '+faststart', muxName,
    ]);
    if (c === 0) baseName = muxName; // se fallisce resta l'audio originale dei clip
  }

  // 6) imprinting sottotitoli (best-effort: dipende da libass nel core)
  let subtitlesBurned = false;
  let finalName = baseName;
  if (hasSrt) {
    onProgress?.('Imprimo i sottotitoli…');
    const burnName = 'final.mp4';
    const style =
      "force_style='Fontname=Arial,Fontsize=16,PrimaryColour=&H00FFFFFF&,OutlineColour=&H90000000&,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=70'";
    const c: number = await ff.exec([
      '-i', baseName,
      '-vf', `subtitles=subs.srt:${style}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', '-movflags', '+faststart', burnName,
    ]);
    if (c === 0) {
      subtitlesBurned = true;
      finalName = burnName;
      srtUrl = null; // bruciati: il sidecar non serve più
    }
  }

  onProgress?.('Finalizzo…', 1);
  const out = (await ff.readFile(finalName)) as Uint8Array;
  const blob = new Blob([out.slice()], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  // pulizia FS virtuale (best-effort)
  try {
    for (const n of clipNames) await ff.deleteFile?.(n);
    await ff.deleteFile?.('list.txt');
    if (audioName) await ff.deleteFile?.(audioName);
    if (hasSrt) await ff.deleteFile?.('subs.srt');
  } catch {
    /* ignore */
  }

  return { url, mime: 'video/mp4', subtitlesBurned, srtUrl, bytes: out.byteLength };
}
