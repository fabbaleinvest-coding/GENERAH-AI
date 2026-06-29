'use client';

import { useMemo, useState, Fragment } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import {
  PLANS,
  METERS,
  METER_ORDER,
  MeterKey,
  euro,
  num,
} from '@/lib/plans';
import { Lead, LeadStatus, LeadStatusOrder, KbFile, KbSource } from '@/lib/store';
import { Guard } from '@/components/Guard';
import { AppShell } from '@/components/AppShell';
import { MeterBar } from '@/components/Meters';
import { TopUpModal } from '@/components/TopUpModal';
import { Container, Button, Badge, Photo, cx } from '@/components/ui';
import VideoConsult from '@/components/VideoConsult';
import { IMG } from '@/lib/images';

type Tab = 'overview' | 'leads' | 'campaigns' | 'video' | 'kb' | 'account';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Panoramica' },
  { id: 'leads', label: 'Lead · CRM' },
  { id: 'campaigns', label: 'Campagne' },
  { id: 'video', label: 'Video-consulto' },
  { id: 'kb', label: 'Knowledge base' },
  { id: 'account', label: 'Account' },
];

const STATUS_META: Record<LeadStatus, { label: string; tone: 'teal' | 'amber' | 'coral' | 'muted' }> = {
  nuovo: { label: 'Nuovo', tone: 'amber' },
  contattato: { label: 'Contattato', tone: 'muted' },
  qualificato: { label: 'Qualificato', tone: 'teal' },
  appuntamento: { label: 'Appuntamento', tone: 'teal' },
  cliente: { label: 'Cliente', tone: 'teal' },
  perso: { label: 'Perso', tone: 'coral' },
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cx('rounded-2xl border p-5', accent ? 'border-teal-300/30 bg-teal-400/[0.04]' : 'border-white/8 bg-ink-900/40')}>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/70">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-bone">{value}</p>
      {sub && <p className="mt-1 text-[0.78rem] text-mist/70">{sub}</p>}
    </div>
  );
}

