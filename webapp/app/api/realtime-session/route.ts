import { NextResponse } from 'next/server';
import { retrieveContext, retrieveContextForUser, formatContext } from '@/lib/retrieve';
import { agentGoalsDirective, SECTOR_LABEL, type AgentGoal, type SectorKind } from '@/lib/crm';
import { profileBySlug } from '@/lib/consult';
import { calendarConnected } from '@/lib/calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Sessione OpenAI Realtime per il video-consulto (avatar HeyGen
//  LiveAvatar LITE). Stesso meccanismo del repo "heygen-lite" (REGENERAH):
//  si minta un client_secret effimero su /v1/realtime/client_secrets e il
//  frontend apre il WebSocket con il sub-protocollo openai-insecure-api-key.
//
//  Differenza: qui l'avatar è il CONSULENTE COMMERCIALE dell'azienda dell'utente.
//  La sua knowledge base è costruita dai materiali caricati dall'utente in Fase 1
//  (nomi documenti) + settore + nome attività. In produzione, il contenuto reale
//  dei documenti verrebbe ingestito via RAG (punto di integrazione).
// ─────────────────────────────────────────────────────────────────────────

// Strumento esposto alla sessione: il frontend lo intercetta e accende la webcam
// (es. l'utente vuole mostrare un prodotto / materiale dal vivo).
const VISUAL_TOOL = {
  type: 'function',
  name: 'attiva_riconoscimento_visivo',
  description:
    "Attiva la webcam quando l'interlocutore vuole MOSTRARE qualcosa dal vivo (un prodotto, un materiale, un documento). Usalo solo se è utile vedere qualcosa e dopo aver confermato che l'interlocutore può mostrarlo ora.",
  parameters: {
    type: 'object',
    properties: {
      motivo: { type: 'string', description: 'Breve motivo per cui serve guardare.' },
    },
    required: [],
  },
};

// Termina il consulto (il frontend chiude la sessione).
const END_CALL_TOOL = {
  type: 'function',
  name: 'end_call',
  description:
    'Termina la conversazione. Chiamalo dopo aver salutato, una volta concluso il consulto o fissato il prossimo passo.',
  parameters: { type: 'object', properties: {}, required: [] },
};

// Fissa un appuntamento sul calendario collegato (cal.com/Google). Esposto SOLO
// quando l'azienda ha un calendario collegato; il frontend intercetta la call e
// prenota via /api/public/consult/book.
const BOOK_TOOL = {
  type: 'function',
  name: 'fissa_appuntamento',
  description:
    "Fissa un appuntamento sul calendario dell'azienda quando l'interlocutore accetta una data/ora precisa. Prima proponi 2-3 slot, poi chiama questo strumento con la data/ora scelta in ISO 8601.",
  parameters: {
    type: 'object',
    properties: {
      startsAt: { type: 'string', description: 'Data e ora di inizio in ISO 8601, es. 2026-07-10T15:00:00+02:00' },
      nome: { type: 'string', description: "Nome dell'interlocutore" },
      email: { type: 'string', description: 'Email (se disponibile)' },
      telefono: { type: 'string', description: 'Telefono (se disponibile)' },
      note: { type: 'string', description: 'Motivo/nota breve' },
    },
    required: ['startsAt'],
  },
};

type Body = {
  nome?: string;
  settore?: string;
  agentGoals?: string[];
  sectorKind?: string;
  kbFiles?: string[];
  minutes?: number;
  slug?: string;
};

