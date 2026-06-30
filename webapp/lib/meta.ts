// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter Meta Marketing API (lato SERVER).
//
//  Strato 1: dal BRIEF prodotto da Opus + un video creativo, pubblica una
//  campagna Lead Generation reale su Meta (Facebook/Instagram):
//    video → modulo lead → campagna (OUTCOME_LEADS) → targeting
//    (geo + età + interessi risolti via Targeting Search) → ad set
//    (promoted_object = pagina, optimization_goal = LEAD_GENERATION) →
//    creatività (object_story_spec con il modulo) → ad.
//
//  Tutto viene creato in PAUSA per impostazione predefinita: l'admin rivede in
//  Gestione Inserzioni e attiva. La connessione per-utente (OAuth) è lo strato
//  successivo; qui la configurazione arriva dalle env (account dell'azienda).
//
//  Config (env): META_ACCESS_TOKEN, META_AD_ACCOUNT_ID (con o senza "act_"),
//  META_PAGE_ID. Opzionali: META_PAGE_ACCESS_TOKEN, META_IG_ACTOR_ID,
//  META_GRAPH_VERSION (default sotto).
// ─────────────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.facebook.com';

function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || 'v23.0';
}

export interface MetaConfig {
  accessToken: string;
  adAccountId: string; // senza prefisso "act_"
  pageId: string;
  igActorId?: string;
  pageToken?: string;
  version: string;
}

export function metaConfigured(): boolean {
  return !!(
    process.env.META_ACCESS_TOKEN &&
    process.env.META_AD_ACCOUNT_ID &&
    process.env.META_PAGE_ID
  );
}

export function metaConfig(): MetaConfig | null {
  if (!metaConfigured()) return null;
  return {
    accessToken: process.env.META_ACCESS_TOKEN as string,
    adAccountId: String(process.env.META_AD_ACCOUNT_ID).replace(/^act_/, ''),
    pageId: process.env.META_PAGE_ID as string,
    igActorId: process.env.META_IG_ACTOR_ID || undefined,
    pageToken: process.env.META_PAGE_ACCESS_TOKEN || undefined,
    version: graphVersion(),
  };
}

export class MetaError extends Error {
  detail?: unknown;
  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = 'MetaError';
    this.detail = detail;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GraphOpts {
  method?: 'GET' | 'POST' | 'DELETE';
  token: string;
  params?: Record<string, unknown>;
  version?: string;
}

// Chiamata generica al Graph: i valori oggetto/array vengono serializzati in
// JSON come richiede Meta; gli errori vengono sollevati come MetaError leggibili.
async function graph<T = any>(path: string, opts: GraphOpts): Promise<T> {
  const version = opts.version || graphVersion();
  const method = opts.method || 'GET';
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.params || {})) {
    if (v === undefined || v === null) continue;
    form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  form.set('access_token', opts.token);

  const base = `${GRAPH}/${version}/${path.replace(/^\//, '')}`;
  let res: Response;
  if (method === 'GET') {
    res = await fetch(`${base}?${form.toString()}`, { method: 'GET' });
  } else {
    res = await fetch(base, { method, body: form });
  }

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const msg =
      json?.error?.error_user_msg ||
      json?.error?.message ||
      `Meta API ${res.status}`;
    throw new MetaError(msg, json?.error);
  }
  return json as T;
}

// ── Video ─────────────────────────────────────────────────────────────────

