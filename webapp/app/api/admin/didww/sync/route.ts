import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { serviceClient } from '@/lib/supabaseServer';
import { didwwConfigured, listDids, DidwwError } from '@/lib/didww';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/admin/didww/sync
// Allinea l'inventario: legge i DID posseduti su DIDWW (GET /dids) e inserisce
// quelli mancanti nel pool `wa_numbers` con stato 'suspended' = grezzo, in
// inventario ma NON ancora assegnabile (manca la registrazione WhatsApp).
// L'admin poi registra il numero su Meta, imposta phone_number_id e lo attiva
// (status 'available') dalla pagina admin.
export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  if (!didwwConfigured()) {
    return NextResponse.json({ ok: false, configured: false, reason: 'not_configured' });
  }
  const svc = serviceClient();
  if (!svc) {
    return NextResponse.json({ ok: false, configured: false, reason: 'no_service_role' });
  }

  try {
    const dids = await listDids({ pageSize: 200 });
    const { data: existing } = await svc.from('wa_numbers').select('e164');
    const have = new Set((existing ?? []).map((r: { e164: string }) => r.e164));

    const rows = dids
      .filter((d) => d.e164 && !have.has(d.e164))
      .map((d) => ({
        id: `didww_${d.id}`,
        e164: d.e164,
        provider: 'didww',
        status: 'suspended', // grezzo: non assegnabile finché non registrato su WhatsApp
        capabilities: ['voice'],
        display_name: '',
        phone_number_id: null,
      }));

    let inserted = 0;
    if (rows.length) {
      const { data, error } = await svc
        .from('wa_numbers')
        .upsert(rows, { onConflict: 'e164', ignoreDuplicates: true })
        .select('id');
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      inserted = Array.isArray(data) ? data.length : 0;
    }

    return NextResponse.json({
      ok: true,
      total: dids.length,
      inserted,
      skipped: dids.length - inserted,
    });
  } catch (e) {
    const err = e as DidwwError;
    return NextResponse.json({ ok: false, error: err.message, detail: err.detail }, { status: err.status || 502 });
  }
}
