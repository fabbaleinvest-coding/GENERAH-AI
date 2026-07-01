// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Higgsfield MCP — OAuth 2.1 DI PIATTAFORMA (lato SERVER).
//
//  Questo modulo NON collega l'account Higgsfield del singolo utente. Collega
//  UNA sola volta l'account Higgsfield DELLA PIATTAFORMA (proprietà di GENERAH):
//  quel token diventa il motore creativo condiviso che genera immagini/video/
//  voiceover per TUTTI gli utenti con un piano a pagamento (e per la demo).
//
//  È un client OAuth 2.1 conforme alla MCP Authorization spec:
//   1) discovery: .well-known/oauth-protected-resource → authorization server
//      → .well-known/oauth-authorization-server (RFC 8414)  [override via env]
//   2) Dynamic Client Registration (RFC 7591) se non c'è un client_id via env
//   3) Authorization Code + PKCE (S256)
//   4) refresh automatico del token quando è vicino alla scadenza
//
//  I token (access + refresh) e le credenziali client sono CIFRATI (AES-256-GCM,
//  chiave server-only) e salvati in un'unica riga singleton della tabella
//  `higgsfield_platform_connection`. La tabella è leggibile SOLO dal service_role
//  (RLS deny-all per gli utenti): nessun utente può mai vedere il token della
//  piattaforma. Serve quindi SUPABASE_SERVICE_ROLE_KEY.
//
//  Config (env):
//    HIGGSFIELD_MCP_URL            (default https://mcp.higgsfield.ai/mcp)
//    HIGGSFIELD_TOKEN_SECRET       (chiave di cifratura; fallback derivato)
//    HIGGSFIELD_OAUTH_SCOPES       (opz; default vuoto → tutti gli scope del server)
//    Override discovery (opzionali, se il server non espone i .well-known):
//      HIGGSFIELD_OAUTH_ISSUER, HIGGSFIELD_OAUTH_AUTH_URL,
//      HIGGSFIELD_OAUTH_TOKEN_URL, HIGGSFIELD_OAUTH_REGISTER_URL,
//      HIGGSFIELD_OAUTH_CLIENT_ID, HIGGSFIELD_OAUTH_CLIENT_SECRET
// ─────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { serviceClient } from '@/lib/supabaseServer';

export const MCP_URL = process.env.HIGGSFIELD_MCP_URL || 'https://mcp.higgsfield.ai/mcp';
const SINGLETON_ID = 'singleton';
// Margine di refresh: rinnova se manca meno di 5 minuti alla scadenza.
const REFRESH_SKEW_MS = 5 * 60 * 1000;

// ── Cifratura (AES-256-GCM, chiave server-only) ─────────────────────────────

