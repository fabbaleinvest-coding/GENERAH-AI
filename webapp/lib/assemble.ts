// Montaggio nel browser con ffmpeg.wasm: prende i clip Higgsfield + il voiceover
// + i sottotitoli (SRT) e produce UN unico spot verticale 9:16.
//
// Scelte tecniche:
// - core SINGLE-THREAD caricato da CDN via @ffmpeg/util.toBlobURL → niente
//   SharedArrayBuffer, quindi nessun header COOP/COEP da configurare su Vercel.
// - i media Higgsfield sono cross-origin: vengono letti tramite il proxy
//   same-origin /api/media/proxy (con il token di sessione).
// - i sottotitoli vengono BRUCIATI in modo affidabile: il core standard non
//   porta libass né font, quindi ogni battuta è renderizzata con il Canvas del
//   browser (testo bianco, box arrotondato on-brand, a capo automatico) e
//   sovrapposta al video con il filtro `overlay` temporizzato. Funziona su
//   qualsiasi core; l'SRT resta scaricabile come sidecar se l'overlay fallisce.

import { supabase } from '@/lib/supabase';
import { parseSrt } from '@/lib/subtitles';

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Renderizza UNA battuta come PNG trasparente a piena risoluzione (W×H):
// box arrotondato on-brand ancorato in basso, testo bianco con contorno e
// a capo automatico. Niente libass/font lato core: tutto via Canvas.
async function renderCuePng(text: string, W: number, H: number): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D non disponibile');

  const fontSize = Math.round(W * 0.052); // ~56px @1080
  const lineH = Math.round(fontSize * 1.22);
  const padX = Math.round(W * 0.045);
  const padY = Math.round(fontSize * 0.55);
  const maxTextW = W - padX * 4;
  const font = `700 ${fontSize}px Inter, "Helvetica Neue", Arial, system-ui, sans-serif`;
  ctx.font = font;

  // word-wrap
  const lines: string[] = [];
  let cur = '';
  for (const word of (text || '').split(/\s+/).filter(Boolean)) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxTextW && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length === 0) lines.push(text || '');

  // box
  let textW = 0;
  for (const l of lines) textW = Math.max(textW, ctx.measureText(l).width);
  const boxW = Math.min(W - padX * 2, textW + padX * 2);
  const boxH = lines.length * lineH + padY * 2;
  const boxX = (W - boxW) / 2;
  const boxY = Math.round(H * 0.8) - boxH; // ancorato verso il basso

  ctx.fillStyle = 'rgba(11,22,34,0.62)'; // ink scuro del brand
  roundRect(ctx, boxX, boxY, boxW, boxH, Math.round(fontSize * 0.45));
  ctx.fill();

  // testo
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.1));
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.fillStyle = '#FFFFFF';
  let ty = boxY + padY + fontSize;
  for (const l of lines) {
    ctx.strokeText(l, W / 2, ty);
    ctx.fillText(l, W / 2, ty);
    ty += lineH;
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob nullo'))), 'image/png')
  );
  return new Uint8Array(await blob.arrayBuffer());
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

  // 3) sottotitoli: il sidecar SRT è sempre pronto (scaricabile). L'imprinting
  //    nel video avviene allo step 6 via overlay di PNG, non serve scriverlo qui.
  const hasSrt = !!(srt && srt.trim());
  let srtUrl: string | null = null;
  if (hasSrt) {
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

  // 6) imprinting sottotitoli: caption renderizzate via Canvas e sovrapposte
  //    con il filtro `overlay` temporizzato (nessun libass/font nel core).
  let subtitlesBurned = false;
  let finalName = baseName;
  const cues = hasSrt ? parseSrt(srt as string) : [];
  if (cues.length > 0) {
    try {
      onProgress?.('Preparo i sottotitoli…');
      // assicura il caricamento dei font dell'app prima di misurare/disegnare
      try {
        await (document as any).fonts?.ready;
      } catch {
        /* ignore */
      }

      const pngNames: string[] = [];
      for (let i = 0; i < cues.length; i++) {
        const png = await renderCuePng(cues[i].text, 1080, 1920);
        const name = `sub${i}.png`;
        await ff.writeFile(name, png);
        pngNames.push(name);
      }

      // input: video base + un PNG per battuta
      const inputs: string[] = ['-i', baseName];
      for (const n of pngNames) inputs.push('-i', n);

      // catena di overlay, ciascuno attivo solo nella sua finestra temporale
      let filter = '';
      let cur = '0:v';
      cues.forEach((c, i) => {
        const out = i === cues.length - 1 ? 'vout' : `v${i + 1}`;
        filter += `[${cur}][${i + 1}:v]overlay=0:0:enable='between(t,${c.start.toFixed(
          2
        )},${c.end.toFixed(2)})'[${out}];`;
        cur = out;
      });
      filter = filter.replace(/;$/, '');

      onProgress?.('Imprimo i sottotitoli…');
      const burnName = 'final.mp4';
      const c: number = await ff.exec([
        ...inputs,
        '-filter_complex', filter,
        '-map', '[vout]', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'copy', '-movflags', '+faststart', burnName,
      ]);
      if (c === 0) {
        subtitlesBurned = true;
        finalName = burnName;
        srtUrl = null; // bruciati nel video: il sidecar non serve più
      }

      try {
        for (const n of pngNames) await ff.deleteFile?.(n);
      } catch {
        /* ignore */
      }
    } catch {
      // qualunque imprevisto nel rendering/overlay: si tiene lo spot senza
      // sottotitoli bruciati e l'SRT resta disponibile come sidecar.
      subtitlesBurned = false;
      finalName = baseName;
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
  } catch {
    /* ignore */
  }

  return { url, mime: 'video/mp4', subtitlesBurned, srtUrl, bytes: out.byteLength };
}
