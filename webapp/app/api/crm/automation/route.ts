import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · CRM avanzato — motore di automazione (Claude Opus 4.8).
//  Dato un lead + il settore operativo + l'obiettivo + la knowledge base (RAG),
//  Claude decide la PROSSIMA azione migliore e scrive il messaggio pronto sul
//  canale giusto, con logica per-settore:
//    • clinica / veterinaria / odontoiatra  → persuasione → fissare appuntamento
//    • prodotti_servizi / altro             → offerta dettagliata → chiusura
//  Output JSON. Richiede ANTHROPIC_API_KEY (env).
// ─────────────────────────────────────────────────────────────────────────

type LeadIn = {
  name?: string;
  email?: string;
  phone?: string;
  channel?: string;
  interest?: string;
  status?: string;
  notes?: string;
  tags?: string[];
};

type Body = {
  lead?: LeadIn;
  nome?: string;
  settore?: string;
  sectorKind?: string;
  automationGoal?: string;
  autonomy?: string; // 'auto' | 'approva'
  kbFiles?: string[];
};

const AUTOMATIONS = ['first_touch', 'followup', 'book_appointment', 'send_offer', 'nurture'] as const;

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

function buildPrompt(b: Body, ctx: string): string {
  const lead = b.lead || {};
  const goal = b.automationGoal === 'offerta_chiusura' ? 'offerta_chiusura' : 'appuntamento';
  const sector = b.sectorKind || 'altro';
  const kb = ctx
    ? `Estratti pertinenti dalla knowledge base (usali come fonte di verità su offerta, prezzi, servizi, tono):\n\n${ctx}`
    : (b.kbFiles || []).length
      ? `Materiali dell'azienda (solo nomi file): ${(b.kbFiles || []).join(', ')}.`
      : "Nessun materiale: basati sul settore.";

  const playbook =
    goal === 'appuntamento'
      ? `OBIETTIVO: portare il lead a FISSARE UN APPUNTAMENTO (visita/consulenza).
Strategia per settore "${sector}": costruisci fiducia e urgenza gentile, rispondi al bisogno emerso, proponi 1-2 slot concreti e invita a confermare. Niente prezzi se non richiesti; il valore è la visita.`
      : `OBIETTIVO: inviare un'OFFERTA DETTAGLIATA e portare alla CHIUSURA.
Strategia per settore "${sector}": presenta la soluzione su misura, evidenzia benefici e prova sociale, includi un'offerta chiara (con leva/limite temporale se sensato) e una call-to-action diretta all'acquisto.`;

  return `Azienda di ${b.nome || "un'impresa"}, settore: ${b.settore || 'n/d'} (operativo: ${sector}). ${kb}

LEAD:
- Nome: ${lead.name || 'n/d'}
- Email: ${lead.email || 'n/d'} | Telefono: ${lead.phone || 'n/d'}
- Canale di arrivo: ${lead.channel || 'n/d'}
- Interesse: ${lead.interest || 'n/d'}
- Stato CRM: ${lead.status || 'nuovo'}
- Note: ${lead.notes || 'nessuna'}

${playbook}

Decidi la PROSSIMA azione migliore e scrivi il messaggio pronto da inviare, persuasivo ed empatico, in italiano, personalizzato sul lead e ancorato alla knowledge base. Scegli il canale: "whatsapp" se c'è un telefono, altrimenti "email".

Rispondi ESCLUSIVAMENTE con JSON:
{
  "automation": "<uno tra: ${AUTOMATIONS.join(', ')}>",
  "channel": "whatsapp" | "email",
  "summary": "<una frase: cosa fa questa azione e perché ora>",
  "emailSubject": "<oggetto se canale=email, altrimenti stringa vuota>",
  "message": "<il messaggio pronto da inviare sul canale scelto>",
  "appointment": ${goal === 'appuntamento' ? '{ "title": "<titolo appuntamento>", "whenHint": "<es. \\"dom mattina\\" o \\"questa settimana\\">" }' : 'null'},
  "newStatus": "<stato CRM suggerito dopo l'azione: nuovo|contattato|qualificato|appuntamento|cliente|perso>"
}`;
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
  const token = bearer(req);
  const ragQuery =
    [lead.interest, lead.notes, body.settore].filter(Boolean).join(' ').trim() || body.settore || '';
  const chunks = token ? await retrieveContext(token, ragQuery, 6) : [];
  const prompt = buildPrompt(body, formatContext(chunks));
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
          'Sei il miglior sales manager e copywriter al mondo, e orchestri un CRM autonomo. Scegli la prossima mossa che massimizza la conversione e scrivi messaggi che convertono. Rispondi sempre e solo con un oggetto JSON valido, senza markdown.',
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

    const automation = (AUTOMATIONS as readonly string[]).includes(parsed.automation)
      ? parsed.automation
      : 'followup';
    const channel = parsed.channel === 'email' || !lead.phone ? 'email' : 'whatsapp';
    const appointment =
      parsed.appointment && typeof parsed.appointment === 'object'
        ? {
            title: String(parsed.appointment.title || ''),
            whenHint: String(parsed.appointment.whenHint || ''),
          }
        : null;

    return NextResponse.json({
      automation,
      channel,
      summary: String(parsed.summary || ''),
      emailSubject: String(parsed.emailSubject || ''),
      message: String(parsed.message || ''),
      appointment,
      newStatus: String(parsed.newStatus || lead.status || 'contattato'),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
