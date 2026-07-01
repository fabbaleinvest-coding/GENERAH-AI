import { NextResponse } from 'next/server';
import { hfConfigured, hfSubmit, hfStatus, hfResultUrl, imageStep } from '@/lib/higgsfield';
import { platformStatus } from '@/lib/higgsfieldOAuth';
import { mcpGenerateImage, mcpWaitForUrl } from '@/lib/higgsfieldMcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Generazione infografica social (Higgsfield · Nano Banana Pro).
//  Dal titolo + bullet del post (prodotti da Opus) costruisce un prompt che fa
//  comporre al modello un'infografica 4:5 pulita con i punti chiave come testo.
//  Submit + polling entro il budget della serverless. Gated: senza credenziali
//  Higgsfield risponde { configured:false } e l'app resta in dimostrativo.
// ─────────────────────────────────────────────────────────────────────────

type Body = { title?: string; bullets?: string[]; caption?: string; imagePrompt?: string };

function buildPrompt(title: string, bullets: string[], imagePrompt: string): string {
  const list = bullets.filter(Boolean);
  const bulletBlock = list.length
    ? `Show these key points as a clean bulleted list, each with a small minimal icon, text in Italian EXACTLY as written:\n${list.map((b) => `• ${b}`).join('\n')}`
    : '';
  const heading = title ? `Headline at the top (Italian, exact): "${title}".` : '';
  const style =
    imagePrompt ||
    'Modern, professional brand design with a refined color palette, strong contrast and generous whitespace.';
  return [
    'Professional social-media infographic, vertical 3:4 format.',
    heading,
    bulletBlock,
    style,
    'Highly legible typography, balanced layout, premium editorial look, no watermark, no placeholder/lorem-ipsum text, render only the provided text.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: Request) {
  // Motore primario: MCP di piattaforma (Nano Banana Pro). Fallback: REST legacy.
  let useMcp = false;
  try {
    useMcp = (await platformStatus()).connected;
  } catch {
    useMcp = false;
  }
  if (!useMcp && !hfConfigured()) {
    return NextResponse.json({ ok: false, configured: false, reason: 'higgsfield_not_configured' });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const title = (body.title || '').toString().slice(0, 200);
  const bullets = Array.isArray(body.bullets) ? body.bullets.map((b) => String(b)).slice(0, 6) : [];
  const imagePrompt = (body.imagePrompt || '').toString().slice(0, 1200);
  if (!title && bullets.length === 0 && !imagePrompt) {
    return NextResponse.json({ error: 'Contenuto del post mancante' }, { status: 400 });
  }

  const prompt = buildPrompt(title, bullets, imagePrompt);

  // ── Ramo MCP: Nano Banana Pro (infografica 3:4) ───────────────────────────
  if (useMcp) {
    try {
      const g = await mcpGenerateImage(prompt, { aspect: '3:4' });
      let imageUrl = g.url;
      if (!imageUrl && g.jobId) imageUrl = await mcpWaitForUrl(g.jobId, { timeoutMs: 50000 });
      if (!imageUrl) {
        return NextResponse.json({ ok: false, configured: true, pending: true, requestId: g.jobId });
      }
      return NextResponse.json({ ok: true, configured: true, engine: 'mcp', imageUrl });
    } catch (e) {
      return NextResponse.json({ ok: false, configured: true, error: (e as Error).message });
    }
  }

  // ── Ramo REST legacy ──────────────────────────────────────────────────────
  const step = imageStep(prompt, { aspect: '3:4', resolution: '1k' });

  try {
    const submitted = await hfSubmit(step.endpoint, step.input);
    let r = submitted;
    const id = r.request_id;
    // Polling: le immagini sono rapide, ma restiamo entro ~50s.
    const deadline = Date.now() + 50_000;
    while (r.status !== 'completed' && r.status !== 'failed' && r.status !== 'nsfw') {
      if (Date.now() > deadline) break;
      await new Promise((res) => setTimeout(res, 2500));
      if (!id) break;
      r = await hfStatus(id);
    }
    if (r.status === 'nsfw') {
      return NextResponse.json({ ok: false, configured: true, error: 'Immagine bloccata dal filtro contenuti' });
    }
    if (r.status === 'failed') {
      return NextResponse.json({ ok: false, configured: true, error: 'Generazione immagine non riuscita' });
    }
    const imageUrl = hfResultUrl(r);
    if (!imageUrl) {
      return NextResponse.json({ ok: false, configured: true, pending: true, requestId: id });
    }
    return NextResponse.json({ ok: true, configured: true, imageUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, configured: true, error: (e as Error).message });
  }
}
