// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Client MCP Higgsfield (lato SERVER) — motore creativo di
//  piattaforma che SOSTITUISCE l'adapter REST (lib/higgsfield.ts).
//
//  Trasporto: MCP "Streamable HTTP" (JSON-RPC 2.0 in POST sull'endpoint MCP).
//  Auth: Bearer con l'access token DI PIATTAFORMA (lib/higgsfieldOAuth.ts), con
//  refresh automatico e un retry su 401. Sessione via header Mcp-Session-Id.
//
//  Espone tre generatori ad alto livello, mappati sui tool reali del server:
//    - generate_image   → modello "Nano Banana Pro"      (immagini/infografiche)
//    - generate_video   → modello "Kling 3.0 Turbo" 9:16 (image-to-video ADS)
//    - generate_audio   → text2speech_v2 / ElevenLabs, voce "Roman" (voiceover)
//  I risultati asincroni (job) vengono pollati via `job_display`.
//
//  Nota di robustezza: gli slug esatti dei modelli, gli id voce e la forma dei
//  risultati vengono RISOLTI A RUNTIME (models_explore / list_voices / job_display)
//  e sono sovrascrivibili via env. L'estrazione di job-id e URL media è difensiva
//  (deep-scan), coerente con l'adapter REST preesistente.
//
//  Config (env, tutte opzionali con default sensati):
//    HIGGSFIELD_MCP_IMAGE_MODEL   (default: risolve "Nano Banana Pro"; fb "nano_banana_2")
//    HIGGSFIELD_MCP_VIDEO_MODEL   (default: "kling3_0_turbo")
//    HIGGSFIELD_MCP_AUDIO_MODEL   (default: "text2speech_v2")
//    HIGGSFIELD_MCP_AUDIO_VARIANT (default: "elevenlabs")
//    HIGGSFIELD_MCP_VOICE_NAME    (default: "Roman")
//    HIGGSFIELD_MCP_VOICE_ID      (bypass della risoluzione voce)
//    HIGGSFIELD_MCP_IMAGE_AR (9:16) · HIGGSFIELD_MCP_VIDEO_AR (9:16)
//    HIGGSFIELD_MCP_VIDEO_RES (720p) · HIGGSFIELD_MCP_VIDEO_DURATION (15)
// ─────────────────────────────────────────────────────────────────────────

import { MCP_URL, getPlatformAccessToken, forceRefresh } from '@/lib/higgsfieldOAuth';

const PROTOCOL_VERSION = '2025-06-18';
const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/;
const MEDIA_URL_RE = /https?:\/\/[^\s"'<>]+\.(?:mp4|mov|webm|png|jpe?g|webp|gif|mp3|wav|m4a|aac|ogg)(?:\?[^\s"'<>]*)?/i;

// ── Trasporto JSON-RPC su Streamable HTTP ────────────────────────────────────

interface RpcResult {
  result?: any;
  error?: { code: number; message: string; data?: unknown };
}

let sessionId: string | null = null;
let rpcId = 0;

async function postRpc(token: string, method: string, params?: any): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const body = { jsonrpc: '2.0', id: ++rpcId, method, ...(params ? { params } : {}) };
  return fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
}

/** Estrae il payload JSON-RPC da una risposta JSON o SSE (text/event-stream). */
async function readRpc(res: Response): Promise<RpcResult> {
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  const ctype = res.headers.get('content-type') || '';
  const raw = await res.text();
  if (ctype.includes('text/event-stream')) {
    // Concatena i data: e prende l'ultimo messaggio JSON-RPC valido.
    let last: RpcResult | null = null;
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^data:\s?(.*)$/);
      if (!m) continue;
      try {
        const obj = JSON.parse(m[1]);
        if (obj && (obj.result !== undefined || obj.error !== undefined)) last = obj;
      } catch {
        /* frammento non JSON: ignorato */
      }
    }
    if (last) return last;
  }
  try {
    return JSON.parse(raw) as RpcResult;
  } catch {
    return { error: { code: -1, message: raw.slice(0, 300) || `HTTP ${res.status}` } };
  }
}

let initialized = false;

