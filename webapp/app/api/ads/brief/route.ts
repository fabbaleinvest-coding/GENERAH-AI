import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Cervello della campagna ads (Claude Opus 4.8) — STRATO 1.
//  Dato il business (knowledge base via RAG + settore + nome) e i parametri
//  scelti (obiettivo, budget, area), Opus agisce come direttore creativo +
//  media buyer e produce il BRIEF completo della campagna Meta:
//   - creatività video 9:16 a 2 scene consecutive da 15s (visual + voiceover
//     + testo a schermo) con logica musicale continua,
//   - testo inserzione, headline, CTA,
//   - targeting (pubblico, età, interessi, geo) e campi del lead form.
//  Output JSON. La generazione video reale (Higgsfield/Kling) e la creazione
//  su Meta sono gli strati 2 e 3, separati.
// ─────────────────────────────────────────────────────────────────────────

type Body = {
  nome?: string;
  settore?: string;
  kbFiles?: string[];
  objective?: string;
  budgetDaily?: number;
  geo?: string;
  ageRange?: string;
};

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

function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function buildPrompt(
  nome: string,
  settore: string,
  kbFiles: string[],
  ragContext: string,
  objective: string,
  geo: string
): string {
  const docs = (kbFiles || []).filter(Boolean);
  const kb = ragContext
    ? `Estratti reali dalla knowledge base dell'azienda (usa prodotti, servizi, prezzi, offerta e tono REALI; non inventare dati assenti):\n\n${ragContext}`
    : docs.length
      ? `Materiali in knowledge base (solo nomi): ${docs.join(', ')}.`
      : "L'azienda non ha ancora caricato materiali: basati sul settore, resta plausibile.";

  return `Sei il miglior direttore creativo pubblicitario e media buyer al mondo. Azienda di ${nome || 'un imprenditore'}, settore: ${settore || 'non specificato'}.
${kb}

Crea il BRIEF COMPLETO di una campagna Meta (Instagram/Facebook) con obiettivo "${objective || 'Lead generation'}"${geo ? `, area indicativa: ${geo}` : ''}.
La creatività è UN VIDEO VERTICALE 9:16 da 30 secondi formato da DUE SCENE CONSECUTIVE da 15 secondi, con narrazione continua e logica musicale coerente tra le due scene. Tono estremamente persuasivo ed emozionale, in italiano. Aggancia il messaggio al business reale qui sopra (offerta, benefici, tono).

Restituisci ESCLUSIVAMENTE un oggetto JSON con questa forma:
{
  "campaignName": "<nome campagna sintetico>",
  "objective": "Lead generation",
  "audienceDescription": "<descrizione del pubblico target (freddo, esclusi clienti esistenti)>",
  "ageRange": "<es. 25-54>",
  "gender": "<Tutti | Donne | Uomini>",
  "interests": ["<4-6 interessi Meta plausibili>"],
  "geoSuggestion": "<area/raggio consigliato>",
  "postText": "<primary text dell'inserzione: persuasivo, emozionale, con call to action>",
  "headline": "<titolo breve dell'inserzione>",
  "cta": "<una CTA Meta standard, es. Scopri di più / Registrati / Contattaci>",
  "leadFormFields": ["<campi del modulo lead, es. Nome e cognome, Email, Telefono>"],
  "music": "<logica musicale: mood e come la traccia evolve in continuità tra scena 1 e scena 2>",
  "videoConcept": "<sintesi del concept in 1-2 frasi>",
  "scenes": [
    { "n": 1, "durationSec": 15, "visual": "<descrizione visiva per generare il video>", "voiceover": "<testo voiceover italiano, emozionale>", "onScreenText": "<testo a schermo breve>" },
    { "n": 2, "durationSec": 15, "visual": "<descrizione visiva, in continuità con la scena 1>", "voiceover": "<voiceover che chiude con la promessa + CTA>", "onScreenText": "<testo a schermo breve>" }
  ]
}`;
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
  const objective = body.objective || 'Lead generation';
  const geo = body.geo || '';

  // RAG: profilo del business per ancorare creatività e targeting ai dati reali.
  const token = bearer(req);
  const ragQuery =
    `prodotti servizi offerta prezzi benefici punti di forza clienti target tono di voce dell'azienda ${settore}`.trim();
  const ragChunks = token ? await retrieveContext(token, ragQuery, 8) : [];
  const ragContext = formatContext(ragChunks, 6000);

  const prompt = buildPrompt(nome, settore, kbFiles, ragContext, objective, geo);
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
        max_tokens: 2500,
        system:
          "Sei il miglior direttore creativo pubblicitario e media buyer al mondo: scrivi spot che emozionano e convertono e imposti targeting efficaci. Rispondi sempre e solo con un oggetto JSON valido, senza markdown e senza testo aggiuntivo.",
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
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'Risposta AI non interpretabile' }, { status: 502 });
    }

    const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    const scenes = rawScenes.slice(0, 2).map((s: any, i: number) => ({
      n: Number(s?.n) || i + 1,
      durationSec: Number(s?.durationSec) || 15,
      visual: asString(s?.visual),
      voiceover: asString(s?.voiceover),
      onScreenText: asString(s?.onScreenText),
    }));

    const brief = {
      campaignName: asString(parsed.campaignName) || 'Campagna lead generation',
      objective: asString(parsed.objective) || 'Lead generation',
      audienceDescription: asString(parsed.audienceDescription),
      ageRange: asString(parsed.ageRange) || '25-54',
      gender: asString(parsed.gender) || 'Tutti',
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.map(asString).filter(Boolean).slice(0, 8)
        : [],
      geoSuggestion: asString(parsed.geoSuggestion),
      postText: asString(parsed.postText),
      headline: asString(parsed.headline),
      cta: asString(parsed.cta) || 'Scopri di più',
      leadFormFields: Array.isArray(parsed.leadFormFields)
        ? parsed.leadFormFields.map(asString).filter(Boolean).slice(0, 8)
        : ['Nome e cognome', 'Email', 'Telefono'],
      music: asString(parsed.music),
      videoConcept: asString(parsed.videoConcept),
      scenes,
    };

    return NextResponse.json({ brief });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
