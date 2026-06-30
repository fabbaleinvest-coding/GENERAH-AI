// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter Metricool API (SOLO SERVER).
//  Contratto verificato dalla documentazione ufficiale:
//   - base:   https://app.metricool.com/api
//   - auth:   header `X-Mc-Auth: <userToken>` + query userId & blogId su OGNI call
//   - brand:  GET  /admin/simpleProfiles?userId=...        → elenco brand (blogId)
//   - media:  GET  /actions/normalize/image/url?url=...    → URL ospitato da Metricool
//   - post:   POST /v2/scheduler/posts?userId=&blogId=     → programma il post
//             body: { text, providers:[{network}], publicationDate:{dateTime,timezone}, media:[url] }
//  Richiede il piano Advanced di Metricool. Tutto è best-effort/gated: senza
//  credenziali valide la webapp resta in modalità dimostrativa.
// ─────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

const MC_BASE = process.env.METRICOOL_BASE_URL || 'https://app.metricool.com/api';

// ── Cifratura del token utente (AES-256-GCM, chiave server-only) ─────────────
function mcKey(): Buffer {
  const secret =
    process.env.METRICOOL_TOKEN_SECRET ||
    process.env.META_TOKEN_SECRET ||
    process.env.META_APP_SECRET ||
    'generah-metricool';
  return crypto.createHash('sha256').update(secret).digest();
}

export function mcEncrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', mcKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function mcDecrypt(blob: string): string {
  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', mcKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ── Chiamata generica ───────────────────────────────────────────────────────
interface McOpts {
  method?: 'GET' | 'POST';
  token: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function mc<T = any>(path: string, opts: McOpts): Promise<T> {
  const url = new URL(`${MC_BASE}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(opts.query || {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    method: opts.method || 'GET',
    headers: {
      'X-Mc-Auth': opts.token,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as any)?.message ||
      (data as any)?.error ||
      (data as any)?.errors?.[0]?.message ||
      `Metricool API ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

// ── Brand (blogId) ──────────────────────────────────────────────────────────
export interface McBrand {
  blogId: string;
  label: string;
  networks: string[]; // reti collegate nel brand (instagram, facebook, …)
}

const NETWORK_KEYS = [
  'instagram',
  'facebook',
  'twitter',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'gmb',
  'threads',
  'bluesky',
];

function extractNetworks(b: any): string[] {
  const out = new Set<string>();
  for (const k of NETWORK_KEYS) {
    const v = b?.[k];
    // Metricool espone le reti come oggetto/booleano a seconda della versione
    if (v === true) out.add(k === 'gmb' ? 'gmb' : k);
    else if (v && typeof v === 'object' && (v.connected || v.id || v.url || v.picture)) out.add(k);
  }
  if (Array.isArray(b?.connectedNetworks)) {
    for (const n of b.connectedNetworks) if (typeof n === 'string') out.add(n.toLowerCase());
  }
  return Array.from(out);
}

export async function listBrands(token: string, userId: string): Promise<McBrand[]> {
  const data = await mc<any>('/admin/simpleProfiles', { token, query: { userId } });
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr
    .map((b: any) => ({
      blogId: String(b?.id ?? b?.blogId ?? b?.blog_id ?? ''),
      label: String(b?.label ?? b?.title ?? b?.brand ?? b?.name ?? `Brand ${b?.id ?? ''}`),
      networks: extractNetworks(b),
    }))
    .filter((b: McBrand) => b.blogId);
}

// ── Media: normalizza l'URL così Metricool lo ospita (non scade) ────────────
export async function normalizeMedia(
  token: string,
  userId: string,
  blogId: string,
  url: string
): Promise<string> {
  try {
    const data = await mc<any>('/actions/normalize/image/url', {
      token,
      query: { userId, blogId, url },
    });
    const out =
      (data as any)?.data?.url ||
      (data as any)?.url ||
      (typeof (data as any)?.data === 'string' ? (data as any).data : null);
    return typeof out === 'string' && out.startsWith('http') ? out : url;
  } catch {
    return url; // se la normalizzazione fallisce si tenta con l'URL pubblico
  }
}

// ── Programmazione del post ─────────────────────────────────────────────────
export interface McCreds {
  token: string;
  userId: string;
  blogId: string;
}

export interface SchedulePostInput {
  text: string;
  networks: string[]; // es. ['instagram','facebook']
  dateTimeLocal: string; // ISO senza Z, es. "2025-07-23T10:00:00"
  timezone: string; // es. "Europe/Rome"
  mediaUrl?: string;
  draft?: boolean;
}

export async function schedulePost(
  creds: McCreds,
  input: SchedulePostInput
): Promise<{ id?: string }> {
  const body: Record<string, unknown> = {
    text: input.text,
    providers: input.networks.map((n) => ({ network: n })),
    publicationDate: { dateTime: input.dateTimeLocal, timezone: input.timezone },
    autoPublish: !input.draft,
    draft: !!input.draft,
  };
  if (input.mediaUrl) {
    const norm = await normalizeMedia(creds.token, creds.userId, creds.blogId, input.mediaUrl);
    body.media = [norm];
  }
  const data = await mc<any>('/v2/scheduler/posts', {
    method: 'POST',
    token: creds.token,
    query: { userId: creds.userId, blogId: creds.blogId },
    body,
  });
  const id = (data as any)?.id ?? (data as any)?.data?.id;
  return { id: id !== undefined ? String(id) : undefined };
}

// ── Persistenza connessione per-utente (RLS, token cifrato) ─────────────────
import { userClient } from '@/lib/supabaseServer';

export interface McConnection {
  token: string;
  userId: string; // userId Metricool
  blogId: string;
  brandLabel?: string;
  networks: string[];
}

export async function saveMetricoolConnection(
  userToken: string,
  c: { token: string; mcUserId: string; blogId: string; brandLabel?: string; networks: string[] }
): Promise<void> {
  const { data } = await userClient(userToken).auth.getUser();
  const id = data?.user?.id;
  if (!id) throw new Error('Sessione non valida');
  const { error } = await userClient(userToken).from('metricool_connections').upsert({
    user_id: id,
    token_cipher: mcEncrypt(c.token),
    mc_user_id: c.mcUserId,
    blog_id: c.blogId,
    brand_label: c.brandLabel ?? null,
    networks: c.networks,
    connected_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function readMetricoolConnection(userToken: string): Promise<McConnection | null> {
  try {
    const { data: u } = await userClient(userToken).auth.getUser();
    const id = u?.user?.id;
    if (!id) return null;
    const { data, error } = await userClient(userToken)
      .from('metricool_connections')
      .select('token_cipher,mc_user_id,blog_id,brand_label,networks')
      .eq('user_id', id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      token: mcDecrypt(data.token_cipher as string),
      userId: data.mc_user_id as string,
      blogId: data.blog_id as string,
      brandLabel: (data.brand_label as string) ?? undefined,
      networks: Array.isArray(data.networks) ? (data.networks as string[]) : [],
    };
  } catch {
    return null;
  }
}

export async function deleteMetricoolConnection(userToken: string): Promise<void> {
  const { data } = await userClient(userToken).auth.getUser();
  const id = data?.user?.id;
  if (!id) return;
  await userClient(userToken).from('metricool_connections').delete().eq('user_id', id);
}
