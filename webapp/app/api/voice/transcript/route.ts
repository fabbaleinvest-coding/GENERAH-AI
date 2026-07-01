import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabaseServer';
import { finalizeCallMemory, type TranscriptTurn } from '@/lib/callMemory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Offload trascrizione chiamata → riassunto → CRM.
//
//  Percorso alternativo all'osservazione in-app (waitUntil): un worker esterno
//  long-running può raccogliere la trascrizione dal sideband WS e POST-arla qui
//  a fine chiamata; noi riassumiamo con Opus e aggiorniamo la memoria del lead.
//  Utile per chiamate oltre il limite serverless o per test manuale.
//
//  Auth: header  x-voice-secret == VOICE_OBSERVER_SECRET.
//  Body: { ownerId, transcript:[{role,text}], leadId?, fromE164? }
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const secret = process.env.VOICE_OBSERVER_SECRET;
  if (!secret || req.headers.get('x-voice-secret') !== secret) {
    return NextResponse.json({ error: 'non autorizzato' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body non valido' }, { status: 400 });
  }

  const svc = serviceClient();
  if (!svc) return NextResponse.json({ error: 'service role assente' }, { status: 500 });

  const ownerId = String(body?.ownerId || '');
  const transcript: TranscriptTurn[] = Array.isArray(body?.transcript)
    ? (body.transcript as any[]).map((t) => ({
        role: t?.role === 'assistant' ? 'assistant' : 'user',
        text: String(t?.text || ''),
      }))
    : [];
  if (!ownerId || !transcript.length) {
    return NextResponse.json({ error: 'ownerId e transcript sono richiesti' }, { status: 400 });
  }

  const out = await finalizeCallMemory(svc, {
    ownerId,
    callerLeadId: body?.leadId ? String(body.leadId) : null,
    fromE164: body?.fromE164 ? String(body.fromE164) : null,
    transcript,
  });
  return NextResponse.json({ ok: !!out, ...(out || {}) });
}
