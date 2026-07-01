// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter Resend (email transazionali/conversazionali).
//
//  Un solo account Resend di piattaforma (RESEND_API_KEY) gestisce le email di
//  TUTTI gli utenti. Ogni utente invia dalla PROPRIA email professionale, il cui
//  dominio va verificato in Resend (record DNS SPF/DKIM/DMARC) per non finire in
//  spam: creiamo il dominio via API, esponiamo i record da inserire nel DNS, poi
//  verifichiamo. Solo a dominio 'verified' l'invio dall'indirizzo è permesso.
// ───────────────────────────────────────────────────────────────────────────

const RESEND = 'https://api.resend.com';

export function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}`, 'Content-Type': 'application/json' };
}

// ── Invio ───────────────────────────────────────────────────────────────────
export interface SendEmailInput {
  from: string; // indirizzo su dominio verificato
  fromName?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  if (!resendConfigured()) throw new Error('RESEND_API_KEY mancante');
  const from = input.fromName ? `${input.fromName} <${input.from}>` : input.from;
  const body: Record<string, unknown> = { from, to: input.to, subject: input.subject };
  if (input.html) body.html = input.html;
  if (input.text) body.text = input.text;
  if (!input.html && !input.text) body.text = ' '; // Resend richiede html o text
  if (input.replyTo) body.reply_to = input.replyTo;

  const res = await fetch(`${RESEND}/emails`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as any)?.message || (data as any)?.error || `Resend ${res.status}`));
  return { id: String((data as any)?.id || '') };
}

// ── Domini (verifica DNS) ────────────────────────────────────────────────────
export interface ResendDomainRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  status?: string;
  ttl?: string;
  priority?: number;
}
export interface ResendDomain {
  id: string;
  name: string;
  status: string; // not_started | pending | verified | failed | temporary_failure
  records: ResendDomainRecord[];
}

function normDomain(d: any): ResendDomain {
  return {
    id: String(d?.id || ''),
    name: String(d?.name || ''),
    status: String(d?.status || 'not_started'),
    records: Array.isArray(d?.records)
      ? d.records.map((r: any) => ({
          record: String(r?.record || ''),
          name: String(r?.name || ''),
          type: String(r?.type || ''),
          value: String(r?.value || ''),
          status: r?.status ? String(r.status) : undefined,
          ttl: r?.ttl ? String(r.ttl) : undefined,
          priority: typeof r?.priority === 'number' ? r.priority : undefined,
        }))
      : [],
  };
}

export async function createDomain(name: string): Promise<ResendDomain> {
  const res = await fetch(`${RESEND}/domains`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as any)?.message || `Resend ${res.status}`));
  return normDomain(data);
}

export async function getDomain(id: string): Promise<ResendDomain> {
  const res = await fetch(`${RESEND}/domains/${encodeURIComponent(id)}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((data as any)?.message || `Resend ${res.status}`));
  return normDomain(data);
}

// Richiede la verifica DNS e rilegge lo stato aggiornato.
export async function verifyDomain(id: string): Promise<ResendDomain> {
  await fetch(`${RESEND}/domains/${encodeURIComponent(id)}/verify`, {
    method: 'POST',
    headers: authHeaders(),
  }).catch(() => {});
  return getDomain(id);
}
