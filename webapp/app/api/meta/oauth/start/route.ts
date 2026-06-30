import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { metaAppConfigured, oauthLoginUrl, signState, oauthRedirectUri } from '@/lib/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Restituisce l'URL del dialog OAuth di Facebook (state firmato). Il client lo
// apre in un popup. Protetta: richiede una sessione utente.

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  try {
    const { data, error } = await userClient(token).auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }

  if (!metaAppConfigured()) {
    return NextResponse.json({ configured: false, reason: 'meta_app_not_configured' });
  }

  const url = oauthLoginUrl(oauthRedirectUri(req), signState());
  return NextResponse.json({ configured: true, url });
}
