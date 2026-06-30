import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { connectionStatus, disconnect } from '@/lib/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stato della connessione Meta dell'utente (senza esporre i token). DELETE scollega.

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

async function requireUser(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  try {
    const { data, error } = await userClient(token).auth.getUser();
    if (error || !data?.user) return null;
    return token;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const token = await requireUser(req);
  if (!token) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  const status = await connectionStatus(token);
  return NextResponse.json(status);
}

export async function DELETE(req: Request) {
  const token = await requireUser(req);
  if (!token) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  await disconnect(token);
  return NextResponse.json({ ok: true, connected: false });
}
