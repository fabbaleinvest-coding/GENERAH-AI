import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { higgsfieldMcpConfigured, startAuthorization } from '@/lib/higgsfieldOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Avvia la connessione Higgsfield DI PIATTAFORMA. Riservata all'admin (titolare):
// è l'account creativo condiviso della webapp, non quello del singolo utente.
// Ritorna l'URL di autorizzazione OAuth (il client lo apre in popup/redirect).

function redirectUri(req: Request): string {
  if (process.env.HIGGSFIELD_OAUTH_REDIRECT) return process.env.HIGGSFIELD_OAUTH_REDIRECT;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return `${proto}://${host}/api/higgsfield/oauth/callback`;
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason || 'forbidden' }, { status: auth.status });
  }
  if (!higgsfieldMcpConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        reason: 'service_role_missing',
        hint: 'Imposta SUPABASE_SERVICE_ROLE_KEY: la connessione di piattaforma non è per-utente e serve il service_role.',
      },
      { status: 200 }
    );
  }
  try {
    const url = await startAuthorization(redirectUri(req));
    return NextResponse.json({ configured: true, url });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message }, { status: 502 });
  }
}