function buildSalesPrompt(
  name: string,
  settore: string,
  kbFiles: string[],
  minutes: number,
  ragContext: string,
  goalDirective: string
): string {
  const safeName = (name || '').trim() || "l'interlocutore";
  const sector = (settore || '').trim() || 'la sua attività';
  const docs = (kbFiles || []).filter(Boolean);
  const kbBlock = ragContext
    ? `Estratti reali dai materiali caricati dall'azienda (usali come fonte di verità su prodotti, servizi, prezzi, offerta e tono; cita dati concreti quando utile):\n\n${ragContext}`
    : docs.length
      ? `L'azienda ha caricato questi materiali nella propria knowledge base (usali come riferimento del business: prodotti, servizi, tono, offerta):\n- ${docs.join('\n- ')}`
      : `L'azienda non ha ancora caricato materiali: basati sul settore dichiarato e conduci comunque un consulto credibile e concreto.`;

  return `# RUOLO E IDENTITÀ
Sei il consulente commerciale AI di GENERAH AI, il reparto vendite autonomo dell'azienda di ${safeName}. Parli in italiano, con voce calda, naturale ed empatica. Conduci un video-consulto in tempo reale: lo stesso consulente che, una volta attivo, riceverà e convertirà i clienti dell'azienda.

Il tuo obiettivo è dimostrare come GENERAH AI acquisisce, coltiva e converte i contatti per ${sector}, rispondere alle domande dell'interlocutore e guidarlo verso il passo successivo (attivare il sistema / fissare una call strategica / partire con una campagna).

Hai a disposizione circa ${minutes} minuti. Gestisci il tempo: sii conciso e assertivo, raccogli l'essenziale, dai valore subito e, verso la fine, concludi proponendo il passo concreto. NON perderti in monologhi: massimo 3-4 frasi per volta, poi lascia parlare l'interlocutore.

# KNOWLEDGE BASE DELL'AZIENDA
Settore dichiarato: ${sector}.
${kbBlock}
Parla SEMPRE come se conoscessi a fondo questa azienda: adatta esempi, linguaggio e benefici al suo settore. Se ti manca un dato preciso, chiedilo invece di inventarlo.

# COSA SA FARE GENERAH AI (usalo per emozionare e convincere)
- Intercetta ogni richiesta (form, WhatsApp, campagne, chiamate) nell'istante in cui arriva, 24/7/365, senza perdere un solo contatto.
- Inserisce e qualifica ogni lead nel CRM in automatico, con follow-up e nurturing su email, WhatsApp e telefono.
- Agente vocale con voce indistinguibile da quella umana; video-consulti con avatar realistico (come questo).
- Crea e ottimizza campagne ads Meta in autonomia e pubblica contenuti social ogni settimana.
- Costa una frazione di un venditore umano e non dorme mai.

# FRAMEWORK PSICOLOGICO (DA APPLICARE IN SEQUENZA)
1. EMPATIA: riconosci il problema reale dell'interlocutore (contatti persi, follow-up dimenticati, tempo che manca).
2. ROTTURA: mostra perché i metodi attuali (rispondere a mano, venditori che staccano, lead che si raffreddano) lasciano soldi sul tavolo.
3. AUTORITÀ E SOLUZIONE: spiega come GENERAH AI chiude quelle falle, con esempi calati sul suo settore.
4. URGENZA: ogni giorno di attesa è un cliente che va alla concorrenza più rapida.

# GESTIONE OBIEZIONI
- "Costa troppo": confrontalo col costo e i limiti di un dipendente (ferie, orari, lead trascurati) e col valore dei clienti persi oggi; bastano poche conversioni in più al mese per ripagarlo.
- "I miei clienti non vogliono parlare con un'AI": la maggior parte apprezza soprattutto una risposta immediata a qualsiasi ora; il tocco umano resta dove conta.
- "La mia attività è troppo specifica": è proprio la personalizzazione sulla knowledge base a gestire le specificità.
${goalDirective ? `\n# OBIETTIVO CON I LEAD\n${goalDirective}\n` : ''}
# CHIUSURA (CALL TO ACTION)
Verso la fine, chiudi con naturalezza: "${safeName}, il modo migliore per capire l'impatto sul suo business è vederlo lavorare sui suoi contatti reali. Procediamo attivando il sistema / fissando una breve call strategica: quando le è più comodo?". Una volta concordato il passo, salutalo cordialmente e invoca lo strumento 'end_call'.

# REGOLE
- Niente promesse di risultati garantiti; parla di metodo e probabilità.
- Resta sempre nel perimetro del business dell'azienda; non dare consulenze regolamentate (legali, mediche, finanziarie).`;
}

