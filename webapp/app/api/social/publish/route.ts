import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { userClient } from '@/lib/supabaseServer';
import { resolveMetaConfig } from '@/lib/metaOAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Programmazione post organici (Graph diretto).
//  Mette in coda i post (social_posts_queue); il cron /api/social/cron li
//  pubblica all'orario previsto sul Facebook/Instagram dell'utente, usando la
//  connessione Meta già stabilita (OAuth). Gated: senza token di pagina
//  risponde { configured:false } e il client ricade su Metricool/demo.
// ─────────────────────────────────────────────────────────────────────────

type PostIn = { caption?: string; imageUrl?: string; scheduledAt?: string; networks?: string[] };
type Body = { posts?: PostIn[] };

const ALLOWED = new Set(['facebook', 'instagram']);

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const userToken = bearer(req);
  if (!userToken) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });

  let userId: string;
  try {
    const { data, error } = await userClient(userToken).auth.getUser();
    if (error || !data?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }

  // Serve il token della pagina per pubblicare organicamente.
  const cfg = await resolveMetaConfig(userToken);
  if (!cfg?.pageToken) {
    return NextResponse.json({ ok: false, configured: false, reason: 'meta_not_connected' });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const posts = Array.isArray(body.posts) ? body.posts : [];
  if (!posts.length) return NextResponse.json({ error: 'Nessun post da programmare' }, { status: 400 });

  const rows = posts
    .map((p) => {
      const caption = (p.caption || '').toString();
      const when = p.scheduledAt ? new Date(p.scheduledAt) : new Date();
      const networks = (Array.isArray(p.networks) ? p.networks : ['facebook', 'instagram'])
        .map((n) => String(n).toLowerCase())
        .filter((n) => ALLOWED.has(n));
      if (!caption.trim() && !p.imageUrl) return null;
      if (!networks.length) return null;
      return {
        id: `sp_${crypto.randomUUID()}`,
        user_id: userId,
        networks,
        caption,
        image_url: p.imageUrl || null,
        scheduled_at: isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
        status: 'pending',
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  if (!rows.length) return NextResponse.json({ error: 'Post non validi' }, { status: 400 });

  const { error } = await userClient(userToken).from('social_posts_queue').insert(rows);
  if (error) {
    return NextResponse.json({ ok: false, configured: true, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, configured: true, queued: rows.length });
}
