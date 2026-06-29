'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { IMG } from '@/lib/images';
import { AuthScreen } from '@/components/AuthScreen';
import { Button, Field, SelectField, Eyebrow, Spinner } from '@/components/ui';

const SETTORI = [
  'B2B · Servizi alle imprese',
  'B2C · Vendita al consumatore',
  'E-commerce',
  'Clinica medica',
  'Studio odontoiatrico',
  'Centro veterinario',
  'Servizi professionali (legale, fiscale)',
  'Immobiliare',
  'Automotive',
  'Formazione e corsi',
  'Beauty & wellness',
  'Altro',
];

export default function RegistratiPage() {
  const { ready, user, register } = useStore();
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [cellulare, setCellulare] = useState('');
  const [settore, setSettore] = useState(SETTORI[0]);
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace('/piani');
  }, [ready, user, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nome.trim() || !cognome.trim()) return setError('Inserisci nome e cognome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Inserisci un indirizzo email valido.');
    if (cellulare.replace(/\D/g, '').length < 8) return setError('Inserisci un numero di cellulare valido.');
    if (password.length < 6) return setError('La password deve avere almeno 6 caratteri.');
    if (password !== conferma) return setError('Le due password non coincidono.');

    setLoading(true);
    (async () => {
      const res = await register({ nome, cognome, email, cellulare, settore, password });
      if (!res.ok) {
        setLoading(false);
        setError(res.error ?? 'Registrazione non riuscita.');
        return;
      }
      router.replace('/piani');
    })();
  }

  return (
    <AuthScreen
      image={IMG.authHero}
      imageAlt="Imprenditore che attiva la sua console GENERAH AI all'alba"
      caption={{
        title: 'Un account, un reparto vendite intero.',
        body: 'Crea le tue credenziali e accedi a una console che acquisisce, coltiva e converte mentre tu pensi al resto.',
      }}
    >
      <div className="animate-fade-up">
        <Eyebrow>Crea il tuo account</Eyebrow>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-[2.3rem]">
          Attiva GENERAH AI
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">
          Pochi dati e la tua console è pronta. Nessun pagamento richiesto per la prova.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Mario" autoComplete="given-name" />
            <Field label="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} placeholder="Rossi" autoComplete="family-name" />
          </div>

          <Field
            label="Email di lavoro"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mario.rossi@azienda.it"
            autoComplete="email"
          />

          <Field
            label="Cellulare"
            type="tel"
            value={cellulare}
            onChange={(e) => setCellulare(e.target.value)}
            placeholder="+39 333 1234567"
            autoComplete="tel"
          />

          <SelectField label="Settore" value={settore} onChange={(e) => setSettore(e.target.value)}>
            {SETTORI.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <Field
              label="Conferma password"
              type="password"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[0.85rem] text-coral">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="h-4 w-4" /> Creazione in corso…
              </>
            ) : (
              'Crea account e scegli il piano'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-[0.9rem] text-mist">
          Hai già un account?{' '}
          <Link href="/accedi" className="font-medium text-teal-300 hover:text-teal-200">
            Accedi
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
