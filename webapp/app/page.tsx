'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { IMG } from '@/lib/images';
import { Logo, Button, Container, Photo, Eyebrow, Badge } from '@/components/ui';

const PILLARS = [
  {
    img: IMG.ragKnowledge,
    title: 'Carica il tuo mondo',
    body: 'Tutto il materiale del tuo business diventa la memoria dell’AI: listini, servizi, tono di voce, obiezioni.',
  },
  {
    img: IMG.mediaBuying,
    title: 'Campagne in autonomia',
    body: 'L’intelligenza crea la creatività video, il copy e il pubblico, lancia su Meta e ottimizza da sola.',
  },
  {
    img: IMG.videoConsult,
    title: 'Voce e volto, sempre attivi',
    body: 'Agente vocale e video-consulto rispondono, qualificano e fissano appuntamenti a ogni ora.',
  },
];

export default function ConsoleEntry() {
  const { ready, user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace('/dashboard');
  }, [ready, user, router]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* top bar */}
      <header className="absolute inset-x-0 top-0 z-30">
        <Container wide className="flex items-center justify-between py-5">
          <Logo />
          <div className="flex items-center gap-2">
            <Button href="/accedi" variant="ghost" size="sm">
              Accedi
            </Button>
            <Button href="/registrati" size="sm">
              Crea account
            </Button>
          </div>
        </Container>
      </header>

      {/* HERO */}
      <section className="relative">
        <Photo
          src={IMG.authHero}
          alt="La console di GENERAH AI al lavoro"
          overlay="left"
          rounded=""
          priority
          className="min-h-[92vh]"
        >
          <Container wide className="flex min-h-[92vh] items-center">
            <div className="max-w-2xl py-28">
              <div className="animate-fade-up">
                <Eyebrow>Console operativa · accesso riservato</Eyebrow>
              </div>
              <h1
                className="mt-6 font-display text-[2.7rem] font-semibold leading-[1.04] tracking-tighter text-bone opacity-0 animate-fade-up sm:text-6xl"
                style={{ animationDelay: '90ms' }}
              >
                Il tuo reparto vendite
                <br />
                <span className="text-teal-300">si attiva qui.</span>
              </h1>
              <p
                className="mt-6 max-w-xl text-lg leading-relaxed text-mist opacity-0 animate-fade-up"
                style={{ animationDelay: '180ms' }}
              >
                Registrati, scegli il tuo piano e lascia che l’intelligenza di GENERAH AI
                acquisisca, coltivi e converta per te. Knowledge base, campagne ADS,
                video-consulti e CRM in un’unica console. Senza sosta.
              </p>
              <div
                className="mt-9 flex flex-wrap items-center gap-3 opacity-0 animate-fade-up"
                style={{ animationDelay: '260ms' }}
              >
                <Button href="/registrati" size="lg">
                  Inizia ora — prova in demo
                </Button>
                <Button href="/accedi" variant="outline" size="lg">
                  Ho già un account
                </Button>
              </div>
              <p
                className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-mist/60 opacity-0 animate-fade-up"
                style={{ animationDelay: '340ms' }}
              >
                Demo gratuita · nessun pagamento richiesto · attivazione immediata
              </p>
            </div>
          </Container>
        </Photo>
      </section>

      {/* PILLARS */}
      <section className="relative bg-ink py-24">
        <Container wide>
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
              Tre passi. Poi lavora da sola.
            </h2>
            <p className="max-w-sm text-mist">
              La console ti guida dall’onboarding al primo lead. Tu autorizzi, l’intelligenza esegue.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <article
                key={p.title}
                className="group overflow-hidden rounded-3xl border border-white/8 bg-ink-900/40"
              >
                <Photo src={p.img} alt={p.title} overlay="bottom" rounded="" className="aspect-[4/3]">
                  <div className="flex h-full items-end p-5">
                    <Badge tone="muted">0{i + 1}</Badge>
                  </div>
                </Photo>
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold text-bone">{p.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-mist">{p.body}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 overflow-hidden rounded-3xl border border-teal-300/15">
            <Photo src={IMG.alwaysOn} alt="Sempre attiva, 24 ore su 24" overlay="center" rounded="" className="min-h-[280px]">
              <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                <p className="font-display text-2xl font-semibold text-bone sm:text-3xl">
                  Mentre dormi, GENERAH AI chiude.
                </p>
                <p className="mt-3 max-w-md text-mist">
                  Attiva la tua console e metti al lavoro un’intelligenza che non si ferma mai.
                </p>
                <Button href="/registrati" size="lg" className="mt-7">
                  Crea il tuo account
                </Button>
              </div>
            </Photo>
          </div>
        </Container>
      </section>

      <footer className="border-t border-white/8 bg-ink py-8">
        <Container wide className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo size={28} />
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-mist/60">
            Ambiente demo · © {new Date().getFullYear()} GENERAH AI
          </p>
        </Container>
      </footer>
    </main>
  );
}
