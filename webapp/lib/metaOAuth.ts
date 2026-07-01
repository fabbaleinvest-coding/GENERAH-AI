// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · OAuth Meta per-utente (lato SERVER) + storage connessione.
//
//  Ogni admin collega il PROPRIO account Meta via Facebook Login. Il token
//  long-lived dell'utente e il token della pagina vengono cifrati (AES-256-GCM
//  con chiave server-only) e salvati nella tabella `meta_connections` (una riga
//  per utente, protetta da RLS). Le chiamate ads usano poi la connessione
//  dell'utente; in assenza, si ricade sulla configurazione via env.
//
//  Flusso (senza esporre il token Supabase nel giro OAuth):
//   1) /api/meta/oauth/start  → URL del dialog FB (state firmato HMAC)
//   2) popup → /api/meta/oauth/callback → rimanda il `code` all'app (postMessage)
//   3) /api/meta/oauth/exchange (autenticata) → code→token→long-lived →
//      scoperta ad account + pagina → salvataggio cifrato
//
//  Config (env): META_APP_ID, META_APP_SECRET. Opzionali: META_OAUTH_REDIRECT,
//  META_TOKEN_SECRET (default: deriva da META_APP_SECRET), META_GRAPH_VERSION.
// ─────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { userClient, serviceClient } from '@/lib/supabaseServer';
import {
  metaConfig as metaEnvConfig,
  subscribePageToLeadgen,
  type MetaConfig,
} from '@/lib/meta';

const GRAPH = 'https://graph.facebook.com';

function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || 'v23.0';
}

export function metaAppConfigured(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

// Fallback sulle credenziali da env (account "house" del proprietario) per gli
// utenti che non hanno ancora collegato il proprio Meta. DISATTIVATO per
// impostazione predefinita: ogni utente — incluso il proprietario in demo —
// collega il proprio account via OAuth e la sua connessione (cifrata) viene
// usata a runtime. Riattivabile solo con META_ALLOW_ENV_FALLBACK=true.
export function metaEnvFallbackEnabled(): boolean {
  const v = (process.env.META_ALLOW_ENV_FALLBACK || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

// URI di callback OAuth: env esplicito se presente, altrimenti dedotto dall'host
// della richiesta (deve combaciare ESATTAMENTE con quello whitelistato su Meta).
export function oauthRedirectUri(req: Request): string {
  if (process.env.META_OAUTH_REDIRECT) return process.env.META_OAUTH_REDIRECT;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return `${proto}://${host}/api/meta/oauth/callback`;
}

const SCOPES = [
  'ads_management',
  'ads_read',
  'leads_retrieval',
  'pages_show_list',
  'pages_manage_ads',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
  'pages_manage_metadata',
];

// ── Cifratura token (AES-256-GCM, chiave server-only) ───────────────────────

function tokenKey(): Buffer {
  const secret =
    process.env.META_TOKEN_SECRET || process.env.META_APP_SECRET || 'generah-meta';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(blob: string): string {
  const raw = Buffer.from(blob, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', tokenKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ── State firmato (CSRF) ────────────────────────────────────────────────────

function stateKey(): string {
  return process.env.META_TOKEN_SECRET || process.env.META_APP_SECRET || 'generah-meta';
}

export function signState(): string {
  const payload = Buffer.from(JSON.stringify({ n: crypto.randomBytes(8).toString('hex'), t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', stateKey()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState(state: string, maxAgeMs = 600_000): boolean {
  const [payload, sig] = (state || '').split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', stateKey()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const { t } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof t === 'number' && Date.now() - t < maxAgeMs;
  } catch {
    return false;
  }
}

// ── Dialog + scambio token ──────────────────────────────────────────────────

export function oauthLoginUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID as string,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: SCOPES.join(','),
  });
  return `https://www.facebook.com/${graphVersion()}/dialog/oauth?${p.toString()}`;
}

async function fbGet<T = any>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH}/${graphVersion()}/${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: 'GET' });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `Meta OAuth ${res.status}`);
  }
  return json as T;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const r = await fbGet<{ access_token: string }>('oauth/access_token', {
    client_id: process.env.META_APP_ID as string,
    client_secret: process.env.META_APP_SECRET as string,
    redirect_uri: redirectUri,
    code,
  });
  return r.access_token;
}

