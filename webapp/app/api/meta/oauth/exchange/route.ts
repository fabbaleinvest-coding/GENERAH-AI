import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { metaAppConfigured, verifyState, completeOAuth, oauthRedirectUri } from '@/lib/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Riceve dal client il `code` ottenuto dal popup OAuth e completa la connessione
// lato server come l'utente autenticato: code → token → long-lived → scoperta
// ad account + pagina → salvataggio cifrato. Protetta da sessione utente.

type Body = { code?: string; state?: string };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
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
    return NextResponse.json({ ok: false, reason: 'meta_app_not_configured' });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  if (!body.code) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 });
  if (!body.state || !verifyState(body.state)) {
    return NextResponse.json({ error: 'Stato OAuth non valido o scaduto' }, { status: 400 });
  }

  try {
    const connection = await completeOAuth(token, body.code, oauthRedirectUri(req));
    return NextResponse.json({ ok: true, connection });
  } catch (e) {
    const msg = (e as Error).message || 'Connessione a Meta non riuscita';
    const hint = /relation|table|schema|meta_connections/i.test(msg)
      ? 'Tabella meta_connections assente: esegui la migrazione SQL su Supabase.'
      : undefined;
    return NextResponse.json({ ok: false, error: msg, hint });
  }
}
