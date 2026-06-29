'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { IMG } from '@/lib/images';
import { AuthScreen } from '@/components/AuthScreen';
import { Button, Field, Eyebrow, Spinner } from '@/components/ui';

export default function AccediPage() {
  const { ready, user, login } = useStore();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(user.plan ? '/dashboard' : '/piani');
    }
  }, [ready, user, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    (async () => {
      const res = await login(email, password);
      if (!res.ok) {
        setLoading(false);
        setError(res.error ?? 'Accesso non riuscito.');
        return;
      }
      // il redirect avviene nell'effect quando lo stato si aggiorna
    })();
  }

  return (
    <AuthScreen
      image={IMG.consoleHero}
      imageAlt="Centro di comando notturno di GENERAH AI"
      caption={{
        title: 'Bentornato al comando.',
        body: 'La tua intelligenza ha continuato a lavorare. Accedi per vedere i lead, le campagne e i contatori.',
      }}
    >
      <div className="animate-fade-up">
        <Eyebrow>Accesso riservato</Eyebrow>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-[2.3rem]">
          Accedi alla console
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">
          Entra con le credenziali che hai creato in fase di registrazione.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mario.rossi@azienda.it"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[0.85rem] text-coral">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="h-4 w-4" /> Accesso in corso…
              </>
            ) : (
              'Entra nella console'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-[0.9rem] text-mist">
          Non hai ancora un account?{' '}
          <Link href="/registrati" className="font-medium text-teal-300 hover:text-teal-200">
            Crea account
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
