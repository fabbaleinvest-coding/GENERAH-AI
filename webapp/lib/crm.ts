'use client';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · CRM avanzato — tipi, parser lista lead (Excel/CSV) e helper DB
//  per timeline (lead_events), calendario interno (appointments) e log delle
//  automazioni (automation_runs). Tutto lato BROWSER, sotto RLS per-utente.
// ─────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Tassonomia del CRM autonomo ──────────────────────────────────────────────
export type SectorKind =
  | 'clinica'
  | 'veterinaria'
  | 'odontoiatra'
  | 'prodotti_servizi'
  | 'altro';

export type AutomationGoal = 'appuntamento' | 'offerta_chiusura';

export const SECTOR_LABEL: Record<SectorKind, string> = {
  clinica: 'Clinica / Studio medico',
  veterinaria: 'Veterinaria',
  odontoiatra: 'Odontoiatria',
  prodotti_servizi: 'Prodotti / Servizi',
  altro: 'Altro',
};

export const GOAL_LABEL: Record<AutomationGoal, string> = {
  appuntamento: 'Fissare un appuntamento',
  offerta_chiusura: 'Inviare offerta e chiudere',
};

// ── Timeline ─────────────────────────────────────────────────────────────────
export type LeadEventType =
  | 'nota'
  | 'stato'
  | 'email'
  | 'whatsapp'
  | 'chiamata'
  | 'ai'
  | 'appuntamento'
  | 'import';

export interface LeadEvent {
  id: string;
  leadId: string;
  type: LeadEventType;
  channel: string | null;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

// ── Calendario interno ───────────────────────────────────────────────────────
export type ApptStatus = 'proposed' | 'confirmed' | 'done' | 'cancelled';

export const APPT_STATUS_LABEL: Record<ApptStatus, string> = {
  proposed: 'Proposto',
  confirmed: 'Confermato',
  done: 'Concluso',
  cancelled: 'Annullato',
};

export interface Appointment {
  id: string;
  leadId: string | null;
  title: string;
  startsAt: number;
  endsAt: number | null;
  status: ApptStatus;
  location: string | null;
  notes: string | null;
  createdBy: 'ai' | 'admin';
  createdAt: number;
}

// ── Automazioni ──────────────────────────────────────────────────────────────
export interface AutomationRun {
  id: string;
  leadId: string | null;
  automation: string;
  dedupeKey: string | null;
  status: string;
  detail: string | null;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────
//  Parser lista lead (Excel / CSV) — lato browser, con auto-mappatura colonne
// ─────────────────────────────────────────────────────────────────────────
export interface ParsedLeadRow {
  name: string;
  email: string;
  phone: string;
  interest: string;
  notes: string;
}

export interface ParsedLeads {
  rows: ParsedLeadRow[];
  total: number; // righe trovate (incluse quelle scartate perché vuote)
  mapped: { name: boolean; email: boolean; phone: boolean };
}

const HEAD = {
  name: ['nome', 'name', 'nominativo', 'cliente', 'contatto', 'ragione sociale', 'full name', 'fullname'],
  first: ['nome', 'first name', 'firstname', 'first'],
  last: ['cognome', 'last name', 'lastname', 'surname', 'last'],
  email: ['email', 'e-mail', 'mail', 'posta', 'indirizzo email'],
  phone: ['telefono', 'phone', 'cellulare', 'cell', 'mobile', 'tel', 'numero', 'whatsapp'],
  interest: ['interesse', 'interest', 'richiesta', 'servizio', 'prodotto', 'oggetto', 'note interesse'],
  notes: ['note', 'notes', 'commento', 'comment', 'descrizione', 'messaggio', 'message'],
};

function findCol(headers: string[], keys: string[]): number {
  const norm = headers.map((h) => (h || '').toString().trim().toLowerCase());
  // match esatto, poi parziale
  for (const k of keys) {
    const i = norm.indexOf(k);
    if (i >= 0) return i;
  }
  for (let i = 0; i < norm.length; i++) {
    if (keys.some((k) => norm[i].includes(k))) return i;
  }
  return -1;
}

function splitDelim(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, defval: '' });
    return rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));
  }
  // CSV / TSV
  const text = await file.text();
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map(splitDelim);
}

