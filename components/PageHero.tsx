'use client';

import { Container, Eyebrow } from './Primitives';
import Reveal from './Reveal';

export default function PageHero({
  image,
  eyebrow,
  title,
  sub,
  align = 'left',
}: {
  image: string;
  eyebrow: string;
  title: string;
  sub?: string;
  align?: 'left' | 'center';
}) {
  return (
    <section className="relative isolate flex min-h-[64vh] items-end overflow-hidden pb-16 pt-32 sm:min-h-[72vh] sm:pb-24">
      {/* Background photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      {/* Tonal overlays for legible text */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/76 to-ink/30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/88 via-ink/45 to-transparent" />
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 60% at ${align === 'center' ? '50%' : '28%'} 88%, rgba(11,22,34,0.85) 0%, rgba(11,22,34,0.45) 50%, rgba(11,22,34,0) 80%)`,
        }}
      />

      <Container wide>
        <div className={`max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 whitespace-pre-line font-display text-4xl font-semibold leading-[1.02] tracking-tighter text-bone sm:text-6xl lg:text-7xl">
              {title}
            </h1>
          </Reveal>
          {sub && (
            <Reveal delay={160}>
              <p className={`mt-6 text-lg leading-relaxed text-mist sm:text-xl ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
                {sub}
              </p>
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}