function tokenKey(): Buffer {
  const secret =
    process.env.HIGGSFIELD_TOKEN_SECRET ||
    process.env.HIGGSFIELD_KEY_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'generah-higgsfield-platform';
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

// ── PKCE ────────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// ── Discovery degli endpoint OAuth ──────────────────────────────────────────

export interface OAuthEndpoints {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Prova i .well-known noti a partire dall'URL del server MCP + issuer. */
async function discoverEndpoints(): Promise<OAuthEndpoints> {
  // 1) Override completo via env (bypassa la rete)
  if (process.env.HIGGSFIELD_OAUTH_AUTH_URL && process.env.HIGGSFIELD_OAUTH_TOKEN_URL) {
    return {
      issuer: process.env.HIGGSFIELD_OAUTH_ISSUER,
      authorization_endpoint: process.env.HIGGSFIELD_OAUTH_AUTH_URL,
      token_endpoint: process.env.HIGGSFIELD_OAUTH_TOKEN_URL,
      registration_endpoint: process.env.HIGGSFIELD_OAUTH_REGISTER_URL,
      scopes_supported: (process.env.HIGGSFIELD_OAUTH_SCOPES || '')
        .split(/[ ,]+/)
        .filter(Boolean),
    };
  }

  const mcp = new URL(MCP_URL);
  const origin = mcp.origin;

  // 2) Protected Resource Metadata (RFC 9728): individua l'authorization server.
  let issuers: string[] = [];
  for (const prm of [
    `${origin}/.well-known/oauth-protected-resource${mcp.pathname}`,
    `${origin}/.well-known/oauth-protected-resource`,
  ]) {
    const meta = await fetchJson(prm);
    const servers = meta?.authorization_servers;
    if (Array.isArray(servers) && servers.length) {
      issuers = servers.filter((s: unknown) => typeof s === 'string');
      break;
    }
  }
  if (process.env.HIGGSFIELD_OAUTH_ISSUER) issuers.unshift(process.env.HIGGSFIELD_OAUTH_ISSUER);
  if (!issuers.length) issuers = [origin];

  // 3) Authorization Server Metadata (RFC 8414 / OpenID Discovery).
  for (const iss of issuers) {
    const base = iss.replace(/\/$/, '');
    for (const asm of [
      `${base}/.well-known/oauth-authorization-server`,
      `${base}/.well-known/openid-configuration`,
    ]) {
      const meta = await fetchJson(asm);
      if (meta?.authorization_endpoint && meta?.token_endpoint) {
        return {
          issuer: meta.issuer || base,
          authorization_endpoint: meta.authorization_endpoint,
          token_endpoint: meta.token_endpoint,
          registration_endpoint: meta.registration_endpoint,
          scopes_supported: meta.scopes_supported,
        };
      }
    }
  }

  // 4) Fallback per convenzione (ultima spiaggia; sovrascrivibile via env).
  const base = issuers[0].replace(/\/$/, '');
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
  };
}

// ── Dynamic Client Registration (RFC 7591) ──────────────────────────────────

async function registerClient(
  ep: OAuthEndpoints,
  redirectUri: string
): Promise<{ clientId: string; clientSecret?: string }> {
  // Client statico via env → nessuna registrazione.
  if (process.env.HIGGSFIELD_OAUTH_CLIENT_ID) {
    return {
      clientId: process.env.HIGGSFIELD_OAUTH_CLIENT_ID,
      clientSecret: process.env.HIGGSFIELD_OAUTH_CLIENT_SECRET,
    };
  }
  if (!ep.registration_endpoint) {
    throw new Error(
      'Higgsfield non espone la registrazione dinamica del client: imposta HIGGSFIELD_OAUTH_CLIENT_ID (e SECRET) via env.'
    );
  }
  const res = await fetch(ep.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'GENERAH AI',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      application_type: 'web',
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.client_id) {
    throw new Error(json?.error_description || json?.error || `Registrazione client MCP fallita (${res.status})`);
  }
  return { clientId: json.client_id, clientSecret: json.client_secret };
}

// ── Storage singleton (service_role, RLS deny-all agli utenti) ───────────────

interface PlatformRow {
  id: string;
  client_id: string | null;
  client_secret_cipher: string | null;
  endpoints: OAuthEndpoints | null;
  scopes: string | null;
  access_token_cipher: string | null;
  refresh_token_cipher: string | null;
  expires_at: string | null;
  pending_cipher: string | null;
  connected_at: string | null;
  updated_at: string | null;
}

function db() {
  const c = serviceClient();
  if (!c) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY mancante: la connessione Higgsfield di piattaforma richiede il service_role (il token non è per-utente).'
    );
  }
  return c;
}

async function readRow(): Promise<PlatformRow | null> {
  const { data, error } = await db()
    .from('higgsfield_platform_connection')
    .select('*')
    .eq('id', SINGLETON_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PlatformRow) || null;
}

async function writeRow(patch: Partial<PlatformRow>): Promise<void> {
  const { error } = await db()
    .from('higgsfield_platform_connection')
    .upsert({ id: SINGLETON_ID, updated_at: new Date().toISOString(), ...patch });
  if (error) throw new Error(error.message);
}

// ── Stato pubblico (senza token) ─────────────────────────────────────────────

export interface PlatformStatus {
  connected: boolean;
  expiresAt?: string | null;
  connectedAt?: string | null;
  clientRegistered?: boolean;
  serviceRoleMissing?: boolean;
  mcpUrl: string;
}

export async function platformStatus(): Promise<PlatformStatus> {
  if (!serviceClient()) {
    return { connected: false, serviceRoleMissing: true, mcpUrl: MCP_URL };
  }
  try {
    const row = await readRow();
    return {
      connected: !!row?.access_token_cipher,
      expiresAt: row?.expires_at ?? null,
      connectedAt: row?.connected_at ?? null,
      clientRegistered: !!row?.client_id,
      mcpUrl: MCP_URL,
    };
  } catch {
    // Tabella assente → trattata come non connessa.
    return { connected: false, mcpUrl: MCP_URL };
  }
}

export function higgsfieldMcpConfigured(): boolean {
  return !!serviceClient();
}

// ── Avvio autorizzazione (chiamato dall'admin) ───────────────────────────────

export async function startAuthorization(redirectUri: string): Promise<string> {
  const ep = await discoverEndpoints();
  const { clientId, clientSecret } = await registerClient(ep, redirectUri);
  const { verifier, challenge } = makePkce();
  const state = base64url(crypto.randomBytes(24));

  const scopes =
    process.env.HIGGSFIELD_OAUTH_SCOPES ||
    (ep.scopes_supported && ep.scopes_supported.join(' ')) ||
    '';

  const pending = {
    state,
    codeVerifier: verifier,
    redirectUri,
    clientId,
    clientSecret,
    endpoints: ep,
    scopes,
    createdAt: Date.now(),
  };

  await writeRow({
    client_id: clientId,
    client_secret_cipher: clientSecret ? encryptSecret(clientSecret) : null,
    endpoints: ep,
    scopes: scopes || null,
    pending_cipher: encryptSecret(JSON.stringify(pending)),
  });

  const p = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  // La resource (RFC 8707) aiuta il server ad emettere un token per l'MCP.
  p.set('resource', MCP_URL);
  if (scopes) p.set('scope', scopes);

  return `${ep.authorization_endpoint}?${p.toString()}`;
}

