import WebSocket from 'ws';
import type { SupabaseClient } from '@supabase/supabase-js';
import { retrieveContextForUser, formatContext } from '@/lib/retrieve';
import { leadMemoryBlock, DEAL_STAGE_LIST, addLeadEvent } from '@/lib/crm';

// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Memoria delle telefonate (OpenAI Realtime via SIP/DIDWW).
//
//  OpenAI NON offre (ancora) un webhook né un REST per recuperare la trascrizione
//  a fine chiamata: l'unico modo di catturarla è il canale WebSocket "sideband".
//  Dopo l'accept, apriamo una seconda connessione alla STESSA sessione realtime
//  (wss://api.openai.com/v1/realtime?call_id=...) e ascoltiamo gli eventi di
//  trascrizione per tutta la durata della chiamata. Alla chiusura (o allo scadere
//  del salvagente) riassumiamo con Opus 4.8 e aggiorniamo la memoria del lead
//  (progress_summary + deal_stage), esattamente come fanno WhatsApp e l'email.
// ───────────────────────────────────────────────────────────────────────────

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  text: string;
}

// Estrae il primo oggetto JSON valido dal testo del modello.
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

// ── Osservazione sideband della chiamata ────────────────────────────────────
// Apre il WS sideband, raccoglie i turni di trascrizione (cliente + agente) e,
// alla fine, invoca finalizeCallMemory. Best-effort: ogni errore è silenzioso.
export async function observeCall(
  svc: SupabaseClient,
  ctx: { callId: string; ownerId: string; callerLeadId: string | null; fromE164: string | null },
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !ctx.callId) return;

  const turns: TranscriptTurn[] = [];
  // Salvagente: finalizza prima che la function serverless venga terminata a
  // maxDuration (default ~280s, poco sotto i 300s del route). Su call più lunghe
  // si riassume la parte catturata; per durate arbitrarie usare l'observer offload.
  const maxMs = Number(process.env.VOICE_OBSERVE_MAX_MS || 280_000);

  try {
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(ctx.callId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      let done = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        try {
          ws.close();
        } catch {
          /* noop */
        }
        resolve();
      };
      timer = setTimeout(finish, maxMs);

      ws.on('message', (raw: WebSocket.RawData) => {
        let evt: any;
        try {
          evt = JSON.parse(raw.toString());
        } catch {
          return;
        }
        const t = String(evt?.type || '');
        // Cliente (input audio → trascrizione Whisper abilitata in accept).
        if (t === 'conversation.item.input_audio_transcription.completed') {
          const text = String(evt?.transcript || '').trim();
          if (text) turns.push({ role: 'user', text });
          return;
        }
        // Agente (l'audio del modello include il transcript): copre le varianti
        // response.audio_transcript.done / response.output_audio_transcript.done.
        if (t.endsWith('audio_transcript.done')) {
          const text = String(evt?.transcript || '').trim();
          if (text) turns.push({ role: 'assistant', text });
        }
      });
      ws.on('close', finish);
      ws.on('error', finish);
    });
  } catch {
    /* connessione fallita: proviamo comunque a finalizzare ciò che c'è */
  }

  if (!turns.length) return;
  await finalizeCallMemory(svc, {
    ownerId: ctx.ownerId,
    callerLeadId: ctx.callerLeadId,
    fromE164: ctx.fromE164,
    transcript: turns,
  });
}

