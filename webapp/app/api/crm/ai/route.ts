import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · CRM avanzato — qualifica del lead con Claude (Opus 4.8).
//  Dato un lead + il contesto del business (settore + materiali della
//  knowledge base), Claude restituisce: punteggio di conversione, sintesi,
//  prossima azione e un follow-up pronto (email + WhatsApp). Output JSON.
//  Richiede ANTHROPIC_API_KEY (env). Modello via ANTHROPIC_MODEL (default Opus 4.8).
// ─────────────────────────────────────────────────────────────────────────

type LeadIn = {
  name?: string;
  email?: string;
  phone?: string;
  channel?: string;
  interest?: string;
  status?: string;
  notes?: string;
};

type Body = {
  lead?: LeadIn;
  nome?: string;
  settore?: string;
  kbFiles?: string[];
};

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

function buildPrompt(
  lead: LeadIn,
  nome: string,
  settore: string,
  kbFiles: string[],
  ragContext: string
): string {
  const docs = (kbFiles || []).filter(Boolean);
  const kb = ragContext
    ? `Estratti pertinenti dalla knowledge base dell'azienda (usali come fonte di verità su prodotti, servizi, prezzi, offerta e tono):\n\n${ragContext}`
    : docs.length
      ? `Materiali dell'azienda (knowledge base): ${docs.join(', ')}.`
      : "L'azienda non ha ancora caricato materiali: basati sul settore.";
  return `Azienda di ${nome || 'un imprenditore'}, settore: ${settore || 'non specificato'}. ${kb}

LEAD da qualificare:
- Nome: ${lead.name || 'n/d'}
- Email: ${lead.email || 'n/d'}
- Telefono: ${lead.phone || 'n/d'}
- Canale di arrivo: ${lead.channel || 'n/d'}
- Interesse dichiarato: ${lead.interest || 'n/d'}
- Stato attuale nel CRM: ${lead.status || 'nuovo'}
- Note: ${lead.notes || 'nessuna'}

Compito: qualifica questo lead per il business indicato e prepara il follow-up più efficace.
Rispondi in italiano, con tono professionale ed empatico.

Restituisci ESCLUSIVAMENTE un oggetto JSON con questa forma:
{
  "score": <numero intero 0-100, probabilità di conversione>,
  "summary": "<2-3 frasi: chi è il lead, quanto è caldo e perché>",
  "nextAction": "<l'azione successiva più efficace, concreta e immediata>",
  "draft": {
    "emailSubject": "<oggetto email breve e persuasivo>",
    "emailBody": "<email di follow-up pronta da inviare, personalizzata sul lead e sul settore>",
    "whatsapp": "<messaggio WhatsApp breve, cordiale e diretto>"
  }
}`;
}

function parseJson(text: string): any | null {
  if (!text) return null;
  // tentativo diretto
  try {
    return JSON.parse(text);
  } catch {
    /* continua sotto */
  }
  // estrae il primo blocco { ... } anche se circondato da testo o markdown
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

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY mancante (env)' }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const lead = body.lead || {};
  const nome = body.nome || '';
  const settore = body.settore || '';
  const kbFiles = Array.isArray(body.kbFiles) ? body.kbFiles : [];

  // RAG: recupera dalla knowledge base i passaggi pertinenti a questo lead
  // (interesse + note) per ancorare qualifica e follow-up ai contenuti reali.
  const token = bearer(req);
  const ragQuery =
    [lead.interest, lead.notes, lead.name].filter(Boolean).join(' ').trim() || settore || nome;
  const ragChunks = token ? await retrieveContext(token, ragQuery, 6) : [];
  const prompt = buildPrompt(lead, nome, settore, kbFiles, formatContext(ragChunks));
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
        max_tokens: 1200,
        system:
          'Sei il miglior sales manager e copywriter al mondo: qualifichi i lead e scrivi follow-up che convertono. Rispondi sempre e solo con un oggetto JSON valido, senza markdown e senza testo aggiuntivo.',
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
    if (!parsed) return NextResponse.json({ error: 'Risposta AI non interpretabile' }, { status: 502 });

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const draft =
      parsed.draft && typeof parsed.draft === 'object'
        ? {
            emailSubject: String(parsed.draft.emailSubject || ''),
            emailBody: String(parsed.draft.emailBody || ''),
            whatsapp: String(parsed.draft.whatsapp || ''),
          }
        : null;

    return NextResponse.json({
      score,
      summary: String(parsed.summary || ''),
      nextAction: String(parsed.nextAction || ''),
      draft,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
