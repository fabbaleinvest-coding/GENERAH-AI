import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Consumo meter autorevole (lato server).
//  Decrementa atomicamente il contatore dell'utente autenticato tramite la
//  funzione DB consume_meter (lock di riga + soglia 10% nel database). Il client
//  riconcilia lo stato locale con la risposta. Non si fida del client per il
//  valore: il server calcola `used` dal DB e fa il cap a `total`.
// ─────────────────────────────────────────────────────────────────────────

const METERS = new Set(['phone', 'video', 'whatsapp', 'ads']);

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });

  let body: { meter?: string; amount?: number };
  try {
    body = (await req.json()) as { meter?: string; amount?: number };
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const meter = String(body.meter || '');
  const amount = Number(body.amount);
  if (!METERS.has(meter)) return NextResponse.json({ error: 'Meter non valido' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Quantità non valida' }, { status: 400 });
  }

  const client = userClient(token);
  // Verifica sessione (auth.uid() dentro la funzione si basa sullo stesso JWT).
  const { data: auth, error: authErr } = await client.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });

  const { data, error } = await client.rpc('consume_meter', { p_meter: meter, p_amount: amount });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'Profilo non disponibile' }, { status: 404 });

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
}
