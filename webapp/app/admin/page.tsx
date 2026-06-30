'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Container, Button, Badge, Spinner } from '@/components/ui';

// ───────────────────────────────────────────────────────────────────────────
//  Area amministratore · approvvigionamento e gestione numeri (pool WhatsApp).
//  Le route /api/admin/* sono protette lato server (ADMIN_EMAILS): qui ci
//  limitiamo a consumarle; un 403 mostra "non autorizzato".
// ───────────────────────────────────────────────────────────────────────────

interface PoolNumber {
  id: string;
  e164: string;
  provider: string;
  waba_id: string | null;
  phone_number_id: string | null;
  display_name: string;
  capabilities: string[];
  status: string;
  assigned_user_id: string | null;
}
interface Sku {
  id: string;
  setup?: string | null;
  monthly?: string | null;
  channels?: number | null;
}
interface DidGroup {
  id: string;
  type: string;
  cityName?: string;
  regionName?: string;
  prefix?: string;
  skus: Sku[];
}

async function token(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authFetch(path: string, init?: RequestInit) {
  const t = await token();
  if (!t) return { status: 401, json: { error: 'auth' } as Record<string, unknown> };
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* vuoto */
  }
  return { status: res.status, json };
}

function statusTone(s: string): 'teal' | 'amber' | 'muted' {
  if (s === 'available') return 'teal';
  if (s === 'suspended') return 'amber';
  return 'muted';
}

