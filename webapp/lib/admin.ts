// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Gating amministratore
//
//  Le route /api/admin/* sono riservate al titolare. Un utente è admin se la
//  sua email (Supabase Auth) è elencata in ADMIN_EMAILS (separate da virgola).
//
//    ADMIN_EMAILS="anna@azienda.it, ops@azienda.it"
//
//  Se ADMIN_EMAILS è vuoto, nessuno è admin (le route rispondono 403): scelta
//  prudente, così l'area admin non resta aperta per dimenticanza.
// ───────────────────────────────────────────────────────────────────────────

import { userClient } from '@/lib/supabaseServer';

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export interface AdminAuth {
  ok: boolean;
  status: number;
  email?: string;
  userId?: string;
  reason?: string;
}

function bearer(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

/** Verifica bearer Supabase + appartenenza a ADMIN_EMAILS. */
export async function requireAdmin(req: Request): Promise<AdminAuth> {
  const tok = bearer(req);
  if (!tok) return { ok: false, status: 401, reason: 'auth' };
  const { data, error } = await userClient(tok).auth.getUser();
  if (error || !data?.user) return { ok: false, status: 401, reason: 'auth' };
  const email = data.user.email || '';
  if (adminEmails().length === 0) return { ok: false, status: 403, reason: 'no_admins_configured' };
  if (!isAdminEmail(email)) return { ok: false, status: 403, reason: 'not_admin' };
  return { ok: true, status: 200, email, userId: data.user.id };
}
