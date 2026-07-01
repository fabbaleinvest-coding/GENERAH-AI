// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Generatore di risposte WhatsApp (Claude Opus 4.8).
//
//  Dato lo storico recente della conversazione + il contesto del business
//  (settore + knowledge base via RAG), restituisce il testo della prossima
//  risposta. Condiviso da /api/whatsapp/draft (bozza con revisione umana) e dal
//  webhook in entrata (auto-reply). Degrada a '' se manca ANTHROPIC_API_KEY o
//  in caso di errore/timeout (il chiamante non invia nulla).
// ───────────────────────────────────────────────────────────────────────────

export interface WaHistoryItem {
  direction: string; // 'inbound' | 'outbound'
  body: string;
}

export async function generateWaReply(opts: {
  history: WaHistoryItem[];
  nome?: string;
  settore?: string;
  kbFiles?: string[];
  ragContext?: string;
  goalDirective?: string;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return '';

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

  const prompt = `Azienda di ${nome || 'un imprenditore'}, settore: ${settore || 'non specificato'}.
${kbBlock}${opts.goalDirective ? `${opts.goalDirective}\n\n` : ''}Conversazione WhatsApp in corso (Cliente = l'interlocutore, Noi = l'azienda):
${transcript || '(primo contatto)'}

Scrivi la PROSSIMA risposta WhatsApp dell'azienda: breve (1-3 frasi), cordiale, diretta, in italiano. Fai avanzare la conversazione verso il passo successivo (informazione utile, domanda di qualifica, proposta di appuntamento). Niente markdown, niente firma, niente virgolette: restituisci solo il testo del messaggio.`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system:
          'Sei il miglior copywriter conversazionale al mondo: scrivi risposte WhatsApp brevi, umane e persuasive che fanno avanzare la vendita. Rispondi solo con il testo del messaggio, senza markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) return '';
    return Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text)
          .join('')
          .trim()
      : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}
