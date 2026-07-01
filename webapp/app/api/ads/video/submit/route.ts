import { NextResponse } from 'next/server';
import { requireEntitledUser } from '@/lib/entitlement';
import { platformStatus } from '@/lib/higgsfieldOAuth';
import {
  mcpGenerateImage,
  mcpGenerateVideo,
  mcpGenerateVoiceover,
  mcpWaitForUrl,
} from '@/lib/higgsfieldMcp';
import { hfConfigured, hfSubmit, hfResultUrl, imageStep, clipStep } from '@/lib/higgsfield';
import { synthesizeVoiceover, ttsConfigured } from '@/lib/tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Avvia uno step della pipeline video ADS. MOTORE PRIMARIO = client MCP Higgsfield
// di PIATTAFORMA (Nano Banana Pro · Kling 3.0 Turbo · ElevenLabs "Roman"): un
// solo account, condiviso da tutti gli utenti a piano. Se la piattaforma non è
// ancora connessa, si ricade con grazia sull'adapter REST legacy + OpenAI TTS.
// Protetto: utente autenticato con piano (consuma i crediti della piattaforma).

type Body = {
  step?: 'image' | 'clip' | 'voiceover';
  prompt?: string;
  imageUrl?: string;
  text?: string;
};

export async function POST(req: Request) {
  const auth = await requireEntitledUser(req);
  if (!auth.ok) {
    const msg =
      auth.reason === 'paid_plan_required'
        ? 'Serve un piano attivo per usare il motore creativo.'
        : 'Autenticazione richiesta';
    return NextResponse.json({ error: msg, reason: auth.reason }, { status: auth.status });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }
  const step = body.step;

  // Motore: MCP di piattaforma se connesso, altrimenti REST legacy.
  let useMcp = false;
  try {
    useMcp = (await platformStatus()).connected;
  } catch {
    useMcp = false;
  }

  try {
    // ── MOTORE MCP (piattaforma) ────────────────────────────────────────────
    if (useMcp) {
      if (step === 'image') {
        if (!body.prompt) return NextResponse.json({ error: 'prompt mancante' }, { status: 400 });
        const r = await mcpGenerateImage(body.prompt);
        return NextResponse.json({ engine: 'mcp', requestId: r.jobId, status: r.status, url: r.url });
      }
      if (step === 'clip') {
        if (!body.prompt || !body.imageUrl) {
          return NextResponse.json({ error: 'prompt o imageUrl mancante' }, { status: 400 });
        }
        const r = await mcpGenerateVideo(body.prompt, body.imageUrl);
        return NextResponse.json({ engine: 'mcp', requestId: r.jobId, status: r.status, url: r.url });
      }
      if (step === 'voiceover') {
        if (!body.text) return NextResponse.json({ error: 'text mancante' }, { status: 400 });
        const r = await mcpGenerateVoiceover(body.text);
        let url = r.url;
        if (!url && r.jobId) url = await mcpWaitForUrl(r.jobId); // il voiceover serve subito nel montaggio
        if (!url) return NextResponse.json({ skipped: true, reason: 'voiceover non pronto' });
        return NextResponse.json({ engine: 'mcp', status: 'completed', url });
      }
      return NextResponse.json({ error: 'step non valido' }, { status: 400 });
    }

    // ── FALLBACK REST legacy (se la piattaforma non è connessa) ──────────────
    if (!hfConfigured() && step !== 'voiceover') {
      return NextResponse.json(
        { error: 'Motore creativo non disponibile: collega Higgsfield (MCP) dall’area admin o configura il REST.', configured: false },
        { status: 503 }
      );
    }
    if (step === 'image') {
      if (!body.prompt) return NextResponse.json({ error: 'prompt mancante' }, { status: 400 });
      const s = imageStep(body.prompt);
      const r = await hfSubmit(s.endpoint, s.input);
      return NextResponse.json({ engine: 'rest', requestId: r.request_id, status: r.status, url: hfResultUrl(r) });
    }
    if (step === 'clip') {
      if (!body.prompt || !body.imageUrl) {
        return NextResponse.json({ error: 'prompt o imageUrl mancante' }, { status: 400 });
      }
      const s = clipStep(body.prompt, body.imageUrl);
      const r = await hfSubmit(s.endpoint, s.input);
      return NextResponse.json({ engine: 'rest', requestId: r.request_id, status: r.status, url: hfResultUrl(r) });
    }
    if (step === 'voiceover') {
      if (!ttsConfigured()) return NextResponse.json({ skipped: true, reason: 'TTS non configurato' });
      if (!body.text) return NextResponse.json({ error: 'text mancante' }, { status: 400 });
      const dataUrl = await synthesizeVoiceover(body.text);
      if (!dataUrl) return NextResponse.json({ skipped: true, reason: 'TTS non configurato' });
      return NextResponse.json({ engine: 'rest', status: 'completed', url: dataUrl });
    }
    return NextResponse.json({ error: 'step non valido' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