export async function extendToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const r = await fbGet<{ access_token: string; expires_in?: number }>('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID as string,
    client_secret: process.env.META_APP_SECRET as string,
    fb_exchange_token: shortToken,
  });
  return { token: r.access_token, expiresIn: r.expires_in || 0 };
}

// ── Scoperta asset (ad account + pagina + IG) ───────────────────────────────

export interface AdAccountInfo {
  id: string; // act_xxx
  accountId: string; // xxx
  name: string;
}

export async function listAdAccounts(token: string): Promise<AdAccountInfo[]> {
  const r = await fbGet<{ data?: { id: string; account_id: string; name: string }[] }>('me/adaccounts', {
    fields: 'id,account_id,name',
    access_token: token,
    limit: '50',
  });
  return (r.data || []).map((a) => ({ id: a.id, accountId: a.account_id, name: a.name }));
}

export interface PageInfo {
  id: string;
  name: string;
  accessToken: string;
  igActorId?: string;
}

export async function listPages(token: string): Promise<PageInfo[]> {
  const r = await fbGet<{ data?: { id: string; name: string; access_token: string }[] }>('me/accounts', {
    fields: 'id,name,access_token',
    access_token: token,
    limit: '50',
  });
  return (r.data || []).map((p) => ({ id: p.id, name: p.name, accessToken: p.access_token }));
}

async function pageInstagramActor(pageId: string, pageToken: string): Promise<string | undefined> {
  try {
    const r = await fbGet<{ instagram_business_account?: { id: string } }>(pageId, {
      fields: 'instagram_business_account',
      access_token: pageToken,
    });
    return r.instagram_business_account?.id;
  } catch {
    return undefined;
  }
}

// ── Storage connessione (tabella meta_connections, RLS per-utente) ──────────

export interface SavedConnection {
  adAccountId: string;
  pageId: string;
  igActorId?: string;
  accountName?: string;
  pageName?: string;
  userToken: string;
  pageToken?: string;
  scopes: string;
  expiresIn: number;
}

