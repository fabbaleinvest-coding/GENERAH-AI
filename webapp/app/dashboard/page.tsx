'use client';

import { useMemo, useState, useEffect, useCallback, useRef, Fragment, type ChangeEvent } from 'react';
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
import { Lead, LeadStatus, LeadStatusOrder, KbFile, KbSource, QueuedSocialPost, QueuedPostStatus, WaMessage } from '@/lib/store';
import {
  type LeadEvent,
  type Appointment,
  type ApptStatus,
  SECTOR_LABEL,
  GOAL_LABEL,
  APPT_STATUS_LABEL,
} from '@/lib/crm';
import { Guard } from '@/components/Guard';
import { AppShell } from '@/components/AppShell';
import { MeterBar } from '@/components/Meters';
import { TopUpModal } from '@/components/TopUpModal';
import { Container, Button, Badge, Photo, Spinner, cx } from '@/components/ui';
import VideoConsult from '@/components/VideoConsult';
import { IMG } from '@/lib/images';

type Tab = 'overview' | 'leads' | 'calendario' | 'whatsapp' | 'campaigns' | 'social' | 'video' | 'kb' | 'account';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Panoramica' },
  { id: 'leads', label: 'Lead · CRM' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'campaigns', label: 'Campagne' },
  { id: 'social', label: 'Post social' },
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

      <NextPostWidget setTab={setTab} />

      <WaNumberCard />

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
// ════════════════════════════ LEADS · CRM ════════════════════════════

function fmtDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ts).toISOString();
  }
}

const EVENT_META: Record<string, { label: string; dot: string }> = {
  ai: { label: 'Azione AI', dot: 'bg-teal-300' },
  nota: { label: 'Nota', dot: 'bg-mist/50' },
  stato: { label: 'Cambio stato', dot: 'bg-amber-soft' },
  email: { label: 'Email', dot: 'bg-sky-300' },
  whatsapp: { label: 'WhatsApp', dot: 'bg-emerald-300' },
  chiamata: { label: 'Chiamata', dot: 'bg-sky-300' },
  appuntamento: { label: 'Appuntamento', dot: 'bg-teal-300' },
  import: { label: 'Import', dot: 'bg-mist/50' },
};

// Striscia "testa del CRM autonomo": settore operativo + obiettivo + autonomia.
function CrmHeader() {
  const { user, classifySector, setCrmAutonomy } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!user) return null;

  async function classify() {
    setBusy(true);
    setErr('');
    const r = await classifySector();
    setBusy(false);
    if (!r.ok) setErr(r.error || 'Errore di classificazione');
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-mist/60">Settore operativo</p>
            <p className="mt-0.5 text-[0.9rem] font-medium text-bone">
              {user.sectorKind ? SECTOR_LABEL[user.sectorKind] : <span className="text-mist/60">Da classificare</span>}
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-mist/60">Obiettivo automazione</p>
            <p className="mt-0.5 text-[0.9rem] font-medium text-bone">
              {user.automationGoal ? GOAL_LABEL[user.automationGoal] : <span className="text-mist/60">—</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* autonomia */}
          <div className="flex items-center rounded-full border border-white/10 bg-ink/60 p-0.5 text-[0.74rem]">
            <button
              onClick={() => setCrmAutonomy('auto')}
              className={cx('rounded-full px-3 py-1 transition', user.crmAutonomy === 'auto' ? 'bg-teal-400 text-ink-900' : 'text-mist hover:text-bone')}
            >
              Autonomo
            </button>
            <button
              onClick={() => setCrmAutonomy('approva')}
              className={cx('rounded-full px-3 py-1 transition', user.crmAutonomy === 'approva' ? 'bg-teal-400 text-ink-900' : 'text-mist hover:text-bone')}
            >
              Con approvazione
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={classify} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : user.sectorKind ? 'Riclassifica' : 'Classifica con AI'}
          </Button>
        </div>
      </div>
      {err && (
        <p className="mt-2 text-[0.78rem] text-amber-soft">
          {err.includes('ANTHROPIC_API_KEY') ? 'Imposta ANTHROPIC_API_KEY per attivare la classificazione AI.' : err}
        </p>
      )}
    </div>
  );
}

