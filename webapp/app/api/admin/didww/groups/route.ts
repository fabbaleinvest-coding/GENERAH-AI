import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import {
  didwwConfigured,
  didwwSandbox,
  listCountries,
  listDidGroups,
  getBalance,
  DidwwError,
} from '@/lib/didww';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// GET /api/admin/didww/groups?country=IT[&type=GEOGRAPHIC]
// Elenca i DID group disponibili per il paese, con i relativi SKU (opzioni
// d'acquisto: prezzo setup/mensile, canali). Solo lettura.
export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: gate.status });
  if (!didwwConfigured()) {
    return NextResponse.json({ ok: false, configured: false, reason: 'not_configured' });
  }

  const url = new URL(req.url);
  const iso = (url.searchParams.get('country') || 'IT').toUpperCase();
  const type = url.searchParams.get('type') || undefined;

  try {
    const countries = await listCountries(iso);
    const country = countries[0] ?? null;
    if (!country) {
      return NextResponse.json({ ok: true, configured: true, sandbox: didwwSandbox(), country: null, groups: [], balance: null });
    }
    const [groups, balance] = await Promise.all([
      listDidGroups(country.id, { type }),
      getBalance(),
    ]);
    return NextResponse.json({ ok: true, configured: true, sandbox: didwwSandbox(), country, groups, balance });
  } catch (e) {
    const err = e as DidwwError;
    return NextResponse.json({ ok: false, error: err.message, detail: err.detail }, { status: err.status || 502 });
  }
}
