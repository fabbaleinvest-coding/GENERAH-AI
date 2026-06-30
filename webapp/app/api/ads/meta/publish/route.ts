import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import {
  metaConfigured,
  metaConfig,
  publishLeadCampaign,
  MetaError,
  type PublishBrief,
} from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Pubblica una campagna Lead Generation reale su Meta a partire dal brief AI +
// un video creativo. Protetta da sessione utente. Quando Meta non è configurato
// (o manca il video) risponde ok:false con un motivo, così il client può
// proseguire in modalità dimostrativa senza errori bloccanti.

type Body = {
  brief?: PublishBrief;
  videoUrl?: string;
  dailyBudgetEur?: number;
  geoText?: string;
  ageRange?: string;
  privacyUrl?: string;
  status?: 'PAUSED' | 'ACTIVE';
  customAudienceIds?: string[];
};

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

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

  if (!metaConfigured()) {
    return NextResponse.json({ ok: false, configured: false, reason: 'meta_not_configured' });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  if (!body.brief || !body.brief.campaignName) {
    return NextResponse.json({ error: 'Brief mancante' }, { status: 400 });
  }
  if (!body.videoUrl) {
    return NextResponse.json({ ok: false, configured: true, reason: 'no_video' });
  }

  const cfg = metaConfig();
  if (!cfg) {
    return NextResponse.json({ ok: false, configured: false, reason: 'meta_not_configured' });
  }

  try {
    const ids = await publishLeadCampaign(cfg, body.brief, {
      videoUrl: body.videoUrl,
      dailyBudgetEur: typeof body.dailyBudgetEur === 'number' ? body.dailyBudgetEur : 30,
      geoText: body.geoText,
      ageRange: body.ageRange,
      privacyUrl: body.privacyUrl,
      status: body.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
      customAudienceIds: body.customAudienceIds,
    });
    return NextResponse.json({ ok: true, configured: true, ids });
  } catch (e) {
    const msg = e instanceof MetaError ? e.message : 'Pubblicazione su Meta non riuscita';
    return NextResponse.json({ ok: false, configured: true, error: msg });
  }
}