// ── Completamento (callback) ─────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

async function exchangeToken(
  ep: OAuthEndpoints,
  body: Record<string, string>,
  clientSecret?: string
): Promise<TokenResponse> {
  const form = new URLSearchParams(body);
  if (clientSecret) form.set('client_secret', clientSecret);
  const res = await fetch(ep.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form.toString(),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error_description || json?.error || `Token endpoint ${res.status}`);
  }
  return json as TokenResponse;
}

export async function completeAuthorization(code: string, state: string): Promise<void> {
  const row = await readRow();
  if (!row?.pending_cipher) throw new Error('Nessuna autorizzazione in corso (pending assente).');
  let pending: any;
  try {
    pending = JSON.parse(decryptSecret(row.pending_cipher));
  } catch {
    throw new Error('Stato di autorizzazione illeggibile.');
  }
  if (!pending?.state || pending.state !== state) {
    throw new Error('Stato OAuth non valido (possibile CSRF).');
  }
  if (Date.now() - (pending.createdAt || 0) > 15 * 60 * 1000) {
    throw new Error('Autorizzazione scaduta: riprova la connessione.');
  }

  const ep: OAuthEndpoints = pending.endpoints;
  const tok = await exchangeToken(
    ep,
    {
      grant_type: 'authorization_code',
      code,
      redirect_uri: pending.redirectUri,
      client_id: pending.clientId,
      code_verifier: pending.codeVerifier,
      resource: MCP_URL,
    },
    pending.clientSecret
  );

  const expiresAt = tok.expires_in
    ? new Date(Date.now() + tok.expires_in * 1000).toISOString()
    : null;

  await writeRow({
    access_token_cipher: encryptSecret(tok.access_token),
    refresh_token_cipher: tok.refresh_token ? encryptSecret(tok.refresh_token) : row.refresh_token_cipher,
    expires_at: expiresAt,
    scopes: tok.scope ?? row.scopes,
    pending_cipher: null,
    connected_at: new Date().toISOString(),
  });
}

// ── Accesso al token (con refresh automatico) — usato dal client MCP ─────────

let refreshInFlight: Promise<string> | null = null;

async function refreshToken(row: PlatformRow): Promise<string> {
  if (!row.refresh_token_cipher || !row.endpoints || !row.client_id) {
    throw new Error('Higgsfield non connesso o refresh token assente: riconnetti dall’area admin.');
  }
  const ep = row.endpoints;
  const clientSecret = row.client_secret_cipher ? decryptSecret(row.client_secret_cipher) : undefined;
  const tok = await exchangeToken(
    ep,
    {
      grant_type: 'refresh_token',
      refresh_token: decryptSecret(row.refresh_token_cipher),
      client_id: row.client_id,
      resource: MCP_URL,
    },
    clientSecret
  );
  const expiresAt = tok.expires_in
    ? new Date(Date.now() + tok.expires_in * 1000).toISOString()
    : null;
  await writeRow({
    access_token_cipher: encryptSecret(tok.access_token),
    refresh_token_cipher: tok.refresh_token ? encryptSecret(tok.refresh_token) : row.refresh_token_cipher,
    expires_at: expiresAt,
  });
  return tok.access_token;
}

/** Ritorna un access token di piattaforma valido, rinnovandolo se serve. */
export async function getPlatformAccessToken(): Promise<string> {
  const row = await readRow();
  if (!row?.access_token_cipher) {
    throw new Error('Higgsfield (piattaforma) non connesso: collega l’account dall’area admin.');
  }
  const expMs = row.expires_at ? Date.parse(row.expires_at) : Infinity;
  if (Number.isFinite(expMs) && expMs - Date.now() < REFRESH_SKEW_MS) {
    if (!refreshInFlight) {
      refreshInFlight = refreshToken(row).finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }
  return decryptSecret(row.access_token_cipher);
}

/** Forza un refresh (usato dal client MCP dopo un 401 inatteso). */
export async function forceRefresh(): Promise<string> {
  const row = await readRow();
  if (!row) throw new Error('Higgsfield non connesso.');
  if (!refreshInFlight) {
    refreshInFlight = refreshToken(row).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function disconnect(): Promise<void> {
  await writeRow({
    access_token_cipher: null,
    refresh_token_cipher: null,
    expires_at: null,
    pending_cipher: null,
    connected_at: null,
  });
}
