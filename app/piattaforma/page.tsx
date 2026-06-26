'use client';

import { useLang, pick } from '@/lib/i18n';
import { common } from '@/lib/content';
import { platform } from '@/lib/content/platform';
import { VIDEO } from '@/lib/images';
import PageHero from '@/components/PageHero';
import FeatureRow from '@/components/FeatureRow';
import OverlayBand from '@/components/OverlayBand';
import { Container } from '@/components/Primitives';
import CTA from '@/components/CTA';
import { home } from '@/lib/content/home';

export default function PlatformPage() {
  const { lang } = useLang();
  return (
    <>
      <PageHero
        image={platform.hero.image}
        video={VIDEO.platform}
        eyebrow={pick(lang, platform.hero.eyebrow)}
        title={pick(lang, platform.hero.title)}
        sub={pick(lang, platform.hero.sub)}
      />

      <Container wide className="space-y-24 py-24 sm:space-y-32 sm:py-32">
        {platform.blocks.map((b) => (
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
            <CTA href="/acquisizione" variant="ghost">
              {lang === 'it' ? 'Scopri l’acquisizione' : 'Explore acquisition'}
            </CTA>
          </>
        }
      />
    </>
  );
}