// Carica un video tramite file_url (Meta lo scarica lato suo). Il video deve
// essere a un URL pubblico raggiungibile (es. la clip Higgsfield/CloudFront).
export async function uploadAdVideo(cfg: MetaConfig, fileUrl: string): Promise<string> {
  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/advideos`, {
    method: 'POST',
    token: cfg.accessToken,
    params: { file_url: fileUrl },
    version: cfg.version,
  });
  return r.id;
}

// Attende che il video sia "ready" (Meta lo elabora dopo l'upload). Cap a ~30s
// per restare nel budget della serverless; se scade si prova comunque a usarlo.
export async function waitVideoReady(
  cfg: MetaConfig,
  videoId: string,
  tries = 10,
  delayMs = 3000
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    const r = await graph<{ status?: { video_status?: string } }>(`${videoId}`, {
      token: cfg.accessToken,
      params: { fields: 'status' },
      version: cfg.version,
    });
    const s = r.status?.video_status;
    if (s === 'ready') return true;
    if (s === 'error') throw new MetaError('Elaborazione del video su Meta non riuscita');
    await sleep(delayMs);
  }
  return false;
}

export async function getVideoThumbnail(
  cfg: MetaConfig,
  videoId: string
): Promise<string | undefined> {
  try {
    const r = await graph<{ data?: { uri: string; is_preferred?: boolean }[] }>(
      `${videoId}/thumbnails`,
      { token: cfg.accessToken, version: cfg.version }
    );
    const list = r.data || [];
    const pref = list.find((t) => t.is_preferred) || list[0];
    return pref?.uri;
  } catch {
    return undefined;
  }
}

// ── Targeting search (nomi → id reali di Meta) ──────────────────────────────

export async function resolveGeo(
  cfg: MetaConfig,
  text: string | undefined
): Promise<Record<string, unknown>> {
  const raw = text || '';
  const city = raw.split(/[+,·]/)[0].trim();
  const radiusMatch = raw.match(/(\d+)\s*km/i);
  const radius = radiusMatch ? Math.min(80, Math.max(1, +radiusMatch[1])) : 25;
  if (city) {
    try {
      const r = await graph<{ data?: { key: string }[] }>('search', {
        token: cfg.accessToken,
        params: { type: 'adgeolocation', location_types: ['city'], q: city, limit: 1 },
        version: cfg.version,
      });
      const hit = r.data?.[0];
      if (hit?.key) {
        return { cities: [{ key: hit.key, radius, distance_unit: 'kilometer' }] };
      }
    } catch {
      /* fallback nazione */
    }
  }
  return { countries: ['IT'] };
}

export async function resolveInterests(
  cfg: MetaConfig,
  names: string[] | undefined
): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = [];
  for (const name of (names || []).slice(0, 8)) {
    if (!name) continue;
    try {
      const r = await graph<{ data?: { id: string; name: string }[] }>('search', {
        token: cfg.accessToken,
        params: { type: 'adinterest', q: name, limit: 1 },
        version: cfg.version,
      });
      const hit = r.data?.[0];
      if (hit?.id) out.push({ id: String(hit.id), name: hit.name || name });
    } catch {
      /* salta l'interesse non risolto */
    }
  }
  return out;
}

function parseAgeRange(s: string | undefined): { min: number; max: number } {
  const m = (s || '').match(/(\d{2})\s*[-–]\s*(\d{2})/);
  let min = m ? +m[1] : 25;
  let max = m ? +m[2] : 55;
  min = Math.min(65, Math.max(18, min));
  max = Math.min(65, Math.max(min, max));
  return { min, max };
}

// ── Modulo lead (instant form) ──────────────────────────────────────────────

interface LeadQuestion {
  type: string;
  key?: string;
  label?: string;
}

function leadFieldsToQuestions(fields: string[] | undefined): LeadQuestion[] {
  const map = (label: string): LeadQuestion => {
    const l = label.toLowerCase();
    if (/mail/.test(l)) return { type: 'EMAIL' };
    if (/(telefono|cellulare|cell|phone|numero)/.test(l)) return { type: 'PHONE' };
    if (/(nome|cognome|name)/.test(l)) return { type: 'FULL_NAME' };
    if (/(citt[àa]|city|comune)/.test(l)) return { type: 'CITY' };
    if (/(azienda|company|impresa|attivit)/.test(l)) return { type: 'COMPANY_NAME' };
    return { type: 'CUSTOM', key: l.replace(/\s+/g, '_').slice(0, 40) || 'campo', label };
  };
  const src = fields && fields.length ? fields : ['Nome e cognome', 'Email', 'Telefono'];
  const seen = new Set<string>();
  const out: LeadQuestion[] = [];
  for (const f of src) {
    const q = map(f);
    const id = q.type === 'CUSTOM' ? `c:${q.key}` : q.type;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(q);
  }
  return out;
}

interface LeadFormInput {
  name: string;
  fields: string[];
  privacyUrl: string;
  privacyLinkText?: string;
  thankYouTitle?: string;
  thankYouBody?: string;
}

export async function createLeadForm(cfg: MetaConfig, input: LeadFormInput): Promise<string> {
  const token = cfg.pageToken || cfg.accessToken;
  const params: Record<string, unknown> = {
    name: input.name.slice(0, 200),
    locale: 'it_IT',
    questions: leadFieldsToQuestions(input.fields),
    privacy_policy: {
      url: input.privacyUrl,
      link_text: (input.privacyLinkText || 'Informativa privacy').slice(0, 70),
    },
    follow_up_action_text: 'Grazie!',
    thank_you_page: {
      title: input.thankYouTitle || 'Grazie!',
      body: input.thankYouBody || 'Ti contatteremo a breve.',
      button_type: 'VIEW_WEBSITE',
      website_url: input.privacyUrl,
    },
  };
  const r = await graph<{ id: string }>(`${cfg.pageId}/leadgen_forms`, {
    method: 'POST',
    token,
    params,
    version: cfg.version,
  });
  return r.id;
}

// ── Campagna / Ad set / Creatività / Ad ─────────────────────────────────────

export async function createCampaign(
  cfg: MetaConfig,
  input: { name: string; objective?: string; status?: 'PAUSED' | 'ACTIVE' }
): Promise<string> {
  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/campaigns`, {
    method: 'POST',
    token: cfg.accessToken,
    params: {
      name: input.name,
      objective: input.objective || 'OUTCOME_LEADS',
      status: input.status || 'PAUSED',
      special_ad_categories: [],
    },
    version: cfg.version,
  });
  return r.id;
}

