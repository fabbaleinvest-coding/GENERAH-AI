'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  PlanId,
  MeterKey,
  priceWithDiscount,
} from './plans';
import { supabase, KB_BUCKET, AD_SPOTS_BUCKET } from './supabase';
import { scenesToSrt } from './subtitles';
import { prepareContacts } from './contacts';
import {
  type SectorKind,
  type AutomationGoal,
  type AgentGoal,
  deriveArchetype,
  type DealStage,
  type LeadEvent,
  type LeadEventType,
  type Appointment,
  type ApptStatus,
  parseLeadsFromFile,
  loadLeadEvents,
  addLeadEvent,
  loadAppointments,
  addAppointment,
  updateAppointment,
  removeAppointment,
  logAutomationRun,
} from './crm';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH IT · store reale su Supabase (DB + Auth + Storage).
//  L'oggetto User e l'interfaccia StoreCtx restano identici alla versione
//  demo: i componenti non cambiano. La persistenza però è su Postgres
//  (tabella public.profiles, RLS owner-only), l'autenticazione su Supabase
//  Auth (email+password) e i file della knowledge base su Supabase Storage.
// ─────────────────────────────────────────────────────────────────────────
export type KbIndexStatus = 'pending' | 'indexed' | 'unsupported' | 'error';

export interface KbFile {
  id: string;
  name: string;
  size: number;
  kind: string;
  addedAt: number;
  path?: string; // percorso su Supabase Storage (bucket kb)
  indexStatus?: KbIndexStatus; // stato indicizzazione RAG
  chunks?: number; // numero di frammenti indicizzati
}

export interface KbSource {
  file_name: string;
  snippet: string;
  similarity: number | null;
}

export interface SocialPostDraft {
  week: string;
  format: string;
  title: string;
  bullets: string[];
  caption?: string;
  imagePrompt?: string;
  imageUrl?: string;
}

export interface SocialPost extends SocialPostDraft {
  id: string;
  scheduledFor: number;
  status: 'programmato';
}

// Post in coda di pubblicazione diretta (Graph). Riflette social_posts_queue.
export interface PublishNetworkResult {
  network: string;
  ok: boolean;
  id?: string;
  error?: string;
}
export type QueuedPostStatus = 'pending' | 'publishing' | 'published' | 'partial' | 'failed';
export interface QueuedSocialPost {
  id: string;
  networks: string[];
  caption: string;
  imageUrl?: string;
  scheduledAt: number;
  status: QueuedPostStatus;
  results: PublishNetworkResult[];
  attempts: number;
  publishedAt?: number;
  createdAt: number;
}

export type LeadStatus =
  | 'nuovo'
  | 'contattato'
  | 'qualificato'
  | 'appuntamento'
  | 'cliente'
  | 'perso';

export interface AiDraft {
  emailSubject: string;
  emailBody: string;
  whatsapp: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  channel: string;
  interest: string;
  status: LeadStatus;
  score: number;
  notes: string;
  // qualifica AI (Claude Opus 4.8)
  aiSummary: string;
  nextAction: string;
  aiDraft: AiDraft | null;
  // CRM operativo
  tags: string[];
  importBatch: string | null;
  consent: boolean;
  automationPaused: boolean;
  createdAt: number;
  lastTouch: number;
  // Stato/memoria trattativa (CRM avanzato)
  dealStage?: DealStage;
  progressSummary?: string;
  lastInteractionAt?: number;
}

export const LeadStatusOrder: LeadStatus[] = [
  'nuovo',
  'contattato',
  'qualificato',
  'appuntamento',
  'cliente',
  'perso',
];

export interface CampaignScene {
  n: number;
  durationSec: number;
  visual: string;
  voiceover: string;
  onScreenText: string;
}

export interface CampaignBrief {
  campaignName: string;
  objective: string;
  audienceDescription: string;
  ageRange: string;
  gender: string;
  interests: string[];
  geoSuggestion: string;
  postText: string;
  headline: string;
  cta: string;
  leadFormFields: string[];
  music: string;
  videoConcept: string;
  scenes: CampaignScene[];
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: 'bozza' | 'in_revisione' | 'attiva' | 'completata';
  dailyBudget: number;
  geo: string;
  audience: string;
  ageRange: string;
  interests: string[];
  postText: string;
  videoConcept: string;
  lookalike: boolean;
  brief?: CampaignBrief; // brief AI completo (strato 1)
  leads: number;
  spend: number;
  createdAt: number;
}

export interface AlertItem {
  id: string;
  meter: MeterKey;
  remainingPct: number;
  createdAt: number;
  read: boolean;
}

export interface Meter {
  total: number;
  used: number;
}

export interface WaNumber {
  id: string;
  e164: string;
  phoneNumberId: string | null;
  displayName: string;
  status: string; // 'assigned' | 'pending'
  pending: boolean; // true = richiesto ma nessun numero libero nel pool
}

export interface WaMessage {
  id: string;
  contact: string; // E.164 del cliente finale
  direction: 'inbound' | 'outbound';
  body: string;
  msgType: string;
  templateName: string | null;
  status: string;
  wamid: string | null;
  createdAt: number;
}

export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  cellulare: string;
  settore: string;
  password: string; // non usata in modalità Supabase (la password vive in Auth)
  createdAt: number;
  // piano
  plan: PlanId | null;
  planMode: 'demo' | 'paid' | null;
  discountCode: string | null;
  featurePlan: PlanId | null;
  paidCanone: number;
  paidSetup: number;
  // contatori
  meters: Record<MeterKey, Meter>;
  // onboarding
  kb: KbFile[];
  igConnected: boolean;
  fbConnected: boolean;
  metricoolConnected: boolean;
  socialPosts: SocialPost[];
  socialSkipped: boolean;
  metaConnected: boolean;
  phase2Skipped: boolean;
  videoConsultUsed: boolean;
  onboardingDone: boolean;
  waAutoreply: boolean; // auto-reply WhatsApp AI attivo (default true)
  // CRM autonomo (testa)
  sectorKind: SectorKind | null;
  automationGoal: AutomationGoal | null;
  agentGoals?: AgentGoal[];
  crmAutonomy: 'auto' | 'approva';
  crmBusinessHours: Record<string, unknown>;
  // dati
  campaigns: Campaign[];
  leads: Lead[];
  alerts: AlertItem[];
  // email di invio (Resend, dominio verificato)
  sendingEmail?: string;
  sendingFromName?: string;
  sendingDomain?: string;
  emailVerified?: boolean;
  waNumber: WaNumber | null; // numero WhatsApp assegnato (derivato, non persistito sul profilo)
}

export interface EmailDnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  status?: string;
  ttl?: string;
  priority?: number;
}

