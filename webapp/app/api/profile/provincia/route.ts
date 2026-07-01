import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { prefixForProvincia } from '@/lib/provinces';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Provincia dell'attività (impostata in registrazione).
//  POST { provincia } → salva provincia + provincia_prefix sul profilo e
//        assegna un numero del pool preferendo il prefisso locale (WhatsApp =
//        agente vocale: è lo STESSO numero). Idempotente sull'assegnazione.
//  GET  → provincia corrente + prefisso + eventuale numero già assegnato.
//  Auth: Bearer token utente (RLS su profiles/wa_numbers).
// ─────────────────────────────────────────────────────────────────────────

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { provincia?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body vuoto → gestito sotto */
  }
  const provincia = String(body.provincia || '').trim();
  if (!provincia) {
    return NextResponse.json({ ok: false, error: 'provincia mancante' }, { status: 400 });
  }
  const prefix = prefixForProvincia(provincia);

  const sb = userClient(token);
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // Salva provincia + prefisso sul profilo (RLS: solo la propria riga).
  const { error: upErr } = await sb
    .from('profiles')
    .update({ provincia, provincia_prefix: prefix })
    .eq('id', uid);
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  // Assegna il numero preferendo il prefisso locale (best-effort: la
  // registrazione non deve fallire se il pool è momentaneamente vuoto).
  let assignment: unknown = null;
  try {
    const { data } = await sb.rpc('assign_wa_number_by_prefix', { p_prefix: prefix });
    assignment = data ?? null;
  } catch {
    /* pool vuoto o RPC non ancora migrata: la richiesta resta in attesa */
  }

  return NextResponse.json({ ok: true, provincia, prefix, assignment });
}

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const sb = userClient(token);
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { data: prof } = await sb
    .from('profiles')
    .select('provincia, provincia_prefix')
    .eq('id', uid)
    .maybeSingle();

  const { data: num } = await sb
    .from('wa_numbers')
    .select('e164, display_name, capabilities')
    .eq('assigned_user_id', uid)
    .eq('status', 'assigned')
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    provincia: prof?.provincia ?? null,
    prefix: prof?.provincia_prefix ?? null,
    number: num?.e164 ?? null,
  });
}
