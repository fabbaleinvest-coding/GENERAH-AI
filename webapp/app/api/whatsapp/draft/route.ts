import { NextResponse } from 'next/server';
import { retrieveContext, formatContext } from '@/lib/retrieve';
import { generateWaReply } from '@/lib/waReply';
import { agentGoalsDirective, SECTOR_LABEL, type AgentGoal, type SectorKind } from '@/lib/crm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Bozza di risposta WhatsApp (Opus 4.8 + RAG).
//  Usata dal composer del tab WhatsApp: genera il testo della prossima
//  risposta, che l'utente rivede prima di inviare. Richiede ANTHROPIC_API_KEY.
// ─────────────────────────────────────────────────────────────────────────

type Msg = { direction?: string; body?: string };
type Body = { contact?: string; messages?: Msg[]; nome?: string; settore?: string; kbFiles?: string[]; agentGoals?: string[]; sectorKind?: string };

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY mancante (env)' }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const settore = body.settore || '';
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const history = msgs.map((m) => ({ direction: String(m.direction || ''), body: String(m.body || '') }));

  // RAG ancorato all'ultimo messaggio del cliente (token utente → RLS).
  const token = bearer(req);
  const lastInbound = [...history].reverse().find((m) => m.direction === 'inbound')?.body || '';
  const ragQuery = (lastInbound || settore).slice(0, 400);
  const ragChunks = token ? await retrieveContext(token, ragQuery, 6) : [];
  const ragContext = formatContext(ragChunks);

  const { reply } = await generateWaReply({
    history,
    nome: body.nome || '',
    settore,
    kbFiles: Array.isArray(body.kbFiles) ? body.kbFiles : [],
    ragContext,
    goalDirective: agentGoalsDirective(
      (Array.isArray(body.agentGoals) ? body.agentGoals : []) as AgentGoal[],
      body.sectorKind ? SECTOR_LABEL[body.sectorKind as SectorKind] : null
    ),
  });
  if (!reply) return NextResponse.json({ error: 'Bozza non disponibile' }, { status: 502 });
  return NextResponse.json({ reply });
}
