'use client';

import { useLang, pick } from '@/lib/i18n';
import { common } from '@/lib/content';
import { home } from '@/lib/content/home';
import HomeHero from '@/components/HomeHero';
import OverlayBand from '@/components/OverlayBand';
import { StatBand, FeatureGrid, LoopTimeline, MathCompare } from '@/components/HomeSections';
import CTA from '@/components/CTA';

export default function HomePage() {
  const { lang } = useLang();
  return (
    <>
      <HomeHero />

      <OverlayBand
        image={home.manifesto.image}
        eyebrow={pick(lang, home.manifesto.eyebrow)}
        title={pick(lang, home.manifesto.title)}
        body={pick(lang, home.manifesto.body)}
        closer={pick(lang, home.manifesto.closer)}
        overlay="left"
      />

      <StatBand />

      <FeatureGrid />

      <OverlayBand
        image={home.alwaysOn.image}
        eyebrow={pick(lang, home.alwaysOn.eyebrow)}
        title={pick(lang, home.alwaysOn.title)}
        body={pick(lang, home.alwaysOn.body)}
        overlay="bottom"
        align="center"
      />

      <LoopTimeline />

      <MathCompare />

      <OverlayBand
        image={home.finalCta.image}
        eyebrow={pick(lang, home.finalCta.eyebrow)}
        title={pick(lang, home.finalCta.title)}
        body={pick(lang, home.finalCta.sub)}
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
