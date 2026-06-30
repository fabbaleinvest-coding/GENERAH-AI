import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Bozza di risposta WhatsApp con Claude (Opus 4.8).
//  Dato lo storico recente della conversazione + il contesto del business
//  (settore + knowledge base via RAG), restituisce il testo della prossima
//  risposta WhatsApp pronta da inviare. Richiede ANTHROPIC_API_KEY (env).
// ─────────────────────────────────────────────────────────────────────────

type Msg = { direction?: string; body?: string };
type Body = { contact?: string; messages?: Msg[]; nome?: string; settore?: string; kbFiles?: string[] };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
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
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const transcript = msgs
    .map((m) => `${m.direction === 'inbound' ? 'Cliente' : 'Noi'}: ${String(m.body || '').trim()}`)
    .filter((l) => l.length > 6)
    .join('\n');

  // RAG ancorato agli ultimi messaggi del cliente.
  const token = bearer(req);
  const lastInbound = [...msgs].reverse().find((m) => m.direction === 'inbound')?.body || '';
  const ragQuery = (lastInbound || settore || nome).slice(0, 400);
  const ragChunks = token ? await retrieveContext(token, ragQuery, 6) : [];
  const kb = formatContext(ragChunks);

  const docs = kbFiles.filter(Boolean);
  const kbBlock = kb
    ? `Estratti dalla knowledge base (fonte di verità su offerta, prezzi, tono):\n\n${kb}\n\n`
    : docs.length
      ? `Materiali dell'azienda: ${docs.join(', ')}.\n\n`
      : '';

  const prompt = `Azienda di ${nome || 'un imprenditore'}, settore: ${settore || 'non specificato'}.
${kbBlock}Conversazione WhatsApp in corso (Cliente = l'interlocutore, Noi = l'azienda):
${transcript || '(nessun messaggio precedente: è il primo contatto)'}

Scrivi la PROSSIMA risposta WhatsApp dell'azienda: breve (1-3 frasi), cordiale, diretta, in italiano. Fai avanzare la conversazione verso il passo successivo (informazione utile, domanda di qualifica, proposta di appuntamento). Niente markdown, niente firma, niente virgolette: restituisci solo il testo del messaggio.`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
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
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: typeof msg === 'string' ? msg : JSON.stringify(msg) }, { status: 500 });
    }
    const text: string = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('').trim()
      : '';
    return NextResponse.json({ reply: text });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
