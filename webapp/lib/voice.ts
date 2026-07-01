import crypto from 'crypto';

// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter voce (OpenAI Realtime via SIP)
//
//  Centralino AI inbound: il numero DIDWW dell'azienda è instradato (trunk SIP
//  in ingresso) verso  sip:<project_id>@sip.api.openai.com . Quando arriva una
//  chiamata, OpenAI invia il webhook `realtime.call.incoming`; noi verifichiamo
//  la firma, mappiamo il numero chiamato → azienda proprietaria e rispondiamo
//  con /accept passando le istruzioni costruite dalla sua knowledge base.
//
//  L'audio (RTP) viaggia direttamente tra DIDWW e OpenAI: il nostro server non
//  fa da ponte media (compatibile con Vercel). Per i tool in tempo reale serve
//  invece un worker WebSocket persistente (fuori da questo repo).
//
//  Config (env):
//    OPENAI_API_KEY          chiave OpenAI (Realtime).
//    OPENAI_WEBHOOK_SECRET   secret di firma webhook (formato whsec_...).
//    OPENAI_REALTIME_MODEL   opzionale, default 'gpt-realtime'.
//    OPENAI_REALTIME_VOICE   opzionale, default 'marin'.
// ───────────────────────────────────────────────────────────────────────────

const OPENAI = 'https://api.openai.com/v1';

function apiKey(): string {
  return process.env.OPENAI_API_KEY || '';
}
function webhookSecret(): string {
  return process.env.OPENAI_WEBHOOK_SECRET || '';
}

/** True se la voce è configurata (chiave OpenAI presente). */
export function voiceConfigured(): boolean {
  return !!apiKey();
}

export class VoiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ── Verifica firma webhook (schema "Standard Webhooks" usato da OpenAI) ───────
//   signed = `${id}.${timestamp}.${rawBody}`
//   sig    = base64( HMAC-SHA256(secretBytes, signed) )
//   header webhook-signature: "v1,<sig> [v1,<sig2> ...]"
export function verifyOpenAIWebhook(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string },
): boolean {
  const secret = webhookSecret();
  if (!secret) return false;
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false; // ±5 min

  const secretBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8');
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signed).digest('base64');

  const provided = signature.split(' ').map((p) => (p.includes(',') ? p.split(',')[1] : p));
  return provided.some((sig) => {
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

/** Estrae un numero E.164 da un URI SIP/TEL ("sip:+39...@host", "tel:+39..."). */
export function numberFromSip(uri: string): string {
  if (!uri) return '';
  const m = uri.match(/[+]?\d{6,15}/);
  if (!m) return '';
  return m[0].startsWith('+') ? m[0] : `+${m[0]}`;
}

/** Valore di un header SIP (case-insensitive) dalla lista del webhook. */
export function sipHeaderValue(headers: { name: string; value: string }[], name: string): string {
  const h = (headers || []).find((x) => String(x.name).toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

// ── Controllo chiamata (REST) ────────────────────────────────────────────────

async function callsPost(subpath: string, body?: unknown): Promise<void> {
  const res = await fetch(`${OPENAI}/realtime/calls/${subpath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new VoiceError(`OpenAI calls/${subpath} → ${res.status} ${t.slice(0, 200)}`, res.status);
  }
}

/** Accetta la chiamata in ingresso configurando la sessione realtime. */
export async function acceptCall(callId: string, session: Record<string, unknown>): Promise<void> {
  await callsPost(`${encodeURIComponent(callId)}/accept`, session);
}
/** Rifiuta la chiamata con uno status SIP (486 occupato, 603 declino). */
export async function rejectCall(callId: string, statusCode = 486): Promise<void> {
  await callsPost(`${encodeURIComponent(callId)}/reject`, { status_code: statusCode });
}
/** Termina la chiamata. */
export async function hangupCall(callId: string): Promise<void> {
  await callsPost(`${encodeURIComponent(callId)}/hangup`);
}
/** Trasferisce la chiamata (es. a un operatore umano): tel:+39... o sip:...). */
export async function referCall(callId: string, targetUri: string): Promise<void> {
  await callsPost(`${encodeURIComponent(callId)}/refer`, { target_uri: targetUri });
}

// ── Istruzioni del consulente telefonico (KB-driven) ─────────────────────────

export function buildPhonePrompt(opts: {
  nome?: string;
  settore?: string;
  kbFiles?: string[];
  ragContext?: string;
  goalDirective?: string;
  memoryBlock?: string;
  bookingEnabled?: boolean;
}): string {
  const sector = (opts.settore || '').trim() || 'la sua attività';
  const docs = (opts.kbFiles || []).filter(Boolean);
  const kbBlock = opts.ragContext
    ? `Estratti reali dai materiali dell'azienda (fonte di verità su prodotti, servizi, prezzi, offerta e tono):\n\n${opts.ragContext}`
    : docs.length
      ? `Materiali in knowledge base (riferimento del business):\n- ${docs.join('\n- ')}`
      : `Nessun materiale caricato: basati sul settore e conduci comunque una conversazione credibile e concreta.`;

  return `# RUOLO
Sei il consulente commerciale AI di GENERAH AI, il reparto vendite autonomo dell'azienda (settore: ${sector}). Stai rispondendo a una TELEFONATA in tempo reale. Parli in italiano, con voce calda e naturale, frasi brevi (massimo 2-3 per turno), ritmo da telefonata. Apri salutando, presentati come assistente dell'azienda e chiedi come puoi aiutare.

# OBIETTIVO
Capire perché la persona chiama, qualificarla (nome, esigenza, recapito), dare valore subito e portarla al passo successivo (preventivo, appuntamento, richiamata da un referente). Gestisci tu il ritmo: ascolta, non monopolizzare.${opts.goalDirective ? `\n\n${opts.goalDirective}` : ''}
${opts.memoryBlock ? `\n${opts.memoryBlock}\n` : ''}
# KNOWLEDGE BASE
${kbBlock}
Usa SEMPRE questi contenuti come verità su offerta, prezzi e tono. Se manca un dato preciso, chiedilo invece di inventarlo.

# REGOLE
- Niente promesse di risultati garantiti; parla di metodo e probabilità.
- Resta nel perimetro del business; niente consulenze regolamentate (legali, mediche, finanziarie).
- Se la richiesta è fuori ambito, riportala con gentilezza al business.
${opts.bookingEnabled ? `\n# APPUNTAMENTI\nL'azienda ha un calendario collegato: se emerge interesse concreto, proponi 2-3 fasce orarie e, quando l'interlocutore accetta una data/ora precisa, conferma che fisserai l'appuntamento. Raccogli nome e un recapito (email o telefono) per la conferma.\n` : ''}
# CHIUSURA
Prima di chiudere, riepiloga il prossimo passo concordato e saluta con cortesia.`;
}

/** Configurazione di sessione per /accept (telefonata audio). */
export function buildAcceptSession(instructions: string): Record<string, unknown> {
  return {
    type: 'realtime',
    model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
    audio: {
      // Trascrizione del parlato del CLIENTE: necessaria per catturare i suoi
      // turni sul canale sideband (l'audio dell'agente porta già il transcript).
      input: { transcription: { model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1' } },
      output: { voice: process.env.OPENAI_REALTIME_VOICE || 'marin' },
    },
    instructions: `${instructions}\n\nApri tu la conversazione con un saluto naturale e chiedi come puoi aiutare.`,
  };
}
