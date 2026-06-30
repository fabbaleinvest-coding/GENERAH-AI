import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Proxy media *same-origin* per i risultati Higgsfield (CloudFront/S3), che sono
// cross-origin: il browser non può farne `fetch` per via del CORS, quindi
// ffmpeg.wasm non riuscirebbe a leggerli. Questa route li ri-serve dalla stessa
// origine. È protetta da sessione utente (Bearer o ?t=) per non esporre un proxy
// aperto, e ha una whitelist di host per evitare SSRF.

const ALLOWED_SUFFIXES = ['.cloudfront.net', '.higgsfield.ai', '.amazonaws.com'];

function tokenFrom(req: Request, url: URL): string {
  const h = req.headers.get('authorization') || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim();
  return url.searchParams.get('t') || '';
}

function hostAllowed(target: URL): boolean {
  if (target.protocol !== 'https:') return false;
  const host = target.hostname.toLowerCase();
  if (ALLOWED_SUFFIXES.some((s) => host.endsWith(s))) return true;
  try {
    const base = new URL(process.env.HIGGSFIELD_BASE_URL || 'https://platform.higgsfield.ai');
    if (host === base.hostname.toLowerCase()) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const token = tokenFrom(req, url);
  if (!token) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  try {
    const { data, error } = await userClient(token).auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }

  const raw = url.searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Parametro url mancante' }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'url non valido' }, { status: 400 });
  }
  if (!hostAllowed(target)) {
    return NextResponse.json({ error: 'Host non consentito' }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { headers: { Accept: '*/*' }, cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'Fetch upstream fallito' }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
  }

  // Bufferizzo (i clip sono di pochi MB): più robusto dello streaming tra runtime.
  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') || 'application/octet-stream');
  headers.set('content-length', String(bytes.byteLength));
  headers.set('cache-control', 'private, max-age=600');
  return new Response(bytes, { status: 200, headers });
}
