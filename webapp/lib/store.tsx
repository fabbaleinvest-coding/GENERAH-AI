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
import { supabase, KB_BUCKET } from './supabase';

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

export interface SocialPost {
  id: string;
  week: string;
  format: string;
  title: string;
  bullets: string[];
  scheduledFor: number;
  status: 'programmato';
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
  createdAt: number;
  lastTouch: number;
}

export const LeadStatusOrder: LeadStatus[] = [
  'nuovo',
  'contattato',
  'qualificato',
  'appuntamento',
  'cliente',
  'perso',
];

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
  // dati
  campaigns: Campaign[];
  leads: Lead[];
  alerts: AlertItem[];
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
    campaigns: Array.isArray(r.campaigns) ? (r.campaigns as Campaign[]) : [],
    leads: Array.isArray(r.leads) ? (r.leads as Lead[]) : [],
    alerts: Array.isArray(r.alerts) ? (r.alerts as AlertItem[]) : [],
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
    meters: u.meters,
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
  addKb: (files: File[]) => void;
  removeKb: (id: string) => void;
  askKb: (question: string) => Promise<{ ok: boolean; answer?: string; sources?: KbSource[]; error?: string }>;
  connectSocial: (network: 'ig' | 'fb' | 'metricool') => void;
  scheduleSocialPosts: (
    posts: { week: string; format: string; title: string; bullets: string[] }[]
  ) => void;
  skipSocial: () => void;
  connectMeta: () => void;
  skipPhase2: () => void;
  useVideoConsult: () => void;
  finishOnboarding: () => void;
  launchCampaign: (c: Omit<Campaign, 'id' | 'createdAt' | 'leads' | 'spend' | 'status'>) => void;
  addLead: (l: Omit<Lead, 'id' | 'createdAt' | 'lastTouch'>) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  enrichLead: (id: string) => Promise<{ ok: boolean; error?: string }>;
  removeLead: (id: string) => void;
  markAlertsRead: () => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

const ALERT_THRESHOLD = 0.1; // 10%

// genera lead demo coerenti col settore (per le campagne)
const FIRST = ['Marco', 'Giulia', 'Luca', 'Sara', 'Andrea', 'Elena', 'Paolo', 'Chiara', 'Davide', 'Martina', 'Simone', 'Federica'];
const LAST = ['Rossi', 'Bianchi', 'Ferrari', 'Russo', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Conti', 'De Luca'];
const INTERESTS = ['Preventivo', 'Informazioni', 'Appuntamento', 'Catalogo', 'Disponibilità', 'Consulenza'];

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

  const activatePlan: StoreCtx['activatePlan'] = (planId, code, mode) => {
    const priced = priceWithDiscount(planId, code);
    const fp = priced.featurePlan;
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
  };

  const consume: StoreCtx['consume'] = (meter, amount) => {
    mutateUser((u) => {
      const m = u.meters[meter];
      if (m.total <= 0) return u;
      const used = Math.min(m.total, m.used + amount);
      const remainingPct = (m.total - used) / m.total;
      let alerts = u.alerts;
      const alreadyAlerted = u.alerts.some((a) => a.meter === meter && !a.read);
      if (remainingPct <= ALERT_THRESHOLD && !alreadyAlerted) {
        alerts = [
          { id: uid(), meter, remainingPct, createdAt: Date.now(), read: false },
          ...u.alerts,
        ];
      }
      return { ...u, meters: { ...u.meters, [meter]: { total: m.total, used } }, alerts };
    });
  };

  const topUp: StoreCtx['topUp'] = (meter, qty) => {
    mutateUser((u) => {
      const m = u.meters[meter];
      return {
        ...u,
        meters: { ...u.meters, [meter]: { total: m.total + qty, used: m.used } },
        alerts: u.alerts.filter((a) => a.meter !== meter),
      };
    });
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

  const scheduleSocialPosts: StoreCtx['scheduleSocialPosts'] = (posts) =>
    mutateUser((u) => {
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const scheduled: SocialPost[] = posts.map((p, i) => ({
        id: uid(),
        week: p.week,
        format: p.format,
        title: p.title,
        bullets: p.bullets,
        scheduledFor: now + (i + 1) * WEEK,
        status: 'programmato' as const,
      }));
      return { ...u, socialPosts: scheduled };
    });

  const skipSocial = () => mutateUser((u) => ({ ...u, socialSkipped: true }));
  const connectMeta = () => mutateUser((u) => ({ ...u, metaConnected: true }));
  const skipPhase2 = () => mutateUser((u) => ({ ...u, phase2Skipped: true }));
  const useVideoConsult = () => mutateUser((u) => ({ ...u, videoConsultUsed: true }));
  const finishOnboarding = () => mutateUser((u) => ({ ...u, onboardingDone: true }));

  const launchCampaign: StoreCtx['launchCampaign'] = (c) => {
    const u = userRef.current;
    if (!u) return;
    const seedLeads = Array.from({ length: Math.floor(3 + Math.random() * 4) }, () =>
      makeLead(c.name, 'Meta Ads')
    );
    if (seedLeads.length) {
      void supabase.from('leads').insert(seedLeads.map((l) => leadToRow(u.id, l)));
    }
    mutateUser((cur) => {
      const ads = cur.meters.ads;
      const usedAds = Math.min(ads.total, ads.used + 1);
      const remainingPct = ads.total > 0 ? (ads.total - usedAds) / ads.total : 1;
      let alerts = cur.alerts;
      if (ads.total > 0 && remainingPct <= ALERT_THRESHOLD && !cur.alerts.some((a) => a.meter === 'ads' && !a.read)) {
        alerts = [{ id: uid(), meter: 'ads', remainingPct, createdAt: Date.now(), read: false }, ...cur.alerts];
      }
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
        meters: { ...cur.meters, ads: { total: ads.total, used: usedAds } },
        alerts,
      };
    });
  };

  const addLead: StoreCtx['addLead'] = (l) => {
    const u = userRef.current;
    if (!u) return;
    const lead: Lead = { ...l, id: leadId(), createdAt: Date.now(), lastTouch: Date.now() };
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
    void supabase.from('leads').update(dbPatch).eq('id', id).eq('user_id', u.id);
  };

  const enrichLead: StoreCtx['enrichLead'] = async (id) => {
    const u = userRef.current;
    if (!u) return { ok: false, error: 'Utente non disponibile' };
    const lead = u.leads.find((l) => l.id === id);
    if (!lead) return { ok: false, error: 'Lead non trovato' };
    try {
      const res = await fetch('/api/crm/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      campaigns: [],
      leads: [],
      alerts: [],
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
    addKb,
    removeKb,
    askKb,
    connectSocial,
    scheduleSocialPosts,
    skipSocial,
    connectMeta,
    skipPhase2,
    useVideoConsult,
    finishOnboarding,
    launchCampaign,
    addLead,
    updateLead,
    enrichLead,
    removeLead,
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