export async function createAdSet(
  cfg: MetaConfig,
  input: {
    campaignId: string;
    name: string;
    dailyBudgetCents: number;
    targeting: Record<string, unknown>;
    status?: 'PAUSED' | 'ACTIVE';
  }
): Promise<string> {
  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/adsets`, {
    method: 'POST',
    token: cfg.accessToken,
    params: {
      name: input.name,
      campaign_id: input.campaignId,
      optimization_goal: 'LEAD_GENERATION',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      daily_budget: Math.max(100, Math.round(input.dailyBudgetCents)),
      promoted_object: { page_id: cfg.pageId },
      destination_type: 'ON_AD',
      targeting: input.targeting,
      status: input.status || 'PAUSED',
    },
    version: cfg.version,
  });
  return r.id;
}

function ctaToMeta(cta: string | undefined): string {
  const c = (cta || '').toLowerCase();
  if (/(registr|iscriv|sign ?up)/.test(c)) return 'SIGN_UP';
  if (/(contatt|contact|chiama|prenota|book)/.test(c)) return 'CONTACT_US';
  if (/(scarica|download)/.test(c)) return 'DOWNLOAD';
  if (/(preventiv|quote|offerta)/.test(c)) return 'GET_QUOTE';
  return 'LEARN_MORE';
}

export async function createCreative(
  cfg: MetaConfig,
  input: {
    name: string;
    videoId: string;
    thumbnailUrl?: string;
    message: string;
    headline?: string;
    cta: string;
    leadFormId: string;
    linkUrl: string;
  }
): Promise<string> {
  const video_data: Record<string, unknown> = {
    video_id: input.videoId,
    message: input.message,
    title: input.headline,
    call_to_action: {
      type: input.cta,
      value: { lead_gen_form_id: input.leadFormId, link: input.linkUrl },
    },
  };
  if (input.thumbnailUrl) video_data.image_url = input.thumbnailUrl;

  const object_story_spec: Record<string, unknown> = {
    page_id: cfg.pageId,
    video_data,
  };
  if (cfg.igActorId) object_story_spec.instagram_actor_id = cfg.igActorId;

  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/adcreatives`, {
    method: 'POST',
    token: cfg.accessToken,
    params: { name: input.name, object_story_spec },
    version: cfg.version,
  });
  return r.id;
}

