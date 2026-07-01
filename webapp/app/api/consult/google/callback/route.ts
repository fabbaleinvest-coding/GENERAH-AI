import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabaseServer';
import { verifyState, exchangeCodeForRefreshToken, appBaseUrl } from '@/lib/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Callback OAuth Google Calendar.
//  GET /api/consult/google/callback?code=...&state=...
//    → verifica lo `state` firmato (→ id utente), scambia il code con un
//      refresh_token e lo salva sul profilo (calendar_provider='google').
//  Il callback non ha sessione utente (è un redirect di Google): l'identità
//  arriva dallo `state` firmato e la scrittura passa dalla service_role.
//  Questo è l'ESATTO redirect URI da registrare in Google Cloud Console:
//    https://<dominio-app>/api/consult/google/callback
// ─────────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const oauthErr = url.searchParams.get('error') || '';
  const back = `${appBaseUrl(req)}/dashboard?tab=video`;

  // L'utente ha negato il consenso su Google.
  if (oauthErr) return NextResponse.redirect(`${back}&google=denied`);

  const uid = verifyState(state);
  if (!uid || !code) return NextResponse.redirect(`${back}&google=error`);

  const { refreshToken } = await exchangeCodeForRefreshToken(code);
  if (!refreshToken) return NextResponse.redirect(`${back}&google=error`);

  const svc = serviceClient();
  if (!svc) return NextResponse.redirect(`${back}&google=error`);

  const { error } = await svc
    .from('profiles')
    .update({
      calendar_provider: 'google',
      google_refresh_token: refreshToken,
      google_calendar_id: 'primary',
    })
    .eq('id', uid);
  if (error) return NextResponse.redirect(`${back}&google=error`);

  return NextResponse.redirect(`${back}&google=connected`);
}
