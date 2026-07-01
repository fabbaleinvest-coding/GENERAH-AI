// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Generatore di risposte WhatsApp (Claude Opus 4.8).
//
//  Dato lo storico recente della conversazione + il contesto del business
//  (settore + knowledge base via RAG) + la MEMORIA di trattativa del lead
//  (fase pipeline + riepilogo AI, via leadMemoryBlock), restituisce SIA il testo
//  della prossima risposta SIA un riepilogo aggiornato della trattativa da
//  ripersistere sul lead. In questo modo l'agente riprende dal punto raggiunto,
//  qualunque sia il canale (WhatsApp o voce condividono la stessa memoria).
//
//  Condiviso da /api/whatsapp/draft (bozza con revisione umana) e dal webhook in
//  entrata (auto-reply). JSON mode: Opus torna { reply, progressSummary }.
//  Degrada a { reply: '', progressSummary: '' } se manca ANTHROPIC_API_KEY o su
//  errore/timeout (il chiamante non invia nulla).
// ───────────────────────────────────────────────────────────────────────────

export interface WaHistoryItem {
  direction: string; // 'inbound' | 'outbound'
  body: string;
}

export interface WaReplyResult {
  reply: string; // testo della prossima risposta ('' = non inviare)
  progressSummary: string; // riepilogo aggiornato della trattativa ('' = invariato)
  booking: { startsAt: string; notes?: string } | null; // appuntamento da fissare, se concordato
}

// Estrae il primo oggetto JSON valido dal testo del modello (tollerante a
// eventuale preambolo o code-fence markdown).
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

export async function generateWaReply(opts: {
  history: WaHistoryItem[];
  nome?: string;
  settore?: string;
  kbFiles?: string[];
  ragContext?: string;
  goalDirective?: string;
  memoryBlock?: string;
  bookingEnabled?: boolean;
  nowISO?: string;
  timezone?: string;
  timeoutMs?: number;
}): Promise<WaReplyResult> {
  const empty: WaReplyResult = { reply: '', progressSummary: '', booking: null };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return empty;

  const nome = opts.nome || '';
  const settore = opts.settore || '';
  const docs = (opts.kbFiles || []).filter(Boolean);
  const kbBlock = opts.ragContext
    ? `Estratti dalla knowledge base (fonte di verità su offerta, prezzi, tono):\n\n${opts.ragContext}\n\n`
    : docs.length
      ? `Materiali dell'azienda: ${docs.join(', ')}.\n\n`
      : '';

  const transcript = (opts.history || [])
    .map((m) => `${m.direction === 'inbound' ? 'Cliente' : 'Noi'}: ${String(m.body || '').trim()}`)
    .filter((l) => l.length > 6)
    .join('\n');

  const memBlock = opts.memoryBlock ? `${opts.memoryBlock}\n\n` : '';
  const nowISO = opts.nowISO || new Date().toISOString();
  const tz = opts.timezone || 'Europe/Rome';
  const bookingBlock = opts.bookingEnabled
    ? `L'azienda ha un calendario collegato: puoi FISSARE un appuntamento. Adesso è ${nowISO} (timezone ${tz}). Quando l'interlocutore accetta una data/ora precisa, includi nel JSON il campo "booking" con l'orario di inizio in ISO 8601; altrimenti lascia "booking": null. Proponi 2-3 fasce prima di fissare.\n\n`
    : '';

  const bookingField = opts.bookingEnabled
    ? `,\n  "booking": <null oppure { "startsAt": "<data/ora ISO 8601 dell'appuntamento concordato>", "notes": "<nota breve>" }>`
    : '';

  const prompt = `Azienda di ${nome || 'un imprenditore'}, settore: ${settore || 'non specificato'}.
${kbBlock}${opts.goalDirective ? `${opts.goalDirective}\n\n` : ''}${memBlock}${bookingBlock}Conversazione WhatsApp in corso (Cliente = l'interlocutore, Noi = l'azienda):
${transcript || '(primo contatto)'}

Scrivi la PROSSIMA risposta WhatsApp dell'azienda: breve (1-3 frasi), cordiale, diretta, in italiano. Riprendi dal punto raggiunto nella trattativa — non ripetere ciò che è già stato detto o inviato — e falla avanzare verso il passo successivo (informazione utile, domanda di qualifica, proposta di appuntamento). Nel testo del messaggio niente markdown, niente firma, niente virgolette.

Rispondi SOLO con un oggetto JSON valido, senza markdown, in questo formato:
{
  "reply": "<il testo del messaggio WhatsApp da inviare>",
  "progressSummary": "<riepilogo AGGIORNATO e conciso (max 3-4 frasi) della trattativa finora: cosa è stato detto/inviato, obiezioni emerse, impegni presi, e da dove ripartire la prossima volta>"${bookingField}
}`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system:
          'Sei il miglior copywriter conversazionale al mondo e gestisci una trattativa di vendita su WhatsApp con memoria persistente. Scrivi risposte brevi, umane e persuasive che riprendono dal punto raggiunto e fanno avanzare la vendita. Rispondi sempre e solo con un oggetto JSON valido, senza markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) return empty;
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text)
          .join('')
          .trim()
      : '';
    const parsed = parseJson(text);
    if (parsed && typeof parsed === 'object') {
      let booking: { startsAt: string; notes?: string } | null = null;
      const b = (parsed as { booking?: unknown }).booking as { startsAt?: unknown; notes?: unknown } | null;
      if (b && typeof b === 'object' && b.startsAt) {
        booking = { startsAt: String(b.startsAt), notes: b.notes ? String(b.notes) : undefined };
      }
      return {
        reply: String(parsed.reply || '').trim(),
        progressSummary: String(parsed.progressSummary || '').trim(),
        booking,
      };
    }
    // Fallback: il modello non ha rispettato il JSON → usa il testo come reply.
    return { reply: text, progressSummary: '', booking: null };
  } catch {
    return empty;
  } finally {
    clearTimeout(timer);
  }
}