// ── Riassunto + aggiornamento memoria CRM ───────────────────────────────────
// Data la trascrizione di una chiamata, risolve il lead chiamante, riassume con
// Opus (ancorato a KB + memoria pregressa) e persiste progress_summary +
// deal_stage + last_interaction_at. Registra anche un evento in timeline.
export async function finalizeCallMemory(
  svc: SupabaseClient,
  input: { ownerId: string; callerLeadId: string | null; fromE164: string | null; transcript: TranscriptTurn[] },
): Promise<{ progressSummary: string; dealStage: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const transcript = (input.transcript || []).filter((t) => t.text && t.text.trim());
  if (!transcript.length) return null;

  // Risolvi il lead chiamante (per id passato, o per numero).
  let leadId = input.callerLeadId;
  let priorStage: string | null = null;
  let priorSummary: string | null = null;
  if (leadId) {
    const { data } = await svc.from('leads').select('deal_stage, progress_summary').eq('id', leadId).maybeSingle();
    const row = data as { deal_stage?: string; progress_summary?: string } | null;
    priorStage = row?.deal_stage || null;
    priorSummary = row?.progress_summary || null;
  } else if (input.fromE164) {
    const { data } = await svc
      .from('leads')
      .select('id, deal_stage, progress_summary')
      .eq('user_id', input.ownerId)
      .eq('phone', input.fromE164)
      .order('last_touch', { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as { id?: string; deal_stage?: string; progress_summary?: string } | null;
    if (row?.id) {
      leadId = row.id;
      priorStage = row.deal_stage || null;
      priorSummary = row.progress_summary || null;
    }
  }
  if (!leadId) return null;

  // Contesto: profilo + KB via RAG service-role, ancorato alla trascrizione.
  const { data: prof } = await svc.from('profiles').select('nome, settore').eq('id', input.ownerId).maybeSingle();
  const p = prof as { nome?: string; settore?: string } | null;
  const settore = String(p?.settore || '');
  const transcriptText = transcript
    .map((t) => `${t.role === 'user' ? 'Cliente' : 'Agente'}: ${t.text.trim()}`)
    .join('\n');
  let ragContext = '';
  try {
    const chunks = await retrieveContextForUser(input.ownerId, (transcriptText.slice(0, 600) || settore), 6);
    ragContext = formatContext(chunks, 4000);
  } catch {
    /* fallback */
  }

  const summary = await summarizeCall({
    nome: String(p?.nome || ''),
    settore,
    transcriptText,
    ragContext,
    memoryBlock: leadMemoryBlock({ dealStage: priorStage, progressSummary: priorSummary }),
  });
  if (!summary) return null;

  const stage = (DEAL_STAGE_LIST as string[]).includes(summary.dealStage)
    ? summary.dealStage
    : priorStage || 'contattato';

  const upd: Record<string, unknown> = { last_interaction_at: new Date().toISOString(), deal_stage: stage };
  if (summary.progressSummary) upd.progress_summary = summary.progressSummary;
  try {
    await svc.from('leads').update(upd).eq('id', leadId);
  } catch {
    /* best-effort */
  }

  // Timeline (best-effort): lo schema lead_events.lead_id è uuid, quindi per i
  // lead con id testuale (es. WhatsApp) l'inserimento può fallire → si ignora.
  try {
    await addLeadEvent(svc, input.ownerId, {
      leadId,
      type: 'chiamata',
      channel: 'telefono',
      summary: summary.progressSummary || 'Chiamata vocale conclusa',
      payload: { source: 'voice', turns: transcript.length },
    });
  } catch {
    /* best-effort */
  }

  return { progressSummary: summary.progressSummary, dealStage: stage };
}

// ── Riassunto della chiamata (Opus 4.8, JSON mode) ──────────────────────────
async function summarizeCall(opts: {
  nome: string;
  settore: string;
  transcriptText: string;
  ragContext: string;
  memoryBlock: string;
}): Promise<{ progressSummary: string; dealStage: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const kbBlock = opts.ragContext
    ? `Estratti dalla knowledge base (verità su offerta, prezzi, tono):\n\n${opts.ragContext}\n\n`
    : '';
  const prompt = `Azienda di ${opts.nome || 'un imprenditore'}, settore: ${opts.settore || 'non specificato'}.
${kbBlock}${opts.memoryBlock}

TRASCRIZIONE della telefonata appena conclusa (Cliente = chi ha chiamato, Agente = l'assistente AI dell'azienda):
${opts.transcriptText}

Aggiorna la MEMORIA della trattativa dopo questa chiamata. Rispondi SOLO con un oggetto JSON valido, senza markdown, in questo formato:
{
  "progressSummary": "<riepilogo AGGIORNATO e conciso (max 4-5 frasi): cosa ha chiesto/detto il cliente, cosa è stato proposto, obiezioni emerse, impegni presi, e da dove ripartire la prossima volta>",
  "dealStage": "<fase aggiornata: nuovo|contattato|in_conversazione|offerta_inviata|in_trattativa|appuntamento_fissato|vinto|perso>"
}`;

  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system:
          'Sei il miglior sales manager al mondo: dopo ogni telefonata aggiorni con precisione la memoria della trattativa. Rispondi sempre e solo con un oggetto JSON valido, senza markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) return null;
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text)
          .join('')
          .trim()
      : '';
    const parsed = parseJson(text);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      progressSummary: String(parsed.progressSummary || '').trim(),
      dealStage: String(parsed.dealStage || '').trim(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
