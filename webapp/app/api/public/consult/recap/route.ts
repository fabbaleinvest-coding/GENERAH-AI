import { NextResponse } from 'next/server';
import { profileBySlug } from '@/lib/consult';
import { serviceClient } from '@/lib/supabaseServer';
import { retrieveContextForUser, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Recap del video-consulto pubblico (Opus 4.8 → CRM).
//  POST { slug, leadId, transcript: {role,text}[] }
//   → riassume il consulto (ancorato alla KB dell'azienda), aggiorna il lead
//     (ai_summary, progress_summary, next_action, deal_stage) + timeline.
//  Pubblico (slug + service_role). Degrada con grazia senza ANTHROPIC_API_KEY.
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { slug?: string; leadId?: string; transcript?: { role?: string; text?: string }[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'payload non valido' }, { status: 400 });
  }

  const slug = String(body.slug || '').trim();
  const leadId = String(body.leadId || '').trim();
  const turns = Array.isArray(body.transcript) ? body.transcript : [];
  if (!slug || !leadId) return NextResponse.json({ ok: false, error: 'parametri mancanti' }, { status: 400 });

  const prof = await profileBySlug(slug);
  const svc = serviceClient();
  if (!prof || !svc) return NextResponse.json({ ok: false, error: 'non disponibile' }, { status: 404 });

  const transcriptText = turns
    .map((t) => `${t.role === 'assistant' ? 'Consulente' : 'Cliente'}: ${String(t.text || '').trim()}`)
    .filter((l) => l.length > 6)
    .join('\n');

  const now = new Date().toISOString();
  if (!transcriptText || !process.env.ANTHROPIC_API_KEY) {
    // Nessun contenuto o AI non configurata: aggiorna solo la recency.
    await svc.from('leads').update({ last_interaction_at: now }).eq('id', leadId).eq('user_id', prof.id);
    return NextResponse.json({ ok: true, summarized: false });
  }

  // KB via RAG service-role per un recap ancorato alla verità dell'azienda.
  let ragContext = '';
  try {
    const chunks = await retrieveContextForUser(prof.id, (transcriptText.slice(0, 600) || String(prof.settore || '')), 6);
    ragContext = formatContext(chunks, 4000);
  } catch {
    /* fallback */
  }

  const kbBlock = ragContext ? `Estratti dalla knowledge base (verità su offerta, prezzi, tono):\n\n${ragContext}\n\n` : '';
  const prompt = `Azienda di ${prof.nome || 'un imprenditore'}, settore: ${prof.settore || 'non specificato'}.
${kbBlock}TRASCRIZIONE del video-consulto appena concluso (Cliente = il lead, Consulente = l'avatar AI dell'azienda):
${transcriptText}

Aggiorna la MEMORIA della trattativa dopo questo consulto. Rispondi SOLO con un oggetto JSON valido, senza markdown, in questo formato:
{
  "recap": "<riepilogo conciso (max 4-5 frasi): esigenze del cliente, cosa è stato proposto, obiezioni, impegni, da dove ripartire>",
  "next_action": "<prossima azione concreta da fare con questo lead>",
  "deal_stage": "<nuovo|contattato|in_conversazione|offerta_inviata|in_trattativa|appuntamento_fissato|vinto|perso>"
}`;

  let recap = '';
  let nextAction = '';
  let dealStage = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
        max_tokens: 700,
        system:
          'Sei il miglior sales manager al mondo: dopo ogni video-consulto aggiorni con precisione la memoria della trattativa nel CRM. Rispondi sempre e solo con un oggetto JSON valido, senza markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    const text: string = Array.isArray((data as any)?.content)
      ? (data as any).content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('').trim()
      : '';
    const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);
    recap = String(parsed.recap || '').trim();
    nextAction = String(parsed.next_action || '').trim();
    dealStage = String(parsed.deal_stage || '').trim();
  } catch {
    recap = 'Video-consulto concluso. Recap automatico non disponibile: rivedere la registrazione.';
  }

  const update: Record<string, unknown> = {
    ai_summary: recap,
    progress_summary: recap,
    last_interaction_at: now,
  };
  if (nextAction) update.next_action = nextAction;
  if (dealStage) update.deal_stage = dealStage;

  await svc.from('leads').update(update).eq('id', leadId).eq('user_id', prof.id);
  await svc.from('lead_events').insert({
    user_id: prof.id,
    lead_id: leadId,
    type: 'ai',
    channel: 'video',
    summary: recap.slice(0, 500) || 'Recap video-consulto',
    payload: { next_action: nextAction, deal_stage: dealStage },
  });

  return NextResponse.json({ ok: true, summarized: true, recap, next_action: nextAction, deal_stage: dealStage });
}