// Editor dei tag del lead (chips con add/remove).
function TagRow({ lead }: { lead: Lead }) {
  const { updateLead } = useStore();
  const [val, setVal] = useState('');
  const tags = lead.tags ?? [];
  function add() {
    const t = val.trim();
    if (!t || tags.includes(t)) {
      setVal('');
      return;
    }
    updateLead(lead.id, { tags: [...tags, t] });
    setVal('');
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.72rem] text-mist">
          {t}
          <button onClick={() => updateLead(lead.id, { tags: tags.filter((x) => x !== t) })} className="text-mist/50 hover:text-coral">×</button>
        </span>
      ))}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="+ tag"
        className="w-20 rounded-full border border-white/10 bg-ink/60 px-2.5 py-0.5 text-[0.72rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none"
      />
    </div>
  );
}

// Timeline del lead (lead_events) con aggiunta nota manuale.
function LeadTimeline({ lead }: { lead: Lead }) {
  const { leadTimeline, addLeadNote } = useStore();
  const [events, setEvents] = useState<LeadEvent[] | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const ev = await leadTimeline(lead.id);
    setEvents(ev);
  }, [leadTimeline, lead.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNote() {
    const t = note.trim();
    if (!t) return;
    setSaving(true);
    await addLeadNote(lead.id, t, 'nota');
    setNote('');
    setSaving(false);
    void load();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
      <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">Timeline</p>
      <div className="mt-2 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveNote()}
          placeholder="Aggiungi una nota…"
          className="flex-1 rounded-lg border border-white/10 bg-ink/70 px-3 py-1.5 text-[0.82rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none"
        />
        <Button size="sm" variant="ghost" onClick={saveNote} disabled={saving}>Aggiungi</Button>
      </div>
      <div className="mt-3 space-y-2">
        {events === null ? (
          <p className="text-[0.8rem] text-mist/60">Carico la cronologia…</p>
        ) : events.length === 0 ? (
          <p className="text-[0.8rem] text-mist/50">Nessun evento ancora.</p>
        ) : (
          events.map((e) => {
            const meta = EVENT_META[e.type] || EVENT_META.nota;
            return (
              <div key={e.id} className="flex gap-2.5">
                <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
                <div className="min-w-0">
                  <p className="text-[0.82rem] text-bone/90">{e.summary}</p>
                  <p className="text-[0.68rem] text-mist/50">
                    {meta.label}
                    {e.channel ? ` · ${e.channel}` : ''} · {fmtDateTime(e.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Motore di automazione sul singolo lead (Opus): esegue/prepara la prossima azione.
function LeadAutomation({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const { user, automateLead, createAppointment } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<NonNullable<Awaited<ReturnType<typeof automateLead>>['result']> | null>(null);
  const [copied, setCopied] = useState(false);
  const [appt, setAppt] = useState<'idle' | 'done'>('idle');

  async function run(force = false) {
    setBusy(true);
    setErr('');
    const r = await automateLead(lead.id, { force });
    setBusy(false);
    if (!r.ok) {
      setErr(r.duplicate ? 'Azione già eseguita per questo lead. Usa "Rigenera" per forzarla.' : r.error || 'Errore');
      return;
    }
    setRes(r.result ?? null);
    onChanged();
  }

  async function book() {
    if (!res?.appointment) return;
    const when = new Date();
    when.setDate(when.getDate() + 2);
    when.setHours(10, 0, 0, 0);
    await createAppointment({
      leadId: lead.id,
      title: res.appointment.title || `Appuntamento · ${lead.name}`,
      startsAt: when.getTime(),
      status: 'proposed',
      notes: res.appointment.whenHint ? `Preferenza: ${res.appointment.whenHint}` : null,
      createdBy: 'ai',
    });
    setAppt('done');
  }

  const autonomy = user?.crmAutonomy ?? 'auto';

  return (
    <div className="rounded-xl border border-teal-300/20 bg-teal-400/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-teal-200/70">Automazione · Opus 4.8</span>
        {!res && (
          <Button size="sm" onClick={() => run(false)} disabled={busy} className="ml-auto">
            {busy ? <Spinner className="h-4 w-4" /> : autonomy === 'auto' ? 'Esegui azione' : 'Prepara azione'}
          </Button>
        )}
        {res && (
          <button onClick={() => run(true)} className="ml-auto text-[0.76rem] text-mist underline-offset-2 hover:text-teal-200 hover:underline">Rigenera</button>
        )}
      </div>

      {err && <p className="mt-2 text-[0.8rem] text-amber-soft">{err.includes('ANTHROPIC_API_KEY') ? 'Imposta ANTHROPIC_API_KEY per attivare l’automazione.' : err}</p>}

      {res && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[0.74rem]">
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-mist">{res.automation}</span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-mist">canale: {res.channel}</span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-mist">{res.mode === 'auto' ? 'eseguita' : 'in attesa di approvazione'}</span>
          </div>
          {res.summary && <p className="text-[0.84rem] text-bone/90">{res.summary}</p>}
          <div className="rounded-lg border border-white/10 bg-ink-900/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.66rem] uppercase tracking-wide text-mist/50">Messaggio {res.channel === 'email' ? '(email)' : '(WhatsApp)'}</p>
              <button
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(res.channel === 'email' ? `${res.emailSubject}\n\n${res.message}` : res.message);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* no clipboard */
                  }
                }}
                className="text-[0.72rem] text-teal-200/80 hover:text-teal-200"
              >
                {copied ? 'Copiato ✓' : 'Copia'}
              </button>
            </div>
            {res.channel === 'email' && res.emailSubject && <p className="mt-1.5 text-[0.84rem] font-medium text-bone">{res.emailSubject}</p>}
            <p className="mt-1 whitespace-pre-wrap text-[0.82rem] text-mist">{res.message}</p>
          </div>
          {res.appointment && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-ink-900/50 p-3">
              <p className="text-[0.82rem] text-bone/90">
                Appuntamento proposto: <span className="font-medium">{res.appointment.title}</span>
                {res.appointment.whenHint ? ` · ${res.appointment.whenHint}` : ''}
              </p>
              <Button size="sm" variant="ghost" onClick={book} disabled={appt === 'done'} className="ml-auto">
                {appt === 'done' ? 'Aggiunto al calendario ✓' : 'Crea appuntamento'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pannello dettaglio CRM del lead: tag, consenso, pausa, automazione, timeline.
function LeadDetail({ lead }: { lead: Lead }) {
  const { updateLead } = useStore();
  const [tick, setTick] = useState(0);
  return (
    <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-[0.66rem] uppercase tracking-wide text-mist/50">Tag</p>
          <div className="mt-1.5">
            <TagRow lead={lead} />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-mist">
          <input type="checkbox" checked={lead.consent ?? false} onChange={(e) => updateLead(lead.id, { consent: e.target.checked })} className="h-4 w-4 accent-teal-400" />
          Consenso al contatto
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-mist">
          <input type="checkbox" checked={lead.automationPaused ?? false} onChange={(e) => updateLead(lead.id, { automationPaused: e.target.checked })} className="h-4 w-4 accent-amber-soft" />
          Automazione in pausa
        </label>
      </div>

      {lead.automationPaused ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[0.82rem] text-mist/70">Automazione in pausa per questo lead. Riattivala per far agire l’AI.</p>
      ) : (
        <LeadAutomation lead={lead} onChanged={() => setTick((t) => t + 1)} />
      )}

      <LeadTimeline key={tick} lead={lead} />
    </div>
  );
}

// Pulsante import lista lead (Excel/CSV) lato browser.
function ImportLeads() {
  const { importLeadsFile } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setBusy(true);
    setMsg('');
    const r = await importLeadsFile(file);
    setBusy(false);
    setMsg(r.ok ? `${r.count} contatti importati` : r.error || 'Import non riuscito');
    setTimeout(() => setMsg(''), 4000);
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={onFile} className="hidden" />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Spinner className="h-4 w-4" /> : 'Importa Excel'}
      </Button>
      {msg && <span className="text-[0.74rem] text-teal-200/80">{msg}</span>}
    </div>
  );
}

// Vista pipeline (kanban) per stato.
function PipelineBoard({ leads }: { leads: Lead[] }) {
  const { updateLead } = useStore();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {LeadStatusOrder.map((s) => {
        const col = leads.filter((l) => l.status === s);
        return (
          <div key={s} className="rounded-2xl border border-white/8 bg-ink-900/40 p-2.5">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[0.76rem] font-medium text-bone">{STATUS_META[s].label}</span>
              <span className="font-mono text-[0.7rem] text-mist/50">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((l) => {
                const idx = LeadStatusOrder.indexOf(l.status);
                return (
                  <div key={l.id} className="rounded-xl border border-white/8 bg-ink/60 p-2.5">
                    <p className="truncate text-[0.82rem] font-medium text-bone">{l.name}</p>
                    <p className="truncate text-[0.7rem] text-mist/55">{l.channel} · score {l.score}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        disabled={idx <= 0}
                        onClick={() => updateLead(l.id, { status: LeadStatusOrder[idx - 1] })}
                        className="rounded-md border border-white/10 px-1.5 py-0.5 text-[0.72rem] text-mist disabled:opacity-30 hover:border-teal-300/40 hover:text-teal-200"
                      >
                        ←
                      </button>
                      {l.automationPaused && <span className="text-[0.62rem] text-amber-soft">pausa</span>}
                      <button
                        disabled={idx >= LeadStatusOrder.length - 1}
                        onClick={() => updateLead(l.id, { status: LeadStatusOrder[idx + 1] })}
                        className="rounded-md border border-white/10 px-1.5 py-0.5 text-[0.72rem] text-mist disabled:opacity-30 hover:border-teal-300/40 hover:text-teal-200"
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
              {col.length === 0 && <p className="px-1 py-2 text-[0.72rem] text-mist/40">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadsView() {
  const { user, updateLead, removeLead, addLead, enrichLead, refreshLeads, consume } = useStore();
  const [filter, setFilter] = useState<LeadStatus | 'tutti'>('tutti');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: 'Informazioni' });
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errById, setErrById] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'pipeline'>('table');

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

  async function doRefresh() {
    setRefreshing(true);
    await refreshLeads();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">CRM · Pipeline lead</h1>
          <p className="mt-1 text-[0.9rem] text-mist">Ogni lead acquisito dall&apos;AI atterra qui, pronto da lavorare.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-white/10 bg-ink/60 p-0.5 text-[0.74rem]">
            <button onClick={() => setView('table')} className={cx('rounded-full px-3 py-1 transition', view === 'table' ? 'bg-teal-400 text-ink-900' : 'text-mist hover:text-bone')}>Tabella</button>
            <button onClick={() => setView('pipeline')} className={cx('rounded-full px-3 py-1 transition', view === 'pipeline' ? 'bg-teal-400 text-ink-900' : 'text-mist hover:text-bone')}>Pipeline</button>
          </div>
          <ImportLeads />
          <Button size="sm" variant="outline" onClick={doRefresh} disabled={refreshing}>
            {refreshing ? <Spinner className="h-4 w-4" /> : 'Aggiorna'}
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Annulla' : '+ Aggiungi lead'}
          </Button>
        </div>
      </div>

      <CrmHeader />

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

      {/* lista */}
      {view === 'pipeline' ? (
        <PipelineBoard leads={filtered} />
      ) : filtered.length === 0 ? (
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
                      <LeadDetail lead={l} />
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
// ════════════════════════════ POST SOCIAL · CODA ════════════════════════════
const QUEUE_STATUS: Record<QueuedPostStatus, { label: string; tone: 'teal' | 'amber' | 'coral' | 'muted' }> = {
  pending: { label: 'Programmato', tone: 'amber' },
  publishing: { label: 'In pubblicazione', tone: 'amber' },
  published: { label: 'Pubblicato', tone: 'teal' },
  partial: { label: 'Parziale', tone: 'coral' },
  failed: { label: 'Errore', tone: 'coral' },
};
const NET_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram' };

function fmtWhen(ms: number): string {
  try {
    return new Date(ms).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function relWhen(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return 'in uscita a breve';
  const min = Math.round(diff / 60000);
  if (min < 60) return `tra ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `tra ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'domani' : `tra ${d} giorni`;
}

// Widget Panoramica: il prossimo post social in coda di pubblicazione. Si
// nasconde se non c'è nulla di programmato.
function NextPostWidget({ setTab }: { setTab: (t: Tab) => void }) {
  const { fetchSocialQueue } = useStore();
  const [next, setNext] = useState<QueuedSocialPost | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const all = await fetchSocialQueue();
      const upcoming = all
        .filter((p) => p.status === 'pending' || p.status === 'publishing')
        .sort((a, b) => a.scheduledAt - b.scheduledAt);
      if (alive) setNext(upcoming[0] ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [fetchSocialQueue]);

  if (!next) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-bone">Prossimo post in uscita</h2>
        <button
          onClick={() => setTab('social')}
          className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-teal-300 hover:text-teal-200"
        >
          Vedi tutti →
        </button>
      </div>
      <div className="flex gap-4 rounded-2xl border border-teal-300/20 bg-teal-400/[0.04] p-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink">
          {next.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={next.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[0.66rem] text-mist/40">no img</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal">{relWhen(next.scheduledAt)}</Badge>
            {next.networks.map((n) => (
              <span key={n} className="rounded-full border border-white/10 px-2 py-0.5 text-[0.7rem] text-mist">
                {NET_LABEL[n] || n}
              </span>
            ))}
            <span className="font-mono text-[0.7rem] text-mist/70">{fmtWhen(next.scheduledAt)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-[0.88rem] text-bone/90">
            {next.caption || <span className="text-mist/50">(senza testo)</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function WaNumberCard() {
  const { user, ensureWaNumber } = useStore();
  if (!user || !user.plan) return null;
  const wa = user.waNumber;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-bone">Numero WhatsApp</h2>
        <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-mist/60">Cloud API · Meta</span>
      </div>
      {wa && wa.status === 'assigned' ? (
        <div className="flex items-center gap-4 rounded-2xl border border-teal-300/20 bg-teal-400/[0.04] p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10 font-mono text-[0.72rem] text-teal-200">
            WA
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[1rem] text-bone">{wa.e164}</span>
              <Badge tone="teal">attivo</Badge>
            </div>
            <p className="mt-1 text-[0.84rem] text-mist">
              {wa.displayName ? `Nome visualizzato: ${wa.displayName}` : 'Numero dedicato assegnato al tuo account.'}
            </p>
          </div>
        </div>
      ) : wa && wa.pending ? (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 font-mono text-amber-200">
            …
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.96rem] text-bone">In attesa di assegnazione</span>
              <Badge tone="amber">pending</Badge>
            </div>
            <p className="mt-1 text-[0.84rem] text-mist">
              Ti assegneremo un numero dedicato appena disponibile. Sei già in lista.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[0.88rem] text-mist">Richiedi il numero WhatsApp dedicato per il tuo account.</p>
          <Button size="sm" variant="outline" onClick={() => ensureWaNumber()}>
            Richiedi numero
          </Button>
        </div>
      )}
    </div>
  );
}

function SocialQueueView() {
  const { user, fetchSocialQueue, cancelSocialPost } = useStore();
  const [items, setItems] = useState<QueuedSocialPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetchSocialQueue();
    setItems(r);
  }, [fetchSocialQueue]);

  const counts = useMemo(() => {
    const c = { total: 0, programmati: 0, pubblicati: 0, parziali: 0, errori: 0 };
    for (const p of items ?? []) {
      c.total++;
      if (p.status === 'pending' || p.status === 'publishing') c.programmati++;
      else if (p.status === 'published') c.pubblicati++;
      else if (p.status === 'partial') c.parziali++;
      else if (p.status === 'failed') c.errori++;
    }
    return c;
  }, [items]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  async function doRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }
  async function doCancel(id: string) {
    setCancelingId(id);
    await cancelSocialPost(id);
    await load();
    setCancelingId((c) => (c === id ? null : c));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">Post social · Coda di pubblicazione</h1>
          <p className="mt-1 text-[0.9rem] text-mist">
            I post programmati su Facebook e Instagram, con lo stato di pubblicazione aggiornato dal motore di GENERAH AI.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={doRefresh} disabled={refreshing}>
          {refreshing ? <Spinner className="h-4 w-4" /> : 'Aggiorna'}
        </Button>
      </div>

      {items && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">{counts.total} totali</Badge>
          <Badge tone="amber">{counts.programmati} programmati</Badge>
          <Badge tone="teal">{counts.pubblicati} pubblicati</Badge>
          {counts.parziali > 0 && <Badge tone="coral">{counts.parziali} parziali</Badge>}
          {counts.errori > 0 && <Badge tone="coral">{counts.errori} errori</Badge>}
        </div>
      )}

      {items === null ? (
        <div className="flex items-center gap-3 py-12 text-mist">
          <Spinner className="h-5 w-5" /> Carico la coda…
        </div>
      ) : items.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <Photo src={IMG.socialPost} alt="Post social programmati" overlay="left" ratio="aspect-[21/9]" rounded="">
            <div className="flex h-full items-center p-8">
              <div className="max-w-md">
                <p className="font-display text-2xl font-semibold text-bone">Nessun post in coda</p>
                <p className="mt-2 text-[0.92rem] text-mist">
                  Genera il piano editoriale e programma i post dal flusso guidato: compariranno qui con lo stato di
                  pubblicazione. La pubblicazione diretta richiede Meta collegato.
                </p>
                <Button className="mt-5" size="sm" href="/onboarding">
                  Vai al flusso social
                </Button>
              </div>
            </div>
          </Photo>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const meta = QUEUE_STATUS[p.status];
            return (
              <div key={p.id} className="flex gap-4 rounded-2xl border border-white/8 bg-ink-900/40 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[0.66rem] text-mist/40">
                      no img
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {p.networks.map((n) => (
                      <span key={n} className="rounded-full border border-white/10 px-2 py-0.5 text-[0.7rem] text-mist">
                        {NET_LABEL[n] || n}
                      </span>
                    ))}
                    <span className="font-mono text-[0.7rem] text-mist/70">{fmtWhen(p.scheduledAt)}</span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-[0.88rem] text-bone/90">
                    {p.caption || <span className="text-mist/50">(senza testo)</span>}
                  </p>

                  {p.results.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {p.results.map((r, i) => (
                        <span key={i} className={cx('text-[0.74rem]', r.ok ? 'text-teal-300' : 'text-coral')}>
                          {r.ok ? '✓' : '✗'} {NET_LABEL[r.network] || r.network}
                          {!r.ok && r.error ? ` — ${r.error}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {p.status === 'pending' && (
                  <button
                    onClick={() => doCancel(p.id)}
                    disabled={cancelingId === p.id}
                    className="self-start font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mist/60 transition hover:text-coral disabled:opacity-50"
                  >
                    {cancelingId === p.id ? '…' : 'Annulla'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
function waClock(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const WA_WINDOW_MS = 24 * 60 * 60 * 1000;

function WhatsAppView() {
  const { user, fetchWaMessages, sendWhatsApp, draftWhatsApp, setWaAutoreply } = useStore();
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const m = await fetchWaMessages();
    setMessages(m);
    setLoading(false);
  }, [fetchWaMessages]);

  useEffect(() => {
    void load();
  }, [load]);

  const conversations = useMemo(() => {
    const map = new Map<string, WaMessage[]>();
    for (const m of messages) {
      if (!map.has(m.contact)) map.set(m.contact, []);
      map.get(m.contact)!.push(m);
    }
    const list = Array.from(map.entries()).map(([contact, msgs]) => {
      const sorted = [...msgs].sort((a, b) => a.createdAt - b.createdAt);
      const lastInbound = [...sorted].reverse().find((x) => x.direction === 'inbound');
      return { contact, msgs: sorted, last: sorted[sorted.length - 1], lastInboundAt: lastInbound?.createdAt ?? 0 };
    });
    list.sort((a, b) => (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0));
    return list;
  }, [messages]);

  useEffect(() => {
    if (!selected && conversations.length) setSelected(conversations[0].contact);
  }, [conversations, selected]);

  const current = conversations.find((c) => c.contact === selected) || null;
  const windowOpen = !!current && current.lastInboundAt > 0 && Date.now() - current.lastInboundAt < WA_WINDOW_MS;
  const wa = user?.waNumber;
  const numberReady = !!wa && wa.status === 'assigned';

  async function handleSend() {
    if (!selected) return;
    setNotice(null);
    if (windowOpen) {
      const t = text.trim();
      if (!t) return;
      setSending(true);
      const optimistic: WaMessage = {
        id: `tmp_${Date.now()}`,
        contact: selected,
        direction: 'outbound',
        body: t,
        msgType: 'text',
        templateName: null,
        status: 'sending',
        wamid: null,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setText('');
      const r = await sendWhatsApp(selected, { text: t });
      setSending(false);
      if (!r.ok) {
        setNotice(
          r.reason === 'outside_window'
            ? 'Fuori finestra 24h: serve un template approvato.'
            : r.configured === false
              ? 'WhatsApp non ancora configurato (numero o token mancanti).'
              : r.error || 'Invio non riuscito.',
        );
      }
      setTimeout(() => void load(), 1200);
    } else {
      const name = templateName.trim();
      if (!name) {
        setNotice('Finestra 24h chiusa: indica il nome di un template approvato.');
        return;
      }
      setSending(true);
      const r = await sendWhatsApp(selected, { template: name, lang: 'it' });
      setSending(false);
      if (r.ok) {
        setTemplateName('');
        setNotice('Template inviato.');
        setTimeout(() => void load(), 1200);
      } else {
        setNotice(
          r.configured === false
            ? 'WhatsApp non ancora configurato.'
            : r.error || `Invio template non riuscito${r.reason ? ` (${r.reason})` : ''}.`,
        );
      }
    }
  }

  async function handleDraft() {
    if (!current) return;
    setNotice(null);
    setDrafting(true);
    const recent = current.msgs.slice(-12).map((m) => ({ direction: m.direction, body: m.body }));
    const reply = await draftWhatsApp(current.contact, recent);
    setDrafting(false);
    if (reply) setText(reply);
    else setNotice('Bozza AI non disponibile (configura ANTHROPIC_API_KEY).');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-bone">WhatsApp</h1>
          <p className="mt-1 text-mist">
            {numberReady ? (
              <>
                Numero attivo <span className="font-mono text-bone">{wa!.e164}</span>
                {wa!.displayName ? ` · ${wa!.displayName}` : ''}
              </>
            ) : wa && wa.pending ? (
              'Numero in attesa di assegnazione.'
            ) : (
              'Nessun numero WhatsApp attivo: attiva un piano per riceverne uno.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWaAutoreply(!user?.waAutoreply)}
            className={cx(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.76rem] font-medium transition',
              user?.waAutoreply
                ? 'border-teal-300/40 bg-teal-400/10 text-teal-200'
                : 'border-white/15 bg-white/[0.03] text-mist hover:text-bone',
            )}
            title="Risposte automatiche AI ai messaggi in arrivo (entro 24h, basate sulla knowledge base)"
          >
            <span
              className={cx(
                'inline-block h-2 w-2 rounded-full',
                user?.waAutoreply ? 'bg-teal-300' : 'bg-mist/50',
              )}
            />
            Auto-reply AI · {user?.waAutoreply ? 'ON' : 'OFF'}
          </button>
          <Button size="sm" variant="outline" onClick={() => load()}>
            Aggiorna
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-2.5 text-[0.86rem] text-bone">{notice}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Lista conversazioni */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-4 py-2.5 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-mist/70">
            Conversazioni ({conversations.length})
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-4 py-8 text-center text-[0.86rem] text-mist">
                Nessuna conversazione. I messaggi in arrivo sul tuo numero compariranno qui.
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.contact}
                  onClick={() => setSelected(c.contact)}
                  className={cx(
                    'flex w-full flex-col gap-0.5 border-b border-white/5 px-4 py-3 text-left transition',
                    c.contact === selected ? 'bg-teal-400/[0.06]' : 'hover:bg-white/[0.03]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.86rem] text-bone">{c.contact}</span>
                    <span className="shrink-0 text-[0.66rem] text-mist/60">{relWhen(c.last.createdAt)}</span>
                  </div>
                  <span className="line-clamp-1 text-[0.78rem] text-mist">
                    {c.last.direction === 'outbound' ? 'Tu: ' : ''}
                    {c.last.body || (c.last.templateName ? `[template ${c.last.templateName}]` : '…')}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread + composer */}
        <div className="flex min-h-[60vh] flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
          {!current ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-mist">
              Seleziona una conversazione per leggere e rispondere.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
                <span className="font-mono text-[0.9rem] text-bone">{current.contact}</span>
                <Badge tone={windowOpen ? 'teal' : 'amber'}>
                  {windowOpen ? 'finestra 24h aperta' : 'finestra 24h chiusa'}
                </Badge>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" style={{ maxHeight: '46vh' }}>
                {current.msgs.map((m) => (
                  <div key={m.id} className={cx('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cx(
                        'max-w-[80%] rounded-2xl px-3.5 py-2 text-[0.88rem]',
                        m.direction === 'outbound'
                          ? 'bg-teal-400/15 text-bone'
                          : 'border border-white/10 bg-white/[0.04] text-bone/90',
                      )}
                    >
                      {m.templateName && (
                        <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/60">
                          template · {m.templateName}
                        </span>
                      )}
                      <span className="whitespace-pre-wrap">{m.body || '…'}</span>
                      <span className="mt-1 block text-right text-[0.6rem] text-mist/50">
                        {waClock(m.createdAt)}
                        {m.status === 'sending' ? ' · invio…' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div className="border-t border-white/10 p-3">
                {windowOpen ? (
                  <div className="flex items-end gap-2">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={2}
                      placeholder="Scrivi una risposta…  (⌘/Ctrl+Invio per inviare)"
                      className="min-h-[44px] flex-1 resize-y rounded-xl border border-white/10 bg-ink px-3 py-2 text-[0.9rem] text-bone outline-none focus:border-teal-300/40"
                    />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDraft()} disabled={drafting}>
                        {drafting ? 'Scrivo…' : 'Bozza AI'}
                      </Button>
                      <Button size="sm" onClick={() => handleSend()} disabled={sending || !text.trim()}>
                        {sending ? 'Invio…' : 'Invia'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[0.8rem] text-mist">
                      Sono passate più di 24h dall&apos;ultimo messaggio del cliente: WhatsApp consente solo un
                      <span className="text-bone"> template approvato</span>.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="nome_template_approvato"
                        className="flex-1 rounded-xl border border-white/10 bg-ink px-3 py-2 font-mono text-[0.85rem] text-bone outline-none focus:border-teal-300/40"
                      />
                      <Button size="sm" onClick={() => handleSend()} disabled={sending || !templateName.trim()}>
                        {sending ? 'Invio…' : 'Invia template'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════ CALENDARIO ════════════════════════════
function CalendarView() {
  const { user, listAppointments, createAppointment, editAppointment, deleteAppointment } = useStore();
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', when: '', leadId: '', location: '', notes: '' });

  const load = useCallback(async () => {
    const a = await listAppointments();
    setAppts(a);
  }, [listAppointments]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!form.title.trim() || !form.when) return;
    setSaving(true);
    await createAppointment({
      title: form.title.trim(),
      startsAt: new Date(form.when).getTime(),
      leadId: form.leadId || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      status: 'confirmed',
      createdBy: 'admin',
    });
    setForm({ title: '', when: '', leadId: '', location: '', notes: '' });
    setAdding(false);
    setSaving(false);
    void load();
  }

  async function setStatus(a: Appointment, status: ApptStatus) {
    await editAppointment(a.id, { status });
    void load();
  }
  async function remove(a: Appointment) {
    await deleteAppointment(a.id);
    void load();
  }

  const leadName = (id: string | null) => (id && user ? user.leads.find((l) => l.id === id)?.name : '') || '';
  const upcoming = (appts ?? []).filter((a) => a.status !== 'cancelled' && a.startsAt >= Date.now() - 36e5);
  const past = (appts ?? []).filter((a) => a.startsAt < Date.now() - 36e5 || a.status === 'cancelled');

  const Row = ({ a }: { a: Appointment }) => (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-ink-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[0.92rem] font-medium text-bone">{a.title}</p>
          <span className={cx('rounded-full px-2 py-0.5 text-[0.66rem]', a.status === 'confirmed' ? 'bg-teal-400/15 text-teal-200' : a.status === 'proposed' ? 'bg-amber-soft/15 text-amber-soft' : a.status === 'done' ? 'bg-white/10 text-mist' : 'bg-coral/15 text-coral')}>
            {APPT_STATUS_LABEL[a.status]}
          </span>
          {a.createdBy === 'ai' && <span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[0.62rem] text-teal-200/80">AI</span>}
        </div>
        <p className="mt-0.5 text-[0.78rem] text-mist">
          {fmtDateTime(a.startsAt)}
          {leadName(a.leadId) ? ` · ${leadName(a.leadId)}` : ''}
          {a.location ? ` · ${a.location}` : ''}
        </p>
        {a.notes && <p className="mt-1 text-[0.78rem] text-mist/70">{a.notes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {a.status !== 'confirmed' && <Button size="sm" variant="ghost" onClick={() => setStatus(a, 'confirmed')}>Conferma</Button>}
        {a.status !== 'done' && <Button size="sm" variant="ghost" onClick={() => setStatus(a, 'done')}>Concludi</Button>}
        <button onClick={() => remove(a)} title="Elimina" className="rounded-lg border border-white/10 p-2 text-mist transition hover:border-coral/40 hover:text-coral">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
        </button>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-bone">Calendario</h1>
          <p className="mt-1 text-[0.9rem] text-mist">Gli appuntamenti fissati da te o proposti dall&apos;AI per i tuoi lead.</p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>{adding ? 'Annulla' : '+ Nuovo appuntamento'}</Button>
      </div>

      {adding && (
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-ink-900/50 p-4 sm:grid-cols-2">
          <input placeholder="Titolo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none" />
          <input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone focus:border-teal-300/60 focus:outline-none" />
          <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone focus:border-teal-300/60 focus:outline-none">
            <option value="">Nessun lead collegato</option>
            {user.leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input placeholder="Luogo (facoltativo)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none" />
          <input placeholder="Note (facoltative)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none sm:col-span-2" />
          <div className="sm:col-span-2">
            <Button size="sm" onClick={submit} disabled={saving}>{saving ? <Spinner className="h-4 w-4" /> : 'Salva appuntamento'}</Button>
          </div>
        </div>
      )}

      {appts === null ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900/40 p-6 text-[0.85rem] text-mist">
          <Spinner className="h-4 w-4" /> Carico il calendario…
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/60">Prossimi · {upcoming.length}</p>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-8 text-center text-mist">Nessun appuntamento in programma.</div>
            ) : (
              <div className="space-y-2.5">{upcoming.map((a) => <Row key={a.id} a={a} />)}</div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/60">Passati / annullati · {past.length}</p>
              <div className="space-y-2.5 opacity-70">{past.map((a) => <Row key={a.id} a={a} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
      {tab === 'calendario' && <CalendarView />}
      {tab === 'whatsapp' && <WhatsAppView />}
      {tab === 'campaigns' && <CampaignsView setTab={setTab} />}
      {tab === 'social' && <SocialQueueView />}
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