export async function parseLeadsFromFile(file: File): Promise<ParsedLeads> {
  const raw = await readRows(file);
  if (raw.length === 0) return { rows: [], total: 0, mapped: { name: false, email: false, phone: false } };

  const headers = raw[0];
  const cName = findCol(headers, HEAD.name);
  const cFirst = findCol(headers, HEAD.first);
  const cLast = findCol(headers, HEAD.last);
  const cEmail = findCol(headers, HEAD.email);
  const cPhone = findCol(headers, HEAD.phone);
  const cInterest = findCol(headers, HEAD.interest);
  const cNotes = findCol(headers, HEAD.notes);

  // Se non riconosco intestazioni utili, assumo che NON ci sia header e provo a
  // dedurre per posizione (col0=nome, poi prima cella tipo email / telefono).
  const hasHeader = cEmail >= 0 || cPhone >= 0 || cName >= 0 || (cFirst >= 0 && cLast >= 0);
  const body = hasHeader ? raw.slice(1) : raw;

  const rows: ParsedLeadRow[] = [];
  for (const r of body) {
    const pick = (i: number) => (i >= 0 && i < r.length ? String(r[i] || '').trim() : '');
    let name = pick(cName);
    if (!name && (cFirst >= 0 || cLast >= 0)) name = `${pick(cFirst)} ${pick(cLast)}`.trim();
    let email = pick(cEmail);
    let phone = pick(cPhone);
    const interest = pick(cInterest);
    const notes = pick(cNotes);

    // fallback per file senza header: scansiona le celle
    if (!hasHeader) {
      for (const cell of r) {
        const v = String(cell || '').trim();
        if (!email && /@/.test(v)) email = v;
        else if (!phone && /^[+\d][\d\s().-]{6,}$/.test(v)) phone = v;
        else if (!name && /[a-zà-ù]{2,}/i.test(v) && !/@/.test(v)) name = v;
      }
    }
    if (!name && !email && !phone) continue; // riga vuota
    rows.push({
      name: name || 'Contatto',
      email,
      phone,
      interest: interest || 'Lista importata',
      notes,
    });
  }

  return {
    rows,
    total: body.length,
    mapped: { name: cName >= 0 || (cFirst >= 0 && cLast >= 0), email: cEmail >= 0, phone: cPhone >= 0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Mapper riga DB <-> oggetto
// ─────────────────────────────────────────────────────────────────────────
function eventFromRow(r: any): LeadEvent {
  return {
    id: r.id,
    leadId: r.lead_id,
    type: (r.type ?? 'nota') as LeadEventType,
    channel: r.channel ?? null,
    summary: r.summary ?? '',
    payload: (r.payload ?? {}) as Record<string, unknown>,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}

function apptFromRow(r: any): Appointment {
  return {
    id: r.id,
    leadId: r.lead_id ?? null,
    title: r.title ?? '',
    startsAt: r.starts_at ? Date.parse(r.starts_at) : Date.now(),
    endsAt: r.ends_at ? Date.parse(r.ends_at) : null,
    status: (r.status ?? 'proposed') as ApptStatus,
    location: r.location ?? null,
    notes: r.notes ?? null,
    createdBy: (r.created_by ?? 'admin') as 'ai' | 'admin',
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}

function runFromRow(r: any): AutomationRun {
  return {
    id: r.id,
    leadId: r.lead_id ?? null,
    automation: r.automation ?? '',
    dedupeKey: r.dedupe_key ?? null,
    status: r.status ?? 'done',
    detail: r.detail ?? null,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}

// ── Timeline ─────────────────────────────────────────────────────────────────
export async function loadLeadEvents(client: SupabaseClient, leadId: string): Promise<LeadEvent[]> {
  const { data, error } = await client
    .from('lead_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !Array.isArray(data)) return [];
  return data.map(eventFromRow);
}

export async function addLeadEvent(
  client: SupabaseClient,
  userId: string,
  e: { leadId: string; type: LeadEventType; channel?: string | null; summary: string; payload?: Record<string, unknown> }
): Promise<LeadEvent | null> {
  const { data, error } = await client
    .from('lead_events')
    .insert({
      user_id: userId,
      lead_id: e.leadId,
      type: e.type,
      channel: e.channel ?? null,
      summary: e.summary,
      payload: e.payload ?? {},
    })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return eventFromRow(data);
}

// ── Calendario ───────────────────────────────────────────────────────────────
export async function loadAppointments(client: SupabaseClient, userId: string): Promise<Appointment[]> {
  const { data, error } = await client
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('starts_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data.map(apptFromRow);
}

export async function addAppointment(
  client: SupabaseClient,
  userId: string,
  a: {
    leadId?: string | null;
    title: string;
    startsAt: number;
    endsAt?: number | null;
    status?: ApptStatus;
    location?: string | null;
    notes?: string | null;
    createdBy?: 'ai' | 'admin';
  }
): Promise<Appointment | null> {
  const { data, error } = await client
    .from('appointments')
    .insert({
      user_id: userId,
      lead_id: a.leadId ?? null,
      title: a.title,
      starts_at: new Date(a.startsAt).toISOString(),
      ends_at: a.endsAt ? new Date(a.endsAt).toISOString() : null,
      status: a.status ?? 'proposed',
      location: a.location ?? null,
      notes: a.notes ?? null,
      created_by: a.createdBy ?? 'admin',
    })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return apptFromRow(data);
}

export async function updateAppointment(
  client: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<Pick<Appointment, 'title' | 'startsAt' | 'endsAt' | 'status' | 'location' | 'notes'>>
): Promise<void> {
  const row: Record<string, any> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.startsAt !== undefined) row.starts_at = new Date(patch.startsAt).toISOString();
  if (patch.endsAt !== undefined) row.ends_at = patch.endsAt ? new Date(patch.endsAt).toISOString() : null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.notes !== undefined) row.notes = patch.notes;
  await client.from('appointments').update(row).eq('id', id).eq('user_id', userId);
}

export async function removeAppointment(client: SupabaseClient, userId: string, id: string): Promise<void> {
  await client.from('appointments').delete().eq('id', id).eq('user_id', userId);
}

// ── Automazioni ──────────────────────────────────────────────────────────────
export async function loadAutomationRuns(client: SupabaseClient, leadId: string): Promise<AutomationRun[]> {
  const { data, error } = await client
    .from('automation_runs')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !Array.isArray(data)) return [];
  return data.map(runFromRow);
}

export async function logAutomationRun(
  client: SupabaseClient,
  userId: string,
  run: { leadId?: string | null; automation: string; dedupeKey?: string | null; status?: string; detail?: string | null }
): Promise<{ ok: boolean; duplicate: boolean }> {
  const { error } = await client.from('automation_runs').insert({
    user_id: userId,
    lead_id: run.leadId ?? null,
    automation: run.automation,
    dedupe_key: run.dedupeKey ?? null,
    status: run.status ?? 'done',
    detail: run.detail ?? null,
  });
  if (error) {
    // 23505 = unique_violation sull'indice dedupe → azione già eseguita
    const dup = (error as any)?.code === '23505' || /duplicate key|unique/i.test(error.message || '');
    return { ok: false, duplicate: dup };
  }
  return { ok: true, duplicate: false };
}
