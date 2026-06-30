import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter WhatsApp Cloud API (Meta).
//
//  Invio e ricezione messaggi tramite la Cloud API ospitata da Meta. Non serve
//  un BSP: GENERAH fa da provider a sé. Un singolo token System User copre i
//  numeri (Phone Number ID) del Business; il numero specifico viene scelto per
//  ogni invio.
//
//  Config (env):
//    WHATSAPP_TOKEN          token System User con permessi whatsapp_business_*
//    WHATSAPP_VERIFY_TOKEN   token di verifica del webhook (GET hub.challenge)
//    WHATSAPP_APP_SECRET     app secret per la firma del webhook (fallback META_APP_SECRET)
//    WHATSAPP_GRAPH_VERSION  opzionale, default v23.0
// ─────────────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.facebook.com';

function version(): string {
  return process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
}

function token(): string {
  return process.env.WHATSAPP_TOKEN || '';
}

/** True se il token Cloud API è presente: senza, le route degradano in demo. */
export function waConfigured(): boolean {
  return !!token();
}

export class WhatsAppError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function graphPost(phoneNumberId: string, payload: Record<string, unknown>) {
  const res = await fetch(`${GRAPH}/${version()}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      (data as { error?: { message?: string } })?.error?.message ||
      `HTTP ${res.status}`;
    throw new WhatsAppError(detail, res.status);
  }
  // La Cloud API restituisce { messages: [{ id }] }
  const wamid = (data as { messages?: { id?: string }[] })?.messages?.[0]?.id || null;
  return { wamid, raw: data };
}

/** Messaggio free-form (valido SOLO entro la finestra di servizio di 24h). */
export async function sendText(phoneNumberId: string, to: string, body: string) {
  return graphPost(phoneNumberId, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeTo(to),
    type: 'text',
    text: { preview_url: false, body },
  });
}

/** Messaggio template approvato (necessario per i messaggi business-initiated). */
export async function sendTemplate(
  phoneNumberId: string,
  to: string,
  name: string,
  lang: string,
  components?: unknown[],
) {
  return graphPost(phoneNumberId, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizeTo(to),
    type: 'template',
    template: {
      name,
      language: { code: lang || 'it' },
      ...(components && components.length ? { components } : {}),
    },
  });
}

/** Numero destinatario in cifre con prefisso internazionale (senza '+'). */
function normalizeTo(to: string): string {
  return String(to).replace(/[^\d]/g, '');
}

// ── Webhook ───────────────────────────────────────────────────────────────

/** Verifica la firma X-Hub-Signature-256. Senza app secret accetta (dev/demo). */
export function verifyWebhookSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
  if (!secret) return true;
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface InboundMessage {
  phoneNumberId: string; // numero GENERAH che ha ricevuto (per risalire all'utente)
  wabaId: string;
  contact: string; // numero del cliente finale (wa_id)
  contactName: string;
  wamid: string;
  type: string;
  text: string; // testo (vuoto per tipi non testuali)
  timestamp: number; // epoch seconds
}

/** Estrae i messaggi in entrata dal payload del webhook WhatsApp. */
export function parseInbound(body: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const b = body as {
    object?: string;
    entry?: {
      id?: string;
      changes?: {
        field?: string;
        value?: {
          metadata?: { phone_number_id?: string };
          contacts?: { profile?: { name?: string }; wa_id?: string }[];
          messages?: {
            from?: string;
            id?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
          }[];
        };
      }[];
    }[];
  };
  if (!b || b.object !== 'whatsapp_business_account') return out;
  for (const entry of b.entry || []) {
    const wabaId = entry.id || '';
    for (const ch of entry.changes || []) {
      if (ch.field !== 'messages' || !ch.value) continue;
      const phoneNumberId = ch.value.metadata?.phone_number_id || '';
      const nameByWaId = new Map<string, string>();
      for (const c of ch.value.contacts || []) {
        if (c.wa_id) nameByWaId.set(c.wa_id, c.profile?.name || '');
      }
      for (const m of ch.value.messages || []) {
        const from = m.from || '';
        if (!from || !m.id) continue;
        out.push({
          phoneNumberId,
          wabaId,
          contact: from,
          contactName: nameByWaId.get(from) || '',
          wamid: m.id,
          type: m.type || 'unknown',
          text: m.text?.body || '',
          timestamp: Number(m.timestamp) || Math.floor(Date.now() / 1000),
        });
      }
    }
  }
  return out;
}