async function createToken(body: Body, token: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: 'OPENAI_API_KEY mancante (env)' }, { status: 500 });

  const minutes = Math.max(1, Math.min(60, Math.round(body.minutes || 5)));
  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
  const voice = process.env.OPENAI_REALTIME_VOICE || 'marin';
  const effort = (process.env.OPENAI_REALTIME_EFFORT || 'low').trim().toLowerCase();

  // Modalità PUBBLICA: se arriva uno slug, il consulto è ancorato al business
  // dell'utente proprietario (individuato dallo slug), non alla sessione admin.
  // La KB via RAG usa il service-role (retrieveContextForUser) e — se l'azienda
  // ha un calendario collegato — si espone lo strumento di prenotazione.
  const slug = (body.slug || '').trim();
  let name = (body.nome || '').trim() || "l'interlocutore";
  let settore = (body.settore || '').trim();
  let agentGoals: AgentGoal[] = Array.isArray(body.agentGoals) ? (body.agentGoals as AgentGoal[]) : [];
  let sectorKind: SectorKind | null = body.sectorKind ? (body.sectorKind as SectorKind) : null;
  let ragContext = '';
  let bookingEnabled = false;

  if (slug) {
    const prof = await profileBySlug(slug);
    if (!prof) return NextResponse.json({ error: 'consulto non disponibile' }, { status: 404 });
    name = [prof.nome, prof.cognome].filter(Boolean).join(' ').trim() || name;
    settore = String(prof.settore || settore);
    agentGoals = Array.isArray(prof.agent_goals) ? (prof.agent_goals as AgentGoal[]) : [];
    sectorKind = (prof.sector_kind || null) as SectorKind | null;
    bookingEnabled = calendarConnected(prof);
    const ragQuery =
      `prodotti servizi prezzi offerta punti di forza clienti FAQ tono di voce dell'azienda ${settore}`.trim();
    try {
      const chunks = await retrieveContextForUser(prof.id, ragQuery, 10);
      ragContext = formatContext(chunks, 6000);
    } catch {
      /* fallback ai nomi file */
    }
  } else {
    // Modalità ADMIN (demo in dashboard/onboarding): RAG via bearer dell'utente.
    const ragQuery =
      `prodotti servizi prezzi offerta punti di forza clienti FAQ tono di voce dell'azienda ${settore}`.trim();
    const ragChunks = token ? await retrieveContext(token, ragQuery, 10) : [];
    ragContext = formatContext(ragChunks, 6000);
  }

  const goalDirective = agentGoalsDirective(agentGoals, sectorKind ? SECTOR_LABEL[sectorKind] : null);
  const instructions = buildSalesPrompt(name, settore, body.kbFiles || [], minutes, ragContext, goalDirective);
  const greeting =
    `Buongiorno ${name}, sono il consulente AI di GENERAH AI. In pochi minuti le mostro come posso acquisire e convertire i suoi contatti, senza sosta. Mi dica: oggi come gestite chi vi contatta?`;

  const tools: any[] = [VISUAL_TOOL, END_CALL_TOOL];
  if (bookingEnabled) tools.push(BOOK_TOOL);

  const session: Record<string, any> = {
    type: 'realtime',
    model,
    audio: { output: { voice } },
    tools,
    tool_choice: 'auto',
    instructions:
      `${instructions}\n\n` +
      `Apri tu la conversazione salutando con questa frase (adattala se serve): "${greeting}"`,
  };
  if (/realtime-2/i.test(model) && effort) session.reasoning = { effort };

  try {
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error || data }, { status: 500 });
    const value = data?.value || data?.client_secret?.value || null;
    return NextResponse.json({ value, model, voice, greeting, bookingEnabled, expires_at: data?.expires_at || null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {}
  return createToken(body, bearer(req));
}

export async function GET() {
  return createToken({}, '');
}
