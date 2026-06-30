// ───────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Adapter DIDWW API v3 (JSON:API)
//
//  Approvvigionamento numeri (lato admin): sfoglia l'inventario DIDWW, ordina
//  numeri e lista i DID posseduti per rifornire il pool WhatsApp (wa_numbers).
//
//  Config (env):
//    DIDWW_API_KEY      API key (header `Api-Key`). Senza, l'adapter è "non
//                       configurato" e le route admin degradano.
//    DIDWW_API_BASE     base URL. Default PRODUZIONE  https://api.didww.com/v3
//                       Sandbox (nessun addebito):    https://sandbox-api.didww.com/v3
//    DIDWW_API_VERSION  opzionale, header X-DIDWW-API-Version (default 2022-05-10)
//
//  Spec: JSON:API — Content-Type/Accept `application/vnd.api+json`.
//  NB: ordinare numeri costa denaro reale sul conto DIDWW. Testa prima in sandbox.
// ───────────────────────────────────────────────────────────────────────────

function apiKey(): string {
  return process.env.DIDWW_API_KEY || '';
}

function apiBase(): string {
  const b = process.env.DIDWW_API_BASE || 'https://api.didww.com/v3';
  return b.replace(/\/+$/, '');
}

function apiVersion(): string {
  return process.env.DIDWW_API_VERSION || '2022-05-10';
}

/** True se l'API key DIDWW è presente: senza, le route admin degradano. */
export function didwwConfigured(): boolean {
  return !!apiKey();
}

/** True se la base punta all'ambiente sandbox (utile a evidenziarlo in UI). */
export function didwwSandbox(): boolean {
  return /sandbox/i.test(apiBase());
}

export class DidwwError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string; type: string } | { id: string; type: string }[] }>;
}
interface JsonApiDoc {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: Record<string, unknown>;
  errors?: { title?: string; detail?: string; code?: string }[];
}

