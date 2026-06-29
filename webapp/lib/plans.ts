// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Modello economico — fonte: GENERAH_AI_modello.xlsx
//  Tutti i prezzi sono IVA esclusa. Stime di partenza per il mercato italiano.
// ─────────────────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'growth' | 'premium' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  canone: number; // €/mese
  setup: number; // una tantum €
  phone: number; // minuti telefono / mese
  video: number; // minuti video-consulto / mese
  whatsapp: number; // messaggi WhatsApp marketing / mese
  ads: number; // campagne ADS gestite dall'AI / mese
  highlight?: boolean;
}

// Ordine dei piani (per la logica di upgrade al piano superiore)
export const PLAN_ORDER: PlanId[] = ['starter', 'growth', 'premium', 'enterprise'];

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Accendi il motore. Il primo reparto vendite che non dorme.',
    canone: 790,
    setup: 2500,
    phone: 700,
    video: 0,
    whatsapp: 500,
    ads: 1,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'Scala l\u2019acquisizione. Voce, video e campagne in sinergia.',
    canone: 1900,
    setup: 4000,
    phone: 2000,
    video: 150,
    whatsapp: 1250,
    ads: 3,
    highlight: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: 'Massima potenza. Un esercito di venditori in un\u2019unica intelligenza.',
    canone: 4500,
    setup: 7000,
    phone: 4500,
    video: 500,
    whatsapp: 3000,
    ads: 6,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Su misura. Volumi illimitati e configurazione dedicata.',
    canone: 5000,
    setup: 8000,
    phone: 8000,
    video: 1000,
    whatsapp: 7500,
    ads: 12,
  },
};

export const PLAN_LIST: Plan[] = PLAN_ORDER.map((id) => PLANS[id]);

// ─────────────────────────────────────────────────────────────────────────
//  Contatori (feature metrate) — etichette e unità
// ─────────────────────────────────────────────────────────────────────────
export type MeterKey = 'phone' | 'video' | 'whatsapp' | 'ads';

export interface MeterMeta {
  key: MeterKey;
  label: string;
  short: string;
  unit: string;
  desc: string;
}

export const METERS: Record<MeterKey, MeterMeta> = {
  phone: {
    key: 'phone',
    label: 'Chiamate AI · Agente vocale',
    short: 'Voce AI',
    unit: 'min',
    desc: 'Minuti di telefonate con l\u2019agente vocale indistinguibile dall\u2019umano.',
  },
  video: {
    key: 'video',
    label: 'Video-consulto AI',
    short: 'Video AI',
    unit: 'min',
    desc: 'Minuti di video-consulto condotti dall\u2019agente visivo.',
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp · Messenger marketing',
    short: 'WhatsApp',
    unit: 'msg',
    desc: 'Messaggi marketing a freddo. Le risposte in finestra 24h restano illimitate.',
  },
  ads: {
    key: 'ads',
    label: 'Gestione campagne ADS',
    short: 'Campagne ADS',
    unit: 'camp.',
    desc: 'Campagne Meta create e ottimizzate in autonomia dall\u2019intelligenza.',
  },
};

export const METER_ORDER: MeterKey[] = ['phone', 'video', 'whatsapp', 'ads'];

// ─────────────────────────────────────────────────────────────────────────
//  Listino Overage — pacchetti aggiuntivi (fonte: foglio Listino_Overage)
//  Proposti automaticamente quando un contatore scende sotto il 10%.
// ─────────────────────────────────────────────────────────────────────────
export interface OveragePack {
  label: string;
  qty: number; // quantità (min o msg). 0 = pay-as-you-go unitario
  price: number; // € prezzo di vendita
  perUnit: number; // €/unità
}

export const OVERAGE: Record<Exclude<MeterKey, 'ads'>, OveragePack[]> = {
  phone: [
    { label: 'Pay-as-you-go', qty: 1, price: 0.35, perUnit: 0.35 },
    { label: 'Pacco 500', qty: 500, price: 154, perUnit: 0.308 },
    { label: 'Pacco 1.000', qty: 1000, price: 266, perUnit: 0.266 },
    { label: 'Pacco 5.000', qty: 5000, price: 1190, perUnit: 0.238 },
  ],
  video: [
    { label: 'Pay-as-you-go', qty: 1, price: 0.65, perUnit: 0.65 },
    { label: 'Pacco 100', qty: 100, price: 58.5, perUnit: 0.585 },
    { label: 'Pacco 300', qty: 300, price: 156, perUnit: 0.52 },
    { label: 'Pacco 1.000', qty: 1000, price: 481, perUnit: 0.481 },
  ],
  whatsapp: [
    { label: 'Pay-as-you-go', qty: 1, price: 0.3, perUnit: 0.3 },
    { label: 'Pacco 1.000', qty: 1000, price: 298, perUnit: 0.298 },
    { label: 'Pacco 5.000', qty: 5000, price: 1380, perUnit: 0.276 },
    { label: 'Pacco 20.000', qty: 20000, price: 4980, perUnit: 0.249 },
    { label: 'Pacco 50.000', qty: 50000, price: 10980, perUnit: 0.2196 },
  ],
};

