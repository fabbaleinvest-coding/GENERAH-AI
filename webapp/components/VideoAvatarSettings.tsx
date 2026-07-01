'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Badge, Spinner, cx } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Impostazioni del Video-avatar pubblico (dashboard).
//  Gestisce: attivazione consulto + slug pubblico + titoli, link/iframe da
//  incorporare nel sito dell'utente, e collegamento calendario (cal.com/Google).
//  Tutto via /api/consult/config (autenticata, RLS sul profilo).
// ─────────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5 text-[0.88rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none';

type Config = {
  slug: string | null;
  consultEnabled: boolean;
  headline: string;
  subheadline: string;
  calendarProvider: string | null;
  calcomEventTypeId: string;
  calcomBookingUrl: string;
  timezone: string;
  googleConfigured?: boolean;
  baseUrl: string;
  consultUrl: string | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[0.68rem] uppercase tracking-wide text-mist/50">{label}</p>
        <button
          onClick={() => {
            try {
              navigator.clipboard?.writeText(value);
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
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2.5 font-mono text-[0.76rem] text-bone/90">
        {value}
      </pre>
    </div>
  );
}

export default function VideoAvatarSettings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  // form consulto
  const [slug, setSlug] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [savingConsult, setSavingConsult] = useState(false);
  const [consultMsg, setConsultMsg] = useState<string | null>(null);

  // form calendario (cal.com)
  const [calKey, setCalKey] = useState('');
  const [calEvent, setCalEvent] = useState('');
  const [calBookingUrl, setCalBookingUrl] = useState('');
  const [savingCal, setSavingCal] = useState(false);
  const [calMsg, setCalMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/consult/config', { headers: await authHeaders() });
        const j = (await r.json()) as Config & { ok?: boolean };
        if (!alive || !j?.ok) {
          setLoading(false);
          return;
        }
        setCfg(j);
        setSlug(j.slug || '');
        setEnabled(!!j.consultEnabled);
        setHeadline(j.headline || '');
        setSubheadline(j.subheadline || '');
        setCalEvent(j.calcomEventTypeId || '');
        setCalBookingUrl(j.calcomBookingUrl || '');
      } catch {
        /* offline */
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Ritorno dal consenso Google (?google=connected|denied|error|…): mostra esito
  // e ripulisci la query dall'URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const g = new URLSearchParams(window.location.search).get('google');
    if (!g) return;
    const map: Record<string, string> = {
      connected: 'Google Calendar collegato ✓',
      denied: 'Collegamento annullato.',
      error: 'Errore nel collegamento a Google. Riprova.',
      unavailable: 'Google Calendar non ancora configurato lato piattaforma.',
      noauth: 'Sessione scaduta, riprova.',
    };
    setCalMsg(map[g] || null);
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      /* noop */
    }
  }, []);

  async function connectGoogle() {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      setCalMsg('Sessione scaduta, ricarica la pagina.');
      return;
    }
    window.location.href = `/api/consult/google/start?token=${encodeURIComponent(token)}`;
  }

  async function saveConsult() {
    setSavingConsult(true);
    setConsultMsg(null);
    try {
      const r = await fetch('/api/consult/config', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'save-consult',
          publicSlug: slug,
          consultEnabled: enabled,
          headline,
          subheadline,
        }),
      });
      const j = await r.json();
      if (!j?.ok) setConsultMsg(j?.error || 'Errore nel salvataggio.');
      else {
        setSlug(j.slug || slug);
        setCfg((c) =>
          c ? { ...c, slug: j.slug || slug, consultUrl: j.consultUrl || c.consultUrl, consultEnabled: enabled, headline, subheadline } : c,
        );
        setConsultMsg('Salvato ✓');
      }
    } catch {
      setConsultMsg('Errore di rete.');
    }
    setSavingConsult(false);
  }

  async function saveCalcom() {
    setSavingCal(true);
    setCalMsg(null);
    try {
      const r = await fetch('/api/consult/config', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'save-calcom',
          calcomApiKey: calKey,
          calcomEventTypeId: calEvent,
          calcomBookingUrl: calBookingUrl,
          timezone: cfg?.timezone || 'Europe/Rome',
        }),
      });
      const j = await r.json();
      if (!j?.ok) setCalMsg(j?.error || 'Errore nel collegamento.');
      else {
        setCfg((c) => (c ? { ...c, calendarProvider: 'calcom', calcomEventTypeId: calEvent, calcomBookingUrl: calBookingUrl } : c));
        setCalKey('');
        setCalMsg('cal.com collegato ✓');
      }
    } catch {
      setCalMsg('Errore di rete.');
    }
    setSavingCal(false);
  }

  async function disconnectCal() {
    setSavingCal(true);
    setCalMsg(null);
    try {
      const r = await fetch('/api/consult/config', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'disconnect-calendar' }),
      });
      const j = await r.json();
      if (!j?.ok) setCalMsg(j?.error || 'Errore.');
      else {
        setCfg((c) => (c ? { ...c, calendarProvider: null } : c));
        setCalMsg('Calendario scollegato.');
      }
    } catch {
      setCalMsg('Errore di rete.');
    }
    setSavingCal(false);
  }

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900/40 p-5 text-mist">
        <Spinner className="h-4 w-4" /> <span className="text-[0.86rem]">Caricamento impostazioni video-avatar…</span>
      </div>
    );
  }

  const consultUrl = cfg?.consultUrl || (cfg?.baseUrl && slug ? `${cfg.baseUrl}/c/${slug}` : '');
  const iframe = consultUrl
    ? `<iframe src="${consultUrl}" width="100%" height="720" allow="camera; microphone; autoplay; fullscreen" style="border:0;border-radius:16px"></iframe>`
    : '';
  const calConnected = !!cfg?.calendarProvider;

  return (
    <div className="mt-8 space-y-5 border-t border-white/8 pt-8">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-bone">Video-avatar sul tuo sito</h2>
        <p className="mt-1 text-[0.88rem] text-mist">
          Pubblica il video-consulto ai tuoi clienti: lasciano i contatti, parlano con l’avatar e finiscono nel tuo CRM.
        </p>
      </div>

      {/* 1) Attivazione + slug + titoli */}
      <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/70">Pagina pubblica</p>
          <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-mist">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-teal-400" />
            Attiva
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <p className="mb-1 text-[0.68rem] uppercase tracking-wide text-mist/50">Indirizzo pubblico</p>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink/70 px-3 py-2.5">
              <span className="font-mono text-[0.8rem] text-mist/60">{(cfg?.baseUrl || '…').replace(/^https?:\/\//, '')}/c/</span>
              <input
                className="flex-1 bg-transparent font-mono text-[0.82rem] text-bone placeholder:text-mist/40 focus:outline-none"
                placeholder="la-tua-azienda"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>
          <input className={inputCls} placeholder="Titolo (es. Parla ora con noi in video)" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <input className={inputCls} placeholder="Sottotitolo (una frase di invito)" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={saveConsult} disabled={savingConsult}>
            {savingConsult ? <Spinner className="h-4 w-4" /> : 'Salva'}
          </Button>
          {consultMsg && <span className="text-[0.8rem] text-teal-200/90">{consultMsg}</span>}
        </div>
      </div>

      {/* 2) Come incorporarlo */}
      {enabled && slug && consultUrl && (
        <div className="rounded-2xl border border-teal-300/20 bg-teal-400/[0.03] p-5">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-teal-200/70">Incorpora nel tuo sito</p>
          <p className="mt-2 text-[0.84rem] text-mist">Due modi, scegli quello che preferisci — nessun DNS da configurare.</p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[0.86rem] font-medium text-bone">Opzione 1 · Link nel menu (più semplice)</p>
              <p className="mt-1 text-[0.82rem] text-mist">Aggiungi una voce di menu «Parla con noi in video» che punta a questo link:</p>
              <div className="mt-2">
                <CopyField label="Link pubblico" value={consultUrl} />
              </div>
            </div>
            <div>
              <p className="text-[0.86rem] font-medium text-bone">Opzione 2 · iframe (dentro una pagina del tuo sito)</p>
              <p className="mt-1 text-[0.82rem] text-mist">Incolla questo codice in una pagina del tuo sito. Include i permessi per camera e microfono.</p>
              <div className="mt-2">
                <CopyField label="Codice iframe" value={iframe} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3) Calendario */}
      <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mist/70">Calendario appuntamenti</p>
          <Badge tone={calConnected ? 'teal' : 'muted'}>
            {cfg?.calendarProvider === 'calcom' ? 'cal.com collegato' : cfg?.calendarProvider === 'google' ? 'Google collegato' : 'Non collegato'}
          </Badge>
        </div>
        <p className="mt-2 text-[0.84rem] text-mist">
          Collega un calendario: video-avatar, agente vocale e WhatsApp potranno fissare appuntamenti in automatico.
        </p>

        {/* cal.com — via pronta all'uso */}
        <div className="mt-4 space-y-3">
          <p className="text-[0.86rem] font-medium text-bone">cal.com (consigliato)</p>
          <ol className="ml-4 list-decimal space-y-1 text-[0.82rem] text-mist">
            <li>Registrati gratis su cal.com (email o Google).</li>
            <li>Crea un «Event Type» (es. Consulenza · 30 min) con durata e disponibilità.</li>
            <li>Copia l&apos;Event Type ID (è un numero, nelle impostazioni dell&apos;evento).</li>
            <li>Genera una API key: Settings → Developer → API Keys.</li>
            <li>Incolla API key + Event Type ID qui sotto e salva.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="cal.com API key (cal_live_…)" value={calKey} onChange={(e) => setCalKey(e.target.value)} />
            <input className={inputCls} placeholder="Event Type ID (es. 123456)" value={calEvent} onChange={(e) => setCalEvent(e.target.value)} />
            <input className={cx(inputCls, 'sm:col-span-2')} placeholder="Link pubblico di prenotazione (facoltativo, es. cal.com/tuonome/30min)" value={calBookingUrl} onChange={(e) => setCalBookingUrl(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveCalcom} disabled={savingCal || !calKey.trim() || !calEvent.trim()}>
              {savingCal ? <Spinner className="h-4 w-4" /> : 'Collega cal.com'}
            </Button>
            {calConnected && (
              <Button size="sm" variant="ghost" onClick={disconnectCal} disabled={savingCal}>
                Scollega
              </Button>
            )}
            {calMsg && <span className="text-[0.8rem] text-teal-200/90">{calMsg}</span>}
          </div>
        </div>

        {/* Google — collegamento OAuth */}
        <div className="mt-5 border-t border-white/8 pt-4">
          <p className="text-[0.86rem] font-medium text-bone">Google Calendar</p>
          <ol className="ml-4 mt-1 list-decimal space-y-1 text-[0.82rem] text-mist">
            <li>Se non hai un account Google, creane uno gratis su google.com.</li>
            <li>Premi «Collega Google Calendar», accedi e concedi l&apos;accesso al calendario.</li>
            <li>Fatto: gli appuntamenti verranno creati sul tuo calendario principale.</li>
          </ol>
          {cfg?.googleConfigured ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={cfg?.calendarProvider === 'google' ? 'ghost' : 'outline'}
                onClick={connectGoogle}
              >
                {cfg?.calendarProvider === 'google' ? 'Ricollega Google Calendar' : 'Collega Google Calendar'}
              </Button>
              {cfg?.calendarProvider === 'google' && (
                <Button size="sm" variant="ghost" onClick={disconnectCal} disabled={savingCal}>
                  Scollega
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 text-[0.78rem] text-mist/60">
                Il collegamento Google richiede la configurazione OAuth lato piattaforma. Nel frattempo usa cal.com, che è
                già operativo.
              </p>
              <Button size="sm" variant="outline" className="mt-3" disabled title="Disponibile a breve">
                Collega Google Calendar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
