'use client';

import { useLang, pick } from '@/lib/i18n';
import { common } from '@/lib/content';
import { sectors } from '@/lib/content/sectors';
import PageHero from '@/components/PageHero';
import OverlayBand from '@/components/OverlayBand';
import { Container, Eyebrow } from '@/components/Primitives';
import Reveal from '@/components/Reveal';
import CTA from '@/components/CTA';
import { IconCheck } from '@/components/Icons';
import { home } from '@/lib/content/home';

export default function SectorsPage() {
  const { lang } = useLang();
  return (
    <>
      <PageHero
        image={sectors.hero.image}
        eyebrow={pick(lang, sectors.hero.eyebrow)}
        title={pick(lang, sectors.hero.title)}
        sub={pick(lang, sectors.hero.sub)}
      />

      <Container wide className="space-y-20 py-24 sm:space-y-28 sm:py-32">
        {sectors.list.map((s, idx) => {
          const imageFirst = idx % 2 === 1;
          return (
            <div
              key={s.id}
              id={s.id}
              className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <Reveal className={imageFirst ? 'lg:order-2' : 'lg:order-1'}>
                <Eyebrow>
                  {String(idx + 1).padStart(2, '0')} — {pick(lang, s.name)}
                </Eyebrow>
                <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
                  {pick(lang, s.headline)}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-mist">{pick(lang, s.text)}</p>
                <ul className="mt-7 space-y-3.5">
                  {pick(lang, s.bullets).map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[0.98rem] leading-relaxed text-bone/85">{b}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={120} className={imageFirst ? 'lg:order-1' : 'lg:order-2'}>
                <div className="group relative overflow-hidden rounded-3xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={pick(lang, s.name)}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-[1.2s] ease-smooth group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5">
                    <span className="font-display text-xl font-semibold text-bone drop-shadow">
                      {pick(lang, s.name)}
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-bone/10" />
                </div>
              </Reveal>
            </div>
          );
        })}
      </Container>

      <OverlayBand
        image={home.finalCta.image}
        eyebrow={lang === 'it' ? 'Il tuo settore, la tua intelligenza' : 'Your industry, your intelligence'}
        title={
          lang === 'it'
            ? 'Costruiamo GENERAH AI sul tuo mondo.'
            : 'We build GENERAH AI around your world.'
        }
        body={
          lang === 'it'
            ? 'Una demo su misura per il tuo settore, con i tuoi servizi e il tuo tono di voce.'
            : 'A demo tailored to your industry, with your services and your tone of voice.'
        }
        align="center"
        overlay="full"
        cta={
          <CTA href="/contatti" variant="primary">
            {pick(lang, common.ctaPrimary)}
          </CTA>
        }
      />
    </>
  );
}
