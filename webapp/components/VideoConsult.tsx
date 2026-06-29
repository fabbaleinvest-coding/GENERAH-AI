'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Button, Badge, cx } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Video-consulto reale — riproduce la costruzione dell'avatar
//  del repo "heygen-lite" (REGENERAH OzoPet): HeyGen LiveAvatar in modalità
//  LITE (volto/lip-sync, muto) + OpenAI Realtime via WebSocket (cervello+voce).
//  L'audio PCM di OpenAI viene inviato all'avatar via streaming a finestre
//  (agent.speak) sul socket dati di LITE. Token da /api/heygen/token-lite e
//  /api/realtime-session. Mic via AudioWorklet /scripts/audioProcessor.js.
//
//  Adattamento GENERAH: persona = consulente commerciale; knowledge base =
//  materiali caricati dall'utente in Fase 1; cap rigido sui minuti (5 in trial,
//  minuti del piano altrimenti) con callback di consumo onEnded(minutiUsati).
// ─────────────────────────────────────────────────────────────────────────

type Msg = { role: 'user' | 'assistant'; text: string };
type Phase = 'idle' | 'connecting' | 'live' | 'error' | 'ended';

const WS_URL = 'wss://api.openai.com/v1/realtime';

async function loadLiveAvatarSDK(): Promise<any> {
  const m: any = await import('@heygen/liveavatar-web-sdk');
  const LiveAvatarSession = m.LiveAvatarSession || m.default?.LiveAvatarSession;
  const SessionEvent = m.SessionEvent || m.default?.SessionEvent;
  if (!LiveAvatarSession || !SessionEvent) throw new Error('SDK LiveAvatar: export non trovati');
  return { LiveAvatarSession, SessionEvent };
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
}
function base64EncodeFloat(float32Array: Float32Array): string {
  return bytesToBase64(new Uint8Array(floatTo16BitPCM(float32Array)));
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface VideoConsultProps {
  /** 'trial' = prova gratuita 5 min una tantum · 'plan' = minuti del piano (consumati) */
  mode: 'trial' | 'plan';
  /** minuti massimi disponibili per questa sessione (cap rigido) */
  maxMinutes: number;
  /** chiamato a fine consulto con i minuti effettivamente usati (arrotondati per eccesso) */
  onEnded?: (minutesUsed: number) => void;
}

export default function VideoConsult({ mode, maxMinutes, onEnded }: VideoConsultProps) {
  const { user } = useStore();

  const [phase, setPhase] = useState<Phase>('idle');
  const [oaiReady, setOaiReady] = useState(false);
  const [hgReady, setHgReady] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [livePartial, setLivePartial] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [needsConfig, setNeedsConfig] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const avatarRef = useRef<any>(null);

  const micRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micSrcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micNodeRef = useRef<AudioWorkletNode | null>(null);
  const micEnabledRef = useRef<boolean>(true);
  const camStreamRef = useRef<MediaStream | null>(null);

  // streaming audio verso l'avatar (vero streaming via _sessionEventSocket)
  const winChunksRef = useRef<Uint8Array[]>([]);
  const winLenRef = useRef<number>(0);
  const allChunksRef = useRef<Uint8Array[]>([]);
  const allLenRef = useRef<number>(0);
  const responseActiveRef = useRef<boolean>(false);
  const turnEventIdRef = useRef<string>('');
  const turnFinishedRef = useRef<boolean>(false);
  const firstChunkSentRef = useRef<boolean>(false);
  const pendingResponseRef = useRef<boolean>(false);
  const visualHandledRef = useRef<Set<string>>(new Set());
  const toolHandledRef = useRef<Set<string>>(new Set());

  const asstBufRef = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const camStartedAtRef = useRef<number>(0);

  // cap minuti
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const endedFiredRef = useRef<boolean>(false);
  const onEndedRef = useRef<typeof onEnded>(onEnded);
  onEndedRef.current = onEnded;
  const maxSeconds = Math.max(1, Math.round(maxMinutes * 60));

  useEffect(() => () => cleanup(), []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, livePartial]);

  // Timer: cronometro + cap rigido. A scadenza chiude da solo.
  useEffect(() => {
    if (phase !== 'live') return;
    startedAtRef.current = Date.now();
    const id = setInterval(() => {
      const used = Math.floor((Date.now() - startedAtRef.current) / 1000);
      elapsedRef.current = used;
      setElapsed(used);
      if (used >= maxSeconds) { stop(); }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function wsSend(obj: any) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) { try { ws.send(JSON.stringify(obj)); } catch {} }
  }
  function requestResponse() {
    if (responseActiveRef.current) { pendingResponseRef.current = true; return; }
    pendingResponseRef.current = false;
    wsSend({ type: 'response.create' });
  }
  function stopFrameTimer() { if (frameTimerRef.current) { clearTimeout(frameTimerRef.current); frameTimerRef.current = null; } }
  const WINDOW_BYTES = 2400; // ~50ms di PCM16@24k: finestra piccola = bassa latenza

  function liveSocket(): WebSocket | null {
    const sk: any = avatarRef.current?._sessionEventSocket;
    return sk && sk.readyState === 1 ? sk : null;
  }
  function concatBytes(chunks: Uint8Array[], total: number): Uint8Array {
    const m = new Uint8Array(total); let o = 0;
    for (const c of chunks) { m.set(c, o); o += c.length; }
    return m;
  }
  function resetOut() { winChunksRef.current = []; winLenRef.current = 0; allChunksRef.current = []; allLenRef.current = 0; }
  function pushOut(bytes: Uint8Array) {
    winChunksRef.current.push(bytes); winLenRef.current += bytes.length;
    allChunksRef.current.push(bytes); allLenRef.current += bytes.length;
  }
  function streamWindow() {
    const sk = liveSocket();
    if (!sk || !turnEventIdRef.current || winLenRef.current <= 0) return;
    const merged = concatBytes(winChunksRef.current, winLenRef.current);
    winChunksRef.current = []; winLenRef.current = 0;
    try { sk.send(JSON.stringify({ type: 'agent.speak', event_id: turnEventIdRef.current, audio: bytesToBase64(merged) })); } catch {}
  }
  function finishTurnAudio() {
    if (turnFinishedRef.current) return;
    turnFinishedRef.current = true;
    const sk = liveSocket();
    if (sk && turnEventIdRef.current) {
      streamWindow();
      try { sk.send(JSON.stringify({ type: 'agent.speak_end', event_id: turnEventIdRef.current })); } catch {}
    } else if (allLenRef.current > 0) {
      const merged = concatBytes(allChunksRef.current, allLenRef.current);
      try { avatarRef.current?.repeatAudio?.(bytesToBase64(merged)); } catch (e) { setErrorMsg('repeatAudio: ' + (e as Error).message); }
    }
    resetOut();
  }

  function handleWsEvent(e: any) {
    const t: string = e?.type || '';
    if (t === 'input_audio_buffer.speech_started') {
      if (responseActiveRef.current) wsSend({ type: 'response.cancel' });
      const sk = liveSocket();
      if (sk && turnEventIdRef.current && !turnFinishedRef.current) { try { sk.send(JSON.stringify({ type: 'agent.speak_end', event_id: turnEventIdRef.current })); } catch {} }
      try { avatarRef.current?.interrupt?.(); } catch {}
      responseActiveRef.current = false; turnFinishedRef.current = true; pendingResponseRef.current = false; resetOut();
    } else if (t === 'response.created') {
      responseActiveRef.current = true; turnFinishedRef.current = false;
      turnEventIdRef.current = 'oai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      firstChunkSentRef.current = false;
      resetOut();
    } else if (t.endsWith('output_audio.delta') || t === 'response.audio.delta') {
      const b64 = e.delta || '';
      if (b64) { pushOut(base64ToBytes(b64)); if (!firstChunkSentRef.current) { firstChunkSentRef.current = true; streamWindow(); } else if (winLenRef.current >= WINDOW_BYTES) streamWindow(); }
    } else if (t === 'response.output_audio.done' || t.endsWith('output_audio.done') || t === 'response.audio.done') {
      finishTurnAudio();
    } else if (t === 'response.done') {
      responseActiveRef.current = false;
      if (e?.response?.status === 'cancelled') { resetOut(); turnFinishedRef.current = true; }
      else finishTurnAudio();
      if (pendingResponseRef.current) { pendingResponseRef.current = false; wsSend({ type: 'response.create' }); }
    } else if (t.endsWith('output_audio_transcript.delta') || t === 'response.audio_transcript.delta' || t === 'response.output_text.delta') {
      asstBufRef.current += e.delta || ''; setLivePartial(asstBufRef.current);
    } else if (t.endsWith('output_audio_transcript.done') || t === 'response.audio_transcript.done' || t === 'response.output_text.done') {
      const text = (e.transcript || asstBufRef.current || '').trim();
      asstBufRef.current = ''; setLivePartial('');
      if (text) setMessages((m) => [...m, { role: 'assistant', text }]);
    } else if (t === 'conversation.item.input_audio_transcription.completed') {
      const text = (e.transcript || '').trim();
      if (text) setMessages((m) => [...m, { role: 'user', text }]);
    } else if (t === 'response.output_item.done' && e?.item?.type === 'function_call') {
      handleToolCall(e.item.name, e.item.call_id, e.item.arguments);
    } else if (t === 'response.function_call_arguments.done') {
      handleToolCall(e.name, e.call_id, e.arguments);
    } else if (t === 'error') {
      const msg = e?.error?.message || '';
      if (!/no active response/i.test(msg) && !/active response (already )?in progress/i.test(msg)) setErrorMsg('OpenAI: ' + (msg || JSON.stringify(e?.error || e)));
    }
  }

  async function startAvatar() {
    const r = await fetch('/api/heygen/token-lite');
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok || j?.error || !j?.sessionToken) {
      const errStr = j?.error ? (typeof j.error === 'string' ? j.error : JSON.stringify(j.error)) : 'token non disponibile';
      if (/mancante \(env\)/i.test(errStr)) { setNeedsConfig(true); }
      throw new Error('LiveAvatar(LITE): ' + errStr);
    }
    if (!videoRef.current) throw new Error('Elemento video non pronto');
    const LA = await loadLiveAvatarSDK();
    const session = new LA.LiveAvatarSession(j.sessionToken, { voiceChat: false });
    avatarRef.current = session;
    session.on(LA.SessionEvent.SESSION_STREAM_READY, () => {
      if (videoRef.current) {
        try { session.attach(videoRef.current); } catch {}
        videoRef.current.muted = false; // la voce esce dall'avatar (riproduce il PCM di OpenAI)
        videoRef.current.play?.().catch(() => {});
      }
      setHgReady(true);
    });
    session.on(LA.SessionEvent.SESSION_DISCONNECTED, () => setHgReady(false));
    await session.start();
  }

  async function startMic() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true } as any,
    });
    micRef.current = stream; micEnabledRef.current = true; setMicOn(true);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    micCtxRef.current = ctx;
    await ctx.audioWorklet.addModule('/scripts/audioProcessor.js');
    const src = ctx.createMediaStreamSource(stream); micSrcRef.current = src;
    const node = new AudioWorkletNode(ctx, 'audio-processor'); micNodeRef.current = node;
    node.port.onmessage = (ev: MessageEvent) => {
      if (!micEnabledRef.current) return;
      const f32: Float32Array = ev.data?.audio;
      if (f32 && f32.length) wsSend({ type: 'input_audio_buffer.append', audio: base64EncodeFloat(f32) });
    };
    src.connect(node);
  }

  async function startOpenAI() {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const r = await fetch('/api/realtime-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        nome: user?.nome || '',
        settore: user?.settore || '',
        kbFiles: (user?.kb || []).map((f) => f.name),
        minutes: maxMinutes,
      }),
    });
    const s = await r.json().catch(() => ({} as any));
    if (!r.ok || !s?.value) {
      const errStr = s?.error ? (typeof s.error === 'string' ? s.error : JSON.stringify(s.error)) : 'Sessione OpenAI non disponibile';
      if (/mancante \(env\)/i.test(errStr)) { setNeedsConfig(true); }
      throw new Error('OpenAI: ' + errStr);
    }
    const EPHEMERAL = s.value; const model = s.model || 'gpt-realtime'; const voice = s.voice || 'marin';

    await new Promise<void>((resolve, reject) => {
      let opened = false;
      const ws = new WebSocket(`${WS_URL}?model=${encodeURIComponent(model)}`, ['realtime', 'openai-insecure-api-key.' + EPHEMERAL]);
      wsRef.current = ws;
      ws.onopen = async () => {
        opened = true; setOaiReady(true);
        wsSend({
          type: 'session.update',
          session: {
            type: 'realtime',
            audio: {
              output: { format: { type: 'audio/pcm', rate: 24000 }, voice },
              input: { turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 200, silence_duration_ms: 50 }, transcription: { model: 'whisper-1' } },
            },
          },
        });
        wsSend({ type: 'response.create' });
        try { await startMic(); } catch (err) { setErrorMsg('Microfono non disponibile: ' + (err as Error).message); }
        resolve();
      };
      ws.onmessage = (ev) => { try { handleWsEvent(JSON.parse(ev.data)); } catch {} };
      ws.onerror = () => { if (!opened) reject(new Error('OpenAI WS: connessione fallita')); };
      ws.onclose = () => { setOaiReady(false); };
    });
  }

  function captureFrameDataUrl(): string | null {
    const v = camVideoRef.current;
    if (!v || !v.videoWidth) return null;
    const maxW = 1024;
    const scale = Math.min(1, maxW / v.videoWidth);
    const w = Math.round(v.videoWidth * scale), h = Math.round(v.videoHeight * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.7);
  }
  function sendFrame(trigger: boolean) {
    const url = captureFrameDataUrl(); if (!url) return;
    wsSend({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_image', image_url: url }] } });
    if (trigger) {
      wsSend({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: "Guarda l'immagine che ti sto mostrando e commentala in modo utile per il consulto." }] } });
      requestResponse();
    }
  }
  function scheduleFrames() {
    stopFrameTimer();
    const elapsedMs = Date.now() - camStartedAtRef.current;
    const interval = elapsedMs < 60000 ? 10000 : 30000;
    frameTimerRef.current = setTimeout(() => { sendFrame(false); scheduleFrames(); }, interval);
  }
  async function startWebcam(): Promise<boolean> {
    if (camStreamRef.current) return true;
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      camStreamRef.current = cam; setCamOn(true);
      if (camVideoRef.current) { camVideoRef.current.srcObject = cam; camVideoRef.current.play?.().catch(() => {}); }
      camStartedAtRef.current = Date.now();
      scheduleFrames();
      return true;
    } catch { setCamOn(false); return false; }
  }
  async function activateVisual(callId?: string) {
    if (callId) { if (visualHandledRef.current.has(callId)) return; visualHandledRef.current.add(callId); }
    const ok = await startWebcam();
    if (callId) wsSend({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: ok ? 'Webcam attivata: sto inquadrando.' : 'Webcam non concessa.' } });
    if (ok) setTimeout(() => sendFrame(true), 1800);
    else requestResponse();
  }
  async function manualVisual() {
    const ok = camStreamRef.current ? true : await startWebcam();
    if (ok) setTimeout(() => sendFrame(true), camStreamRef.current ? 0 : 1500);
  }

  function handleToolCall(name?: string, callId?: string, _argsStr?: string) {
    if (!name) return;
    if (callId) { if (toolHandledRef.current.has(callId)) return; toolHandledRef.current.add(callId); }
    if (name === 'attiva_riconoscimento_visivo') { activateVisual(callId); return; }
    if (name === 'end_call') {
      if (callId) wsSend({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ ok: true }) } });
      setTimeout(() => stop(), 1400);
      return;
    }
    if (callId) wsSend({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: '{}' } });
    requestResponse();
  }

  function cleanup() {
    stopFrameTimer();
    try { wsRef.current?.close(); } catch {}
    try { micNodeRef.current?.disconnect(); } catch {}
    try { micSrcRef.current?.disconnect(); } catch {}
    try { micCtxRef.current?.close(); } catch {}
    try { micRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
    try { camStreamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
    try { avatarRef.current?.interrupt?.(); } catch {}
    try { avatarRef.current?.stop?.(); } catch {}
    wsRef.current = null; micNodeRef.current = null; micSrcRef.current = null; micCtxRef.current = null;
    micRef.current = null; camStreamRef.current = null; avatarRef.current = null;
    resetOut(); responseActiveRef.current = false; turnFinishedRef.current = false; firstChunkSentRef.current = false; pendingResponseRef.current = false; visualHandledRef.current = new Set(); toolHandledRef.current = new Set(); turnEventIdRef.current = ''; asstBufRef.current = '';
    setOaiReady(false); setHgReady(false); setLivePartial(''); setCamOn(false);
  }

  function fireEnded() {
    if (endedFiredRef.current) return;
    endedFiredRef.current = true;
    const used = Math.min(maxMinutes, Math.ceil(elapsedRef.current / 60));
    try { onEndedRef.current?.(used); } catch {}
  }

  async function start() {
    setErrorMsg(''); setNeedsConfig(false); setMessages([]); setPhase('connecting');
    endedFiredRef.current = false; elapsedRef.current = 0; setElapsed(0);
    try {
      await startAvatar();
      await startOpenAI();
      setPhase('live');
    } catch (e) {
      cleanup();
      setErrorMsg((e as Error).message || 'Errore di avvio'); setPhase('error');
    }
  }
  function stop() {
    fireEnded();
    cleanup();
    setPhase('ended');
  }
  function toggleMic() {
    const on = !micEnabledRef.current; micEnabledRef.current = on;
    micRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    setMicOn(on);
  }

  // ----------------------------- UI -----------------------------
  const remainingSec = Math.max(0, maxSeconds - elapsed);
  const mmss = `${String(Math.floor(remainingSec / 60)).padStart(2, '0')}:${String(remainingSec % 60).padStart(2, '0')}`;

  function StatusPill({ ok, label, pending }: { ok: boolean; label: string; pending?: boolean }) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.72rem] font-medium text-mist">
        <span className="relative flex h-2.5 w-2.5">
          {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300/60" />}
          <span className={cx('relative inline-flex h-2.5 w-2.5 rounded-full', ok ? 'bg-teal-300' : pending ? 'bg-amber' : 'bg-white/25')} />
        </span>
        {label}
      </span>
    );
  }

  const controlBar = (
    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2.5 bg-gradient-to-t from-ink via-ink/55 to-transparent px-4 pb-4 pt-12">
      {phase === 'idle' || phase === 'error' ? (
        <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-7 py-3 text-sm font-semibold text-ink-900 shadow-lg shadow-black/30 transition hover:bg-teal-300">
          ▶ Avvia il consulto
        </button>
      ) : phase === 'ended' ? (
        <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-white/15 px-7 py-3 text-sm font-semibold text-white/70 ring-1 ring-white/20">
          ✓ Consulto terminato
        </button>
      ) : (
        <>
          <button onClick={stop} className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-black/30 transition hover:opacity-90">
            ■ Termina
          </button>
          <button onClick={toggleMic} disabled={phase !== 'live'} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-white disabled:opacity-50">
            {micOn ? '🎙 Microfono' : '🔇 Muto'}
          </button>
          <button onClick={manualVisual} disabled={phase !== 'live'} className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/90 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50">
            📷 {camOn ? 'Mostra' : 'Webcam'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* Status pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <StatusPill ok={oaiReady} pending={phase === 'connecting'} label="Intelligenza & voce" />
        <StatusPill ok={hgReady} pending={phase === 'connecting'} label="Avatar · lip-sync" />
        <StatusPill ok={camOn} label={camOn ? 'Webcam attiva' : 'Webcam in attesa'} />
        <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[0.72rem] text-mist">
          {mode === 'trial' ? 'Prova gratuita' : 'Minuti piano'} · cap {maxMinutes}:00
        </span>
      </div>

      {needsConfig && (
        <div className="mb-4 rounded-2xl border border-amber/30 bg-amber/5 px-4 py-3 text-[0.86rem] text-amber-soft">
          <p className="font-semibold">Configurazione richiesta</p>
          <p className="mt-1 text-amber-soft/90">
            L avatar reale richiede le chiavi su Vercel: <span className="font-mono">OPENAI_API_KEY</span>,{' '}
            <span className="font-mono">LIVEAVATAR_API_KEY</span>, <span className="font-mono">LIVEAVATAR_AVATAR_ID</span>.
          </p>
        </div>
      )}
      {errorMsg && !needsConfig && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral">
          <span className="mt-0.5">⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Pannello avatar */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-xl">
          <div className="relative aspect-[3/4] max-h-[62vh] w-full bg-gradient-to-b from-teal-deep to-ink">
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />

            {phase !== 'live' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/45 px-6 text-center backdrop-blur-[2px]">
                {phase === 'connecting' ? (
                  <>
                    <span className="h-12 w-12 animate-spin rounded-full border-2 border-white/25 border-t-teal-300" />
                    <p className="text-sm font-medium text-white/85">Connessione in corso…</p>
                  </>
                ) : phase === 'ended' ? (
                  <>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">✓</span>
                    <p className="text-base font-semibold text-white">Consulto terminato</p>
                  </>
                ) : phase === 'error' ? (
                  <>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">⚠</span>
                    <p className="text-sm font-medium text-white/85">Riprova ad avviare il consulto</p>
                  </>
                ) : (
                  <>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">🎥</span>
                    <p className="text-base font-semibold text-white">Il consulente AI comparirà qui</p>
                    <p className="text-sm font-medium text-teal-200">Premi «Avvia il consulto»</p>
                  </>
                )}
              </div>
            )}

            {phase === 'live' && (
              <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
                </span>
                LIVE · {mmss}
              </div>
            )}

            <video
              ref={camVideoRef}
              autoPlay
              playsInline
              muted
              className={'absolute right-4 top-4 z-10 h-24 w-24 rounded-2xl border-2 border-white/80 object-cover shadow-lg sm:h-28 sm:w-28 ' + (camOn ? '' : 'hidden')}
            />

            {controlBar}
          </div>
        </div>

        {/* Pannello trascrizione */}
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-900/50">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
            <span className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-mist/70">Conversazione</span>
            {phase === 'live' && (
              <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-teal-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" /> in ascolto
              </span>
            )}
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5" style={{ maxHeight: 440 }}>
            {messages.length === 0 && !livePartial && (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <span className="text-2xl">💬</span>
                <p className="text-sm text-mist">La conversazione apparirà qui in tempo reale.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <span
                  className={cx(
                    'inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user' ? 'rounded-br-md bg-teal-400 text-ink-900' : 'rounded-bl-md bg-white/5 text-bone ring-1 ring-white/8'
                  )}
                >
                  {m.text}
                </span>
              </div>
            ))}
            {livePartial && (
              <div className="flex justify-start">
                <span className="inline-block max-w-[85%] rounded-2xl rounded-bl-md bg-white/5 px-3.5 py-2.5 text-sm italic leading-relaxed text-mist ring-1 ring-white/8">
                  {livePartial}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="teal">Avatar HeyGen LiveAvatar · LITE</Badge>
        <Badge tone="muted">Cervello + voce: OpenAI Realtime</Badge>
        <Badge tone="muted">Memoria: knowledge base Fase 1</Badge>
      </div>
      <p className="mt-3 max-w-2xl text-[0.72rem] leading-relaxed text-mist/70">
        Il consulto AI ha finalità dimostrative. La voce esce dal volto dell avatar; microfono e webcam restano sul tuo dispositivo.
      </p>
    </div>
  );
}
