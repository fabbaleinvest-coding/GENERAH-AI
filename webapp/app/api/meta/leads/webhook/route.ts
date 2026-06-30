import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { serviceClient } from '@/lib/supabaseServer';
import { connectionByPageId } from '@/lib/metaOAuth';
import { fetchLeadData, type FetchedLead } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────
//  Webhook Lead Ads di Meta.
//
//  Una sola callback riceve gli eventi `leadgen` di TUTTE le pagine collegate
//  all'app. L'evento porta solo gli ID (leadgen_id, page_id): da page_id si
//  risale all'utente proprietario (meta_connections, via service_role), con il
//  suo token si leggono i dati del lead e si salva nella sua tabella `leads`.
//
//  Config (env): META_WEBHOOK_VERIFY_TOKEN (verifica GET), META_APP_SECRET
//  (firma POST), SUPABASE_SERVICE_ROLE_KEY (scrittura lead). Senza la
//  service_role il webhook risponde comunque 200 ma non scrive (degrado pulito).
// ─────────────────────────────────────────────────────────────────────────

// 1) Verifica della sottoscrizione: Meta chiama in GET e si aspetta l'echo del
//    challenge se il verify_token combacia.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('forbidden', { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  // Senza app secret non si può verificare: si accetta (utile in dev/demo).
  if (!secret) return true;
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Mappa i campi del modulo Meta sulle colonne del lead. I nomi standard sono
// full_name / email / phone_number / city / company_name; gestiti anche
// first_name + last_name come fallback.
function mapLeadRow(userId: string, lead: FetchedLead) {
  const f = lead.fields;
  const name =
    f['full_name'] ||
    [f['first_name'], f['last_name']].filter(Boolean).join(' ').trim() ||
    f['name'] ||
    'Lead Meta';
  const phone = f['phone_number'] || f['phone'] || f['telefono'] || '';
  const email = f['email'] || f['e-mail'] || '';
  const interest = f['city'] || f['città'] || f['company_name'] || f['azienda'] || '';
  const createdAt = lead.createdTime ? new Date(lead.createdTime) : new Date();
  const nowIso = new Date().toISOString();
  return {
    id: `mlg_${lead.id}`,
    user_id: userId,
    name,
    phone,
    email,
    source: lead.campaignName || 'Meta Lead Ads',
    channel: 'Meta Ads',
    interest,
    status: 'nuovo',
    score: 0,
    notes: '',
    ai_summary: '',
    next_action: '',
    ai_draft: null,
    created_at: isNaN(createdAt.getTime()) ? nowIso : createdAt.toISOString(),
    last_touch: nowIso,
  };
}

interface LeadgenChange {
  field?: string;
  value?: { leadgen_id?: string; page_id?: string; form_id?: string; ad_id?: string };
}
interface WebhookEntry {
  id?: string;
  changes?: LeadgenChange[];
}

// Ingestione best-effort: non solleva mai (Meta ritenta se non riceve 200).
async function ingest(body: any): Promise<void> {
  if (!body || body.object !== 'page') return;
  const db = serviceClient();
  if (!db) return; // service_role non configurata: nessuna scrittura

  const entries: WebhookEntry[] = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const ch of changes) {
      if (ch.field !== 'leadgen' || !ch.value) continue;
      const leadgenId = ch.value.leadgen_id;
      const pageId = ch.value.page_id || entry.id;
      if (!leadgenId || !pageId) continue;
      try {
        const conn = await connectionByPageId(String(pageId));
        if (!conn) continue;
        const token = conn.pageToken || conn.accessToken;
        const lead = await fetchLeadData(token, String(leadgenId), conn.version);
        const row = mapLeadRow(conn.userId, lead);
        // upsert idempotente: se l'evento viene riconsegnato non duplica.
        await db.from('leads').upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      } catch {
        // singolo lead fallito: si prosegue con gli altri
      }
    }
  }
}

// 2) Notifica eventi: verifica firma, ACK rapido, ingestione best-effort.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('bad signature', { status: 401 });
  }
  try {
    await ingest(JSON.parse(raw));
  } catch {
    // body non parsabile o errore di ingest: si ACK comunque per non far ritentare
  }
  return NextResponse.json({ received: true });
}
