import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

// ─────────────────────────────────────────────────────────────────────────
//  Assegna all'utente un numero WhatsApp libero del pool (idempotente).
//  Da chiamare all'acquisto/attivazione di un pacchetto. Se non ci sono numeri
//  liberi restituisce { assigned:false, reason:'no_numbers' } così l'admin può
//  rifornire il pool (comprando su DIDWW + registrando su WhatsApp).
// ─────────────────────────────────────────────────────────────────────────

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const tok = bearer(req);
  if (!tok) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });

  const client = userClient(tok);
  const { data: auth, error: authErr } = await client.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });

  const { data, error } = await client.rpc('assign_wa_number');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'Profilo non disponibile' }, { status: 404 });

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
}
