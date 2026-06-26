'use client';

import { useLang, pick } from '@/lib/i18n';
import { home } from '@/lib/content/home';
import { Container, Eyebrow } from './Primitives';
import Reveal from './Reveal';
import { iconByKey, IconCheck } from './Icons';

export function StatBand() {
  const { lang } = useLang();
  return (
    <section className="border-y border-teal-200/10 bg-ink-900/60">
      <Container wide className="py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {home.stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 70} className="text-center sm:text-left">
              <div className="font-display text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm leading-snug text-mist">{pick(lang, s.label)}</div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function FeatureGrid() {
  const { lang } = useLang();
  return (
    <section className="relative py-24 sm:py-32">
      <Container wide>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>{pick(lang, home.featuresIntro.eyebrow)}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tighter text-bone sm:text-5xl">
              {pick(lang, home.featuresIntro.title)}
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 text-lg leading-relaxed text-mist">
              {pick(lang, home.featuresIntro.sub)}
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-teal-200/10 bg-teal-200/10 sm:grid-cols-2 lg:grid-cols-3">
          {home.features.map((f, i) => {
            const Icon = iconByKey[f.icon] ?? iconByKey.spark;
            return (
              <Reveal
                key={f.id}
                delay={(i % 3) * 80}
                className="group relative bg-ink-900 p-8 transition-colors duration-500 hover:bg-ink-800 sm:p-9"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/12 text-teal-300 transition-colors duration-500 group-hover:bg-teal-500/20">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-teal-300/80">
                  {pick(lang, f.tag)}
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-bone">
                  {pick(lang, f.title)}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">
                  {pick(lang, f.text)}
                </p>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function LoopTimeline() {
  const { lang } = useLang();
  const L = home.loop;
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* faint background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={L.image}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.16]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-ink/85 to-ink" />

      <Container wide>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>{pick(lang, L.eyebrow)}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tighter text-bone sm:text-5xl">
              {pick(lang, L.title)}
            </h2>
          </Reveal>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-teal-200/10 bg-teal-200/10 md:grid-cols-5">
          {L.steps.map((s, i) => (
            <Reveal
              as="li"
              key={s.time}
              delay={i * 90}
              className="relative bg-ink-900/90 p-7"
            >
              <div className="font-mono text-sm font-semibold text-teal-300">{s.time}</div>
              <div className="mt-4 h-px w-full bg-gradient-to-r from-teal-400/60 to-transparent" />
              <h3 className="mt-4 font-display text-lg font-semibold text-bone">
                {pick(lang, s.title)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{pick(lang, s.text)}</p>
              <span className="absolute right-5 top-6 font-mono text-xs text-mist/40">
                0{i + 1}
              </span>
            </Reveal>
          ))}
        </ol>
        <Reveal delay={200}>
          <p className="mt-10 max-w-2xl font-display text-xl italic text-mist">
            {lang === 'it'
              ? 'Nessun essere umano della tua azienda ha dovuto muovere un dito.'
              : 'No human in your company had to lift a finger.'}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}

export function MathCompare() {
  const { lang } = useLang();
  const M = home.math;
  return (
    <section className="py-24 sm:py-32">
      <Container wide>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow className="justify-center">{pick(lang, M.eyebrow)}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.06] tracking-tighter text-bone sm:text-5xl">
              {pick(lang, M.title)}
            </h2>
          </Reveal>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {M.columns.map((col) => {
            const brand = col.tone === 'brand';
            return (
              <Reveal
                key={col.kind.it}
                delay={brand ? 120 : 0}
                className={`rounded-3xl border p-8 sm:p-10 ${
                  brand
                    ? 'border-teal-400/40 bg-gradient-to-b from-teal-500/10 to-transparent'
                    : 'border-teal-200/10 bg-ink-900/70'
                }`}
              >
                <h3
                  className={`font-display text-2xl font-semibold ${
                    brand ? 'text-bone' : 'text-mist'
                  }`}
                >
                  {pick(lang, col.kind)}
                </h3>
                <ul className="mt-6 space-y-4">
                  {pick(lang, col.points).map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${
                          brand ? 'bg-teal-500/20 text-teal-300' : 'bg-white/5 text-mist/60'
                        }`}
                      >
                        {brand ? (
                          <IconCheck className="h-3 w-3" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span className={`text-[0.97rem] leading-relaxed ${brand ? 'text-bone/90' : 'text-mist'}`}>
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={160}>
          <p className="mx-auto mt-12 max-w-2xl text-center font-display text-2xl font-medium leading-snug text-gradient-teal sm:text-3xl">
            {pick(lang, M.closer)}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
