'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  PlanId,
  PLANS,
  MeterKey,
  METER_ORDER,
  priceWithDiscount,
} from './plans';

// ─────────────────────────────────────────────────────────────────────────
//  Tipi
// ─────────────────────────────────────────────────────────────────────────
export interface KbFile {
  id: string;
  name: string;
  size: number;
  kind: string;
  addedAt: number;
}

export interface SocialPost {
  id: string;
  week: string; // es. "Settimana 1"
  format: string; // es. "Educativo"
  title: string;
  bullets: string[];
  scheduledFor: number; // timestamp di pubblicazione programmata
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
  password: string;
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

interface DB {
  users: Record<string, User>; // chiave: email lowercase
  session: string | null; // email loggata
}

const KEY = 'generah_db_v1';

const emptyMeters = (): Record<MeterKey, Meter> => ({
  phone: { total: 0, used: 0 },
  video: { total: 0, used: 0 },
  whatsapp: { total: 0, used: 0 },
  ads: { total: 0, used: 0 },
});

function loadDB(): DB {
  if (typeof window === 'undefined') return { users: {}, session: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { users: {}, session: null };
    return JSON.parse(raw) as DB;
  } catch {
    return { users: {}, session: null };
  }
}

function saveDB(db: DB) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

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
  }) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  activatePlan: (
    planId: PlanId,
    code: string | null,
    mode: 'demo' | 'paid'
  ) => void;
  consume: (meter: MeterKey, amount: number) => void;
  topUp: (meter: MeterKey, qty: number) => void;
  addKb: (files: { name: string; size: number; kind: string }[]) => void;
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

// genera lead demo coerenti col settore
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
  const [db, setDb] = useState<DB>({ users: {}, session: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDb(loadDB());
    setReady(true);
  }, []);

  const persist = useCallback((next: DB) => {
    setDb(next);
    saveDB(next);
  }, []);

  const user = db.session ? db.users[db.session] ?? null : null;

  const mutateUser = useCallback(
    (fn: (u: User) => User) => {
      setDb((prev) => {
        if (!prev.session) return prev;
        const cur = prev.users[prev.session];
        if (!cur) return prev;
        const nextUser = fn(cur);
        const next: DB = {
          ...prev,
          users: { ...prev.users, [prev.session]: nextUser },
        };
        saveDB(next);
        return next;
      });
    },
    []
  );

  const register: StoreCtx['register'] = (d) => {
    const email = d.email.trim().toLowerCase();
    if (db.users[email]) return { ok: false, error: 'Esiste già un account con questa email.' };
    const u: User = {
      id: uid(),
      nome: d.nome.trim(),
      cognome: d.cognome.trim(),
      email,
      cellulare: d.cellulare.trim(),
      settore: d.settore.trim(),
      password: d.password,
      createdAt: Date.now(),
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
    persist({ users: { ...db.users, [email]: u }, session: email });
    return { ok: true };
  };

  const login: StoreCtx['login'] = (email, password) => {
    const key = email.trim().toLowerCase();
    const u = db.users[key];
    if (!u) return { ok: false, error: 'Nessun account trovato con questa email.' };
    if (u.password !== password) return { ok: false, error: 'Password errata.' };
    persist({ ...db, session: key });
    return { ok: true };
  };

  const logout = () => persist({ ...db, session: null });

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
          {
            id: uid(),
            meter,
            remainingPct,
            createdAt: Date.now(),
            read: false,
          },
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
    mutateUser((u) => ({
      ...u,
      kb: [
        ...u.kb,
        ...files.map((f) => ({ id: uid(), name: f.name, size: f.size, kind: f.kind, addedAt: Date.now() })),
      ],
    }));
  };

  const removeKb: StoreCtx['removeKb'] = (id) =>
    mutateUser((u) => ({ ...u, kb: u.kb.filter((f) => f.id !== id) }));

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
    persist({ users: {}, session: null });
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
