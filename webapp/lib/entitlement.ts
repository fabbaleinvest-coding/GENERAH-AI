// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Entitlement per il motore creativo di PIATTAFORMA.
//
//  Il client MCP Higgsfield usa l'account (e i crediti) della piattaforma: la
//  generazione va quindi riservata agli utenti che hanno un piano. La barriera
//  di sicurezza server-side è la sessione Supabase autenticata (niente anonimi).
//
//  Il piano attivo, in demo, vive lato client: viene passato via header
//  `x-generah-plan`. In produzione con enforcement stretto (HIGGSFIELD_REQUIRE_PAID
//  = "true") il piano deve essere uno a pagamento; in demo qualunque piano
//  selezionato (incluso "demo"/"trial") è sufficiente.
// ─────────────────────────────────────────────────────────────────────────

import { userClient } from '@/lib/supabaseServer';
import { PLAN_ORDER, type PlanId } from '@/lib/plans';

const PAID = new Set<string>(PLAN_ORDER as PlanId[]); // starter|growth|premium|enterprise

export interface Entitlement {
  ok: boolean;
  status: number;
  userId?: string;
  email?: string;
  plan?: string;
  reason?: string;
}

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

export async function requireEntitledUser(req: Request): Promise<Entitlement> {
  const tok = bearer(req);
  if (!tok) return { ok: false, status: 401, reason: 'auth' };
  try {
    const { data, error } = await userClient(tok).auth.getUser();
    if (error || !data?.user) return { ok: false, status: 401, reason: 'auth' };

    const plan = (req.headers.get('x-generah-plan') || '').trim().toLowerCase();
    const strict = process.env.HIGGSFIELD_REQUIRE_PAID === 'true';
    if (strict && !PAID.has(plan)) {
      return { ok: false, status: 402, reason: 'paid_plan_required', userId: data.user.id, email: data.user.email || undefined, plan };
    }
    return { ok: true, status: 200, userId: data.user.id, email: data.user.email || undefined, plan: plan || undefined };
  } catch {
    return { ok: false, status: 401, reason: 'auth' };
  }
}
