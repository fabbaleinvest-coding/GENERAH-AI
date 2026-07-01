'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, Field, Spinner, Logo, cx } from '@/components/ui';
import VideoConsult from '@/components/VideoConsult';

// ─────────────────────────────────────────────────────────────────────────
//  GENERAH AI · Video-consulto PUBBLICO (/c/<slug>).
//  Pagina che l'utente incorpora nel proprio sito (link diretto o <iframe>).
//  Il visitatore (lead) lascia i contatti → nasce un lead nel CRM dell'azienda
//  → parte il consulto con l'avatar ancorato alla KB dell'azienda → a fine
//  consulto Opus 4.8 scrive il recap nel CRM. Nessun login richiesto.
// ─────────────────────────────────────────────────────────────────────────

type Business = { name: string; settore: string; headline: string; subheadline: string; hasCalendar: boolean };
type Phase = 'loading' | 'form' | 'consult' | 'done' | 'unavailable';

const MAX_MINUTES = 15;

export default function PublicConsultPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug || '').toString();

  const [phase, setPhase] = useState<Phase>('loading');
  const [biz, setBiz] = useState<Business | null>(null);
  const [leadId, setLeadId] = useState<string>('');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Info pubblica del business (RPC sicura: solo campi pubblici).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.rpc('public_business_by_slug', { p_slug: slug });
        const row = Array.isArray(data) ? data[0] : data;
        if (!alive) return;
        if (!row) {
          setPhase('unavailable');
          return;
        }
        setBiz({
          name: row.business_name || 'Consulente',
          settore: row.settore || '',
          headline: row.headline || '',
          subheadline: row.subheadline || '',
          hasCalendar: !!row.has_calendar,
        });
        setPhase('form');
      } catch {
        if (alive) setPhase('unavailable');
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nome.trim()) return setError('Inserisci il tuo nome.');
    if (!email.trim() && !telefono.trim()) return setError('Inserisci email o telefono.');
    setSubmitting(true);
    try {
      const r = await fetch('/api/public/consult/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, nome, email, telefono, motivo }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setSubmitting(false);
        setError(j?.error || 'Non è stato possibile avviare il consulto.');
        return;
      }
      setLeadId(j.leadId || '');
      if (j.business) setBiz((b) => ({ ...(b as Business), ...j.business }));
      setPhase('consult');
    } catch {
      setSubmitting(false);
      setError('Errore di rete. Riprova.');
    }
  }

  async function onTranscript(turns: { role: string; text: string }[]) {
    try {
      await fetch('/api/public/consult/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, leadId, transcript: turns }),
      });
    } catch {
      /* best-effort */
    }
    setPhase('done');
  }

  const headline = biz?.headline || (biz ? `Parla in video con ${biz.name}` : 'Video-consulto');
  const subheadline =
    biz?.subheadline || 'Lascia i tuoi contatti e avvia subito una conversazione con il nostro consulente AI.';

  return (
    <main className="min-h-screen bg-ink text-bone">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo size={26} withText={false} href={null} />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-mist/60">Powered by GENERAH AI</span>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          {phase === 'loading' && (
            <div className="flex items-center justify-center py-20 text-mist">
              <Spinner className="h-5 w-5" /> <span className="ml-3 text-[0.9rem]">Caricamento…</span>
            </div>
          )}

          {phase === 'unavailable' && (
            <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-8 text-center">
              <h1 className="font-display text-2xl font-semibold text-bone">Consulto non disponibile</h1>
              <p className="mt-3 text-[0.95rem] text-mist">
                Il link potrebbe non essere più attivo. Contatta direttamente l’azienda per fissare un incontro.
              </p>
            </div>
          )}

          {phase === 'form' && (
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-teal-300/80">
                  {biz?.settore || 'Consulenza'}
                </p>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
                  {headline}
                </h1>
                <p className="mt-4 text-[1rem] leading-relaxed text-mist">{subheadline}</p>
                <ul className="mt-6 space-y-2 text-[0.9rem] text-bone/80">
                  {['Risposte immediate, senza attese', 'Un consulente disponibile a ogni ora', 'Nessuna installazione, direttamente dal browser'].map(
                    (t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-teal-400" />
                        <span>{t}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-ink-900/50 p-6">
                <p className="font-display text-[1.05rem] font-semibold text-bone">Avvia il video-consulto</p>
                <p className="mt-1 text-[0.82rem] text-mist">I tuoi dati restano riservati all’azienda.</p>
                <div className="mt-5 space-y-3">
                  <Field label="Nome e cognome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Mario Rossi" />
                  <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario@esempio.it" />
                  <Field label="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+39 333 1234567" />
                  <Field label="Di cosa vuoi parlare? (facoltativo)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Es. un preventivo, informazioni…" />
                </div>
                {error && (
                  <div className="mt-4 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[0.85rem] text-coral">{error}</div>
                )}
                <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4" /> Avvio…
                    </>
                  ) : (
                    'Avvia il consulto'
                  )}
                </Button>
                <p className="mt-3 text-center text-[0.72rem] text-mist/50">
                  Avviando accetti di essere ricontattato dall’azienda in merito alla tua richiesta.
                </p>
              </form>
            </div>
          )}

          {phase === 'consult' && (
            <div>
              <p className="mb-4 text-center text-[0.86rem] text-mist">
                Stai parlando con il consulente AI di <span className="text-bone">{biz?.name}</span>.
              </p>
              <VideoConsult
                mode="plan"
                maxMinutes={MAX_MINUTES}
                publicSlug={slug}
                publicLeadId={leadId}
                guestName={nome}
                onTranscript={onTranscript}
              />
            </div>
          )}

          {phase === 'done' && (
            <div className="rounded-2xl border border-white/8 bg-ink-900/40 p-8 text-center">
              <h1 className="font-display text-2xl font-semibold text-bone">
                Grazie{nome ? `, ${nome.split(' ')[0]}` : ''}!
              </h1>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-mist">
                Il consulto è concluso. {biz?.name || 'L’azienda'} ha ricevuto la tua richiesta e ti ricontatterà al più presto.
              </p>
              <div className={cx('mt-6 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/5 px-4 py-2 text-[0.8rem] text-teal-200')}>
                A presto ✦
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