// ════════════════════════════ OVERVIEW ════════════════════════════
function Overview({ onTopUp, setTab }: { onTopUp: (m: MeterKey) => void; setTab: (t: Tab) => void }) {
  const { user, consume } = useStore();
  if (!user) return null;

  const leadsNew = user.leads.filter((l) => l.status === 'nuovo').length;
  const clients = user.leads.filter((l) => l.status === 'cliente').length;
  const activeCampaigns = user.campaigns.filter((c) => c.status === 'attiva').length;
  const convRate = user.leads.length ? Math.round((clients / user.leads.length) * 100) : 0;

  function simulate() {
    // simula una giornata di attività dell'intelligenza
    consume('phone', Math.floor(20 + Math.random() * 60));
    consume('whatsapp', Math.floor(10 + Math.random() * 40));
    if (user!.meters.video.total > 0) consume('video', Math.floor(3 + Math.random() * 12));
  }

  return (
    <div className="space-y-8">
      {!user.onboardingDone && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber/30 bg-amber/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-bone">Completa l&apos;onboarding</p>
            <p className="mt-1 text-[0.86rem] text-mist">Carica la knowledge base, lancia la prima campagna e prova il video-consulto.</p>
          </div>
          <Button href="/onboarding" variant="amber" size="sm">
            Riprendi
          </Button>
        </div>
      )}

      {/* saluto */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-teal-300/80">La tua console</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-bone sm:text-4xl">Ciao {user.nome} 👋</h1>
          <p className="mt-2 text-mist">Ecco cosa ha fatto la tua intelligenza mentre eri altrove.</p>
        </div>
        <Button variant="outline" size="sm" onClick={simulate}>
          Simula una giornata di attività
        </Button>
      </div>

      {/* stat */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Lead totali" value={num(user.leads.length)} sub={`${leadsNew} nuovi da gestire`} accent />
        <StatCard label="Clienti chiusi" value={num(clients)} sub={`Conversione ${convRate}%`} />
        <StatCard label="Campagne attive" value={num(activeCampaigns)} sub={`${user.campaigns.length} totali`} />
        <StatCard label="File in memoria" value={num(user.kb.length)} sub="Knowledge base" />
      </div>

      {/* contatori */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-bone">Contatori del piano {user.plan ? PLANS[user.plan].name : ''}</h2>
          <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-mist/60">Avviso automatico sotto il 10%</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {METER_ORDER.map((k) => (
            <MeterBar key={k} meter={k} total={user.meters[k].total} used={user.meters[k].used} onTopUp={onTopUp} />
          ))}
        </div>
      </div>

      {/* lead recenti */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-bone">Lead recenti</h2>
          <button onClick={() => setTab('leads')} className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-teal-300 hover:text-teal-200">
            Apri il CRM →
          </button>
        </div>
        {user.leads.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-8 text-center">
            <p className="text-[0.92rem] text-mist">Ancora nessun lead. Lancia una campagna per riempire la pipeline.</p>
            <Button className="mt-4" size="sm" onClick={() => setTab('campaigns')}>
              Vai alle campagne
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/8">
            {user.leads.slice(0, 5).map((l, i) => (
              <div key={l.id} className={cx('flex items-center gap-4 px-4 py-3', i % 2 === 0 ? 'bg-ink-900/40' : 'bg-ink-900/20')}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 font-mono text-[0.68rem] font-semibold uppercase text-mist">
                  {l.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9rem] font-medium text-bone">{l.name}</p>
                  <p className="truncate text-[0.76rem] text-mist/70">{l.channel} · {l.interest}</p>
                </div>
                <span className="hidden font-mono text-[0.78rem] text-teal-200 sm:block">{l.score}</span>
                <Badge tone={STATUS_META[l.status].tone}>{STATUS_META[l.status].label}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════ LEADS / CRM ════════════════════════════
function LeadsView() {
  const { user, updateLead, removeLead, addLead, enrichLead, consume } = useStore();
  const [filter, setFilter] = useState<LeadStatus | 'tutti'>('tutti');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: 'Informazioni' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errById, setErrById] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!user) return [];
    return user.leads.filter((l) => {
      if (filter !== 'tutti' && l.status !== filter) return false;
      if (q && !`${l.name} ${l.email} ${l.channel} ${l.interest}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [user, filter, q]);

  if (!user) return null;

  function call(l: Lead) {
    consume('phone', Math.floor(2 + Math.random() * 6));
    updateLead(l.id, { status: l.status === 'nuovo' ? 'contattato' : l.status });
  }
  function wa(l: Lead) {
    consume('whatsapp', 1);
    updateLead(l.id, { status: l.status === 'nuovo' ? 'contattato' : l.status });
  }
  function submitAdd() {
    if (!form.name.trim()) return;
    addLead({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: 'Inserimento manuale',
      channel: 'Manuale',
      interest: form.interest,
      status: 'nuovo',
      score: Math.floor(40 + Math.random() * 50),
      notes: '',
      aiSummary: '',
      nextAction: '',
      aiDraft: null,
    });
    setForm({ name: '', phone: '', email: '', interest: 'Informazioni' });
    setAdding(false);
  }

  async function runAi(l: Lead) {
    setBusyId(l.id);
    setErrById((m) => ({ ...m, [l.id]: '' }));
    const r = await enrichLead(l.id);
    setBusyId((cur) => (cur === l.id ? null : cur));
    if (!r.ok) setErrById((m) => ({ ...m, [l.id]: r.error || 'Errore imprevisto' }));
  }
  function toggleAi(l: Lead) {
    if (openId === l.id) {
      setOpenId(null);
      return;
    }
    setOpenId(l.id);
    if (!l.aiSummary && !l.aiDraft && busyId !== l.id) void runAi(l);
  }
  function copyText(text: string, tag: string) {
    try {
      navigator.clipboard?.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied((c) => (c === tag ? null : c)), 1500);
    } catch {
      /* clipboard non disponibile */
    }
  }

  const counts = (s: LeadStatus) => user.leads.filter((l) => l.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">CRM · Pipeline lead</h1>
          <p className="mt-1 text-[0.9rem] text-mist">Ogni lead acquisito dall&apos;AI atterra qui, pronto da lavorare.</p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Annulla' : '+ Aggiungi lead'}
        </Button>
      </div>

      {adding && (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-ink-900/50 p-4 sm:grid-cols-4">
          <input placeholder="Nome e cognome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none" />
          <input placeholder="Telefono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none" />
          <Button size="sm" onClick={submitAdd}>Salva lead</Button>
        </div>
      )}

      {/* filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('tutti')} className={cx('rounded-full border px-3 py-1.5 text-[0.78rem] transition', filter === 'tutti' ? 'border-teal-300/50 bg-teal-400/10 text-teal-200' : 'border-white/10 text-mist hover:border-teal-300/30')}>
            Tutti · {user.leads.length}
          </button>
          {LeadStatusOrder.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cx('rounded-full border px-3 py-1.5 text-[0.78rem] transition', filter === s ? 'border-teal-300/50 bg-teal-400/10 text-teal-200' : 'border-white/10 text-mist hover:border-teal-300/30')}>
              {STATUS_META[s].label} · {counts(s)}
            </button>
          ))}
        </div>
        <input placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-full border border-white/10 bg-ink/70 px-4 py-2 text-[0.84rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none sm:w-56" />
      </div>

      {/* tabella */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-10 text-center text-mist">Nessun lead in questa vista.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-white/8 bg-ink-900/60 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mist/60">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Canale</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <Fragment key={l.id}>
                <tr className={cx('border-b border-white/5', i % 2 === 0 ? 'bg-ink-900/30' : '')}>
                  <td className="px-4 py-3">
                    <p className="text-[0.9rem] font-medium text-bone">{l.name}</p>
                    <p className="text-[0.74rem] text-mist/60">{l.email || l.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[0.84rem] text-mist">{l.channel}</p>
                    <p className="text-[0.72rem] text-mist/55">{l.interest}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cx('font-mono text-[0.82rem]', l.score >= 75 ? 'text-teal-200' : l.score >= 55 ? 'text-amber-soft' : 'text-mist')}>{l.score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => updateLead(l.id, { status: e.target.value as LeadStatus })}
                      className="rounded-lg border border-white/10 bg-ink/70 px-2.5 py-1.5 text-[0.8rem] text-bone focus:border-teal-300/60 focus:outline-none"
                    >
                      {LeadStatusOrder.map((s) => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => toggleAi(l)} title="Qualifica con l'AI (Opus 4.8)" className={cx('rounded-lg border p-2 transition', openId === l.id ? 'border-teal-300/60 bg-teal-400/10 text-teal-200' : l.aiSummary || l.aiDraft ? 'border-teal-300/40 text-teal-200' : 'border-white/10 text-mist hover:border-teal-300/40 hover:text-teal-200')}>
                        {busyId === l.id ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4L12 3z" /></svg>
                        )}
                      </button>
                      <button onClick={() => call(l)} title="Chiama con l'agente vocale" className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-teal-300/40 hover:text-teal-200">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
                      </button>
                      <button onClick={() => wa(l)} title="Messaggio WhatsApp" className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-teal-300/40 hover:text-teal-200">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z" /></svg>
                      </button>
                      <button onClick={() => removeLead(l.id)} title="Elimina" className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-coral/40 hover:text-coral">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                {openId === l.id && (
                  <tr className="border-b border-white/5 bg-ink-900/40">
                    <td colSpan={5} className="px-4 pb-5 pt-1">
                      {busyId === l.id ? (
                        <div className="flex items-center gap-3 py-3 text-[0.85rem] text-mist">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
                          Claude Opus 4.8 sta qualificando il lead…
                        </div>
                      ) : errById[l.id] ? (
                        <div className="rounded-xl border border-amber-soft/30 bg-amber-soft/5 p-4 text-[0.85rem]">
                          {errById[l.id].includes('ANTHROPIC_API_KEY') ? (
                            <>
                              <p className="font-medium text-amber-soft">Configurazione richiesta</p>
                              <p className="mt-1 text-mist">Imposta <code className="rounded bg-white/10 px-1 text-bone">ANTHROPIC_API_KEY</code> nelle variabili d&apos;ambiente per attivare la qualifica AI.</p>
                            </>
                          ) : (
                            <p className="text-amber-soft">{errById[l.id]}</p>
                          )}
                          <Button variant="ghost" size="sm" className="mt-3" onClick={() => runAi(l)}>Riprova</Button>
                        </div>
                      ) : l.aiSummary || l.aiDraft ? (
                        <div className="space-y-4 pt-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-teal-200/70">Qualifica AI · Opus 4.8</span>
                            <span className={cx('rounded-full px-2.5 py-0.5 text-[0.74rem] font-medium', l.score >= 75 ? 'bg-teal-400/15 text-teal-200' : l.score >= 55 ? 'bg-amber-soft/15 text-amber-soft' : 'bg-white/10 text-mist')}>Conversione {l.score}%</span>
                            <button onClick={() => runAi(l)} className="ml-auto text-[0.76rem] text-mist underline-offset-2 hover:text-teal-200 hover:underline">Rigenera</button>
                          </div>
                          {l.aiSummary && (
                            <div>
                              <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">Sintesi</p>
                              <p className="mt-1 text-[0.9rem] text-bone/90">{l.aiSummary}</p>
                            </div>
                          )}
                          {l.nextAction && (
                            <div>
                              <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">Prossima azione</p>
                              <p className="mt-1 text-[0.9rem] text-bone/90">{l.nextAction}</p>
                            </div>
                          )}
                          {l.aiDraft && (
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">Email di follow-up</p>
                                  <button onClick={() => copyText(`${l.aiDraft!.emailSubject}\n\n${l.aiDraft!.emailBody}`, `mail-${l.id}`)} className="text-[0.72rem] text-teal-200/80 hover:text-teal-200">{copied === `mail-${l.id}` ? 'Copiato ✓' : 'Copia'}</button>
                                </div>
                                <p className="mt-2 text-[0.84rem] font-medium text-bone">{l.aiDraft.emailSubject}</p>
                                <p className="mt-1 whitespace-pre-wrap text-[0.82rem] text-mist">{l.aiDraft.emailBody}</p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">Messaggio WhatsApp</p>
                                  <button onClick={() => copyText(l.aiDraft!.whatsapp, `wa-${l.id}`)} className="text-[0.72rem] text-teal-200/80 hover:text-teal-200">{copied === `wa-${l.id}` ? 'Copiato ✓' : 'Copia'}</button>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-[0.82rem] text-mist">{l.aiDraft.whatsapp}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 py-3 text-[0.85rem] text-mist">
                          <Button size="sm" onClick={() => runAi(l)}>Qualifica con l&apos;AI</Button>
                          <span>Claude Opus 4.8 analizza il lead e prepara il follow-up.</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════ CAMPAIGNS ════════════════════════════
function CampaignsView({ setTab }: { setTab: (t: Tab) => void }) {
  const { user, launchCampaign } = useStore();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const adsLeft = user.meters.ads.total - user.meters.ads.used;

  function quickLaunch() {
    setBusy(true);
    setTimeout(() => {
      const geos = ['Milano + 25 km', 'Roma + 30 km', 'Torino + 20 km', 'Napoli + 25 km'];
      launchCampaign({
        name: `Lead-gen lampo · ${geos[Math.floor(Math.random() * geos.length)]}`,
        objective: 'Lead generation',
        dailyBudget: 25 + Math.floor(Math.random() * 5) * 5,
        geo: geos[Math.floor(Math.random() * geos.length)],
        audience: 'Pubblico freddo generato dall AI sul settore di riferimento.',
        ageRange: '25-54',
        interests: ['Local business', 'Decision maker', 'PMI'],
        postText: 'Smetti di perdere clienti mentre fai altro. Scopri GENERAH AI.',
        videoConcept: 'Spot 2×15s generato da Kling 3.0 Turbo con voce ElevenLabs.',
        lookalike: false,
      });
      setBusy(false);
    }, 1400);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">Campagne Meta</h1>
          <p className="mt-1 text-[0.9rem] text-mist">Create, lanciate e ottimizzate dall&apos;intelligenza. {adsLeft > 0 ? `${adsLeft} campagne disponibili nel piano.` : 'Nessuna campagna residua nel piano.'}</p>
        </div>
        <Button size="sm" onClick={quickLaunch} disabled={busy || adsLeft <= 0}>
          {busy ? 'Lancio…' : '+ Campagna lampo'}
        </Button>
      </div>

      {user.campaigns.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <Photo src={IMG.mediaBuying} alt="Campagne pubblicitarie AI" overlay="left" ratio="aspect-[21/9]" rounded="">
            <div className="flex h-full items-center p-8">
              <div className="max-w-md">
                <p className="font-display text-2xl font-semibold text-bone">Nessuna campagna, per ora</p>
                <p className="mt-2 text-[0.92rem] text-mist">Avvia il flusso guidato: knowledge base → creatività video → pubblico → lancio.</p>
                <Button className="mt-5" size="sm" onClick={() => setTab('overview')} href="/onboarding">
                  Crea con il flusso guidato
                </Button>
              </div>
            </div>
          </Photo>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {user.campaigns.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/8 bg-ink-900/40 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-bone">{c.name}</p>
                  <p className="mt-0.5 text-[0.8rem] text-mist/70">{c.objective} · {c.geo} · età {c.ageRange}</p>
                </div>
                <Badge tone={c.status === 'attiva' ? 'teal' : 'muted'}>{c.status}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/8 bg-ink/40 px-3 py-2.5">
                  <p className="font-mono text-[0.58rem] uppercase tracking-wider text-mist/60">Budget/g</p>
                  <p className="mt-1 font-display text-lg font-semibold text-bone">{euro(c.dailyBudget)}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-ink/40 px-3 py-2.5">
                  <p className="font-mono text-[0.58rem] uppercase tracking-wider text-mist/60">Lead</p>
                  <p className="mt-1 font-display text-lg font-semibold text-teal-200">{num(c.leads)}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-ink/40 px-3 py-2.5">
                  <p className="font-mono text-[0.58rem] uppercase tracking-wider text-mist/60">Lookalike</p>
                  <p className="mt-1 font-display text-lg font-semibold text-bone">{c.lookalike ? 'Sì' : 'No'}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.interests.map((it) => (
                  <span key={it} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.72rem] text-mist">{it}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════ VIDEO ════════════════════════════
function VideoView({ onTopUp }: { onTopUp: (m: MeterKey) => void }) {
  const { user, consume, useVideoConsult } = useStore();
  const [active, setActive] = useState<null | 'trial' | 'plan'>(null);
  if (!user) return null;

  const hasVideo = user.meters.video.total > 0;
  const left = user.meters.video.total - user.meters.video.used;
  const trialAvailable = !user.videoConsultUsed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">Video-consulto AI</h1>
        <p className="mt-1 text-[0.9rem] text-mist">Un consulente con il volto e la voce della tua azienda, disponibile a ogni ora.</p>
      </div>

      {active ? (
        <div>
          <button onClick={() => setActive(null)} className="mb-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-mist/60 transition hover:text-mist">← Torna</button>
          <VideoConsult
            mode={active}
            maxMinutes={active === 'trial' ? 5 : left}
            onEnded={(m) => {
              if (active === 'trial') useVideoConsult();
              else if (m > 0) consume('video', m);
            }}
          />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <Photo src={IMG.videoConsult} alt="Sessione di video-consulto" overlay="center" ratio="aspect-[16/10]" rounded="">
              <div className="flex h-full items-center justify-center">
                <button
                  onClick={() => { if (trialAvailable) setActive('trial'); else if (hasVideo && left > 0) setActive('plan'); }}
                  disabled={!trialAvailable && (!hasVideo || left <= 0)}
                  className={cx('flex h-16 w-16 items-center justify-center rounded-full border border-bone/40 bg-ink/30 backdrop-blur transition', (trialAvailable || (hasVideo && left > 0)) ? 'hover:bg-ink/50' : 'opacity-40')}
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5 text-bone" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </button>
              </div>
            </Photo>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/70">Minuti video del piano</p>
              {hasVideo ? (
                <>
                  <p className="mt-2 font-display text-3xl font-semibold text-bone">{num(left)} <span className="text-base font-normal text-mist">min residui</span></p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-teal-400 transition-all duration-700" style={{ width: `${Math.max(2, Math.round((left / user.meters.video.total) * 100))}%` }} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => setActive('plan')} disabled={left <= 0}>Avvia consulto</Button>
                    <Button size="sm" variant="outline" onClick={() => onTopUp('video')}>Ricarica minuti</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[0.9rem] text-mist">Il piano {user.plan ? PLANS[user.plan].name : ''} non include minuti video. Aggiungili quando vuoi.</p>
                  <Button className="mt-4" size="sm" variant="outline" onClick={() => onTopUp('video')}>Aggiungi minuti video</Button>
                </>
              )}
            </div>

            <div className={cx('rounded-2xl border p-5', trialAvailable ? 'border-teal-300/25 bg-teal-400/[0.04]' : 'border-white/8 bg-ink-900/40')}>
              <div className="flex items-center justify-between">
                <p className="font-display text-[0.98rem] font-semibold text-bone">Consulto omaggio · 5 min</p>
                <Badge tone={trialAvailable ? 'teal' : 'muted'}>{trialAvailable ? 'Disponibile' : 'Utilizzato'}</Badge>
              </div>
              <p className="mt-2 text-[0.84rem] text-mist">{trialAvailable ? 'Provalo gratis una volta: non scala i minuti del piano.' : 'La prova gratuita una tantum è già stata utilizzata.'}</p>
              {trialAvailable && <Button className="mt-4" size="sm" onClick={() => setActive('trial')}>Avvia prova gratuita</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════ KNOWLEDGE BASE ════════════════════════════
function KbView() {
  const { user, addKb, removeKb } = useStore();
  if (!user) return null;
  const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addKb(files);
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">Knowledge base</h1>
          <p className="mt-1 text-[0.9rem] text-mist">La memoria con cui l&apos;AI parla, scrive e vende. Aggiorna i materiali quando vuoi.</p>
        </div>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2.5 text-[0.9rem] font-medium text-ink-900 transition hover:bg-teal-300">+ Aggiungi file</span>
          <input type="file" multiple className="hidden" onChange={pick} />
        </label>
      </div>

      {user.kb.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <Photo src={IMG.ragKnowledge} alt="Knowledge base AI" overlay="left" ratio="aspect-[21/9]" rounded="">
            <div className="flex h-full items-center p-8">
              <div className="max-w-md">
                <p className="font-display text-2xl font-semibold text-bone">Memoria vuota</p>
                <p className="mt-2 text-[0.92rem] text-mist">Carica brochure, listini, FAQ e script. Più conosce il tuo business, meglio converte.</p>
              </div>
            </div>
          </Photo>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {user.kb.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900/40 px-4 py-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 font-mono text-[0.6rem] uppercase text-teal-200">{(f.name.split('.').pop() ?? 'doc').slice(0, 4)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] text-bone">{f.name}</p>
                <p className="text-[0.72rem] text-mist/60">{fmtBytes(f.size)} · {new Date(f.addedAt).toLocaleDateString('it-IT')}</p>
                <KbStatus f={f} />
              </div>
              <button onClick={() => removeKb(f.id)} className="rounded-lg p-2 text-mist transition hover:bg-coral/10 hover:text-coral" aria-label="Rimuovi">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {user.kb.length > 0 && <KbAsk />}
    </div>
  );
}

function KbStatus({ f }: { f: KbFile }) {
  const s = f.indexStatus;
  if (!s) return null;
  if (s === 'pending')
    return (
      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[0.7rem] text-amber-soft">
        <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
        Indicizzazione…
      </span>
    );
  if (s === 'indexed')
    return (
      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[0.7rem] text-teal-200">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Indicizzato · {f.chunks ?? 0} frammenti
      </span>
    );
  if (s === 'unsupported')
    return <span className="mt-0.5 inline-flex text-[0.7rem] text-mist/50">Non indicizzabile (nessun testo)</span>;
  return <span className="mt-0.5 inline-flex text-[0.7rem] text-coral">Errore d&apos;indicizzazione</span>;
}

function KbAsk() {
  const { askKb } = useStore();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ answer: string; sources: KbSource[] } | null>(null);
  const [err, setErr] = useState('');

  async function ask() {
    const question = q.trim();
    if (!question || loading) return;
    setLoading(true);
    setErr('');
    setRes(null);
    const r = await askKb(question);
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || 'Errore imprevisto');
      return;
    }
    setRes({ answer: r.answer || '', sources: r.sources || [] });
  }

  const configErr = err.includes('OPENAI_API_KEY') || err.includes('ANTHROPIC_API_KEY');

  return (
    <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-5">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-teal-200" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4L12 3z" /></svg>
        <p className="font-display text-[1.05rem] font-semibold text-bone">Chiedi alla tua Knowledge Base</p>
      </div>
      <p className="mt-1 text-[0.84rem] text-mist">Opus 4.8 risponde basandosi solo sui tuoi documenti indicizzati, citando le fonti.</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask();
          }}
          placeholder="Es. Qual è il prezzo del servizio principale?"
          className="flex-1 rounded-xl border border-white/10 bg-ink/70 px-3.5 py-2.5 text-[0.9rem] text-bone placeholder-mist/40 focus:border-teal-300/60 focus:outline-none"
        />
        <Button onClick={() => void ask()} disabled={loading || !q.trim()}>
          {loading ? 'Cerco…' : 'Chiedi'}
        </Button>
      </div>

      {err && (
        <p className="mt-3 text-[0.84rem] text-coral">
          {configErr
            ? 'Configurazione richiesta: imposta OPENAI_API_KEY (embeddings) e ANTHROPIC_API_KEY (risposta) nelle variabili d’ambiente.'
            : err}
        </p>
      )}

      {res && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-teal-300/20 bg-teal-400/5 p-4">
            <p className="whitespace-pre-wrap text-[0.9rem] text-bone/90">{res.answer}</p>
          </div>
          {res.sources.length > 0 && (
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">Fonti</p>
              {res.sources.map((s, i) => (
                <div key={i} className="rounded-lg border border-white/8 bg-ink-900/50 px-3 py-2">
                  <p className="text-[0.76rem] font-medium text-teal-200">
                    [Fonte {i + 1}] {s.file_name}
                    {typeof s.similarity === 'number' ? ` · ${Math.round(s.similarity * 100)}%` : ''}
                  </p>
                  <p className="mt-0.5 text-[0.76rem] text-mist/70">{s.snippet}…</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════ ACCOUNT ════════════════════════════
function AccountView() {
  const { user, resetAll } = useStore();
  const [confirm, setConfirm] = useState(false);
  if (!user) return null;
  const plan = user.plan ? PLANS[user.plan] : null;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">Account e piano</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-6">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/70">Profilo</p>
          <dl className="mt-4 space-y-3 text-[0.9rem]">
            {[
              ['Nome', `${user.nome} ${user.cognome}`],
              ['Email', user.email],
              ['Cellulare', user.cellulare],
              ['Settore', user.settore],
              ['Registrato il', new Date(user.createdAt).toLocaleDateString('it-IT')],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <dt className="text-mist/70">{k}</dt>
                <dd className="text-right font-medium text-bone">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/70">Piano attivo</p>
            <Badge tone={user.planMode === 'demo' ? 'amber' : 'teal'}>{user.planMode === 'demo' ? 'Demo' : 'Attivo'}</Badge>
          </div>
          {plan && (
            <>
              <p className="mt-3 font-display text-2xl font-semibold text-bone">{plan.name}</p>
              <dl className="mt-4 space-y-3 text-[0.9rem]">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <dt className="text-mist/70">Canone</dt>
                  <dd className="font-medium text-bone">{euro(user.paidCanone)}/mese</dd>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <dt className="text-mist/70">Setup una tantum</dt>
                  <dd className="font-medium text-bone">{euro(user.paidSetup)}</dd>
                </div>
                {user.discountCode && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <dt className="text-mist/70">Codice applicato</dt>
                    <dd className="font-mono text-[0.82rem] text-teal-200">{user.discountCode}</dd>
                  </div>
                )}
                {user.featurePlan && user.featurePlan !== user.plan && (
                  <div className="flex items-center justify-between">
                    <dt className="text-mist/70">Feature attive</dt>
                    <dd className="font-medium text-amber-soft">Piano {PLANS[user.featurePlan].name}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
          <Button href="/piani" variant="outline" size="sm" className="mt-5">Cambia piano</Button>
        </div>
      </div>

      {/* reset demo */}
      <div className="rounded-2xl border border-coral/25 bg-coral/[0.04] p-6">
        <p className="font-display text-lg font-semibold text-bone">Reset ambiente demo</p>
        <p className="mt-1.5 text-[0.86rem] text-mist">Cancella account, lead, campagne e knowledge base salvati su questo dispositivo. Operazione irreversibile.</p>
        {!confirm ? (
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirm(true)}>Azzera tutto</Button>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={resetAll}>Confermo, azzera</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Annulla</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════ SHELL ════════════════════════════
function DashboardInner() {
  const [tab, setTab] = useState<Tab>('overview');
  const [topUp, setTopUp] = useState<MeterKey | null>(null);

  return (
    <Container wide className="py-8">
      {/* tab nav */}
      <div className="mb-8 flex gap-1.5 overflow-x-auto rounded-full border border-white/8 bg-ink-900/40 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'whitespace-nowrap rounded-full px-4 py-2 text-[0.86rem] font-medium transition',
              tab === t.id ? 'bg-teal-400 text-ink-900' : 'text-mist hover:bg-white/5 hover:text-bone'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview onTopUp={setTopUp} setTab={setTab} />}
      {tab === 'leads' && <LeadsView />}
      {tab === 'campaigns' && <CampaignsView setTab={setTab} />}
      {tab === 'video' && <VideoView onTopUp={setTopUp} />}
      {tab === 'kb' && <KbView />}
      {tab === 'account' && <AccountView />}

      <TopUpModal meter={topUp} onClose={() => setTopUp(null)} />
    </Container>
  );
}

export default function DashboardPage() {
  return (
    <Guard need="plan">
      <AppShell>
        <DashboardInner />
      </AppShell>
    </Guard>
  );
}
