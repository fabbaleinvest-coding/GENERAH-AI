import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { buildLookalikeAudience, MetaError } from '@/lib/meta';
import { resolveMetaConfig } from '@/lib/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Crea una Custom Audience da lista clienti (utenti GIÀ hashati SHA-256 lato
// browser: qui non transita PII in chiaro) e da essa una Lookalike. Restituisce
// l'id della lookalike da usare nel targeting della campagna. Protetta.

type Body = {
  schema?: string[];
  data?: string[][];
  country?: string;
  ratio?: number;
  label?: string;
};

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

const HEX64 = /^[a-f0-9]{64}$/;

export async function POST(req: Request) {
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

  const cfg = await resolveMetaConfig(token);
  if (!cfg) {
    return NextResponse.json({ ok: false, configured: false, reason: 'meta_not_configured' });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const schema = Array.isArray(body.schema) ? body.schema : [];
  const data = Array.isArray(body.data) ? body.data : [];
  if (!schema.length || !data.length) {
    return NextResponse.json({ error: 'Lista contatti mancante' }, { status: 400 });
  }
  // Difesa: accetta solo valori hash (esadecimali) o vuoti — mai PII in chiaro.
  const clean = data.every(
    (row) => Array.isArray(row) && row.length === schema.length && row.every((v) => v === '' || HEX64.test(v))
  );
  if (!clean) {
    return NextResponse.json({ error: 'Formato non valido: attesi solo hash SHA-256' }, { status: 400 });
  }

  try {
    const result = await buildLookalikeAudience(cfg, {
      schema,
      data,
      label: body.label,
      country: body.country || 'IT',
      ratio: typeof body.ratio === 'number' ? body.ratio : undefined,
    });
    return NextResponse.json({ ok: true, configured: true, ...result });
  } catch (e) {
    const msg = e instanceof MetaError ? e.message : 'Creazione audience non riuscita';
    return NextResponse.json({ ok: false, configured: true, error: msg });
  }
}
