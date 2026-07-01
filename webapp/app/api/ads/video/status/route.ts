import { NextResponse } from 'next/server';
import { requireEntitledUser } from '@/lib/entitlement';
import { platformStatus } from '@/lib/higgsfieldOAuth';
import { mcpJobStatus } from '@/lib/higgsfieldMcp';
import { hfConfigured, hfStatus, hfResultUrl } from '@/lib/higgsfield';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Polling dello stato di un job. Sceglie il motore in base alla connessione:
// MCP di piattaforma se attiva (job_display), altrimenti REST legacy. Il client
// può forzare con ?engine=mcp|rest (valorizzato dalla risposta di /submit).

export async function GET(req: Request) {
  const auth = await requireEntitledUser(req);
  if (!auth.ok) return NextResponse.json({ error: 'Autenticazione richiesta', reason: auth.reason }, { status: auth.status });

  const u = new URL(req.url);
  const id = u.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 });

  const hint = u.searchParams.get('engine');
  let useMcp = hint === 'mcp';
  if (!hint) {
    try {
      useMcp = (await platformStatus()).connected;
    } catch {
      useMcp = false;
    }
  }

  try {
    if (useMcp) {
      const r = await mcpJobStatus(id);
      return NextResponse.json({ engine: 'mcp', status: r.status, url: r.url });
    }
    if (!hfConfigured()) {
      return NextResponse.json({ error: 'Motore REST non configurato', configured: false }, { status: 503 });
    }
    const r = await hfStatus(id);
    return NextResponse.json({ engine: 'rest', status: r.status, url: hfResultUrl(r) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
