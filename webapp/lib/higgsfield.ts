// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter Higgsfield Cloud API (v2) — SOLO SERVER.
//  Contratto verificato dall'SDK ufficiale @higgsfield/client (v2):
//   - base:   https://platform.higgsfield.ai
//   - auth:   Authorization: Key <KEY_ID>:<KEY_SECRET>
//   - submit: POST /<endpoint>            (body = input del modello)
//   - poll:   GET  /requests/<id>/status  → { status, request_id, images?, video? }
//   - stati:  queued | in_progress | completed | failed | nsfw
//  Endpoint tipizzati certi: /v1/text2image/soul, /v1/image2video/dop,
//  /v1/speak/higgsfield. Gli slug dei modelli specifici (Nano Banana Pro,
//  Kling 3.0 Turbo, ElevenLabs) sono CONFIGURABILI via env, con default
//  confermati (Soul + DoP-Turbo) così la pipeline funziona da subito e passa
//  ai modelli esatti impostando gli slug, senza modificare il codice.
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
    'User-Agent': 'higgsfield-server-js/2.0',
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

// ── Builder dei 3 step della pipeline ───────────────────────────────────────
// Ogni step ha un endpoint con DEFAULT CONFERMATO + override via env, e
// costruisce l'input giusto per l'endpoint scelto.

export interface HfStep {
  endpoint: string;
  input: Record<string, unknown>;
}

/** Step 1 — immagine di partenza (default: Higgsfield Soul). `opts` permette di
 *  forzare formato/aspetto (es. 4:5 per le infografiche social). */
export function imageStep(prompt: string, opts?: { aspect?: string; size?: string }): HfStep {
  const endpoint = process.env.HIGGSFIELD_IMAGE_ENDPOINT || '/v1/text2image/soul';
  if (endpoint.includes('soul')) {
    return {
      endpoint,
      input: {
        prompt,
        width_and_height: opts?.size || process.env.HIGGSFIELD_IMAGE_SIZE || '1080x1920',
        quality: process.env.HIGGSFIELD_IMAGE_QUALITY || '720p',
        batch_size: 1,
        enhance_prompt: true,
      },
    };
  }
  // slug generico (es. Nano Banana Pro): input standard text-to-image
  return {
    endpoint,
    input: {
      prompt,
      aspect_ratio: opts?.aspect || process.env.HIGGSFIELD_IMAGE_ASPECT || '9:16',
    },
  };
}

/** Step 2 — clip image-to-video 9:16 (default: Higgsfield DoP, model dop-turbo). */
export function clipStep(prompt: string, imageUrl: string): HfStep {
  const endpoint = process.env.HIGGSFIELD_VIDEO_ENDPOINT || '/v1/image2video/dop';
  if (endpoint.includes('dop')) {
    return {
      endpoint,
      input: {
        model: process.env.HIGGSFIELD_VIDEO_MODEL || 'dop-turbo',
        prompt,
        input_images: [{ type: 'image_url', image_url: imageUrl }],
        enhance_prompt: true,
      },
    };
  }
  // slug generico (es. Kling 3.0 Turbo): input standard image-to-video
  return {
    endpoint,
    input: {
      prompt,
      image_url: imageUrl,
      aspect_ratio: process.env.HIGGSFIELD_VIDEO_ASPECT || '9:16',
      ...(process.env.HIGGSFIELD_VIDEO_MODEL ? { model: process.env.HIGGSFIELD_VIDEO_MODEL } : {}),
    },
  };
}

/**
 * Step 3 — voiceover TTS (es. ElevenLabs, voce Roman).
 * Nessun endpoint TTS è tipizzato nell'SDK ufficiale: va impostato via
 * HIGGSFIELD_TTS_ENDPOINT. Se assente, la pipeline procede SENZA traccia voce
 * (i sottotitoli restano), in modo trasparente.
 */
export function ttsStep(text: string): HfStep | null {
  const endpoint = process.env.HIGGSFIELD_TTS_ENDPOINT;
  if (!endpoint) return null;
  return {
    endpoint,
    input: {
      text,
      voice: process.env.HIGGSFIELD_TTS_VOICE || 'Roman',
      ...(process.env.HIGGSFIELD_TTS_MODEL ? { model: process.env.HIGGSFIELD_TTS_MODEL } : {}),
    },
  };
}

export function ttsConfigured(): boolean {
  return !!process.env.HIGGSFIELD_TTS_ENDPOINT;
}