export async function createAd(
  cfg: MetaConfig,
  input: { adsetId: string; name: string; creativeId: string; status?: 'PAUSED' | 'ACTIVE' }
): Promise<string> {
  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/ads`, {
    method: 'POST',
    token: cfg.accessToken,
    params: {
      name: input.name,
      adset_id: input.adsetId,
      creative: { creative_id: input.creativeId },
      status: input.status || 'PAUSED',
    },
    version: cfg.version,
  });
  return r.id;
}

// ── Custom Audience (lista clienti) + Lookalike ─────────────────────────────

export async function createCustomAudience(
  cfg: MetaConfig,
  input: { name: string; description?: string }
): Promise<string> {
  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/customaudiences`, {
    method: 'POST',
    token: cfg.accessToken,
    params: {
      name: input.name.slice(0, 200),
      subtype: 'CUSTOM',
      description: input.description || 'GENERAH AI · lista contatti',
      customer_file_source: 'USER_PROVIDED_ONLY',
    },
    version: cfg.version,
  });
  return r.id;
}

// Aggiunge utenti (già hashati SHA-256) all'audience, in lotti da max 10.000.
export async function addUsersToAudience(
  cfg: MetaConfig,
  audienceId: string,
  schema: string[],
  data: string[][]
): Promise<number> {
  let received = 0;
  for (let i = 0; i < data.length; i += 10000) {
    const chunk = data.slice(i, i + 10000);
    const r = await graph<{ num_received?: number }>(`${audienceId}/users`, {
      method: 'POST',
      token: cfg.accessToken,
      params: { payload: { schema, data: chunk } },
      version: cfg.version,
    });
    received += r.num_received ?? chunk.length;
  }
  return received;
}

export async function createLookalike(
  cfg: MetaConfig,
  input: { name: string; originAudienceId: string; country?: string; ratio?: number }
): Promise<string> {
  const ratio = Math.min(0.2, Math.max(0.01, input.ratio ?? 0.03));
  const r = await graph<{ id: string }>(`act_${cfg.adAccountId}/customaudiences`, {
    method: 'POST',
    token: cfg.accessToken,
    params: {
      name: input.name.slice(0, 200),
      subtype: 'LOOKALIKE',
      origin_audience_id: input.originAudienceId,
      lookalike_spec: { type: 'similarity', country: input.country || 'IT', ratio },
    },
    version: cfg.version,
  });
  return r.id;
}

export interface LookalikeResult {
  customAudienceId: string;
  lookalikeId: string | null;
  received: number;
  note?: string;
}

// Orchestratore: lista hashata → custom audience → utenti → lookalike.
export async function buildLookalikeAudience(
  cfg: MetaConfig,
  input: { schema: string[]; data: string[][]; label?: string; country?: string; ratio?: number }
): Promise<LookalikeResult> {
  const label = input.label || 'GENERAH';
  const customAudienceId = await createCustomAudience(cfg, { name: `${label} · Lista contatti` });
  const received = await addUsersToAudience(cfg, customAudienceId, input.schema, input.data);

  // Il lookalike richiede un seed con abbastanza utenti corrisposti: se Meta lo
  // rifiuta (lista troppo piccola / in elaborazione) non si fa fallire tutto.
  let lookalikeId: string | null = null;
  let note: string | undefined;
  try {
    lookalikeId = await createLookalike(cfg, {
      name: `${label} · Lookalike`,
      originAudienceId: customAudienceId,
      country: input.country,
      ratio: input.ratio,
    });
  } catch (e) {
    note = e instanceof MetaError ? e.message : 'Lookalike non creato (seed in elaborazione o troppo piccolo)';
  }
  return { customAudienceId, lookalikeId, received, note };
}

// ── Lead Ads (webhook) ──────────────────────────────────────────────────────

// Iscrive la PAGINA agli aggiornamenti `leadgen`: senza questo, anche con il
// webhook configurato nell'app, Meta non recapita i lead della pagina. Best-effort
// (richiede il page token con pages_manage_metadata).
export async function subscribePageToLeadgen(
  pageToken: string,
  pageId: string,
  version?: string
): Promise<void> {
  await graph(`${pageId}/subscribed_apps`, {
    method: 'POST',
    token: pageToken,
    params: { subscribed_fields: 'leadgen' },
    version,
  });
}

export interface FetchedLead {
  id: string;
  createdTime?: string;
  adId?: string;
  formId?: string;
  campaignId?: string;
  campaignName?: string;
  fields: Record<string, string>;
}

