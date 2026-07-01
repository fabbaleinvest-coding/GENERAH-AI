// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter Higgsfield Platform API — SOLO SERVER.
//  Contratto VERIFICATO DAL VIVO (curl reali, 07/2026):
//   - base:   https://platform.higgsfield.ai
//   - auth:   Authorization: Key <KEY_ID>:<KEY_SECRET>
//   - submit: POST /<model_id>            (body PIATTO = input del modello)
//   - poll:   GET  /requests/<id>/status  → { status, request_id, images?, video? }
//   - stati:  queued | in_progress | completed | failed | nsfw
//  Slug confermati funzionanti (rispondono "queued"):
//   - immagini: higgsfield-ai/soul/standard   body {prompt, aspect_ratio, resolution}
//   - video:    kling-video/v3.0/pro/image-to-video
//               body {prompt, image_url, aspect_ratio, duration}
//  Gli slug e i formati sono sovrascrivibili via env, con questi default reali.
//  Il voiceover NON è su questa API (vedi lib/tts.ts → OpenAI TTS).
// ─────────────────────────────────────────────────────────────────────────

const BASE = process.env.HIGGSFIELD_BASE_URL || 'https://platform.higgsfield.ai';

export type HfStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw';

export interface HfResponse {
  status: HfStatus;
  request_id: string;
  status_url?: string;
  cancel_url?: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  audio?: { url: string };
  // alcune varianti restituiscono url diretti: li gestiamo difensivamente
  [k: string]: unknown;
}

export function hfCredentials(): { id: string; secret: string } | null {
  const combo = process.env.HIGGSFIELD_CREDENTIALS || '';
  if (combo.includes(':')) {
    const [id, secret] = combo.split(':');
    if (id && secret) return { id: id.trim(), secret: secret.trim() };
  }
  const id = process.env.HIGGSFIELD_KEY_ID || '';
  const secret = process.env.HIGGSFIELD_KEY_SECRET || '';
  if (id && secret) return { id: id.trim(), secret: secret.trim() };
  return null;
}

export function hfConfigured(): boolean {
  return hfCredentials() !== null;
}

function headers(): Record<string, string> {
  const c = hfCredentials();
  if (!c) throw new Error('HIGGSFIELD credenziali mancanti (env)');
  return {
    Authorization: `Key ${c.id}:${c.secret}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'higgsfield-server-js/3.0',
  };
}

function endpointUrl(endpoint: string): string {
  const e = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE}${e}`;
}

/** Invia un job (senza polling) e ritorna la risposta iniziale (con request_id). */
export async function hfSubmit(endpoint: string, input: Record<string, unknown>): Promise<HfResponse> {
  const res = await fetch(endpointUrl(endpoint), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as HfResponse;
  if (!res.ok) {
    const detail =
      (data as any)?.detail || (data as any)?.message || (data as any)?.error || `HTTP ${res.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data;
}

/** Legge lo stato corrente di un job. */
export async function hfStatus(requestId: string): Promise<HfResponse> {
  const res = await fetch(`${BASE}/requests/${encodeURIComponent(requestId)}/status`, {
    method: 'GET',
    headers: headers(),
  });
  const data = (await res.json().catch(() => ({}))) as HfResponse;
  if (!res.ok) {
    const detail =
      (data as any)?.detail || (data as any)?.message || (data as any)?.error || `HTTP ${res.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data;
}

/** Estrae l'URL del risultato dalla risposta, qualunque sia il tipo di media. */
export function hfResultUrl(r: HfResponse): string | null {
  if (r.video?.url) return r.video.url;
  if (r.audio?.url) return r.audio.url;
  if (r.images && r.images[0]?.url) return r.images[0].url;
  // fallback difensivi per slug non tipizzati
  const any = r as any;
  return any.url || any.audio_url || any.video_url || any.image_url || null;
}

// ── Builder degli step della pipeline ───────────────────────────────────────
// Body PIATTI, come richiesto dalla Platform API (verificato dal vivo).

export interface HfStep {
  endpoint: string;
  input: Record<string, unknown>;
}

/** Step 1 — immagine (default: Higgsfield Soul). `opts` permette di forzare
 *  formato/risoluzione (es. 3:4 per le infografiche social). */
export function imageStep(prompt: string, opts?: { aspect?: string; resolution?: string }): HfStep {
  const endpoint = process.env.HIGGSFIELD_IMAGE_ENDPOINT || '/higgsfield-ai/soul/standard';
  return {
    endpoint,
    input: {
      prompt,
      aspect_ratio: opts?.aspect || process.env.HIGGSFIELD_IMAGE_ASPECT || '9:16',
      resolution: opts?.resolution || process.env.HIGGSFIELD_IMAGE_RESOLUTION || '1k',
    },
  };
}

/** Step 2 — clip image-to-video 9:16 (default: Kling 3.0 Pro).
 *  `image_url` è obbligatorio (modello image-to-video). La durata è
 *  configurabile (default 15s, come da specifica ADS). La resolution è
 *  opzionale: inclusa solo se HIGGSFIELD_VIDEO_RESOLUTION è impostata, perché
 *  il body confermato dal vivo funziona senza. */
export function clipStep(prompt: string, imageUrl: string, opts?: { duration?: number }): HfStep {
  const endpoint =
    process.env.HIGGSFIELD_VIDEO_ENDPOINT || '/kling-video/v3.0/pro/image-to-video';
  const duration =
    opts?.duration ?? (Number(process.env.HIGGSFIELD_VIDEO_DURATION || 15) || 15);
  const resolution = process.env.HIGGSFIELD_VIDEO_RESOLUTION;
  return {
    endpoint,
    input: {
      prompt,
      image_url: imageUrl,
      aspect_ratio: process.env.HIGGSFIELD_VIDEO_ASPECT || '9:16',
      duration,
      ...(resolution ? { resolution } : {}),
    },
  };
}
