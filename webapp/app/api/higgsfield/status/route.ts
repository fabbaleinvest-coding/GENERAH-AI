import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { platformStatus, disconnect } from '@/lib/higgsfieldOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stato della connessione Higgsfield di piattaforma (senza esporre alcun token).
// DELETE scollega. Entrambe riservate all'admin.

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'forbidden' }, { status: auth.status });
  try {
    return NextResponse.json(await platformStatus());
  } catch (e) {
    return NextResponse.json({ connected: false, error: (e as Error).message });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'forbidden' }, { status: auth.status });
  try {
    await disconnect();
    return NextResponse.json({ ok: true, connected: false });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