// Pacchetti campagne ADS aggiuntive (coerenti col valore della gestione AI)
export const ADS_PACKS: OveragePack[] = [
  { label: 'Campagna singola', qty: 1, price: 290, perUnit: 290 },
  { label: 'Pacco 3 campagne', qty: 3, price: 790, perUnit: 263 },
  { label: 'Pacco 6 campagne', qty: 6, price: 1490, perUnit: 248 },
];

export function overageFor(key: MeterKey): OveragePack[] {
  if (key === 'ads') return ADS_PACKS;
  return OVERAGE[key];
}

// ─────────────────────────────────────────────────────────────────────────
//  Codici sconto
// ─────────────────────────────────────────────────────────────────────────
export interface DiscountResult {
  ok: boolean;
  code: string;
  message: string;
  percentOff: number; // sul canone (e setup salvo override)
  setupExtraOff: number; // sconto % addizionale solo sul setup
  upgradeFeatures: boolean; // feature del piano immediatamente superiore
}

const VALID_CODES = ['EXTRASPECIAL10', '!EXTRA20SPECIAL#', '#PLANUPGRADE!', '!PLAN50%UPGRADE#'];

export function evaluateDiscount(raw: string): DiscountResult | null {
  const code = raw.trim();
  if (!code) return null;
  // confronto case-insensitive ma conservando i simboli
  const upper = code.toUpperCase();
  const match = VALID_CODES.find((c) => c.toUpperCase() === upper);
  if (!match) {
    return {
      ok: false,
      code,
      message: 'Codice non valido o scaduto.',
      percentOff: 0,
      setupExtraOff: 0,
      upgradeFeatures: false,
    };
  }
  switch (match) {
    case 'EXTRASPECIAL10':
      return {
        ok: true,
        code: match,
        message: '\u201310% su canone e setup.',
        percentOff: 0.1,
        setupExtraOff: 0,
        upgradeFeatures: false,
      };
    case '!EXTRA20SPECIAL#':
      return {
        ok: true,
        code: match,
        message: '\u201320% su canone e setup.',
        percentOff: 0.2,
        setupExtraOff: 0,
        upgradeFeatures: false,
      };
    case '#PLANUPGRADE!':
      return {
        ok: true,
        code: match,
        message: 'Paghi questo piano, ottieni tutte le feature del piano superiore.',
        percentOff: 0,
        setupExtraOff: 0,
        upgradeFeatures: true,
      };
    case '!PLAN50%UPGRADE#':
      return {
        ok: true,
        code: match,
        message: 'Feature del piano superiore + 50% di sconto sull\u2019una tantum.',
        percentOff: 0,
        setupExtraOff: 0.5,
        upgradeFeatures: true,
      };
  }
  return null;
}

export function nextPlan(id: PlanId): PlanId {
  const i = PLAN_ORDER.indexOf(id);
  return i < PLAN_ORDER.length - 1 ? PLAN_ORDER[i + 1] : id;
}

export interface PricedPlan {
  base: Plan; // piano scelto (prezzo)
  featurePlan: Plan; // piano da cui prendere le feature (può essere il superiore)
  canone: number; // canone scontato
  setup: number; // setup scontato
  canoneFull: number;
  setupFull: number;
  discount: DiscountResult | null;
  upgradeApplied: boolean;
}

export function priceWithDiscount(planId: PlanId, code: string | null): PricedPlan {
  const base = PLANS[planId];
  const discount = code ? evaluateDiscount(code) : null;
  const valid = discount && discount.ok ? discount : null;

  const upgradeApplied = !!valid?.upgradeFeatures;
  const featurePlan = upgradeApplied ? PLANS[nextPlan(planId)] : base;

  const percent = valid?.percentOff ?? 0;
  const setupExtra = valid?.setupExtraOff ?? 0;

  const canone = Math.round(base.canone * (1 - percent));
  // setup: prima lo sconto percentuale generale, poi l'extra sull'una tantum
  const setupAfterPercent = base.setup * (1 - percent);
  const setup = Math.round(setupAfterPercent * (1 - setupExtra));

  return {
    base,
    featurePlan,
    canone,
    setup,
    canoneFull: base.canone,
    setupFull: base.setup,
    discount: valid,
    upgradeApplied,
  };
}

export const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);

export const num = (n: number) => new Intl.NumberFormat('it-IT').format(n);
