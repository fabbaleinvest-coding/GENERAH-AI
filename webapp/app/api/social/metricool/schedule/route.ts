import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { readMetricoolConnection, schedulePost } from '@/lib/metricool';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Programma N post su Metricool con le credenziali per-utente. Ogni post:
// { text, dateTimeLocal, mediaUrl? }. Le reti vengono dal brand collegato
// (eventualmente filtrate a Instagram/Facebook). Protetta.

type PostIn = { text?: string; dateTimeLocal?: string; mediaUrl?: string };
type Body = { posts?: PostIn[]; timezone?: string; networks?: string[] };

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

  const conn = await readMetricoolConnection(userToken);
  if (!conn) return NextResponse.json({ ok: false, configured: false, reason: 'metricool_not_connected' });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const posts = Array.isArray(body.posts) ? body.posts : [];
  if (!posts.length) return NextResponse.json({ error: 'Nessun post da programmare' }, { status: 400 });

  const timezone = body.timezone || process.env.METRICOOL_TIMEZONE || 'Europe/Rome';
  // Reti: quelle richieste, intersecate con quelle del brand; fallback al brand,
  // o a Instagram+Facebook se il brand non le espone.
  const want = (body.networks && body.networks.length ? body.networks : ['instagram', 'facebook']).map((n) =>
    n.toLowerCase()
  );
  const brandNets = conn.networks.map((n) => n.toLowerCase());
  let networks = brandNets.length ? want.filter((n) => brandNets.includes(n)) : want;
  if (!networks.length) networks = brandNets.length ? brandNets : want;

  const creds = { token: conn.token, userId: conn.userId, blogId: conn.blogId };
  const results: Array<{ ok: boolean; id?: string; error?: string }> = [];
  for (const p of posts) {
    const text = (p.text || '').toString().trim();
    const dateTimeLocal = (p.dateTimeLocal || '').toString();
    if (!text || !dateTimeLocal) {
      results.push({ ok: false, error: 'Testo o data mancanti' });
      continue;
    }
    try {
      const r = await schedulePost(creds, {
        text,
        networks,
        dateTimeLocal,
        timezone,
        mediaUrl: p.mediaUrl || undefined,
      });
      results.push({ ok: true, id: r.id });
    } catch (e) {
      results.push({ ok: false, error: (e as Error).message });
    }
  }

  const scheduled = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: scheduled > 0, configured: true, scheduled, networks, results });
}