async function ensureInitialized(token: string): Promise<void> {
  if (initialized) return;
  const res = await postRpc(token, 'initialize', {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'GENERAH AI', version: '1.0.0' },
  });
  const out = await readRpc(res);
  if (out.error) throw new Error(`MCP initialize: ${out.error.message}`);
  // Notifica "initialized" (best-effort, nessuna risposta attesa).
  try {
    await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${token}`,
        'MCP-Protocol-Version': PROTOCOL_VERSION,
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
  } catch {
    /* ignorato */
  }
  initialized = true;
}

/** Chiamata RPC generica con auth di piattaforma, init pigro e retry su 401. */
async function rpc(method: string, params?: any, _retry = false): Promise<any> {
  const token = await getPlatformAccessToken();
  await ensureInitialized(token);
  const res = await postRpc(token, method, params);
  if (res.status === 401 && !_retry) {
    // Token invalidato lato server: forza refresh, reset sessione e riprova.
    initialized = false;
    sessionId = null;
    await forceRefresh();
    return rpc(method, params, true);
  }
  const out = await readRpc(res);
  if (out.error) throw new Error(out.error.message || 'Errore MCP');
  return out.result;
}

// ── Primitive MCP ────────────────────────────────────────────────────────────

export async function listTools(): Promise<any[]> {
  const r = await rpc('tools/list', {});
  return r?.tools || [];
}

/** Invoca un tool e restituisce un oggetto "scansionabile" (structured + testo). */
export async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
  const r = await rpc('tools/call', { name, arguments: args });
  if (r?.isError) {
    const msg = extractText(r) || `Tool ${name} in errore`;
    throw new Error(msg);
  }
  return normalizeToolResult(r);
}

function extractText(result: any): string {
  const parts: string[] = [];
  for (const c of result?.content || []) {
    if (c?.type === 'text' && typeof c.text === 'string') parts.push(c.text);
  }
  return parts.join('\n');
}

/** Aggrega structuredContent + eventuale JSON dentro i blocchi text in un unico oggetto. */
function normalizeToolResult(result: any): any {
  const bag: any = { _raw: result };
  if (result?.structuredContent) bag.structured = result.structuredContent;
  const text = extractText(result);
  if (text) {
    bag.text = text;
    try {
      bag.json = JSON.parse(text);
    } catch {
      /* testo non JSON */
    }
  }
  return bag;
}

// ── Deep-scan difensivo: job-id e URL media ──────────────────────────────────

function deepFind(obj: unknown, pred: (v: string) => boolean, prefKeys: string[]): string | null {
  const seen = new Set<unknown>();
  let fallback: string | null = null;
  const walk = (node: unknown, key?: string): string | null => {
    if (node == null || seen.has(node)) return null;
    if (typeof node === 'string') {
      if (pred(node)) {
        if (key && prefKeys.includes(key)) return node; // match su chiave preferita
        if (!fallback) fallback = node;
      }
      return null;
    }
    if (typeof node !== 'object') return null;
    seen.add(node);
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const hit = walk(v, k);
      if (hit) return hit;
    }
    return null;
  };
  return walk(obj) || fallback;
}

export function findJobId(bag: any): string | null {
  return deepFind(
    bag,
    (v) => UUID_RE.test(v) && v.length <= 40,
    ['job_id', 'jobId', 'id', 'request_id', 'requestId']
  );
}

export function findMediaUrl(bag: any): string | null {
  return deepFind(
    bag,
    (v) => MEDIA_URL_RE.test(v),
    ['result_url', 'url', 'video_url', 'image_url', 'audio_url', 'output_url']
  );
}

// ── Risoluzione modelli / voce (cache in-process) ────────────────────────────

let imageModelCache: string | null = null;
let voiceIdCache: string | null = null;

async function resolveImageModel(): Promise<string> {
  if (process.env.HIGGSFIELD_MCP_IMAGE_MODEL) return process.env.HIGGSFIELD_MCP_IMAGE_MODEL;
  if (imageModelCache) return imageModelCache;
  // Cerca il modello il cui nome contiene "Nano Banana Pro".
  try {
    const bag = await callTool('models_explore', { type: 'image' });
    const models: any[] = bag?.json?.models || bag?.structured?.models || [];
    const hit = models.find((m) =>
      String(m?.name || m?.title || '').toLowerCase().includes('nano banana pro')
    );
    const id = hit?.id || hit?.model || hit?.slug;
    if (id) {
      imageModelCache = id;
      return id;
    }
  } catch {
    /* fallback sotto */
  }
  // Fallback: nel catalogo Higgsfield "Nano Banana Pro" = machine id nano_banana_2.
  imageModelCache = 'nano_banana_2';
  return imageModelCache;
}

async function resolveVoiceId(): Promise<string | undefined> {
  if (process.env.HIGGSFIELD_MCP_VOICE_ID) return process.env.HIGGSFIELD_MCP_VOICE_ID;
  if (voiceIdCache) return voiceIdCache;
  const wanted = (process.env.HIGGSFIELD_MCP_VOICE_NAME || 'Roman').toLowerCase();
  try {
    const bag = await callTool('list_voices', { size: 100 });
    const voices: any[] = bag?.json?.voices || bag?.structured?.voices || bag?.json || [];
    const hit = (Array.isArray(voices) ? voices : []).find((v) =>
      String(v?.name || '').toLowerCase().includes(wanted)
    );
    const id = hit?.voice_id || hit?.id;
    if (id) {
      voiceIdCache = id;
      return id;
    }
  } catch {
    /* la voce potrà essere passata via env */
  }
  return undefined;
}

/** Importa un URL https in storage Higgsfield → media_id (per usarlo come start frame). */
async function importUrl(url: string): Promise<string | null> {
  try {
    const bag = await callTool('media_import_url', { url });
    return findJobId(bag) || null;
  } catch {
    return null;
  }
}

// ── Generatori ad alto livello (contratto omogeneo al REST) ──────────────────

export type GenStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

export interface GenSubmit {
  jobId: string | null;
  url: string | null;
  status: GenStatus;
}

/** Immagine (Nano Banana Pro). aspect 9:16 di default (infografiche/ADS). */
export async function mcpGenerateImage(
  prompt: string,
  opts?: { aspect?: string }
): Promise<GenSubmit> {
  const model = await resolveImageModel();
  const bag = await callTool('generate_image', {
    params: {
      model,
      prompt,
      aspect_ratio: opts?.aspect || process.env.HIGGSFIELD_MCP_IMAGE_AR || '9:16',
      count: 1,
    },
  });
  const url = findMediaUrl(bag);
  return { jobId: findJobId(bag), url, status: url ? 'completed' : 'queued' };
}

/** Clip image-to-video (Kling 3.0 Turbo, 9:16, 720p, 15s). */
export async function mcpGenerateVideo(
  prompt: string,
  imageRef: string,
  opts?: { duration?: number }
): Promise<GenSubmit> {
  const model = process.env.HIGGSFIELD_MCP_VIDEO_MODEL || 'kling3_0_turbo';
  // imageRef può essere un URL (da importare) o già un media_id/job_id.
  let mediaValue = imageRef;
  if (/^https?:\/\//i.test(imageRef)) {
    const imported = await importUrl(imageRef);
    if (imported) mediaValue = imported;
  }
  const duration = opts?.duration ?? (Number(process.env.HIGGSFIELD_MCP_VIDEO_DURATION || 15) || 15);
  const params: Record<string, unknown> = {
    model,
    prompt,
    aspect_ratio: process.env.HIGGSFIELD_MCP_VIDEO_AR || '9:16',
    duration,
    // Kling 3.0 richiede un start_image tra le medias.
    medias: [{ role: 'start_image', value: mediaValue }],
  };
  const res = process.env.HIGGSFIELD_MCP_VIDEO_RES || '720p';
  if (res) (params as any).resolution = res;
  const bag = await callTool('generate_video', { params });
  const url = findMediaUrl(bag);
  return { jobId: findJobId(bag), url, status: url ? 'completed' : 'queued' };
}

/** Voiceover (text2speech_v2 · ElevenLabs · voce "Roman"). */
export async function mcpGenerateVoiceover(text: string): Promise<GenSubmit> {
  const model = process.env.HIGGSFIELD_MCP_AUDIO_MODEL || 'text2speech_v2';
  const variant = process.env.HIGGSFIELD_MCP_AUDIO_VARIANT || 'elevenlabs';
  const voiceId = await resolveVoiceId();
  const params: Record<string, unknown> = { model, prompt: text, variant };
  if (voiceId) {
    params.voice_type = 'preset';
    params.voice_id = voiceId;
  }
  const bag = await callTool('generate_audio', { params });
  const url = findMediaUrl(bag);
  return { jobId: findJobId(bag), url, status: url ? 'completed' : 'queued' };
}

/** Stato di un job (via job_display). Ritorna url quando completato. */
export async function mcpJobStatus(jobId: string): Promise<{ status: GenStatus; url: string | null }> {
  const bag = await callTool('job_display', { id: jobId });
  const url = findMediaUrl(bag);
  const s = String(
    bag?.json?.status || bag?.structured?.status || (url ? 'completed' : 'in_progress')
  ).toLowerCase();
  const status: GenStatus =
    url ? 'completed' : s.includes('fail') ? 'failed' : s.includes('queue') ? 'queued' : 'in_progress';
  return { status, url };
}

/** Poll bloccante e limitato (per il voiceover, che serve subito nel montaggio). */
export async function mcpWaitForUrl(
  jobId: string,
  { timeoutMs = 45000, intervalMs = 2500 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { status, url } = await mcpJobStatus(jobId);
    if (url) return url;
    if (status === 'failed') return null;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
