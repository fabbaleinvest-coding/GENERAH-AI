import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import {
  hfConfigured,
  hfSubmit,
  hfResultUrl,
  imageStep,
  clipStep,
} from '@/lib/higgsfield';
import { synthesizeVoiceover, ttsConfigured } from '@/lib/tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Avvia un singolo step della pipeline video ads su Higgsfield e ritorna il
// request_id (il client poi fa polling su /api/ads/video/status). Protetto:
// richiede una sessione utente valida per non esporre un proxy a consumo crediti.

type Body = {
  step?: 'image' | 'clip' | 'voiceover';
  prompt?: string;
  imageUrl?: string;
  text?: string;
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

  if (!hfConfigured()) {
    return NextResponse.json(
      { error: 'HIGGSFIELD non configurato (env)', configured: false },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const step = body.step;
  try {
    if (step === 'image') {
      if (!body.prompt) return NextResponse.json({ error: 'prompt mancante' }, { status: 400 });
      const s = imageStep(body.prompt);
      const r = await hfSubmit(s.endpoint, s.input);
      return NextResponse.json({ requestId: r.request_id, status: r.status, url: hfResultUrl(r) });
    }
    if (step === 'clip') {
      if (!body.prompt || !body.imageUrl) {
        return NextResponse.json({ error: 'prompt o imageUrl mancante' }, { status: 400 });
      }
      const s = clipStep(body.prompt, body.imageUrl);
      const r = await hfSubmit(s.endpoint, s.input);
      return NextResponse.json({ requestId: r.request_id, status: r.status, url: hfResultUrl(r) });
    }
    if (step === 'voiceover') {
      if (!ttsConfigured()) {
        // Nessuna OPENAI_API_KEY: si procede senza voce (trasparente).
        return NextResponse.json({ skipped: true, reason: 'TTS non configurato' });
      }
      if (!body.text) return NextResponse.json({ error: 'text mancante' }, { status: 400 });
      // OpenAI TTS è sincrono: ritorna subito un data URL mp3 (nessun polling).
      const dataUrl = await synthesizeVoiceover(body.text);
      if (!dataUrl) return NextResponse.json({ skipped: true, reason: 'TTS non configurato' });
      return NextResponse.json({ status: 'completed', url: dataUrl });
    }
    return NextResponse.json({ error: 'step non valido' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
