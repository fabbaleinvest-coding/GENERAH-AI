// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Parsing + hashing della lista contatti (lato BROWSER).
//
//  La PII grezza NON lascia mai il client: il file (CSV o Excel) viene letto e
//  parsato qui, i valori normalizzati e cifrati con SHA-256 (Web Crypto), e al
//  server vengono inviati SOLO gli hash, nel formato schema/data richiesto da
//  Meta per le Custom Audience da lista clienti.
// ─────────────────────────────────────────────────────────────────────────

export interface ContactRow {
  email?: string;
  phone?: string;
  fn?: string;
  ln?: string;
}

export interface HashedAudience {
  schema: string[]; // sottoinsieme di ['EMAIL','PHONE','FN','LN']
  data: string[][]; // righe di hash esadecimali allineate a schema ('' se assente)
  count: number;
}

// ── Lettura file ────────────────────────────────────────────────────────────

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        q = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      q = true;
    } else if (ch === ',' || ch === ';' || ch === '\t') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
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
    return rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : []));
  }
  // CSV / TSV
  const text = await file.text();
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map(splitCsvLine);
}

// ── Mappatura colonne ───────────────────────────────────────────────────────

interface ColMap {
  email: number;
  phone: number;
  fn: number;
  ln: number;
  full: number;
}

function mapColumns(header: string[]): ColMap {
  const idx = (re: RegExp) => header.findIndex((h) => re.test(h.toLowerCase()));
  return {
    email: idx(/e-?mail|posta|@/),
    phone: idx(/phone|telefono|tel\b|cell|mobile|numero/),
    full: idx(/full ?name|nominativo|nome ?e ?cognome|contatto/),
    fn: idx(/^(first ?name|nome|name|firstname)$/),
    ln: idx(/last ?name|cognome|surname|lastname/),
  };
}

function looksLikeHeader(row: string[]): boolean {
  const j = row.join(' ').toLowerCase();
  return /e-?mail|telefono|phone|nome|name|cognome|surname|cell/.test(j) && !j.includes('@');
}

function detectEmailColumn(rows: string[][]): number {
  const cols = rows[0]?.length ?? 0;
  for (let c = 0; c < cols; c++) {
    let hits = 0;
    let seen = 0;
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const v = rows[r][c];
      if (v) {
        seen++;
        if (/.+@.+\..+/.test(v)) hits++;
      }
    }
    if (seen > 0 && hits / seen > 0.6) return c;
  }
  return -1;
}

// ── Normalizzazione (regole Meta) ───────────────────────────────────────────

function normEmail(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, '');
}

function normPhone(v: string): string {
  let d = (v || '').replace(/\D+/g, '');
  if (!d) return '';
  d = d.replace(/^00/, '');
  // numero italiano senza prefisso internazionale → prepend 39 (best-effort)
  if (d.length >= 9 && d.length <= 10 && d.startsWith('3')) d = '39' + d;
  return d;
}

function normName(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── Hashing (Web Crypto, SHA-256 esadecimale) ───────────────────────────────

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Pipeline completa: file → righe → hash ──────────────────────────────────

export async function prepareContacts(file: File): Promise<{ ok: true; audience: HashedAudience } | { ok: false; error: string }> {
  let rows: string[][];
  try {
    rows = await readRows(file);
  } catch (e) {
    return { ok: false, error: `File non leggibile: ${(e as Error).message}` };
  }
  rows = rows.filter((r) => r.some((c) => (c || '').trim().length > 0));
  if (!rows.length) return { ok: false, error: 'File vuoto' };

  let header: string[] | null = null;
  let body = rows;
  if (looksLikeHeader(rows[0])) {
    header = rows[0];
    body = rows.slice(1);
  }

  const cols = header ? mapColumns(header) : { email: -1, phone: -1, fn: -1, ln: -1, full: -1 };
  if (cols.email < 0) cols.email = detectEmailColumn(body);

  if (cols.email < 0 && cols.phone < 0 && cols.full < 0 && cols.fn < 0) {
    return { ok: false, error: 'Nessuna colonna email/telefono/nome riconosciuta' };
  }

  const parsed: ContactRow[] = [];
  for (const r of body) {
    const row: ContactRow = {};
    if (cols.email >= 0 && r[cols.email]) row.email = normEmail(r[cols.email]);
    if (cols.phone >= 0 && r[cols.phone]) row.phone = normPhone(r[cols.phone]);
    if (cols.fn >= 0 && r[cols.fn]) row.fn = normName(r[cols.fn]);
    if (cols.ln >= 0 && r[cols.ln]) row.ln = normName(r[cols.ln]);
    if (!row.fn && cols.full >= 0 && r[cols.full]) {
      const parts = normName(r[cols.full]).split(' ');
      row.fn = parts[0];
      if (parts.length > 1) row.ln = parts.slice(1).join(' ');
    }
    if (row.email || row.phone || row.fn) parsed.push(row);
  }
  if (!parsed.length) return { ok: false, error: 'Nessun contatto valido nel file' };

  const schema: string[] = [];
  if (parsed.some((p) => p.email)) schema.push('EMAIL');
  if (parsed.some((p) => p.phone)) schema.push('PHONE');
  if (parsed.some((p) => p.fn)) schema.push('FN');
  if (parsed.some((p) => p.ln)) schema.push('LN');

  const data: string[][] = [];
  for (const p of parsed) {
    const out: string[] = [];
    for (const key of schema) {
      const raw = key === 'EMAIL' ? p.email : key === 'PHONE' ? p.phone : key === 'FN' ? p.fn : p.ln;
      out.push(raw ? await sha256Hex(raw) : '');
    }
    data.push(out);
  }

  return { ok: true, audience: { schema, data, count: data.length } };
}