const emptyMeters = (): Record<MeterKey, Meter> => ({
  phone: { total: 0, used: 0 },
  video: { total: 0, used: 0 },
  whatsapp: { total: 0, used: 0 },
  ads: { total: 0, used: 0 },
});

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// UUID valido per la chiave primaria della tabella leads.
function leadId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {
    /* fallback sotto */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function leadToRow(userId: string, l: Lead) {
  return {
    id: l.id,
    user_id: userId,
    name: l.name,
    phone: l.phone,
    email: l.email,
    source: l.source,
    channel: l.channel,
    interest: l.interest,
    status: l.status,
    score: l.score,
    notes: l.notes,
    ai_summary: l.aiSummary,
    next_action: l.nextAction,
    ai_draft: l.aiDraft,
    tags: l.tags ?? [],
    deal_stage: l.dealStage ?? null,
    progress_summary: l.progressSummary ?? null,
    last_interaction_at: l.lastInteractionAt ? new Date(l.lastInteractionAt).toISOString() : null,
    import_batch: l.importBatch ?? null,
    consent: l.consent ?? false,
    automation_paused: l.automationPaused ?? false,
    created_at: new Date(l.createdAt).toISOString(),
    last_touch: new Date(l.lastTouch).toISOString(),
  };
}

function leadFromRow(r: any): Lead {
  return {
    id: r.id,
    name: r.name ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    source: r.source ?? '',
    channel: r.channel ?? '',
    interest: r.interest ?? '',
    status: (r.status ?? 'nuovo') as LeadStatus,
    score: Number(r.score ?? 0),
    notes: r.notes ?? '',
    aiSummary: r.ai_summary ?? '',
    nextAction: r.next_action ?? '',
    aiDraft: (r.ai_draft ?? null) as AiDraft | null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    dealStage: (r.deal_stage ?? undefined) as DealStage | undefined,
    progressSummary: r.progress_summary ?? undefined,
    lastInteractionAt: r.last_interaction_at ? new Date(r.last_interaction_at).getTime() : undefined,
    importBatch: r.import_batch ?? null,
    consent: !!r.consent,
    automationPaused: !!r.automation_paused,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
    lastTouch: r.last_touch ? Date.parse(r.last_touch) : Date.now(),
  };
}

async function loadLeads(userId: string): Promise<Lead[]> {
  try {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return Array.isArray(data) ? data.map(leadFromRow) : [];
  } catch {
    return [];
  }
}

// Numero WhatsApp assegnato all'utente (RLS: vede solo il proprio). Se non è
// assegnato ma esiste una richiesta in attesa, restituisce lo stato "pending".
async function loadWaNumber(userId: string): Promise<WaNumber | null> {
  try {
    const { data } = await supabase
      .from('wa_numbers')
      .select('id, e164, phone_number_id, display_name, status')
      .eq('assigned_user_id', userId)
      .eq('status', 'assigned')
      .maybeSingle();
    if (data) {
      return {
        id: (data as any).id,
        e164: (data as any).e164,
        phoneNumberId: (data as any).phone_number_id ?? null,
        displayName: (data as any).display_name ?? '',
        status: 'assigned',
        pending: false,
      };
    }
    const { data: req } = await supabase
      .from('wa_number_requests')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();
    if (req) {
      return { id: '', e164: '', phoneNumberId: null, displayName: '', status: 'pending', pending: true };
    }
    return null;
  } catch {
    return null;
  }
}

function waMessageFromRow(r: any): WaMessage {
  return {
    id: String(r.id),
    contact: String(r.contact || ''),
    direction: r.direction === 'inbound' ? 'inbound' : 'outbound',
    body: String(r.body || ''),
    msgType: String(r.msg_type || 'text'),
    templateName: r.template_name ?? null,
    status: String(r.status || ''),
    wamid: r.wamid ?? null,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}

function queuedFromRow(r: any): QueuedSocialPost {
  return {
    id: r.id,
    networks: Array.isArray(r.networks) ? (r.networks as string[]) : [],
    caption: r.caption ?? '',
    imageUrl: r.image_url ?? undefined,
    scheduledAt: r.scheduled_at ? Date.parse(r.scheduled_at) : Date.now(),
    status: (r.status ?? 'pending') as QueuedPostStatus,
    results: Array.isArray(r.results) ? (r.results as PublishNetworkResult[]) : [],
    attempts: Number(r.attempts ?? 0),
    publishedAt: r.published_at ? Date.parse(r.published_at) : undefined,
    createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Mappatura riga DB <-> oggetto User
// ─────────────────────────────────────────────────────────────────────────
function rowToUser(r: any): User {
  return {
    id: r.id,
    nome: r.nome ?? '',
    cognome: r.cognome ?? '',
    email: r.email ?? '',
    cellulare: r.cellulare ?? '',
    settore: r.settore ?? '',
    password: '',
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    plan: (r.plan ?? null) as PlanId | null,
    planMode: (r.plan_mode ?? null) as 'demo' | 'paid' | null,
    discountCode: r.discount_code ?? null,
    featurePlan: (r.feature_plan ?? null) as PlanId | null,
    paidCanone: Number(r.paid_canone ?? 0),
    paidSetup: Number(r.paid_setup ?? 0),
    meters: (r.meters ?? emptyMeters()) as Record<MeterKey, Meter>,
    kb: Array.isArray(r.kb) ? (r.kb as KbFile[]) : [],
    igConnected: !!r.ig_connected,
    fbConnected: !!r.fb_connected,
    metricoolConnected: !!r.metricool_connected,
    socialPosts: Array.isArray(r.social_posts) ? (r.social_posts as SocialPost[]) : [],
    socialSkipped: !!r.social_skipped,
    metaConnected: !!r.meta_connected,
    phase2Skipped: !!r.phase2_skipped,
    videoConsultUsed: !!r.video_consult_used,
    onboardingDone: !!r.onboarding_done,
    waAutoreply: r.wa_autoreply !== false,
    sectorKind: (r.sector_kind ?? null) as SectorKind | null,
    automationGoal: (r.automation_goal ?? null) as AutomationGoal | null,
    agentGoals: Array.isArray(r.agent_goals) ? (r.agent_goals as AgentGoal[]) : [],
    crmAutonomy: (r.crm_autonomy ?? 'auto') as 'auto' | 'approva',
    crmBusinessHours: (r.crm_business_hours ?? {}) as Record<string, unknown>,
    campaigns: Array.isArray(r.campaigns) ? (r.campaigns as Campaign[]) : [],
    leads: Array.isArray(r.leads) ? (r.leads as Lead[]) : [],
    alerts: Array.isArray(r.alerts) ? (r.alerts as AlertItem[]) : [],
    sendingEmail: r.sending_email ?? '',
    sendingFromName: r.sending_from_name ?? '',
    sendingDomain: r.sending_domain ?? '',
    emailVerified: !!r.email_verified,
    waNumber: null, // caricato separatamente da loadWaNumber (RLS su wa_numbers)
  };
}

function userToRow(u: User) {
  return {
    id: u.id,
    email: u.email,
    nome: u.nome,
    cognome: u.cognome,
    cellulare: u.cellulare,
    settore: u.settore,
    plan: u.plan,
    plan_mode: u.planMode,
    discount_code: u.discountCode,
    feature_plan: u.featurePlan,
    paid_canone: u.paidCanone,
    paid_setup: u.paidSetup,
    kb: u.kb,
    ig_connected: u.igConnected,
    fb_connected: u.fbConnected,
    metricool_connected: u.metricoolConnected,
    social_posts: u.socialPosts,
    social_skipped: u.socialSkipped,
    meta_connected: u.metaConnected,
    phase2_skipped: u.phase2Skipped,
    video_consult_used: u.videoConsultUsed,
    onboarding_done: u.onboardingDone,
    wa_autoreply: u.waAutoreply,
    sector_kind: u.sectorKind,
    automation_goal: u.automationGoal,
    agent_goals: u.agentGoals ?? [],
    crm_autonomy: u.crmAutonomy,
    crm_business_hours: u.crmBusinessHours,
    campaigns: u.campaigns,
    alerts: u.alerts,
  };
}

function mapAuthError(msg?: string): string {
  const m = (msg || '').toLowerCase();
  if (/invalid login credentials/.test(m)) return 'Email o password non corretti.';
  if (/email not confirmed/.test(m)) return 'Account non ancora confermato.';
  if (/rate limit/.test(m)) return 'Troppi tentativi, riprova tra poco.';
  if (/password should be at least/.test(m)) return 'La password deve avere almeno 6 caratteri.';
  return msg || 'Operazione non riuscita.';
}

// ─────────────────────────────────────────────────────────────────────────
//  Context
// ─────────────────────────────────────────────────────────────────────────
interface StoreCtx {
  ready: boolean;
  user: User | null;
  register: (d: {
    nome: string;
    cognome: string;
    email: string;
    cellulare: string;
    settore: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  activatePlan: (planId: PlanId, code: string | null, mode: 'demo' | 'paid') => void;
  consume: (meter: MeterKey, amount: number) => void;
  topUp: (meter: MeterKey, qty: number) => void;
  ensureWaNumber: () => void; // assegna/recupera il numero WhatsApp dell'utente
  addKb: (files: File[]) => void;
  removeKb: (id: string) => void;
  askKb: (question: string) => Promise<{ ok: boolean; answer?: string; sources?: KbSource[]; error?: string }>;
  connectSocial: (network: 'ig' | 'fb' | 'metricool') => void;
  scheduleSocialPosts: (
    posts: SocialPostDraft[]
  ) => Promise<{
    ok: boolean;
    remote: boolean;
    channel?: 'graph' | 'metricool';
    scheduled?: number;
    error?: string;
  }>;
  generateSocialPlan: () => Promise<{ ok: boolean; posts?: SocialPostDraft[]; error?: string }>;
  generateInfographic: (
    draft: SocialPostDraft
  ) => Promise<{ ok: boolean; configured: boolean; imageUrl?: string; error?: string }>;
  connectMetricool: (
    token: string,
    mcUserId: string,
    blogId?: string
  ) => Promise<{
    ok: boolean;
    needBrand?: boolean;
    brands?: { blogId: string; label: string; networks: string[] }[];
    connected?: boolean;
    brand?: { blogId: string; label: string; networks: string[] };
    error?: string;
  }>;
  disconnectMetricool: () => Promise<void>;
  skipSocial: () => void;
  connectMeta: () => Promise<{ ok: boolean; error?: string }>;
  skipPhase2: () => void;
  useVideoConsult: () => void;
  finishOnboarding: () => void;
  launchCampaign: (
    c: Omit<Campaign, 'id' | 'createdAt' | 'leads' | 'spend' | 'status'>,
    opts?: { demoLeads?: boolean }
  ) => void;
  refreshLeads: () => Promise<void>;
  fetchSocialQueue: () => Promise<QueuedSocialPost[]>;
  cancelSocialPost: (id: string) => Promise<void>;
  fetchWaMessages: () => Promise<WaMessage[]>;
  sendWhatsApp: (
    to: string,
    opts: { text?: string; template?: string; lang?: string },
  ) => Promise<{
    ok: boolean;
    reason?: string;
    needTemplate?: boolean;
    configured?: boolean;
    error?: string;
    meter?: unknown;
  }>;
  draftWhatsApp: (contact: string, recent: { direction: string; body: string }[]) => Promise<string>;
  setWaAutoreply: (on: boolean) => void;
  emailDomainStatus: () => Promise<{
    ok: boolean;
    sendingEmail?: string | null;
    status?: string;
    verified?: boolean;
    records?: EmailDnsRecord[];
    domain?: string | null;
    error?: string;
  }>;
  setupSendingEmail: (
    email: string,
    fromName?: string
  ) => Promise<{ ok: boolean; status?: string; verified?: boolean; records?: EmailDnsRecord[]; error?: string }>;
  verifySendingDomain: () => Promise<{
    ok: boolean;
    status?: string;
    verified?: boolean;
    records?: EmailDnsRecord[];
    error?: string;
  }>;
  sendLeadEmail: (to: string, subject: string, body: string) => Promise<{ ok: boolean; id?: string; error?: string }>;
  generateCampaignBrief: (input?: {
    objective?: string;
    budgetDaily?: number;
    geo?: string;
    ageRange?: string;
  }) => Promise<{ ok: boolean; brief?: CampaignBrief; error?: string }>;
  generateAdVideo: (
    brief: CampaignBrief,
    onProgress?: (msg: string) => void
  ) => Promise<{ ok: boolean; clips: string[]; audioUrl: string | null; srt: string; error?: string }>;
  publishMetaCampaign: (
    brief: CampaignBrief,
    params: {
      videoUrl: string;
      dailyBudgetEur: number;
      geoText?: string;
      ageRange?: string;
      customAudienceIds?: string[];
    }
  ) => Promise<{
    ok: boolean;
    configured: boolean;
    reason?: string;
    ids?: { campaignId: string; adSetId: string; adId: string; leadFormId: string };
    error?: string;
  }>;
  buildLookalike: (file: File) => Promise<{
    ok: boolean;
    configured: boolean;
    count?: number;
    lookalikeId?: string | null;
    customAudienceId?: string;
    note?: string;
    error?: string;
  }>;
  uploadAdSpot: (blob: Blob) => Promise<{ ok: boolean; url?: string; error?: string }>;
  addLead: (
    l: Omit<Lead, 'id' | 'createdAt' | 'lastTouch' | 'tags' | 'importBatch' | 'consent' | 'automationPaused'> &
      Partial<Pick<Lead, 'tags' | 'importBatch' | 'consent' | 'automationPaused'>>
  ) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  enrichLead: (id: string) => Promise<{ ok: boolean; error?: string }>;
  removeLead: (id: string) => void;
  // CRM avanzato
  classifySector: () => Promise<{
    ok: boolean;
    error?: string;
    sectorKind?: SectorKind | null;
    automationGoal?: AutomationGoal | null;
    rationale?: string;
  }>;
  setAiGoals: (goals: AgentGoal[], sectorKind?: SectorKind | null) => void;
  setCrmAutonomy: (mode: 'auto' | 'approva') => void;
  automateLead: (
    id: string,
    opts?: { force?: boolean }
  ) => Promise<{
    ok: boolean;
    error?: string;
    duplicate?: boolean;
    result?: {
      automation: string;
      channel: string;
      summary: string;
      emailSubject: string;
      message: string;
      appointment: { title: string; whenHint: string } | null;
      newStatus: string;
      mode: 'auto' | 'approva';
    };
  }>;
  importLeadsFile: (file: File) => Promise<{ ok: boolean; count: number; batch?: string; error?: string }>;
  leadTimeline: (leadId: string) => Promise<LeadEvent[]>;
  addLeadNote: (leadId: string, note: string, type?: LeadEventType) => Promise<LeadEvent | null>;
  listAppointments: () => Promise<Appointment[]>;
  createAppointment: (a: {
    leadId?: string | null;
    title: string;
    startsAt: number;
    endsAt?: number | null;
    status?: ApptStatus;
    location?: string | null;
    notes?: string | null;
    createdBy?: 'ai' | 'admin';
  }) => Promise<Appointment | null>;
  editAppointment: (
    id: string,
    patch: Partial<Pick<Appointment, 'title' | 'startsAt' | 'endsAt' | 'status' | 'location' | 'notes'>>
  ) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  markAlertsRead: () => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);


// genera lead demo coerenti col settore (per le campagne)
const FIRST = ['Marco', 'Giulia', 'Luca', 'Sara', 'Andrea', 'Elena', 'Paolo', 'Chiara', 'Davide', 'Martina', 'Simone', 'Federica'];
const LAST = ['Rossi', 'Bianchi', 'Ferrari', 'Russo', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Conti', 'De Luca'];
const INTERESTS = ['Preventivo', 'Informazioni', 'Appuntamento', 'Catalogo', 'Disponibilità', 'Consulenza'];

// Timestamp → "YYYY-MM-DDTHH:mm:ss" (ora locale, senza Z) alle 10:00, formato
// richiesto da Metricool insieme alla timezone.
function toLocalIso(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00:00`;
}

function makeLead(source: string, channel: string): Lead {
  const f = FIRST[Math.floor(Math.random() * FIRST.length)];
  const l = LAST[Math.floor(Math.random() * LAST.length)];
  const name = `${f} ${l}`;
  return {
    id: leadId(),
    name,
    phone: `+39 3${Math.floor(10 + Math.random() * 89)} ${Math.floor(1000000 + Math.random() * 8999999)}`,
    email: `${f.toLowerCase()}.${l.toLowerCase().replace(' ', '')}@email.it`,
    source,
    channel,
    interest: INTERESTS[Math.floor(Math.random() * INTERESTS.length)],
    status: 'nuovo',
    score: Math.floor(40 + Math.random() * 60),
    notes: '',
    aiSummary: '',
    nextAction: '',
    aiDraft: null,
    tags: [],
    importBatch: null,
    consent: false,
    automationPaused: false,
    createdAt: Date.now(),
    lastTouch: Date.now(),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // riferimento sempre aggiornato all'utente (per le funzioni async)
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Persistenza su DB (upsert della riga profilo). Best-effort in background.
  async function persist(u: User) {
    try {
      await supabase.from('profiles').upsert(userToRow(u));
    } catch {
      /* la UI ha già lo stato locale; il prossimo cambiamento riproverà */
    }
  }

  // Aggiorna lo stato locale (sincrono per la UI) e salva su DB in background.
  function mutateUser(fn: (u: User) => User) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      void persist(next);
      return next;
    });
  }

  async function loadProfile(id: string): Promise<User | null> {
    // Piccolo retry: alla primissima registrazione la riga profilo è creata
    // dal trigger un istante dopo il signUp.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (data) {
        const u = rowToUser(data);
        u.leads = await loadLeads(id);
        u.waNumber = await loadWaNumber(id);
        return u;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  }

  // Bootstrap sessione + sottoscrizione ai cambi di auth (logout da altre tab).
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const u = await loadProfile(data.session.user.id);
        if (mounted) {
          setUser(u);
          setReady(true);
        }
      } else if (mounted) {
        setUser(null);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) setUser(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const register: StoreCtx['register'] = async (d) => {
    const email = d.email.trim().toLowerCase();
    const { error: signErr } = await supabase.auth.signUp({
      email,
      password: d.password,
      options: {
        data: {
          nome: d.nome.trim(),
          cognome: d.cognome.trim(),
          cellulare: d.cellulare.trim(),
          settore: d.settore.trim(),
        },
      },
    });
    if (signErr && /(registered|already|exists)/i.test(signErr.message)) {
      return { ok: false, error: 'Esiste già un account con questa email.' };
    }
    // Login per ottenere la sessione (il trigger auto-conferma rende possibile
    // l'accesso immediato, anche se il signUp non ha restituito una sessione).
    const { data: sess, error: inErr } = await supabase.auth.signInWithPassword({
      email,
      password: d.password,
    });
    if (inErr || !sess.session?.user) {
      return { ok: false, error: mapAuthError(inErr?.message || signErr?.message) };
    }
    const u = await loadProfile(sess.session.user.id);
    setUser(u);
    return { ok: true };
  };

  const login: StoreCtx['login'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.session?.user) {
      return { ok: false, error: mapAuthError(error?.message) };
    }
    const u = await loadProfile(data.session.user.id);
    setUser(u);
    return { ok: true };
  };

  const logout = () => {
    void supabase.auth.signOut();
    setUser(null);
  };

  // Assicura un numero WhatsApp all'utente: assegna un numero libero del pool
  // (idempotente). Se il pool è vuoto resta "in attesa" (richiesta registrata
  // lato DB come avviso per il titolare).
  const ensureWaNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('assign_wa_number');
      if (error || !data) return;
      const d = data as {
        assigned?: boolean;
        pending?: boolean;
        id?: string;
        e164?: string;
        phone_number_id?: string | null;
        display_name?: string;
      };
      setUser((prev) => {
        if (!prev) return prev;
        if (d.assigned) {
          return {
            ...prev,
            waNumber: {
              id: String(d.id || ''),
              e164: String(d.e164 || ''),
              phoneNumberId: d.phone_number_id ?? null,
              displayName: String(d.display_name || ''),
              status: 'assigned',
              pending: false,
            },
          };
        }
        if (d.pending) {
          return {
            ...prev,
            waNumber: { id: '', e164: '', phoneNumberId: null, displayName: '', status: 'pending', pending: true },
          };
        }
        return prev;
      });
    } catch {
      /* offline: nessun cambiamento */
    }
  };

  const activatePlan: StoreCtx['activatePlan'] = (planId, code, mode) => {
    const priced = priceWithDiscount(planId, code);
    const fp = priced.featurePlan;
    // Ottimistico locale (incl. meters per UI immediata). I campi del profilo
    // vengono persistiti da mutateUser; i `meters` NO (colonna blindata): li
    // alloca in modo autorevole la funzione DB provision_plan_meters.
    mutateUser((u) => ({
      ...u,
      plan: planId,
      planMode: mode,
      discountCode: priced.discount?.code ?? null,
      featurePlan: fp.id,
      paidCanone: priced.canone,
      paidSetup: priced.setup,
      meters: {
        phone: { total: fp.phone, used: 0 },
        video: { total: fp.video, used: 0 },
        whatsapp: { total: fp.whatsapp, used: 0 },
        ads: { total: fp.ads, used: 0 },
      },
      alerts: [],
    }));
    // Provisioning autorevole dei meter lato server + riconciliazione.
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('provision_plan_meters', {
          p_plan_id: planId,
          p_feature_plan_id: fp.id,
        });
        if (error || !data) return;
        setUser((prev) => (prev ? { ...prev, meters: data as Record<MeterKey, Meter> } : prev));
      } catch {
        // offline: resta l'allocazione ottimistica locale
      }
    })();
    // Assegnazione automatica del numero WhatsApp all'attivazione del piano.
    void ensureWaNumber();
  };

  // Consumo meter: aggiornamento ottimistico locale (UI reattiva) + consumo
  // AUTOREVOLE lato server (funzione DB atomica). Lo stato locale viene poi
  // riconciliato con il valore del server, che rileva anche la soglia del 10%.
  const consume: StoreCtx['consume'] = (meter, amount) => {
    // 1) ottimistico (immediato)
    setUser((prev) => {
      if (!prev) return prev;
      const m = prev.meters[meter];
      if (!m || m.total <= 0) return prev;
      const used = Math.min(m.total, m.used + amount);
      return { ...prev, meters: { ...prev.meters, [meter]: { total: m.total, used } } };
    });

    // 2) autorevole sul server + riconciliazione/alert
    void (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;
        const res = await fetch('/api/meter/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ meter, amount }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d || d.ok === false || d.in_plan === false) return;
        setUser((prev) => {
          if (!prev) return prev;
          const m = prev.meters[meter];
          if (!m) return prev;
          const total = Number(d.total);
          const used = Number(d.used);
          let alerts = prev.alerts;
          if (d.alert && !prev.alerts.some((a) => a.meter === meter && !a.read)) {
            alerts = [
              {
                id: uid(),
                meter,
                remainingPct: total > 0 ? Number(d.remaining) / total : 0,
                createdAt: Date.now(),
                read: false,
              },
              ...prev.alerts,
            ];
          }
          return { ...prev, meters: { ...prev.meters, [meter]: { total, used } }, alerts };
        });
      } catch {
        // offline / errore: resta l'aggiornamento ottimistico locale
      }
    })();
  };

  const topUp: StoreCtx['topUp'] = (meter, qty) => {
    // Ottimistico locale + svuotamento alert (persistito). I `meters` reali li
    // aggiorna la funzione DB topup_meter (colonna blindata lato client).
    mutateUser((u) => {
      const m = u.meters[meter];
      return {
        ...u,
        meters: { ...u.meters, [meter]: { total: m.total + qty, used: m.used } },
        alerts: u.alerts.filter((a) => a.meter !== meter),
      };
    });
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('topup_meter', { p_meter: meter, p_qty: qty });
        if (error || !data) return;
        setUser((prev) => (prev ? { ...prev, meters: data as Record<MeterKey, Meter> } : prev));
      } catch {
        // offline: resta l'aumento ottimistico locale
      }
    })();
  };

  const setKbStatus = (id: string, patch: Partial<KbFile>) =>
    mutateUser((cur) => ({
      ...cur,
      kb: cur.kb.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    }));

  // Indicizzazione RAG di un singolo file: estrae il testo (browser), lo manda
  // a /api/kb/ingest (chunk + embeddings + insert) e aggiorna lo stato.
  const indexKbFile = async (meta: KbFile, file?: File) => {
    if (!file) {
      setKbStatus(meta.id, { indexStatus: 'error' });
      return;
    }
    try {
      const { extractText } = await import('./extract');
      const { text, supported } = await extractText(file);
      if (!supported || !text.trim()) {
        setKbStatus(meta.id, { indexStatus: 'unsupported', chunks: 0 });
        return;
      }
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setKbStatus(meta.id, { indexStatus: 'error' });
        return;
      }
      const res = await fetch('/api/kb/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileId: meta.id, fileName: meta.name, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setKbStatus(meta.id, { indexStatus: 'error' });
        return;
      }
      const n = Number(data?.chunks) || 0;
      setKbStatus(meta.id, { indexStatus: n > 0 ? 'indexed' : 'unsupported', chunks: n });
    } catch {
      setKbStatus(meta.id, { indexStatus: 'error' });
    }
  };

  const addKb: StoreCtx['addKb'] = (files) => {
    const u = userRef.current;
    if (!u || files.length === 0) return;
    void (async () => {
      const added: KbFile[] = [];
      const fileById: Record<string, File> = {};
      for (const f of files) {
        const id = uid();
        const safe = f.name.replace(/[^\w.\-]+/g, '_');
        const path = `${u.id}/${id}-${safe}`;
        try {
          await supabase.storage
            .from(KB_BUCKET)
            .upload(path, f, { upsert: false, contentType: f.type || undefined });
        } catch {
          /* upload best-effort: registriamo comunque i metadati */
        }
        added.push({
          id,
          name: f.name,
          size: f.size,
          kind: f.type || 'file',
          addedAt: Date.now(),
          path,
          indexStatus: 'pending',
        });
        fileById[id] = f;
      }
      mutateUser((cur) => ({ ...cur, kb: [...cur.kb, ...added] }));
      // Indicizzazione RAG (estrazione testo + embeddings) per ciascun file.
      for (const meta of added) void indexKbFile(meta, fileById[meta.id]);
    })();
  };

  const removeKb: StoreCtx['removeKb'] = (id) => {
    const u = userRef.current;
    const f = u?.kb.find((x) => x.id === id);
    if (f?.path) {
      void supabase.storage.from(KB_BUCKET).remove([f.path]).catch(() => {});
    }
    // Rimuove anche i frammenti indicizzati (RLS: solo i propri).
    void supabase.from('kb_chunks').delete().eq('kb_file_id', id);
    mutateUser((cur) => ({ ...cur, kb: cur.kb.filter((x) => x.id !== id) }));
  };

  const askKb: StoreCtx['askKb'] = async (question) => {
    const q = (question || '').trim();
    if (!q) return { ok: false, error: 'Inserisci una domanda' };
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return { ok: false, error: 'Sessione non valida' };
      const res = await fetch('/api/kb/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      return {
        ok: true,
        answer: String(data?.answer || ''),
        sources: Array.isArray(data?.sources) ? (data.sources as KbSource[]) : [],
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const connectSocial: StoreCtx['connectSocial'] = (network) =>
    mutateUser((u) => ({
      ...u,
      igConnected: network === 'ig' ? true : u.igConnected,
      fbConnected: network === 'fb' ? true : u.fbConnected,
      metricoolConnected: network === 'metricool' ? true : u.metricoolConnected,
    }));

  // Programma i post: salva lo schedule locale (UI) e, se Metricool è collegato,
  // crea davvero i post programmati via API Metricool con l'infografica allegata.
  const scheduleSocialPosts: StoreCtx['scheduleSocialPosts'] = async (posts) => {
    const u = userRef.current;
    if (!u) return { ok: false, remote: false, error: 'Utente non disponibile' };
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const scheduled: SocialPost[] = posts.map((p, i) => ({
      id: uid(),
      week: p.week,
      format: p.format,
      title: p.title,
      bullets: p.bullets,
      caption: p.caption,
      imagePrompt: p.imagePrompt,
      imageUrl: p.imageUrl,
      scheduledFor: now + (i + 1) * WEEK,
      status: 'programmato' as const,
    }));
    mutateUser((cur) => ({ ...cur, socialPosts: scheduled }));

    // 1) Pubblicazione diretta via Graph (preferita se Meta è collegato): mette
    //    i post in coda; il cron della webapp li pubblica su FB/IG all'orario.
    if (u.metaConnected) {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const payload = scheduled.map((p) => ({
          caption:
            p.caption && p.caption.trim()
              ? p.caption
              : [p.title, ...(p.bullets || [])].filter(Boolean).join('\n'),
          imageUrl: p.imageUrl || undefined,
          scheduledAt: new Date(p.scheduledFor).toISOString(),
          networks: ['facebook', 'instagram'],
        }));
        const res = await fetch('/api/social/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ posts: payload }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d?.configured !== false && d?.ok) {
          return { ok: true, remote: true, channel: 'graph', scheduled: d?.queued };
        }
        // configured:false → Meta non davvero pronto: si prova Metricool sotto.
      } catch {
        // errore di rete: si prova Metricool/demo sotto
      }
    }

    // 2) Metricool (se collegato).
    if (!u.metricoolConnected) return { ok: true, remote: false };

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const payload = scheduled.map((p) => ({
        text:
          p.caption && p.caption.trim()
            ? p.caption
            : [p.title, ...(p.bullets || [])].filter(Boolean).join('\n'),
        dateTimeLocal: toLocalIso(p.scheduledFor),
        mediaUrl: p.imageUrl || undefined,
      }));
      const res = await fetch('/api/social/metricool/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ posts: payload, timezone: 'Europe/Rome', networks: ['instagram', 'facebook'] }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d?.configured === false) return { ok: true, remote: false, error: d?.error };
      const firstErr = Array.isArray(d?.results) ? d.results.find((r: any) => r?.error)?.error : undefined;
      return { ok: !!d?.ok, remote: true, channel: 'metricool', scheduled: d?.scheduled, error: d?.ok ? undefined : firstErr || d?.error };
    } catch (e) {
      return { ok: true, remote: false, error: (e as Error).message };
    }
  };

  // Genera l'infografica del singolo post (Higgsfield · Nano Banana Pro).
  const generateInfographic: StoreCtx['generateInfographic'] = async (draft) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/social/infographic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: draft.title,
          bullets: draft.bullets,
          caption: draft.caption,
          imagePrompt: draft.imagePrompt,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, configured: true, error: String(d?.error || `HTTP ${res.status}`) };
      return { ok: !!d?.ok, configured: d?.configured !== false, imageUrl: d?.imageUrl, error: d?.error };
    } catch (e) {
      return { ok: false, configured: false, error: (e as Error).message };
    }
  };

  // Collega Metricool: senza blogId restituisce i brand; con blogId salva.
  const connectMetricool: StoreCtx['connectMetricool'] = async (token, mcUserId, blogId) => {
    try {
      const t = (await supabase.auth.getSession()).data.session?.access_token;
      if (!t) return { ok: false, error: 'Sessione non disponibile' };
      const res = await fetch('/api/social/metricool/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ token, mcUserId, blogId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: String(d?.error || `HTTP ${res.status}`) };
      if (d?.needBrand) return { ok: true, needBrand: true, brands: d.brands };
      if (d?.connected) {
        const nets: string[] = Array.isArray(d.brand?.networks) ? d.brand.networks : [];
        mutateUser((cur) => ({
          ...cur,
          metricoolConnected: true,
          igConnected: cur.igConnected || nets.includes('instagram'),
          fbConnected: cur.fbConnected || nets.includes('facebook'),
        }));
        return { ok: true, connected: true, brand: d.brand };
      }
      return { ok: false, error: d?.error || 'Connessione non riuscita' };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const disconnectMetricool: StoreCtx['disconnectMetricool'] = async () => {
    try {
      const t = (await supabase.auth.getSession()).data.session?.access_token;
      if (t) {
        await fetch('/api/social/metricool/status', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${t}` },
        });
      }
    } catch {
      /* best-effort */
    }
    mutateUser((u) => ({ ...u, metricoolConnected: false }));
  };

  // Generazione reale del piano editoriale via Opus 4.8 (route /api/social/plan),
  // ancorata alla knowledge base (retrieval) col token di sessione.
  const generateSocialPlan: StoreCtx['generateSocialPlan'] = async () => {
    const u = userRef.current;
    if (!u) return { ok: false, error: 'Utente non disponibile' };
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/social/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nome: u.nome,
          settore: u.settore,
          kbFiles: u.kb.map((f) => f.name),
          count: 4,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      const posts = Array.isArray(data?.posts) ? (data.posts as SocialPostDraft[]) : [];
      if (posts.length === 0) return { ok: false, error: 'Nessun post generato' };
      return { ok: true, posts };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const skipSocial = () => mutateUser((u) => ({ ...u, socialSkipped: true }));
  // Collega l'account Meta dell'utente via OAuth: chiede l'URL del dialog,
  // apre il popup, riceve il `code` (postMessage) e lo scambia lato server.
  const connectMeta: StoreCtx['connectMeta'] = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return { ok: false, error: 'Sessione non disponibile' };
      const s = await fetch('/api/meta/oauth/start', { headers: { Authorization: `Bearer ${token}` } });
      const sd = await s.json().catch(() => ({}));
      if (!s.ok) return { ok: false, error: String(sd?.error || `HTTP ${s.status}`) };
      if (sd?.configured === false || !sd?.url) return { ok: false, error: 'meta_app_not_configured' };

      const got = await new Promise<{ code: string; state: string } | null>((resolve) => {
        const w = 600;
        const h = 740;
        const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
        const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
        const popup = window.open(sd.url, 'generah-meta-oauth', `width=${w},height=${h},left=${left},top=${top}`);
        if (!popup) {
          resolve(null);
          return;
        }
        let done = false;
        const cleanup = () => {
          clearInterval(timer);
          window.removeEventListener('message', onMsg);
        };
        const onMsg = (ev: MessageEvent) => {
          if (ev.origin !== window.location.origin) return;
          const d = ev.data as { source?: string; code?: string; state?: string; error?: string };
          if (!d || d.source !== 'generah-meta-oauth') return;
          done = true;
          cleanup();
          if (d.error || !d.code) {
            resolve(null);
            return;
          }
          resolve({ code: d.code, state: d.state || '' });
        };
        const timer = setInterval(() => {
          if (popup.closed && !done) {
            cleanup();
            resolve(null);
          }
        }, 600);
        window.addEventListener('message', onMsg);
      });
      if (!got) return { ok: false, error: 'Connessione annullata' };

      const ex = await fetch('/api/meta/oauth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: got.code, state: got.state }),
      });
      const exd = await ex.json().catch(() => ({}));
      if (!ex.ok || !exd?.ok) {
        return { ok: false, error: String(exd?.error || exd?.reason || `HTTP ${ex.status}`) };
      }
      mutateUser((u) => ({ ...u, metaConnected: true }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };
  // Carica lo spot montato (Blob dal browser) su uno storage PUBBLICO e
  // restituisce l'URL: serve come file_url scaricabile da Meta per la creatività.
  const uploadAdSpot: StoreCtx['uploadAdSpot'] = async (blob) => {
    try {
      const uid = (await supabase.auth.getSession()).data.session?.user?.id;
      if (!uid) return { ok: false, error: 'Sessione non disponibile' };
      const path = `${uid}/${Date.now()}.mp4`;
      const { error } = await supabase.storage
        .from(AD_SPOTS_BUCKET)
        .upload(path, blob, { contentType: 'video/mp4', upsert: true });
      if (error) return { ok: false, error: error.message };
      const { data } = supabase.storage.from(AD_SPOTS_BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) return { ok: false, error: 'URL pubblico non disponibile' };
      return { ok: true, url: data.publicUrl };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  // Lookalike: parsa+hasha la lista contatti NEL BROWSER (la PII non esce dal
  // client), poi invia i soli hash al server che crea custom audience + lookalike.
  const buildLookalike: StoreCtx['buildLookalike'] = async (file) => {
    try {
      const prep = await prepareContacts(file);
      if (!prep.ok) return { ok: false, configured: true, error: prep.error };
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return { ok: false, configured: false, error: 'Sessione non disponibile' };
      const res = await fetch('/api/ads/meta/lookalike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schema: prep.audience.schema,
          data: prep.audience.data,
          country: 'IT',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, configured: true, count: prep.audience.count, error: String(d?.error || `HTTP ${res.status}`) };
      }
      return {
        ok: !!d?.ok,
        configured: d?.configured !== false,
        count: prep.audience.count,
        lookalikeId: d?.lookalikeId ?? null,
        customAudienceId: d?.customAudienceId,
        note: d?.note,
        error: d?.error,
      };
    } catch (e) {
      return { ok: false, configured: false, error: (e as Error).message };
    }
  };

  const skipPhase2 = () => mutateUser((u) => ({ ...u, phase2Skipped: true }));
  const useVideoConsult = () => mutateUser((u) => ({ ...u, videoConsultUsed: true }));
  const finishOnboarding = () => mutateUser((u) => ({ ...u, onboardingDone: true }));

  const launchCampaign: StoreCtx['launchCampaign'] = (c, opts) => {
    const u = userRef.current;
    if (!u) return;
    // Su una campagna Meta reale i lead arrivano dal webhook: niente seed finti.
    // In modalità demo si popolano alcuni lead di esempio per il CRM.
    const demoLeads = opts?.demoLeads !== false;
    const seedLeads = demoLeads
      ? Array.from({ length: Math.floor(3 + Math.random() * 4) }, () => makeLead(c.name, 'Meta Ads'))
      : [];
    if (seedLeads.length) {
      void supabase.from('leads').insert(seedLeads.map((l) => leadToRow(u.id, l)));
    }
    mutateUser((cur) => {
      const campaign: Campaign = {
        ...c,
        id: uid(),
        status: 'attiva',
        leads: seedLeads.length,
        spend: 0,
        createdAt: Date.now(),
      };
      return {
        ...cur,
        campaigns: [campaign, ...cur.campaigns],
        leads: [...seedLeads, ...cur.leads],
      };
    });

    // Consumo del meter "ads" autorevole lato server (con soglia 10%).
    consume('ads', 1);
  };

  const addLead: StoreCtx['addLead'] = (l) => {
    const u = userRef.current;
    if (!u) return;
    const lead: Lead = {
      tags: [],
      importBatch: null,
      consent: false,
      automationPaused: false,
      ...l,
      id: leadId(),
      createdAt: Date.now(),
      lastTouch: Date.now(),
    };
    setUser((prev) => (prev ? { ...prev, leads: [lead, ...prev.leads] } : prev));
    void supabase.from('leads').insert(leadToRow(u.id, lead));
  };

  const updateLead: StoreCtx['updateLead'] = (id, patch) => {
    const u = userRef.current;
    if (!u) return;
    const now = Date.now();
    setUser((prev) =>
      prev
        ? { ...prev, leads: prev.leads.map((l) => (l.id === id ? { ...l, ...patch, lastTouch: now } : l)) }
        : prev
    );
    const dbPatch: Record<string, any> = { last_touch: new Date(now).toISOString() };
    (['name', 'phone', 'email', 'source', 'channel', 'interest', 'status', 'score', 'notes'] as const).forEach(
      (k) => {
        if (k in patch) dbPatch[k] = (patch as any)[k];
      }
    );
    if ('aiSummary' in patch) dbPatch.ai_summary = patch.aiSummary;
    if ('nextAction' in patch) dbPatch.next_action = patch.nextAction;
    if ('aiDraft' in patch) dbPatch.ai_draft = patch.aiDraft;
    if ('tags' in patch) dbPatch.tags = patch.tags;
    if ('importBatch' in patch) dbPatch.import_batch = patch.importBatch;
    if ('consent' in patch) dbPatch.consent = patch.consent;
    if ('automationPaused' in patch) dbPatch.automation_paused = patch.automationPaused;
    if ('dealStage' in patch) dbPatch.deal_stage = patch.dealStage;
    if ('progressSummary' in patch) dbPatch.progress_summary = patch.progressSummary;
    if ('lastInteractionAt' in patch)
      dbPatch.last_interaction_at = patch.lastInteractionAt
        ? new Date(patch.lastInteractionAt).toISOString()
        : null;
    void supabase.from('leads').update(dbPatch).eq('id', id).eq('user_id', u.id);
  };

  const enrichLead: StoreCtx['enrichLead'] = async (id) => {
    const u = userRef.current;
    if (!u) return { ok: false, error: 'Utente non disponibile' };
    const lead = u.leads.find((l) => l.id === id);
    if (!lead) return { ok: false, error: 'Lead non trovato' };
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/crm/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lead: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            channel: lead.channel,
            interest: lead.interest,
            status: lead.status,
            notes: lead.notes,
          },
          nome: u.nome,
          settore: u.settore,
          kbFiles: u.kb.map((f) => f.name),
        }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      const draft: AiDraft | null =
        data?.draft && typeof data.draft === 'object'
          ? {
              emailSubject: String(data.draft.emailSubject || ''),
              emailBody: String(data.draft.emailBody || ''),
              whatsapp: String(data.draft.whatsapp || ''),
            }
          : null;
      updateLead(id, {
        aiSummary: String(data?.summary || ''),
        nextAction: String(data?.nextAction || ''),
        aiDraft: draft,
        score: typeof data?.score === 'number' ? data.score : lead.score,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const removeLead: StoreCtx['removeLead'] = (id) => {
    const u = userRef.current;
    if (!u) return;
    setUser((prev) => (prev ? { ...prev, leads: prev.leads.filter((l) => l.id !== id) } : prev));
    void supabase.from('leads').delete().eq('id', id).eq('user_id', u.id);
  };

  // Ricarica i lead dalla tabella (es. per far comparire quelli arrivati dal
  // webhook Lead Ads). I lead dal DB sono autorevoli; eventuali lead locali non
  // ancora persistiti vengono preservati.
  const refreshLeads: StoreCtx['refreshLeads'] = async () => {
    const u = userRef.current;
    if (!u) return;
    const fresh = await loadLeads(u.id);
    setUser((prev) => {
      if (!prev) return prev;
      const byId = new Map(fresh.map((l) => [l.id, l]));
      for (const l of prev.leads) if (!byId.has(l.id)) byId.set(l.id, l);
      const merged = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
      return { ...prev, leads: merged };
    });
  };

  // ── CRM avanzato ───────────────────────────────────────────────────────────
  async function authToken(): Promise<string | undefined> {
    return (await supabase.auth.getSession()).data.session?.access_token;
  }

  // Classifica il settore operativo + l'obiettivo dell'automazione dalla KB (Opus).
  // Obiettivi degli agenti scelti dall'utente (multi-selezione) + settore.
  // Deriva anche l'archetipo di flusso ('appuntamento' | 'offerta_chiusura') su
  // cui gira il motore CRM/automation esistente.
  const setAiGoals: StoreCtx['setAiGoals'] = (goals, sectorKind) => {
    mutateUser((u) => ({
      ...u,
      agentGoals: goals,
      automationGoal: goals.length ? deriveArchetype(goals) : u.automationGoal,
      ...(sectorKind !== undefined ? { sectorKind } : {}),
    }));
  };

  const classifySector: StoreCtx['classifySector'] = async () => {
    const u = userRef.current;
    if (!u) return { ok: false, error: 'Utente non disponibile' };
    try {
      const token = await authToken();
      const res = await fetch('/api/crm/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ nome: u.nome, settore: u.settore, kbFiles: u.kb.map((f) => f.name) }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      const sectorKind = (data?.sectorKind ?? null) as SectorKind | null;
      const automationGoal = (data?.automationGoal ?? null) as AutomationGoal | null;
      mutateUser((cur) => ({ ...cur, sectorKind, automationGoal }));
      return { ok: true, sectorKind, automationGoal, rationale: String(data?.rationale || '') };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const setCrmAutonomy: StoreCtx['setCrmAutonomy'] = (mode) => {
    mutateUser((cur) => ({ ...cur, crmAutonomy: mode }));
  };

  // Esegue (o prepara) la prossima azione automatica sul lead. Idempotente:
  // registra un automation_run con dedupe_key per evitare doppioni.
  const automateLead: StoreCtx['automateLead'] = async (id, opts) => {
    const u = userRef.current;
    if (!u) return { ok: false, error: 'Utente non disponibile' };
    const lead = u.leads.find((l) => l.id === id);
    if (!lead) return { ok: false, error: 'Lead non trovato' };
    if (lead.automationPaused) return { ok: false, error: 'Automazione in pausa per questo lead' };
    try {
      const token = await authToken();
      const res = await fetch('/api/crm/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          lead: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            channel: lead.channel,
            interest: lead.interest,
            status: lead.status,
            notes: lead.notes,
            tags: lead.tags,
          },
          nome: u.nome,
          settore: u.settore,
          sectorKind: u.sectorKind,
          automationGoal: u.automationGoal,
          agentGoals: u.agentGoals ?? [],
          dealStage: lead.dealStage ?? null,
          progressSummary: lead.progressSummary ?? '',
          autonomy: u.crmAutonomy,
          kbFiles: u.kb.map((f) => f.name),
        }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };

      const automation = String(data?.automation || 'followup');
      const channel = String(data?.channel || 'whatsapp');
      const message = String(data?.message || '');
      const summary = String(data?.summary || '');
      const emailSubject = String(data?.emailSubject || '');
      const newStatus = String(data?.newStatus || lead.status);
      const appointment =
        data?.appointment && typeof data.appointment === 'object'
          ? { title: String(data.appointment.title || ''), whenHint: String(data.appointment.whenHint || '') }
          : null;
      const dealStage = String(data?.dealStage || lead.dealStage || '');
      const progressSummary = String(data?.progressSummary || lead.progressSummary || '');
      // Nurturing e reminder sono INDIPENDENTI dalla trattativa: NON riscrivono la
      // memoria negoziale (deal_stage/progress_summary). Solo le azioni di
      // conversazione (first_touch, followup, book_appointment, send_offer) la
      // aggiornano; il nurture aggiorna soltanto la recency (lastInteractionAt).
      const touchesMemory = automation !== 'nurture';
      const memPatch: Partial<Lead> = { lastInteractionAt: Date.now() };
      if (touchesMemory && dealStage) memPatch.dealStage = dealStage as DealStage;
      if (touchesMemory && progressSummary) memPatch.progressSummary = progressSummary;

      // Idempotenza: un solo run per (lead, automazione) salvo retry esplicito.
      const dedupeKey = opts?.force ? null : `${id}:${automation}`;
      const run = await logAutomationRun(supabase, u.id, {
        leadId: id,
        automation,
        dedupeKey,
        status: u.crmAutonomy === 'auto' ? 'done' : 'pending',
        detail: summary,
      });
      if (!run.ok && run.duplicate && !opts?.force) {
        return { ok: false, duplicate: true, error: 'Azione già eseguita per questo lead.' };
      }

      // Timeline: registra l'azione con il messaggio prodotto.
      await addLeadEvent(supabase, u.id, {
        leadId: id,
        type: 'ai',
        channel,
        summary: summary || `Azione automatica: ${automation}`,
        payload: { automation, channel, emailSubject, message, mode: u.crmAutonomy },
      });

      // In modalità autonoma avanza lo stato del lead.
      if (u.crmAutonomy === 'auto' && newStatus && newStatus !== lead.status) {
        updateLead(id, { status: newStatus as LeadStatus, ...memPatch });
      } else {
        updateLead(id, { lastTouch: Date.now(), ...memPatch });
      }

      // Invio autonomo: se l'AI ha scelto il canale email, l'autonomia è 'auto',
      // il dominio è verificato e il lead ha un'email → invia davvero via Resend.
      if (channel === 'email' && u.crmAutonomy === 'auto' && u.emailVerified && lead.email && message) {
        try {
          const t2 = (await supabase.auth.getSession()).data.session?.access_token;
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(t2 ? { Authorization: `Bearer ${t2}` } : {}) },
            body: JSON.stringify({ to: lead.email, subject: emailSubject || 'Un aggiornamento', text: message }),
          });
        } catch {
          /* invio best-effort */
        }
      }

      return {
        ok: true,
        result: { automation, channel, summary, emailSubject, message, appointment, newStatus, mode: u.crmAutonomy },
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  // Import lista lead da Excel/CSV (lato browser): parsing + bulk insert taggato.
  const importLeadsFile: StoreCtx['importLeadsFile'] = async (file) => {
    const u = userRef.current;
    if (!u) return { ok: false, count: 0, error: 'Utente non disponibile' };
    try {
      const parsed = await parseLeadsFromFile(file);
      if (parsed.rows.length === 0) return { ok: false, count: 0, error: 'Nessun contatto valido nel file.' };
      const batch = `import-${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
      const now = Date.now();
      const leads: Lead[] = parsed.rows.map((r) => ({
        id: leadId(),
        name: r.name,
        phone: r.phone,
        email: r.email,
        source: 'Import lista',
        channel: 'Lista importata',
        interest: r.interest,
        status: 'nuovo' as LeadStatus,
        score: 0,
        notes: r.notes,
        aiSummary: '',
        nextAction: '',
        aiDraft: null,
        tags: ['import'],
        importBatch: batch,
        consent: false,
        automationPaused: false,
        createdAt: now,
        lastTouch: now,
      }));
      setUser((prev) => (prev ? { ...prev, leads: [...leads, ...prev.leads] } : prev));
      const { error } = await supabase.from('leads').insert(leads.map((l) => leadToRow(u.id, l)));
      if (error) return { ok: false, count: 0, error: error.message };
      return { ok: true, count: leads.length, batch };
    } catch (e) {
      return { ok: false, count: 0, error: (e as Error).message };
    }
  };

  // Timeline di un lead (lead_events).
  const leadTimeline: StoreCtx['leadTimeline'] = async (leadId) => {
    return loadLeadEvents(supabase, leadId);
  };

  // Aggiunge una nota/evento manuale alla timeline.
  const addLeadNote: StoreCtx['addLeadNote'] = async (leadId, note, type) => {
    const u = userRef.current;
    if (!u) return null;
    return addLeadEvent(supabase, u.id, { leadId, type: type ?? 'nota', summary: note });
  };

  // ── Calendario interno (appointments) ───────────────────────────────────────
  const listAppointments: StoreCtx['listAppointments'] = async () => {
    const u = userRef.current;
    if (!u) return [];
    return loadAppointments(supabase, u.id);
  };
  const createAppointment: StoreCtx['createAppointment'] = async (a) => {
    const u = userRef.current;
    if (!u) return null;
    const appt = await addAppointment(supabase, u.id, a);
    if (appt && a.leadId) {
      await addLeadEvent(supabase, u.id, {
        leadId: a.leadId,
        type: 'appuntamento',
        summary: `Appuntamento: ${a.title}`,
        payload: { startsAt: a.startsAt, status: appt.status },
      });
    }
    return appt;
  };
  const editAppointment: StoreCtx['editAppointment'] = async (id, patch) => {
    const u = userRef.current;
    if (!u) return;
    await updateAppointment(supabase, u.id, id, patch);
  };
  const deleteAppointment: StoreCtx['deleteAppointment'] = async (id) => {
    const u = userRef.current;
    if (!u) return;
    await removeAppointment(supabase, u.id, id);
  };

  // Legge la coda di pubblicazione social (social_posts_queue) dell'utente.
  const fetchSocialQueue: StoreCtx['fetchSocialQueue'] = async () => {
    const u = userRef.current;
    if (!u) return [];
    try {
      const { data } = await supabase
        .from('social_posts_queue')
        .select('*')
        .eq('user_id', u.id)
        .order('scheduled_at', { ascending: false });
      return Array.isArray(data) ? data.map(queuedFromRow) : [];
    } catch {
      return [];
    }
  };

  // Annulla un post ancora in attesa (non tocca quelli già pubblicati).
  const cancelSocialPost: StoreCtx['cancelSocialPost'] = async (id) => {
    const u = userRef.current;
    if (!u) return;
    await supabase
      .from('social_posts_queue')
      .delete()
      .eq('id', id)
      .eq('user_id', u.id)
      .eq('status', 'pending');
  };

  // ── WhatsApp (conversazioni) ───────────────────────────────────────────
  const fetchWaMessages: StoreCtx['fetchWaMessages'] = async () => {
    const u = userRef.current;
    if (!u) return [];
    try {
      const { data } = await supabase
        .from('wa_messages')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: true })
        .limit(1000);
      return Array.isArray(data) ? data.map(waMessageFromRow) : [];
    } catch {
      return [];
    }
  };

  const sendWhatsApp: StoreCtx['sendWhatsApp'] = async (to, opts) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return { ok: false, error: 'Sessione non valida' };
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(
          opts.template
            ? { to, template: { name: opts.template, lang: opts.lang || 'it' } }
            : { to, text: opts.text || '' },
        ),
      });
      const data = await res.json().catch(() => ({}));
      return {
        ok: !!data?.ok,
        reason: data?.reason,
        needTemplate: !!data?.need_template,
        configured: data?.configured,
        error: data?.error,
        meter: data?.meter,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const draftWhatsApp: StoreCtx['draftWhatsApp'] = async (contact, recent) => {
    const u = userRef.current;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!u || !token) return '';
    try {
      const res = await fetch('/api/whatsapp/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contact,
          messages: recent,
          nome: u.nome,
          settore: u.settore,
          agentGoals: u.agentGoals ?? [],
          sectorKind: u.sectorKind,
          kbFiles: u.kb.map((f) => f.name),
        }),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? String(data?.reply || '') : '';
    } catch {
      return '';
    }
  };

  const setWaAutoreply: StoreCtx['setWaAutoreply'] = (on) => {
    mutateUser((u) => ({ ...u, waAutoreply: on }));
  };

  async function authTok(): Promise<string | undefined> {
    return (await supabase.auth.getSession()).data.session?.access_token;
  }

  const emailDomainStatus: StoreCtx['emailDomainStatus'] = async () => {
    try {
      const token = await authTok();
      const res = await fetch('/api/email/domain', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      return {
        ok: true,
        sendingEmail: data?.sendingEmail ?? null,
        status: String(data?.status || ''),
        verified: !!data?.verified,
        records: Array.isArray(data?.records) ? (data.records as EmailDnsRecord[]) : [],
        domain: data?.domain ?? null,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const setupSendingEmail: StoreCtx['setupSendingEmail'] = async (email, fromName) => {
    try {
      const token = await authTok();
      const res = await fetch('/api/email/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'setup', email, fromName: fromName || '' }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      mutateUser((u) => ({
        ...u,
        sendingEmail: String(data?.sendingEmail || email),
        sendingFromName: fromName || u.sendingFromName || '',
        sendingDomain: String(data?.domain || email.split('@')[1] || ''),
        emailVerified: !!data?.verified,
      }));
      return {
        ok: true,
        status: String(data?.status || ''),
        verified: !!data?.verified,
        records: Array.isArray(data?.records) ? (data.records as EmailDnsRecord[]) : [],
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const verifySendingDomain: StoreCtx['verifySendingDomain'] = async () => {
    try {
      const token = await authTok();
      const res = await fetch('/api/email/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      mutateUser((u) => ({ ...u, emailVerified: !!data?.verified }));
      return {
        ok: true,
        status: String(data?.status || ''),
        verified: !!data?.verified,
        records: Array.isArray(data?.records) ? (data.records as EmailDnsRecord[]) : [],
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const sendLeadEmail: StoreCtx['sendLeadEmail'] = async (to, subject, body) => {
    try {
      const token = await authTok();
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ to, subject, text: body }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      return { ok: true, id: String(data?.id || '') };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const generateCampaignBrief: StoreCtx['generateCampaignBrief'] = async (input) => {
    const u = userRef.current;
    if (!u) return { ok: false, error: 'Utente non disponibile' };
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/ads/brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nome: u.nome,
          settore: u.settore,
          kbFiles: u.kb.map((f) => f.name),
          objective: input?.objective || 'Lead generation',
          budgetDaily: input?.budgetDaily,
          geo: input?.geo,
          ageRange: input?.ageRange,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: String(data?.error || `HTTP ${res.status}`) };
      if (!data?.brief) return { ok: false, error: 'Brief non disponibile' };
      return { ok: true, brief: data.brief as CampaignBrief };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  // Pubblica la campagna lead reale su Meta (strato 1). Se Meta non è
  // configurato o manca il video, ritorna configured:false/reason senza errori:
  // il chiamante prosegue in modalità dimostrativa.
  const publishMetaCampaign: StoreCtx['publishMetaCampaign'] = async (brief, params) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return { ok: false, configured: false, reason: 'no_session' };
      const res = await fetch('/api/ads/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          brief: {
            campaignName: brief.campaignName,
            postText: brief.postText,
            headline: brief.headline,
            cta: brief.cta,
            interests: brief.interests,
            ageRange: brief.ageRange,
            geoSuggestion: brief.geoSuggestion,
            leadFormFields: brief.leadFormFields,
          },
          videoUrl: params.videoUrl,
          dailyBudgetEur: params.dailyBudgetEur,
          geoText: params.geoText,
          ageRange: params.ageRange,
          customAudienceIds: params.customAudienceIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, configured: true, error: String(data?.error || `HTTP ${res.status}`) };
      }
      return {
        ok: !!data?.ok,
        configured: data?.configured !== false,
        reason: data?.reason,
        ids: data?.ids,
        error: data?.error,
      };
    } catch (e) {
      return { ok: false, configured: false, error: (e as Error).message };
    }
  };

  const generateAdVideo: StoreCtx['generateAdVideo'] = async (brief, onProgress) => {
    const empty = { ok: false, clips: [] as string[], audioUrl: null as string | null, srt: '' };
    const u = userRef.current;
    if (!u) return { ...empty, error: 'Utente non disponibile' };
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return { ...empty, error: 'Sessione non disponibile' };
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const submit = async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/ads/video/submit', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || `HTTP ${res.status}`));
      return data as { requestId?: string; status?: string; url?: string | null; skipped?: boolean };
    };
    const poll = async (requestId: string, url0?: string | null): Promise<string> => {
      if (url0) return url0;
      for (let i = 0; i < 120; i++) {
        const res = await fetch(`/api/ads/video/status?id=${encodeURIComponent(requestId)}`, {
          headers: auth,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String((data as any)?.error || `HTTP ${res.status}`));
        const status = (data as any)?.status;
        if (status === 'completed') {
          const url = (data as any)?.url;
          if (!url) throw new Error('Risultato senza URL');
          return url as string;
        }
        if (status === 'failed' || status === 'nsfw') throw new Error(`Job ${status}`);
        await new Promise((r) => setTimeout(r, 2500));
      }
      throw new Error('Timeout generazione');
    };

    try {
      const scenes = Array.isArray(brief.scenes) ? brief.scenes : [];
      if (!scenes.length) return { ...empty, error: 'Brief senza scene' };
      const clips: string[] = [];
      for (const sc of scenes) {
        onProgress?.(`Scena ${sc.n}: genero l'immagine…`);
        const img = await submit({ step: 'image', prompt: sc.visual });
        const imageUrl = await poll(img.requestId || '', img.url);
        onProgress?.(`Scena ${sc.n}: animo il video…`);
        const clip = await submit({ step: 'clip', prompt: sc.visual, imageUrl });
        const clipUrl = await poll(clip.requestId || '', clip.url);
        clips.push(clipUrl);
      }
      let audioUrl: string | null = null;
      const voText = scenes
        .map((s) => s.voiceover)
        .filter(Boolean)
        .join(' ');
      if (voText) {
        onProgress?.('Genero il voiceover…');
        const vo = await submit({ step: 'voiceover', text: voText });
        if (!vo.skipped && (vo.url || vo.requestId)) {
          audioUrl = await poll(vo.requestId || '', vo.url);
        }
      }
      const srt = scenesToSrt(
        scenes.map((s) => ({ durationSec: s.durationSec, voiceover: s.voiceover }))
      );
      onProgress?.('Clip pronti.');
      return { ok: true, clips, audioUrl, srt };
    } catch (e) {
      return { ...empty, error: (e as Error).message };
    }
  };

  const markAlertsRead = () =>
    mutateUser((u) => ({ ...u, alerts: u.alerts.map((a) => ({ ...a, read: true })) }));

  const resetAll = () => {
    const u = userRef.current;
    if (!u) return;
    const paths = u.kb.map((f) => f.path).filter(Boolean) as string[];
    if (paths.length) {
      void supabase.storage.from(KB_BUCKET).remove(paths).catch(() => {});
    }
    void supabase.from('kb_chunks').delete().eq('user_id', u.id);
    void supabase.from('leads').delete().eq('user_id', u.id);
    const fresh: User = {
      ...u,
      password: '',
      plan: null,
      planMode: null,
      discountCode: null,
      featurePlan: null,
      paidCanone: 0,
      paidSetup: 0,
      meters: emptyMeters(),
      kb: [],
      igConnected: false,
      fbConnected: false,
      metricoolConnected: false,
      socialPosts: [],
      socialSkipped: false,
      metaConnected: false,
      phase2Skipped: false,
      videoConsultUsed: false,
      onboardingDone: false,
      waAutoreply: true,
      campaigns: [],
      leads: [],
      alerts: [],
      waNumber: null,
    };
    setUser(fresh);
    void persist(fresh);
  };

  const value: StoreCtx = {
    ready,
    user,
    register,
    login,
    logout,
    activatePlan,
    consume,
    topUp,
    ensureWaNumber,
    addKb,
    removeKb,
    askKb,
    connectSocial,
    scheduleSocialPosts,
    generateSocialPlan,
    generateInfographic,
    connectMetricool,
    disconnectMetricool,
    skipSocial,
    connectMeta,
    skipPhase2,
    useVideoConsult,
    finishOnboarding,
    launchCampaign,
    generateCampaignBrief,
    generateAdVideo,
    publishMetaCampaign,
    buildLookalike,
    uploadAdSpot,
    addLead,
    updateLead,
    enrichLead,
    removeLead,
    refreshLeads,
    classifySector,
    setAiGoals,
    setCrmAutonomy,
    automateLead,
    importLeadsFile,
    leadTimeline,
    addLeadNote,
    listAppointments,
    createAppointment,
    editAppointment,
    deleteAppointment,
    fetchSocialQueue,
    cancelSocialPost,
    fetchWaMessages,
    sendWhatsApp,
    draftWhatsApp,
    setWaAutoreply,
    emailDomainStatus,
    setupSendingEmail,
    verifySendingDomain,
    sendLeadEmail,
    markAlertsRead,
    resetAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore deve essere usato dentro StoreProvider');
  return ctx;
}
