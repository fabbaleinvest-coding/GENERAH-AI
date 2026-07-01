import crypto from 'crypto';

// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · OAuth Google Calendar (collegamento per-utente).
//
//  Due livelli distinti:
//   • L'IDENTITÀ della piattaforma verso Google = GOOGLE_CLIENT_ID/SECRET.
//     Una sola coppia per tutta la piattaforma (env var, non per-utente).
//   • L'AUTORIZZAZIONE del singolo utente = il refresh_token che Google rilascia
//     quando l'admin concede l'accesso al SUO calendario. Si salva nel DB
//     (profiles.google_refresh_token), non nelle env.
//
//  Flusso: /api/consult/google/start (redirect a Google col consenso) →
//  Google → /api/consult/google/callback (scambio code → refresh_token, salvato
//  sul profilo via service_role). Da lì lib/calendar.bookGoogle usa il refresh
//  token per creare gli eventi (video-avatar, voce e WhatsApp).
//
//  Config (env): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, e opzionale
//  GOOGLE_REDIRECT_URI (default = URL di produzione della webapp).
// ───────────────────────────────────────────────────────────────────────────

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

// Scope minimo: creare/gestire eventi sul calendario dell'utente.
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

/** True se le credenziali OAuth di piattaforma sono presenti. */
export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Redirect URI registrato in Google Cloud Console (deve combaciare ESATTAMENTE). */
export function googleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    'https://generah-ai-jeyv.vercel.app/api/consult/google/callback'
  ).trim();
}

// Base URL della webapp (per i redirect di ritorno alla dashboard).
export function appBaseUrl(req: Request): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (env) return env;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return host ? `${proto}://${host}` : '';
}

// ── State firmato (anti-CSRF + trasporto dell'id utente) ────────────────────
// Il parametro `state` di OAuth non deve contenere segreti: portiamo l'id utente
// firmato HMAC (chiave = GOOGLE_CLIENT_SECRET, server-only) con TTL di 15 minuti.
function stateSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'generah-oauth';
}

export function signState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  if (!state || !state.includes('.')) return null;
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: string; t?: number };
    if (!obj?.u) return null;
    if (Date.now() - Number(obj.t || 0) > 15 * 60 * 1000) return null; // TTL 15 min
    return String(obj.u);
  } catch {
    return null;
  }
}

/** URL del consenso Google (con access_type=offline + prompt=consent per il refresh_token). */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

/** Scambia il code di autorizzazione con un refresh_token duraturo. */
export async function exchangeCodeForRefreshToken(
  code: string,
): Promise<{ refreshToken: string | null; error?: string }> {
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok) {
      return { refreshToken: null, error: String(data?.error_description || data?.error || `Google ${res.status}`) };
    }
    return { refreshToken: data?.refresh_token || null };
  } catch (e) {
    return { refreshToken: null, error: (e as Error).message };
  }
}
