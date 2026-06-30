import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { didwwConfigured, didwwSandbox, createOrder, DidwwError } from '@/lib/didww';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface OrderBody {
  sku_id?: string;
  qty?: number;
  confirm?: boolean;
}

// POST /api/admin/didww/order  { sku_id, qty, confirm:true }
// Crea un ordine DIDWW per `qty` numeri dello SKU indicato.
// ⚠️ Addebito reale sul conto DIDWW (in produzione). Richiede confirm:true.
// Il provisioning è asincrono: dopo l'ordine usare /api/admin/didww/sync per
// importare i numeri nel pool.
export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  if (!didwwConfigured()) {
    return NextResponse.json({ ok: false, configured: false, reason: 'not_configured' });
  }

  let body: OrderBody;
  try {
    body = (await req.json()) as OrderBody;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const skuId = String(body.sku_id || '').trim();
  const qty = Number(body.qty || 0);
  if (!skuId) return NextResponse.json({ error: 'sku_id mancante' }, { status: 400 });
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    return NextResponse.json({ error: 'qty deve essere un intero tra 1 e 10' }, { status: 400 });
  }
  if (body.confirm !== true) {
    // Salvaguardia anti fat-finger: l'ordine costa denaro reale.
    return NextResponse.json(
      { ok: false, needConfirm: true, reason: 'confirm_required', sandbox: didwwSandbox() },
      { status: 409 },
    );
  }

  try {
    const order = await createOrder(skuId, qty);
    return NextResponse.json({ ok: true, sandbox: didwwSandbox(), order });
  } catch (e) {
    const err = e as DidwwError;
    return NextResponse.json({ ok: false, error: err.message, detail: err.detail }, { status: err.status || 502 });
  }
}
