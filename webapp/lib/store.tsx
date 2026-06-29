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
export interface KbFile {
  id: string;
  name: string;
  size: number;
  kind: string;
  addedAt: number;
  path?: string; // percorso su Supabase Storage (bucket kb)
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
    leads: u.leads,
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
    id: uid(),
    name,
    phone: `+39 3${Math.floor(10 + Math.random() * 89)} ${Math.floor(1000000 + Math.random() * 8999999)}`,
    email: `${f.toLowerCase()}.${l.toLowerCase().replace(' ', '')}@email.it`,
    source,
    channel,
    interest: INTERESTS[Math.floor(Math.random() * INTERESTS.length)],
    status: 'nuovo',
    score: Math.floor(40 + Math.random() * 60),
    notes: '',
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
      if (data) return rowToUser(data);
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

  const addKb: StoreCtx['addKb'] = (files) => {
    const u = userRef.current;
    if (!u || files.length === 0) return;
    void (async () => {
      const added: KbFile[] = [];
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
        added.push({ id, name: f.name, size: f.size, kind: f.type || 'file', addedAt: Date.now(), path });
      }
      mutateUser((cur) => ({ ...cur, kb: [...cur.kb, ...added] }));
    })();
  };

  const removeKb: StoreCtx['removeKb'] = (id) => {
    const u = userRef.current;
    const f = u?.kb.find((x) => x.id === id);
    if (f?.path) {
      void supabase.storage.from(KB_BUCKET).remove([f.path]).catch(() => {});
    }
    mutateUser((cur) => ({ ...cur, kb: cur.kb.filter((x) => x.id !== id) }));
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
    mutateUser((u) => {
      const seedLeads = Array.from({ length: Math.floor(3 + Math.random() * 4) }, () =>
        makeLead(c.name, 'Meta Ads')
      );
      const ads = u.meters.ads;
      const usedAds = Math.min(ads.total, ads.used + 1);
      const remainingPct = ads.total > 0 ? (ads.total - usedAds) / ads.total : 1;
      let alerts = u.alerts;
      if (ads.total > 0 && remainingPct <= ALERT_THRESHOLD && !u.alerts.some((a) => a.meter === 'ads' && !a.read)) {
        alerts = [{ id: uid(), meter: 'ads', remainingPct, createdAt: Date.now(), read: false }, ...u.alerts];
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
        ...u,
        campaigns: [campaign, ...u.campaigns],
        leads: [...seedLeads, ...u.leads],
        meters: { ...u.meters, ads: { total: ads.total, used: usedAds } },
        alerts,
      };
    });
  };

  const addLead: StoreCtx['addLead'] = (l) =>
    mutateUser((u) => ({
      ...u,
      leads: [{ ...l, id: uid(), createdAt: Date.now(), lastTouch: Date.now() }, ...u.leads],
    }));

  const updateLead: StoreCtx['updateLead'] = (id, patch) =>
    mutateUser((u) => ({
      ...u,
      leads: u.leads.map((l) => (l.id === id ? { ...l, ...patch, lastTouch: Date.now() } : l)),
    }));

  const removeLead: StoreCtx['removeLead'] = (id) =>
    mutateUser((u) => ({ ...u, leads: u.leads.filter((l) => l.id !== id) }));

  const markAlertsRead = () =>
    mutateUser((u) => ({ ...u, alerts: u.alerts.map((a) => ({ ...a, read: true })) }));

  const resetAll = () => {
    const u = userRef.current;
    if (!u) return;
    const paths = u.kb.map((f) => f.path).filter(Boolean) as string[];
    if (paths.length) {
      void supabase.storage.from(KB_BUCKET).remove(paths).catch(() => {});
    }
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
