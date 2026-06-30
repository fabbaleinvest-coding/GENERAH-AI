import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { listBrands, saveMetricoolConnection } from '@/lib/metricool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Collega Metricool: passo 1 (token + userId) → elenco brand; passo 2 (+ blogId)
// → salva la connessione cifrata. Protetta dalla sessione utente.

type Body = { token?: string; mcUserId?: string; blogId?: string };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const userToken = bearer(req);
  if (!userToken) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  try {
    const { data, error } = await userClient(userToken).auth.getUser();
    if (error || !data?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const token = (body.token || '').trim();
  const mcUserId = (body.mcUserId || '').trim();
  if (!token || !mcUserId) {
    return NextResponse.json({ error: 'Token API e User ID Metricool richiesti' }, { status: 400 });
  }

  let brands;
  try {
    brands = await listBrands(token, mcUserId);
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Credenziali Metricool non valide: ${(e as Error).message}` });
  }
  if (!brands.length) {
    return NextResponse.json({ ok: false, error: 'Nessun brand trovato per queste credenziali' });
  }

  const blogId = (body.blogId || '').trim();
  if (!blogId) {
    // Passo 1: restituisce i brand per la scelta
    return NextResponse.json({ ok: true, needBrand: true, brands });
  }

  const brand = brands.find((b) => b.blogId === blogId);
  if (!brand) return NextResponse.json({ ok: false, error: 'Brand non valido' }, { status: 400 });

  try {
    await saveMetricoolConnection(userToken, {
      token,
      mcUserId,
      blogId: brand.blogId,
      brandLabel: brand.label,
      networks: brand.networks,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Salvataggio non riuscito: ${(e as Error).message}` });
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    brand: { blogId: brand.blogId, label: brand.label, networks: brand.networks },
  });
}
