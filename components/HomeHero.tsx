'use client';

import { useLang, pick } from '@/lib/i18n';
import { common } from '@/lib/content';
import { home } from '@/lib/content/home';
import { VIDEO } from '@/lib/images';
import { Container, Eyebrow } from './Primitives';
import CTA from './CTA';

export default function HomeHero() {
  const { lang } = useLang();
  const hasVideo = VIDEO.heroHome && !VIDEO.heroHome.startsWith('__');
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* Background: cinematic drone-POV video with the hero photo as poster/fallback */}
      {hasVideo ? (
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          poster={home.hero.image}
          aria-hidden
        >
          <source src={VIDEO.heroHome} type="video/mp4" />
        </video>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={home.hero.image}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
      )}
      {/* Gradients for legibility */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/65 to-ink/40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/45 to-transparent" />
      {/* Ambient teal glow */}
      <div
        className="absolute -left-40 top-1/3 -z-10 h-[40rem] w-[40rem] rounded-full bg-teal-500/15 blur-[140px]"
        aria-hidden
      />

      <Container wide className="w-full pt-24">
        <div className="max-w-3xl">
          <div className="animate-fade-in">
            <Eyebrow>{pick(lang, home.hero.eyebrow)}</Eyebrow>
          </div>
          <h1
            className="mt-6 whitespace-pre-line font-display text-5xl font-semibold leading-[0.98] tracking-tighter text-bone opacity-0 [animation-delay:120ms] [animation-fill-mode:forwards] sm:text-7xl lg:text-[5.4rem] animate-fade-up"
          >
            {pick(lang, home.hero.title)}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-mist opacity-0 [animation-delay:280ms] [animation-fill-mode:forwards] sm:text-xl animate-fade-up">
            {pick(lang, home.hero.sub)}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 opacity-0 [animation-delay:420ms] [animation-fill-mode:forwards] animate-fade-up">
            <CTA href="/contatti" variant="primary">
              {pick(lang, common.ctaPrimary)}
            </CTA>
            <CTA href="/piattaforma" variant="ghost">
              {pick(lang, common.ctaSecondary)}
            </CTA>
          </div>
        </div>
      </Container>

      {/* Scroll hint */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 opacity-0 [animation-delay:900ms] [animation-fill-mode:forwards] animate-fade-in" aria-hidden>
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-bone/30 p-1">
          <span className="h-2 w-px animate-bounce bg-bone/60" />
        </div>
      </div>
    </section>
  );
}