async function didwwRequest(method: string, path: string, body?: unknown): Promise<JsonApiDoc> {
  if (!apiKey()) throw new DidwwError('DIDWW non configurato (DIDWW_API_KEY mancante)', 500);
  const url = path.startsWith('http')
    ? path
    : `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    'Api-Key': apiKey(),
    Accept: 'application/vnd.api+json',
    'X-DIDWW-API-Version': apiVersion(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/vnd.api+json';

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  let json: JsonApiDoc | null = null;
  try {
    json = text ? (JSON.parse(text) as JsonApiDoc) : null;
  } catch {
    /* risposta non-JSON */
  }
  if (!res.ok) {
    const detail =
      json?.errors?.[0]?.detail || json?.errors?.[0]?.title || text.slice(0, 300) || '';
    throw new DidwwError(`DIDWW ${method} ${path} → ${res.status}`, res.status, detail);
  }
  return json ?? {};
}

const asArray = (d: JsonApiDoc['data']): JsonApiResource[] =>
  Array.isArray(d) ? d : d ? [d] : [];

// ── Paesi ──────────────────────────────────────────────────────────────────

export interface DidwwCountry {
  id: string;
  name: string;
  iso: string;
  prefix?: string;
}

export async function listCountries(iso?: string): Promise<DidwwCountry[]> {
  const q = iso
    ? `?filter[iso]=${encodeURIComponent(iso.toUpperCase())}`
    : '?page[size]=300';
  const r = await didwwRequest('GET', `/countries${q}`);
  return asArray(r.data).map((d) => ({
    id: d.id,
    name: String(d.attributes?.name ?? ''),
    iso: String(d.attributes?.iso ?? ''),
    prefix: d.attributes?.prefix ? String(d.attributes.prefix) : undefined,
  }));
}

// ── DID group + SKU (opzioni d'acquisto) ─────────────────────────────────────

export interface DidwwSku {
  id: string;
  setup?: string | null;
  monthly?: string | null;
  channels?: number | null;
  perMinute?: boolean | null;
  raw: Record<string, unknown>;
}

export interface DidwwDidGroup {
  id: string;
  type: string;
  areaName?: string;
  cityName?: string;
  regionName?: string;
  prefix?: string;
  countryId: string;
  skus: DidwwSku[];
}

// Sceglie il primo valore presente tra più chiavi possibili (i nomi degli
// attributi SKU variano per versione dell'API): mappa best-effort + raw integrale.
function pick(a: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (a[k] !== undefined && a[k] !== null) return a[k];
  return undefined;
}

export async function listDidGroups(
  countryId: string,
  opts?: { type?: string; pageSize?: number },
): Promise<DidwwDidGroup[]> {
  const params = new URLSearchParams();
  params.set('filter[country.id]', countryId);
  if (opts?.type) params.set('filter[did_group_type.name]', opts.type);
  params.set('include', 'stock_keeping_units,city,region,did_group_type');
  params.set('page[size]', String(opts?.pageSize ?? 50));

  const r = await didwwRequest('GET', `/did_groups?${params.toString()}`);
  const included = r.included ?? [];
  const byType = (t: string) => new Map(included.filter((i) => i.type === t).map((i) => [i.id, i]));
  const skus = byType('stock_keeping_units');
  const cities = byType('cities');
  const regions = byType('regions');
  const types = byType('did_group_types');

  return asArray(r.data).map((g) => {
    const rel = g.relationships ?? {};
    const skuRefs = Array.isArray(rel.stock_keeping_units?.data)
      ? (rel.stock_keeping_units!.data as { id: string }[])
      : [];
    const mappedSkus: DidwwSku[] = skuRefs.map((ref) => {
      const a = (skus.get(ref.id)?.attributes ?? {}) as Record<string, unknown>;
      const channels = pick(a, ['channels_included_count', 'channels', 'channels_count']);
      return {
        id: ref.id,
        setup: (pick(a, ['setup_price', 'nrc', 'activation_price']) as string) ?? null,
        monthly: (pick(a, ['monthly_price', 'mrc', 'periodic_fee', 'price']) as string) ?? null,
        channels: typeof channels === 'number' ? channels : channels ? Number(channels) : null,
        perMinute: (pick(a, ['per_minute', 'pay_per_minute']) as boolean) ?? null,
        raw: a,
      };
    });
    const cityId = (rel.city?.data as { id: string } | undefined)?.id;
    const regionId = (rel.region?.data as { id: string } | undefined)?.id;
    const typeId = (rel.did_group_type?.data as { id: string } | undefined)?.id;
    return {
      id: g.id,
      type: String(
        (typeId && types.get(typeId)?.attributes?.name) || g.attributes?.did_group_type || 'GEOGRAPHIC',
      ),
      areaName: g.attributes?.area_name ? String(g.attributes.area_name) : undefined,
      cityName: cityId && cities.get(cityId)?.attributes?.name ? String(cities.get(cityId)!.attributes!.name) : undefined,
      regionName: regionId && regions.get(regionId)?.attributes?.name ? String(regions.get(regionId)!.attributes!.name) : undefined,
      prefix: g.attributes?.prefix ? String(g.attributes.prefix) : undefined,
      countryId,
      skus: mappedSkus,
    };
  });
}

// ── Ordine ───────────────────────────────────────────────────────────────────

export interface DidwwOrder {
  id: string;
  status: string;
  amount?: string;
  raw: JsonApiDoc;
}

/**
 * Crea un ordine per `qty` numeri dello SKU indicato. Provisioning asincrono:
 * i DID compaiono poi in GET /dids (usare syncDids per importarli nel pool).
 * ATTENZIONE: addebito reale sul conto DIDWW (in produzione).
 */
export async function createOrder(skuId: string, qty: number): Promise<DidwwOrder> {
  const body = {
    data: {
      type: 'orders',
      attributes: {
        allow_back_ordering: false,
        items: [{ type: 'did_order_items', attributes: { sku_id: skuId, qty } }],
      },
    },
  };
  const r = await didwwRequest('POST', '/orders', body);
  const d = Array.isArray(r.data) ? r.data[0] : r.data;
  return {
    id: String(d?.id ?? ''),
    status: String(d?.attributes?.status ?? 'Unknown'),
    amount: d?.attributes?.amount ? String(d.attributes.amount) : undefined,
    raw: r,
  };
}

// ── Inventario DID posseduti ─────────────────────────────────────────────────

export interface DidwwDid {
  id: string;
  number: string; // come restituito da DIDWW (di norma senza '+')
  e164: string; // normalizzato con '+'
  countryId?: string;
}

export async function listDids(opts?: { pageSize?: number; pageNumber?: number }): Promise<DidwwDid[]> {
  const params = new URLSearchParams();
  params.set('page[size]', String(opts?.pageSize ?? 100));
  if (opts?.pageNumber) params.set('page[number]', String(opts.pageNumber));
  const r = await didwwRequest('GET', `/dids?${params.toString()}`);
  return asArray(r.data).map((d) => {
    const num = String(d.attributes?.number ?? '').replace(/[^\d+]/g, '');
    const e164 = num.startsWith('+') ? num : `+${num}`;
    return {
      id: d.id,
      number: num,
      e164,
      countryId: (d.relationships?.country?.data as { id: string } | undefined)?.id,
    };
  });
}

// ── Saldo (best-effort) ──────────────────────────────────────────────────────

export async function getBalance(): Promise<{ balance?: string; currency?: string } | null> {
  try {
    const r = await didwwRequest('GET', '/balance');
    const d = Array.isArray(r.data) ? r.data[0] : r.data;
    const a = (d?.attributes ?? {}) as Record<string, unknown>;
    return {
      balance: (pick(a, ['balance', 'credit_balance', 'total_balance']) as string) ?? undefined,
      currency: a.currency ? String(a.currency) : undefined,
    };
  } catch {
    return null;
  }
}