async function uid(userToken: string): Promise<string | null> {
  try {
    const { data } = await userClient(userToken).auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function saveConnection(userToken: string, c: SavedConnection): Promise<void> {
  const id = await uid(userToken);
  if (!id) throw new Error('Sessione non valida');
  const expires_at = c.expiresIn > 0 ? new Date(Date.now() + c.expiresIn * 1000).toISOString() : null;
  const { error } = await userClient(userToken)
    .from('meta_connections')
    .upsert({
      user_id: id,
      ad_account_id: c.adAccountId,
      page_id: c.pageId,
      ig_actor_id: c.igActorId ?? null,
      account_name: c.accountName ?? null,
      page_name: c.pageName ?? null,
      token_cipher: encryptSecret(c.userToken),
      page_token_cipher: c.pageToken ? encryptSecret(c.pageToken) : null,
      scopes: c.scopes,
      expires_at,
      connected_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

interface ConnectionRow {
  ad_account_id: string;
  page_id: string;
  ig_actor_id: string | null;
  account_name: string | null;
  page_name: string | null;
  token_cipher: string;
  page_token_cipher: string | null;
  expires_at: string | null;
}

async function readRow(userToken: string): Promise<ConnectionRow | null> {
  const id = await uid(userToken);
  if (!id) return null;
  const { data, error } = await userClient(userToken)
    .from('meta_connections')
    .select('ad_account_id,page_id,ig_actor_id,account_name,page_name,token_cipher,page_token_cipher,expires_at')
    .eq('user_id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConnectionRow) || null;
}

export interface ConnectionStatus {
  connected: boolean;
  adAccountId?: string;
  pageId?: string;
  accountName?: string;
  pageName?: string;
  expiresAt?: string | null;
}

export async function connectionStatus(userToken: string): Promise<ConnectionStatus> {
  try {
    const row = await readRow(userToken);
    if (!row) return { connected: false };
    return {
      connected: true,
      adAccountId: row.ad_account_id,
      pageId: row.page_id,
      accountName: row.account_name ?? undefined,
      pageName: row.page_name ?? undefined,
      expiresAt: row.expires_at,
    };
  } catch {
    // tabella assente o errore: trattato come non connesso
    return { connected: false };
  }
}

export async function disconnect(userToken: string): Promise<void> {
  const id = await uid(userToken);
  if (!id) return;
  await userClient(userToken).from('meta_connections').delete().eq('user_id', id);
}

export interface PageConnection {
  userId: string;
  pageToken?: string;
  accessToken: string;
  version: string;
}

// Lookup per page_id (server-to-server, service_role): individua l'utente
// proprietario della pagina Meta e restituisce i token decifrati, così il
// webhook Lead Ads può leggere i dati del lead e salvarlo per quell'utente.
// Null se la service_role non è configurata o la pagina non è collegata.
export async function connectionByPageId(pageId: string): Promise<PageConnection | null> {
  const db = serviceClient();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('meta_connections')
      .select('user_id,token_cipher,page_token_cipher')
      .eq('page_id', pageId)
      .limit(1);
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return null;
    return {
      userId: row.user_id as string,
      accessToken: decryptSecret(row.token_cipher as string),
      pageToken: row.page_token_cipher ? decryptSecret(row.page_token_cipher as string) : undefined,
      version: graphVersion(),
    };
  } catch {
    return null;
  }
}

// Risolve la MetaConfig completa per uno specifico user_id (server-to-server,
// service_role). Usata dal cron di pubblicazione social, che non ha la sessione
// dell'utente. Include il token di pagina (per pubblicare su FB/IG).
export async function connectionByUserId(userId: string): Promise<MetaConfig | null> {
  const db = serviceClient();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('meta_connections')
      .select('ad_account_id,page_id,ig_actor_id,token_cipher,page_token_cipher')
      .eq('user_id', userId)
      .limit(1);
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return null;
    return {
      accessToken: decryptSecret(row.token_cipher as string),
      adAccountId: String(row.ad_account_id).replace(/^act_/, ''),
      pageId: row.page_id as string,
      igActorId: (row.ig_actor_id as string) ?? undefined,
      pageToken: row.page_token_cipher ? decryptSecret(row.page_token_cipher as string) : undefined,
      version: graphVersion(),
    };
  } catch {
    return null;
  }
}

// Risolve la MetaConfig da usare per le chiamate ads: SEMPRE la connessione
// per-utente (decifrata) se presente. Se l'utente non ha collegato Meta, si
// ricade sulle credenziali da env SOLO quando META_ALLOW_ENV_FALLBACK=true;
// altrimenti null → l'utente (proprietario incluso) deve collegare il proprio
// account via OAuth, anche in demo.
export async function resolveMetaConfig(userToken: string): Promise<MetaConfig | null> {
  try {
    const row = await readRow(userToken);
    if (row) {
      return {
        accessToken: decryptSecret(row.token_cipher),
        adAccountId: String(row.ad_account_id).replace(/^act_/, ''),
        pageId: row.page_id,
        igActorId: row.ig_actor_id ?? undefined,
        pageToken: row.page_token_cipher ? decryptSecret(row.page_token_cipher) : undefined,
        version: graphVersion(),
      };
    }
  } catch {
    // tabella assente / errore di lettura → eventuale fallback env sotto
  }
  return metaEnvFallbackEnabled() ? metaEnvConfig() : null;
}

// Orchestratore lato exchange: code → token → long-lived → asset → salvataggio.
export async function completeOAuth(
  userToken: string,
  code: string,
  redirectUri: string
): Promise<ConnectionStatus> {
  const shortTok = await exchangeCode(code, redirectUri);
  const { token: longTok, expiresIn } = await extendToken(shortTok);

  const [accounts, pages] = await Promise.all([listAdAccounts(longTok), listPages(longTok)]);
  if (!accounts.length) throw new Error('Nessun account pubblicitario trovato sul profilo Meta');
  if (!pages.length) throw new Error('Nessuna pagina Facebook trovata sul profilo Meta');

  const account = accounts[0];
  const page = pages[0];
  const igActorId = await pageInstagramActor(page.id, page.accessToken);

  await saveConnection(userToken, {
    adAccountId: account.accountId,
    pageId: page.id,
    igActorId,
    accountName: account.name,
    pageName: page.name,
    userToken: longTok,
    pageToken: page.accessToken,
    scopes: SCOPES.join(','),
    expiresIn,
  });

  // Iscrive la pagina agli eventi `leadgen` così il webhook riceve i lead della
  // campagna. Non bloccante: se fallisce, l'admin può attivarlo da Meta.
  try {
    await subscribePageToLeadgen(page.accessToken, page.id, graphVersion());
  } catch {
    // ignorato di proposito
  }

  return {
    connected: true,
    adAccountId: account.accountId,
    pageId: page.id,
    accountName: account.name,
    pageName: page.name,
  };
}
