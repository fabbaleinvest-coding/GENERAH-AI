import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · CRM avanzato — classificatore di settore (Claude Opus 4.8).
//  Legge la knowledge base dell'azienda (RAG) + il settore dichiarato e
//  deduce: il "settore operativo" (clinica/veterinaria/odontoiatra/
//  prodotti_servizi/altro) e l'obiettivo dell'automazione (fissare un
//  appuntamento ↔ inviare un'offerta e chiudere). Guida il motore CRM.
//  Output JSON. Richiede ANTHROPIC_API_KEY (env).
// ─────────────────────────────────────────────────────────────────────────

type Body = {
  nome?: string;
  settore?: string;
  kbFiles?: string[];
};

const SECTORS = ['clinica', 'veterinaria', 'odontoiatra', 'prodotti_servizi', 'altro'] as const;
const GOALS = ['appuntamento', 'offerta_chiusura'] as const;

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

function parseJson(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    /* sotto */
  }
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) {
    try {
      return JSON.parse(text.slice(s, e + 1));
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

  const nome = body.nome || '';
  const settore = body.settore || '';
  const kbFiles = Array.isArray(body.kbFiles) ? body.kbFiles : [];

  const token = bearer(req);
  const ragQuery =
    `${settore} attività servizi prodotti clienti pazienti offerta prezzi prenotazione appuntamento`.trim();
  const chunks = token ? await retrieveContext(token, ragQuery, 8) : [];
  const ctx = formatContext(chunks);

  const kb = ctx
    ? `Estratti dalla knowledge base dell'azienda (fonte di verità):\n\n${ctx}`
    : kbFiles.length
      ? `Materiali caricati (solo nomi file): ${kbFiles.join(', ')}.`
      : 'Nessun materiale caricato: basati solo sul settore dichiarato.';

  const prompt = `Azienda di ${nome || 'un imprenditore'}. Settore dichiarato: "${settore || 'non specificato'}".
${kb}

Compito: classifica il business per guidare un CRM autonomo.

1) "sectorKind" — scegli UNO tra: ${SECTORS.join(', ')}.
   • clinica = studio/clinica medica (poliambulatori, estetica medica, fisioterapia…)
   • veterinaria = cliniche e ambulatori per animali
   • odontoiatra = studi dentistici / implantologia
   • prodotti_servizi = e-commerce, negozi, agenzie, professionisti, B2B/B2C che vendono prodotti o servizi
   • altro = se nessuna delle precedenti calza
2) "automationGoal" — scegli UNO tra: ${GOALS.join(', ')}.
   • appuntamento = l'obiettivo naturale è far prenotare una visita/consulenza (tipico di cliniche, veterinari, odontoiatri, servizi su prenotazione)
   • offerta_chiusura = l'obiettivo è inviare un'offerta dettagliata e chiudere la vendita (tipico di prodotti, e-commerce, B2B)
3) "rationale" — una frase che spiega la scelta.

Rispondi ESCLUSIVAMENTE con JSON:
{"sectorKind":"<...>","automationGoal":"<...>","rationale":"<...>"}`;

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
        max_tokens: 400,
        system:
          'Sei un analista di business. Classifichi aziende in modo netto per guidare un CRM autonomo. Rispondi sempre e solo con un oggetto JSON valido, senza markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
      return NextResponse.json(
        { error: typeof msg === 'string' ? msg : JSON.stringify(msg) },
        { status: 500 }
      );
    }
    const text: string = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      : '';
    const parsed = parseJson(text);
    if (!parsed) return NextResponse.json({ error: 'Risposta AI non interpretabile' }, { status: 502 });

    const sectorKind = (SECTORS as readonly string[]).includes(parsed.sectorKind)
      ? parsed.sectorKind
      : 'altro';
    const automationGoal = (GOALS as readonly string[]).includes(parsed.automationGoal)
      ? parsed.automationGoal
      : sectorKind === 'prodotti_servizi' || sectorKind === 'altro'
        ? 'offerta_chiusura'
        : 'appuntamento';

    return NextResponse.json({
      sectorKind,
      automationGoal,
      rationale: String(parsed.rationale || ''),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
