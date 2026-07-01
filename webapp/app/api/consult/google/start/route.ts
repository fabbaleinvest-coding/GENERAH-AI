import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { googleConfigured, buildAuthUrl, signState, appBaseUrl } from '@/lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Avvio collegamento Google Calendar.
//  GET /api/consult/google/start?token=<supabase_access_token>
//    → verifica l'utente, firma il suo id nello `state`, e reindirizza al
//      consenso Google (access_type=offline per ottenere il refresh_token).
//  Il flusso OAuth è una navigazione del browser: l'access token dell'utente
//  arriva come query param (breve durata, HTTPS) e NON viene inoltrato a Google:
//  a Google va solo lo `state` firmato HMAC.
// ─────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const back = `${appBaseUrl(req)}/dashboard?tab=video`;

  if (!googleConfigured()) {
    return NextResponse.redirect(`${back}&google=unavailable`);
  }
  if (!token) {
    return NextResponse.redirect(`${back}&google=noauth`);
  }

  const sb = userClient(token);
  const { data: u } = await sb.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) {
    return NextResponse.redirect(`${back}&google=noauth`);
  }

  const state = signState(uid);
  return NextResponse.redirect(buildAuthUrl(state));
}
