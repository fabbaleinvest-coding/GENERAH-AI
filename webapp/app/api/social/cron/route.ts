import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabaseServer';
import { connectionByUserId } from '@/lib/metaOAuth';
import { publishOrganic } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Cron di pubblicazione social.
//  Pubblica i post in coda (social_posts_queue) la cui ora è arrivata, sul
//  Facebook/Instagram dell'utente proprietario. Va invocato periodicamente:
//  Vercel Cron (vercel.json) oppure un cron esterno che chiama questo URL.
//  Protetto da CRON_SECRET (Vercel Cron lo invia come Bearer).
//
//  Idempotenza: ogni post viene "reclamato" (pending→publishing) in modo
//  atomico prima di pubblicare, così tick sovrapposti non lo pubblicano due
//  volte. In caso di errore non si ritenta in automatico (per non rischiare
//  doppie pubblicazioni su una rete già andata a buon fine).
// ─────────────────────────────────────────────────────────────────────────

const BATCH = 10;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // senza segreto non si esegue (niente endpoint aperto)
  const h = req.headers.get('authorization') || '';
  const bearer = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
  const url = new URL(req.url);
  const key = url.searchParams.get('key') || '';
  return bearer === secret || key === secret;
}

async function run(): Promise<{ processed: number; published: number; failed: number }> {
  const db = serviceClient();
  if (!db) return { processed: 0, published: 0, failed: 0 };

  const nowIso = new Date().toISOString();
  const { data: due } = await db
    .from('social_posts_queue')
    .select('id,user_id,networks,caption,image_url')
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(BATCH);

  const list = Array.isArray(due) ? due : [];
  let published = 0;
  let failed = 0;
  let processed = 0;

  for (const row of list) {
    // Claim atomico: solo chi riesce a portare pending→publishing procede.
    const { data: claimed } = await db
      .from('social_posts_queue')
      .update({ status: 'publishing' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id');
    if (!Array.isArray(claimed) || claimed.length === 0) continue;
    processed++;

    const networks: string[] = Array.isArray(row.networks) ? (row.networks as string[]) : ['facebook', 'instagram'];
    const cfg = await connectionByUserId(row.user_id as string);

    if (!cfg?.pageToken) {
      await db
        .from('social_posts_queue')
        .update({
          status: 'failed',
          attempts: 1,
          results: [{ ok: false, error: 'Connessione Meta non disponibile' }],
        })
        .eq('id', row.id);
      failed++;
      continue;
    }

    const results = await publishOrganic(
      cfg,
      { caption: (row.caption as string) || '', imageUrl: (row.image_url as string) || undefined },
      networks
    );
    const okCount = results.filter((r) => r.ok).length;
    const status = okCount === results.length ? 'published' : okCount > 0 ? 'partial' : 'failed';
    await db
      .from('social_posts_queue')
      .update({
        status,
        attempts: 1,
        results,
        published_at: okCount > 0 ? new Date().toISOString() : null,
      })
      .eq('id', row.id);
    if (status === 'failed') failed++;
    else published++;
  }

  return { processed, published, failed };
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('unauthorized', { status: 401 });
  try {
    const summary = await run();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// Anche POST, per i cron esterni che usano POST.
export async function POST(req: Request) {
  return GET(req);
}