// Il webhook recapita solo gli ID: i dati del lead si leggono qui, con il token
// della pagina. `field_data` è una lista di { name, values }.
export async function fetchLeadData(
  token: string,
  leadgenId: string,
  version?: string
): Promise<FetchedLead> {
  const r = await graph<{
    id: string;
    created_time?: string;
    ad_id?: string;
    form_id?: string;
    campaign_id?: string;
    campaign_name?: string;
    field_data?: { name: string; values: string[] }[];
  }>(leadgenId, {
    method: 'GET',
    token,
    params: { fields: 'id,created_time,ad_id,form_id,campaign_id,campaign_name,field_data' },
    version,
  });
  const fields: Record<string, string> = {};
  for (const f of r.field_data || []) {
    if (f?.name) fields[f.name.toLowerCase()] = Array.isArray(f.values) ? f.values.join(' ').trim() : '';
  }
  return {
    id: r.id,
    createdTime: r.created_time,
    adId: r.ad_id,
    formId: r.form_id,
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    fields,
  };
}

// ── Orchestratore: brief → campagna lead pubblicata ─────────────────────────

export interface PublishBrief {
  campaignName: string;
  postText: string;
  headline?: string;
  cta?: string;
  interests?: string[];
  ageRange?: string;
  geoSuggestion?: string;
  leadFormFields?: string[];
}

export interface PublishParams {
  videoUrl: string;
  dailyBudgetEur: number;
  geoText?: string;
  ageRange?: string;
  privacyUrl?: string;
  status?: 'PAUSED' | 'ACTIVE';
  customAudienceIds?: string[];
}

export interface PublishResult {
  campaignId: string;
  adSetId: string;
  adId: string;
  creativeId: string;
  leadFormId: string;
  videoId: string;
  status: 'PAUSED' | 'ACTIVE';
}

export async function publishLeadCampaign(
  cfg: MetaConfig,
  brief: PublishBrief,
  params: PublishParams
): Promise<PublishResult> {
  const status: 'PAUSED' | 'ACTIVE' = params.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
  const name = brief.campaignName || 'GENERAH · Lead generation';
  const privacyUrl = params.privacyUrl || `https://www.facebook.com/${cfg.pageId}`;

  // 1) video → 2) attesa elaborazione → 3) thumbnail
  const videoId = await uploadAdVideo(cfg, params.videoUrl);
  await waitVideoReady(cfg, videoId).catch(() => false);
  const thumbnailUrl = await getVideoThumbnail(cfg, videoId);

  // 4) modulo lead
  const leadFormId = await createLeadForm(cfg, {
    name: `${name} · Modulo`,
    fields: brief.leadFormFields || [],
    privacyUrl,
    thankYouBody: 'Grazie! Ti contatteremo a breve.',
  });

  // 5) campagna
  const campaignId = await createCampaign(cfg, { name, status });

  // 6) targeting (geo + età + interessi reali)
  const geo = await resolveGeo(cfg, params.geoText || brief.geoSuggestion);
  const interests = await resolveInterests(cfg, brief.interests);
  const { min, max } = parseAgeRange(params.ageRange || brief.ageRange);
  const targeting: Record<string, unknown> = {
    ...geo,
    age_min: min,
    age_max: max,
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream', 'reels'],
  };
  if (interests.length) targeting.flexible_spec = [{ interests }];
  if (params.customAudienceIds?.length) {
    targeting.custom_audiences = params.customAudienceIds.map((id) => ({ id }));
  }

  // 7) ad set
  const adSetId = await createAdSet(cfg, {
    campaignId,
    name: `${name} · Ad set`,
    dailyBudgetCents: Math.round((params.dailyBudgetEur || 30) * 100),
    targeting,
    status,
  });

  // 8) creatività
  const creativeId = await createCreative(cfg, {
    name: `${name} · Creatività`,
    videoId,
    thumbnailUrl,
    message: brief.postText,
    headline: brief.headline,
    cta: ctaToMeta(brief.cta),
    leadFormId,
    linkUrl: privacyUrl,
  });

  // 9) ad
  const adId = await createAd(cfg, {
    adsetId: adSetId,
    name: `${name} · Ad`,
    creativeId,
    status,
  });

  return { campaignId, adSetId, adId, creativeId, leadFormId, videoId, status };
}
