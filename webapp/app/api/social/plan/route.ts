import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Generatore piano editoriale social (Claude Opus 4.8).
//  Produce N post (1 a settimana) per IG/FB, coerenti col business reale:
//  attinge alla knowledge base via RAG (retrieval) e, per ciascun post,
//  restituisce hook + bullet (infografica) + caption pronta + prompt immagine
//  (Nano Banana Pro). Output JSON. Richiede ANTHROPIC_API_KEY; con token
//  Bearer aggancia il retrieval per-utente, altrimenti usa settore + nomi file.
// ─────────────────────────────────────────────────────────────────────────

type Body = { nome?: string; settore?: string; kbFiles?: string[]; count?: number };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

function parseJson(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    /* continua */
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* niente */
    }
  }
  return null;
}

function buildPrompt(
  nome: string,
  settore: string,
  kbFiles: string[],
  ragContext: string,
  count: number
): string {
  const docs = (kbFiles || []).filter(Boolean);
  const kb = ragContext
    ? `Estratti reali dalla knowledge base dell'azienda (usa prodotti, servizi, prezzi, offerta e tono REALI; non inventare dati assenti):\n\n${ragContext}`
    : docs.length
      ? `Materiali in knowledge base (solo nomi): ${docs.join(', ')}.`
      : "L'azienda non ha ancora caricato materiali: basati sul settore, resta plausibile.";

  return `Sei il miglior social media strategist e copywriter al mondo. Azienda di ${nome || 'un imprenditore'}, settore: ${settore || 'non specificato'}.
${kb}

Crea un piano editoriale di ${count} post per Instagram/Facebook, UNO a settimana, pensati per generare contatti e vendite e coerenti con il business reale qui sopra. Varia gli angoli tra i post (educativo, dietro le quinte, prova sociale, offerta con call to action). Tono adatto al settore, italiano.

Per OGNI post fornisci:
- week: "Settimana 1" ... "Settimana ${count}"
- format: formato consigliato (es. "Carosello", "Reel", "Post singolo", "Infografica")
- title: hook/titolo persuasivo e breve
- bullets: 3-4 punti chiave brevissimi per l'infografica
- caption: testo del post pronto da pubblicare (2-4 frasi + call to action chiara, con 3-5 hashtag pertinenti)
- imagePrompt: prompt in INGLESE per generare l'infografica con un modello immagini (descrivi stile, layout, palette/brand mood; immagine pulita e professionale)

Restituisci ESCLUSIVAMENTE un oggetto JSON con questa forma:
{
  "posts": [
    { "week": "Settimana 1", "format": "...", "title": "...", "bullets": ["...", "..."], "caption": "...", "imagePrompt": "..." }
  ]
}`;
}

function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY mancante (env)' }, { status: 500 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const nome = body.nome || '';
  const settore = body.settore || '';
  const kbFiles = Array.isArray(body.kbFiles) ? body.kbFiles : [];
  const count = Math.max(1, Math.min(6, Math.round(Number(body.count) || 4)));

  // RAG: profilo del business per ancorare i contenuti ai materiali reali.
  const token = bearer(req);
  const ragQuery =
    `prodotti servizi offerta prezzi punti di forza clienti tono di voce dell'azienda ${settore}`.trim();
  const ragChunks = token ? await retrieveContext(token, ragQuery, 8) : [];
  const ragContext = formatContext(ragChunks, 6000);

  const prompt = buildPrompt(nome, settore, kbFiles, ragContext, count);
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

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
        max_tokens: 2200,
        system:
          'Sei il miglior social media strategist e copywriter al mondo. Crei piani editoriali che generano contatti reali. Rispondi sempre e solo con un oggetto JSON valido, senza markdown e senza testo aggiuntivo.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) }, { status: 500 });
    }
    const text: string = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      : '';
    const parsed = parseJson(text);
    const rawPosts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    if (rawPosts.length === 0) return NextResponse.json({ error: 'Risposta AI non interpretabile' }, { status: 502 });

    const posts = rawPosts.slice(0, count).map((p: any, i: number) => ({
      week: asString(p?.week) || `Settimana ${i + 1}`,
      format: asString(p?.format) || 'Post singolo',
      title: asString(p?.title),
      bullets: Array.isArray(p?.bullets) ? p.bullets.map(asString).filter(Boolean).slice(0, 5) : [],
      caption: asString(p?.caption),
      imagePrompt: asString(p?.imagePrompt),
    }));

    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
