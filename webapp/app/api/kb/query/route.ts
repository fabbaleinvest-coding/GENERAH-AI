import { NextResponse } from 'next/server';
import { userClient } from '@/lib/supabaseServer';
import { embedTexts, toVectorLiteral } from '@/lib/embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · RAG — risposta ancorata alla knowledge base.
//  Embedda la domanda, recupera i chunk più simili (pgvector, RLS per-utente)
//  e fa rispondere Claude Opus 4.8 SOLO sul contesto recuperato, citando le
//  fonti. Richiede OPENAI_API_KEY (embeddings) e ANTHROPIC_API_KEY (risposta).
// ─────────────────────────────────────────────────────────────────────────

type Body = { question?: string; matchCount?: number };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const question = (body.question || '').trim();
  if (!question) return NextResponse.json({ error: 'Domanda mancante' }, { status: 400 });
  const matchCount = Math.max(1, Math.min(12, Number(body.matchCount) || 6));

  const supa = userClient(token);
  const { data: ures, error: uerr } = await supa.auth.getUser(token);
  if (uerr || !ures?.user) return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });

  // 1) embedding della domanda
  let qvec: number[][];
  try {
    qvec = await embedTexts([question]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // 2) retrieval (RLS => solo i documenti dell'utente)
  const { data: matches, error: merr } = await supa.rpc('match_kb_chunks', {
    query_embedding: toVectorLiteral(qvec[0]),
    match_count: matchCount,
  });
  if (merr) return NextResponse.json({ error: merr.message }, { status: 500 });

  const ctx = Array.isArray(matches) ? matches : [];
  if (ctx.length === 0) {
    return NextResponse.json({
      answer:
        'Non ho ancora documenti indicizzati su cui basarmi. Carica del materiale nella knowledge base e riprova.',
      sources: [],
    });
  }

  // 3) risposta ancorata al contesto con Opus 4.8
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY mancante (env)' }, { status: 500 });
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

  const context = ctx
    .map((m: any, i: number) => `[Fonte ${i + 1} · ${m.file_name}]\n${m.content}`)
    .join('\n\n---\n\n');

  const prompt = `Contesto estratto dalla knowledge base dell'azienda:\n\n${context}\n\nDomanda dell'utente: ${question}\n\nRispondi in italiano basandoti ESCLUSIVAMENTE sul contesto qui sopra. Se il contesto non contiene la risposta, dillo con onestà invece di inventare. Quando usi un'informazione, cita la fonte come [Fonte N].`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        system:
          "Sei l'assistente della knowledge base aziendale di GENERAH AI. Rispondi solo in base al contesto fornito, con precisione e senza inventare nulla. Cita sempre le fonti pertinenti.",
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) }, { status: 500 });
    }
    const answer: string = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      : '';
    const sources = ctx.map((m: any) => ({
      file_name: String(m.file_name || ''),
      snippet: String(m.content || '').slice(0, 240),
      similarity: typeof m.similarity === 'number' ? m.similarity : null,
    }));
    return NextResponse.json({ answer: answer || '(nessuna risposta)', sources });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