export default function AdminPage() {
  const [phase, setPhase] = useState<'loading' | 'unauth' | 'forbidden' | 'ready'>('loading');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // pool
  const [pool, setPool] = useState<PoolNumber[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // didww
  const [iso, setIso] = useState('IT');
  const [didwwState, setDidwwState] = useState<{ configured: boolean; sandbox?: boolean; balance?: string | null }>({ configured: false });
  const [groups, setGroups] = useState<DidGroup[]>([]);

  // form manuale
  const [m, setM] = useState({ e164: '', phone_number_id: '', waba_id: '', display_name: '' });

  const loadPool = useCallback(async () => {
    const { status, json } = await authFetch('/api/admin/whatsapp/pool');
    if (status === 401) return setPhase('unauth');
    if (status === 403) return setPhase('forbidden');
    if (json.ok) {
      setPool((json.numbers as PoolNumber[]) || []);
      setPendingCount(((json.pending as unknown[]) || []).length);
      setPhase('ready');
    } else {
      setPhase('ready');
      setMsg(`Pool non disponibile: ${String(json.reason || json.error || 'errore')}`);
    }
  }, []);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  async function searchGroups() {
    setBusy('search');
    setMsg(null);
    const { status, json } = await authFetch(`/api/admin/didww/groups?country=${encodeURIComponent(iso)}`);
    setBusy(null);
    if (status === 403) return setPhase('forbidden');
    if (json.configured === false) {
      setDidwwState({ configured: false });
      setMsg('DIDWW non configurato (manca DIDWW_API_KEY).');
      return;
    }
    if (json.ok) {
      const bal = json.balance as { balance?: string } | null;
      setDidwwState({ configured: true, sandbox: !!json.sandbox, balance: bal?.balance ?? null });
      setGroups((json.groups as DidGroup[]) || []);
      if (!((json.groups as DidGroup[]) || []).length) setMsg('Nessun gruppo trovato per questo paese.');
    } else {
      setMsg(`Errore DIDWW: ${String(json.error || '')} ${String(json.detail || '')}`);
    }
  }

  async function order(skuId: string) {
    const qtyStr = window.prompt('Quante numeri ordinare? (1-10)', '1');
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return setMsg('Quantità non valida.');
    const sandboxNote = didwwState.sandbox ? '(sandbox)' : '(ADDEBITO REALE)';
    if (!window.confirm(`Confermi l'ordine di ${qty} numero/i ${sandboxNote}?`)) return;
    setBusy(`order_${skuId}`);
    setMsg(null);
    const { json } = await authFetch('/api/admin/didww/order', {
      method: 'POST',
      body: JSON.stringify({ sku_id: skuId, qty, confirm: true }),
    });
    setBusy(null);
    if (json.ok) {
      const o = json.order as { id: string; status: string };
      setMsg(`Ordine creato (id ${o.id}, stato ${o.status}). Quando è completato premi "Sincronizza numeri".`);
    } else {
      setMsg(`Ordine non riuscito: ${String(json.error || json.reason || '')} ${String(json.detail || '')}`);
    }
  }

  async function sync() {
    setBusy('sync');
    setMsg(null);
    const { json } = await authFetch('/api/admin/didww/sync', { method: 'POST' });
    setBusy(null);
    if (json.ok) {
      setMsg(`Sincronizzati: ${String(json.inserted)} nuovi numeri importati (su ${String(json.total)} su DIDWW).`);
      void loadPool();
    } else {
      setMsg(`Sync non riuscita: ${String(json.error || json.reason || '')}`);
    }
  }

  async function activate(n: PoolNumber) {
    const pid = window.prompt(`Phone Number ID (Cloud API) per ${n.e164}:`, n.phone_number_id || '');
    if (!pid) return;
    const dn = window.prompt('Nome visualizzato (opzionale):', n.display_name || '') || '';
    setBusy(`act_${n.id}`);
    const { json } = await authFetch('/api/admin/whatsapp/pool', {
      method: 'PATCH',
      body: JSON.stringify({ id: n.id, phone_number_id: pid, display_name: dn, status: 'available', capabilities: ['whatsapp'] }),
    });
    setBusy(null);
    if (json.ok) {
      setMsg(`${n.e164} attivato e assegnabile.`);
      void loadPool();
    } else {
      setMsg(`Attivazione non riuscita: ${String(json.error || '')}`);
    }
  }

  async function setStatus(n: PoolNumber, status: string) {
    setBusy(`st_${n.id}`);
    const { json } = await authFetch('/api/admin/whatsapp/pool', {
      method: 'PATCH',
      body: JSON.stringify({ id: n.id, status }),
    });
    setBusy(null);
    if (json.ok) void loadPool();
    else setMsg(`Aggiornamento non riuscito: ${String(json.error || '')}`);
  }

  async function addManual() {
    if (!/^\+\d{6,15}$/.test(m.e164)) return setMsg('e164 non valido (es. +391234567890).');
    if (!m.phone_number_id.trim()) return setMsg('phone_number_id obbligatorio.');
    setBusy('add');
    const { json } = await authFetch('/api/admin/whatsapp/pool', { method: 'POST', body: JSON.stringify(m) });
    setBusy(null);
    if (json.ok) {
      setMsg('Numero aggiunto al pool.');
      setM({ e164: '', phone_number_id: '', waba_id: '', display_name: '' });
      void loadPool();
    } else {
      setMsg(`Aggiunta non riuscita: ${String(json.error || '')}`);
    }
  }

  if (phase === 'loading') {
    return (
      <Container>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      </Container>
    );
  }
  if (phase === 'unauth') {
    return (
      <Container>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-2xl text-bone">Accesso richiesto</h1>
          <p className="mt-2 text-mist">Devi effettuare l&apos;accesso con un account amministratore.</p>
          <Button href="/" variant="outline" className="mt-6">Vai al login</Button>
        </div>
      </Container>
    );
  }
  if (phase === 'forbidden') {
    return (
      <Container>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-2xl text-bone">Non autorizzato</h1>
          <p className="mt-2 text-mist">Questo account non è tra gli amministratori (ADMIN_EMAILS).</p>
        </div>
      </Container>
    );
  }

  const cell = 'px-3 py-2 text-left align-middle';

  return (
    <Container>
      <div className="space-y-10 py-10">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bone">Amministrazione · Numeri</h1>
          <p className="mt-1 text-mist">Pool WhatsApp e approvvigionamento DIDWW.</p>
        </div>

        {msg && (
          <div className="rounded-xl border border-teal-300/20 bg-teal-400/[0.06] px-4 py-3 text-[0.9rem] text-bone">
            {msg}
          </div>
        )}

        {/* Pool */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-bone">Pool numeri ({pool.length})</h2>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && <Badge tone="amber">{pendingCount} in attesa</Badge>}
              <Button size="sm" variant="outline" onClick={() => loadPool()}>Aggiorna</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-[0.82rem]">
              <thead className="bg-white/[0.03] text-mist">
                <tr>
                  <th className={cell}>Numero</th>
                  <th className={cell}>Stato</th>
                  <th className={cell}>Phone Number ID</th>
                  <th className={cell}>Capabilities</th>
                  <th className={cell}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pool.length === 0 && (
                  <tr><td className={cell} colSpan={5}><span className="text-mist">Pool vuoto.</span></td></tr>
                )}
                {pool.map((n) => (
                  <tr key={n.id} className="border-t border-white/5">
                    <td className={cell}><span className="font-mono text-bone">{n.e164}</span></td>
                    <td className={cell}><Badge tone={statusTone(n.status)}>{n.status}</Badge>{n.assigned_user_id && <span className="ml-2 text-mist/70">assegnato</span>}</td>
                    <td className={cell}><span className="font-mono text-mist">{n.phone_number_id || '—'}</span></td>
                    <td className={cell}><span className="text-mist">{(n.capabilities || []).join(', ')}</span></td>
                    <td className={cell}>
                      <div className="flex flex-wrap gap-2">
                        {(n.status === 'suspended' || !n.phone_number_id) && (
                          <Button size="sm" variant="amber" onClick={() => activate(n)} disabled={busy === `act_${n.id}`}>Attiva</Button>
                        )}
                        {n.status === 'available' && !n.assigned_user_id && (
                          <Button size="sm" variant="ghost" onClick={() => setStatus(n, 'suspended')} disabled={busy === `st_${n.id}`}>Sospendi</Button>
                        )}
                        {n.status === 'suspended' && n.phone_number_id && (
                          <Button size="sm" variant="ghost" onClick={() => setStatus(n, 'available')} disabled={busy === `st_${n.id}`}>Rendi disponibile</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Approvvigionamento DIDWW */}
        <section className="space-y-3">
          <h2 className="font-display text-xl text-bone">Approvvigiona da DIDWW</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={iso}
              onChange={(e) => setIso(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="IT"
              className="w-24 rounded-lg border border-white/10 bg-ink px-3 py-2 font-mono text-bone outline-none focus:border-teal-300/40"
            />
            <Button size="sm" onClick={() => searchGroups()} disabled={busy === 'search'}>
              {busy === 'search' ? 'Cerco…' : 'Cerca SKU'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => sync()} disabled={busy === 'sync'}>
              {busy === 'sync' ? 'Sincronizzo…' : 'Sincronizza numeri'}
            </Button>
            {didwwState.configured && (
              <span className="text-[0.8rem] text-mist">
                {didwwState.sandbox ? <Badge tone="amber">sandbox</Badge> : <Badge tone="teal">produzione</Badge>}
                {didwwState.balance != null && <span className="ml-2">saldo: {didwwState.balance}</span>}
              </span>
            )}
          </div>

          {groups.length > 0 && (
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-center gap-2 text-[0.86rem] text-bone">
                    <Badge tone="muted">{g.type}</Badge>
                    <span>{g.cityName || g.regionName || '—'}</span>
                    {g.prefix && <span className="font-mono text-mist">+{g.prefix}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.skus.length === 0 && <span className="text-[0.8rem] text-mist">nessuno SKU</span>}
                    {g.skus.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => order(s.id)}
                        disabled={busy === `order_${s.id}`}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-left text-[0.78rem] text-bone hover:border-teal-300/40 disabled:opacity-50"
                      >
                        <span className="font-mono">SKU {s.id.slice(0, 8)}</span>
                        <span className="ml-2 text-mist">
                          setup {s.setup ?? '?'} · mese {s.monthly ?? '?'}
                          {s.channels != null ? ` · ${s.channels} canali` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Aggiunta manuale (numero già registrato su WhatsApp) */}
        <section className="space-y-3">
          <h2 className="font-display text-xl text-bone">Aggiungi numero pronto (manuale)</h2>
          <p className="text-[0.84rem] text-mist">
            Per un numero già registrato sulla Cloud API: indica e164 e Phone Number ID. Entra come disponibile.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['e164', '+391234567890'],
              ['phone_number_id', 'Phone Number ID'],
              ['waba_id', 'WABA ID (opzionale)'],
              ['display_name', 'Nome visualizzato (opzionale)'],
            ] as const).map(([key, ph]) => (
              <input
                key={key}
                value={(m as Record<string, string>)[key]}
                onChange={(e) => setM((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={ph}
                className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-bone outline-none focus:border-teal-300/40"
              />
            ))}
          </div>
          <Button size="sm" onClick={() => addManual()} disabled={busy === 'add'}>
            {busy === 'add' ? 'Aggiungo…' : 'Aggiungi al pool'}
          </Button>
        </section>
      </div>
    </Container>
  );
}
