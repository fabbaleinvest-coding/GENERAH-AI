import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { readMetricoolConnection, deleteMetricoolConnection } from '@/lib/metricool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

async function requireUser(req: Request): Promise<string | null> {
  const t = bearer(req);
  if (!t) return null;
  try {
    const { data, error } = await userClient(t).auth.getUser();
    if (error || !data?.user) return null;
    return t;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const t = await requireUser(req);
  if (!t) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const conn = await readMetricoolConnection(t);
  if (!conn) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    blogId: conn.blogId,
    brandLabel: conn.brandLabel,
    networks: conn.networks,
  });
}

export async function DELETE(req: Request) {
  const t = await requireUser(req);
  if (!t) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  await deleteMetricoolConnection(t);
  return NextResponse.json({ ok: true, connected: false });
}
