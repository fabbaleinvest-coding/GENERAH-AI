'use client';

import { useLang, pick } from '@/lib/i18n';
import { common } from '@/lib/content';
import { acquisition } from '@/lib/content/acquisition';
import { VIDEO } from '@/lib/images';
import PageHero from '@/components/PageHero';
import FeatureRow from '@/components/FeatureRow';
import OverlayBand from '@/components/OverlayBand';
import { Container, Eyebrow } from '@/components/Primitives';
import Reveal from '@/components/Reveal';
import CTA from '@/components/CTA';

function ChannelStrip() {
  const { lang } = useLang();
  const items = [...acquisition.channels, ...acquisition.channels];
  return (
    <section className="overflow-hidden border-y border-teal-200/10 bg-ink-900/60 py-10">
      <div className="marquee gap-12">
        {items.map((c, i) => (
          <span key={i} className="inline-flex items-baseline gap-3 px-2">
            <span className="font-display text-2xl font-semibold text-bone sm:text-3xl">
              {c.name}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300/70">
              {pick(lang, c.role)}
            </span>
            <span className="ml-6 text-teal-400/40">/</span>
          </span>
        ))}
      </div>
    </section>
  );
}

export default function AcquisitionPage() {
  const { lang } = useLang();
  return (
    <>
      <PageHero
        image={acquisition.hero.image}
        video={VIDEO.acquisition}
        eyebrow={pick(lang, acquisition.hero.eyebrow)}
        title={pick(lang, acquisition.hero.title)}
        sub={pick(lang, acquisition.hero.sub)}
      />

      {/* Intro */}
      <Container wide className="py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <Reveal>
            <Eyebrow>{pick(lang, acquisition.intro.eyebrow)}</Eyebrow>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
              {pick(lang, acquisition.intro.title)}
            </h2>
          </Reveal>
          <Reveal delay={120} className="lg:pt-2">
            <p className="text-lg leading-relaxed text-mist">
              {pick(lang, acquisition.intro.body)}
            </p>
          </Reveal>
        </div>
      </Container>

      <ChannelStrip />

      <Container wide className="space-y-24 py-24 sm:space-y-32 sm:py-32">
        {acquisition.blocks.map((b) => (
          <FeatureRow
            key={b.id}
            id={b.id}
            num={b.num}
            tag={pick(lang, b.tag)}
            title={pick(lang, b.title)}
            lead={pick(lang, b.lead)}
            points={pick(lang, b.points)}
            image={b.image}
            align={b.align}
          />
        ))}
      </Container>

      <OverlayBand
        image={acquisition.hero.image}
        eyebrow={pick(lang, acquisition.closer.eyebrow)}
        title={pick(lang, acquisition.closer.title)}
        body={pick(lang, acquisition.closer.sub)}
        align="center"
        overlay="full"
        cta={
          <>
            <CTA href="/contatti" variant="primary">
              {pick(lang, common.ctaPrimary)}
            </CTA>
            <CTA href="/prezzi" variant="ghost">
              {pick(lang, common.ctaPricing)}
            </CTA>
          </>
        }
      />
    </>
  );
}
