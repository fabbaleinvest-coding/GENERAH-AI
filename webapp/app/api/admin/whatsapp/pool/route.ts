import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/admin';
import { serviceClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const STATUSES = ['available', 'assigned', 'suspended'];

function svcOrNull() {
  return serviceClient();
}

// GET /api/admin/whatsapp/pool
// Elenca tutti i numeri del pool + le richieste in attesa (avviso titolare).
export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  const svc = svcOrNull();
  if (!svc) return NextResponse.json({ ok: false, configured: false, reason: 'no_service_role' });

  const { data: numbers, error } = await svc
    .from('wa_numbers')
    .select('id, e164, provider, waba_id, phone_number_id, display_name, capabilities, status, assigned_user_id, assigned_at, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { data: pending } = await svc
    .from('wa_number_requests')
    .select('user_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return NextResponse.json({ ok: true, numbers: numbers ?? [], pending: pending ?? [] });
}

interface AddBody {
  e164?: string;
  phone_number_id?: string;
  waba_id?: string;
  display_name?: string;
  capabilities?: string[];
}

// POST /api/admin/whatsapp/pool
// Aggiunge manualmente un numero GIÀ registrato su WhatsApp (pronto): richiede
// e164 + phone_number_id, entra come 'available' (assegnabile).
export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  const svc = svcOrNull();
  if (!svc) return NextResponse.json({ ok: false, configured: false, reason: 'no_service_role' });

  let body: AddBody;
  try {
    body = (await req.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const e164 = String(body.e164 || '').trim();
  const phoneNumberId = String(body.phone_number_id || '').trim();
  if (!/^\+\d{6,15}$/.test(e164)) {
    return NextResponse.json({ error: 'e164 non valido (formato +391234567890)' }, { status: 400 });
  }
  if (!phoneNumberId) {
    return NextResponse.json({ error: 'phone_number_id mancante (registra prima il numero su WhatsApp)' }, { status: 400 });
  }

  const row = {
    id: `wa_${crypto.randomUUID()}`,
    e164,
    provider: 'didww',
    waba_id: body.waba_id ? String(body.waba_id).trim() : null,
    phone_number_id: phoneNumberId,
    display_name: body.display_name ? String(body.display_name).trim() : '',
    capabilities: Array.isArray(body.capabilities) && body.capabilities.length ? body.capabilities : ['whatsapp'],
    status: 'available',
  };
  const { data, error } = await svc.from('wa_numbers').insert(row).select('id, e164, status').maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, number: data });
}

interface PatchBody {
  id?: string;
  phone_number_id?: string | null;
  waba_id?: string | null;
  display_name?: string;
  capabilities?: string[];
  status?: string;
}

// PATCH /api/admin/whatsapp/pool
// Aggiorna/attiva un numero del pool. Tipico: dopo aver registrato un DID grezzo
// su WhatsApp, impostare phone_number_id e status 'available' per renderlo
// assegnabile.
export async function PATCH(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  const svc = svcOrNull();
  if (!svc) return NextResponse.json({ ok: false, configured: false, reason: 'no_service_role' });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.phone_number_id !== undefined) patch.phone_number_id = body.phone_number_id ? String(body.phone_number_id).trim() : null;
  if (body.waba_id !== undefined) patch.waba_id = body.waba_id ? String(body.waba_id).trim() : null;
  if (body.display_name !== undefined) patch.display_name = String(body.display_name).trim();
  if (Array.isArray(body.capabilities)) patch.capabilities = body.capabilities;
  if (body.status !== undefined) {
    if (!STATUSES.includes(String(body.status))) {
      return NextResponse.json({ error: `status non valido (${STATUSES.join(', ')})` }, { status: 400 });
    }
    patch.status = String(body.status);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nessun campo da aggiornare' }, { status: 400 });
  }

  const { data, error } = await svc
    .from('wa_numbers')
    .update(patch)
    .eq('id', id)
    .select('id, e164, phone_number_id, display_name, capabilities, status')
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'numero non trovato' }, { status: 404 });
  return NextResponse.json({ ok: true, number: data });
}
