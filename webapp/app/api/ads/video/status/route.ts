import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { hfConfigured, hfStatus, hfResultUrl } from '@/lib/higgsfield';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Polling dello stato di un job Higgsfield. Il client chiama questa route a
// intervalli finché status = completed | failed | nsfw. Protetto da sessione.

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  try {
    const { data, error } = await userClient(token).auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }

  if (!hfConfigured()) {
    return NextResponse.json(
      { error: 'HIGGSFIELD non configurato (env)', configured: false },
      { status: 503 }
    );
  }

  const id = new URL(req.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 });

  try {
    const r = await hfStatus(id);
    return NextResponse.json({ status: r.status, url: hfResultUrl(r) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
