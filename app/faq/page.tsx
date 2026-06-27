'use client';

import { useLang, pick } from '@/lib/i18n';
import { faqHero, faqSections, faqEnNote } from '@/lib/content/faq';
import { IMG } from '@/lib/images';
import PageHero from '@/components/PageHero';
import { Container, Eyebrow } from '@/components/Primitives';
import Reveal from '@/components/Reveal';
import CTA from '@/components/CTA';

export default function FaqPage() {
  const { lang } = useLang();

  return (
    <>
      <PageHero
        image={IMG.ragKnowledge}
        eyebrow={pick(lang, faqHero.eyebrow)}
        title={pick(lang, faqHero.title)}
        sub={pick(lang, faqHero.sub)}
      />

      <Container wide className="py-16 sm:py-20">
        {/* Indice sezioni */}
        <nav aria-label="FAQ" className="flex flex-wrap gap-2">
          {faqSections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-teal-200/15 bg-ink-900/60 px-4 py-2 text-sm text-mist transition-colors hover:border-teal-300/40 hover:text-bone"
            >
              <span className="font-mono text-xs text-teal-400/80">{String(i + 1).padStart(2, '0')}</span>{' '}
              {pick(lang, s.title)}
            </a>
          ))}
        </nav>

        {lang === 'en' && (
          <p className="mt-8 rounded-2xl border border-teal-200/12 bg-ink-900/50 px-5 py-3 text-sm text-mist">
            {faqEnNote}
          </p>
        )}

        {/* Sezioni */}
        <div className="mt-12 space-y-16 sm:mt-16 sm:space-y-20">
          {faqSections.map((s, si) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <Reveal>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm text-teal-400/80">{String(si + 1).padStart(2, '0')}</span>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-bone sm:text-3xl">
                    {pick(lang, s.title)}
                  </h2>
                </div>
              </Reveal>

              <div className="mt-6 space-y-3">
                {s.items.map((it, ii) => (
                  <Reveal key={ii} delay={Math.min(ii * 40, 200)}>
                    <details className="group rounded-2xl border border-teal-200/12 bg-ink-900/60 p-5 [&_summary]:cursor-pointer">
                      <summary className="flex items-start justify-between gap-4 font-display text-base font-medium text-bone marker:content-[''] sm:text-lg">
                        <span>{it.q}</span>
                        <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-teal-200/25 text-teal-300 transition-transform duration-300 group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">{it.a}</p>
                    </details>
                  </Reveal>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>

      {/* CTA finale */}
      <section className="border-t border-teal-200/10 py-20 sm:py-24">
        <Container className="max-w-2xl text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              {lang === 'it' ? 'Non hai trovato la tua risposta?' : 'Didn’t find your answer?'}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-mist">
              {lang === 'it'
                ? 'Raccontaci la tua attività: ti rispondiamo e ti mostriamo GENERAH AI sul tuo caso reale.'
                : 'Tell us about your business: we’ll answer and show you GENERAH AI on your real case.'}
            </p>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-8 flex justify-center">
              <CTA href="/contatti">{lang === 'it' ? 'Richiedi una demo' : 'Request a demo'}</CTA>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
