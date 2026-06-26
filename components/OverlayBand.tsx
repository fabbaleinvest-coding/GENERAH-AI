'use client';

import { Container, Eyebrow } from './Primitives';
import Reveal from './Reveal';

export default function OverlayBand({
  image,
  eyebrow,
  title,
  body,
  closer,
  cta,
  align = 'left',
  height = 'tall',
  overlay = 'bottom',
}: {
  image: string;
  eyebrow?: string;
  title: string;
  body?: string | string[];
  closer?: string;
  cta?: React.ReactNode;
  align?: 'left' | 'center';
  height?: 'tall' | 'medium';
  overlay?: 'bottom' | 'left' | 'full';
}) {
  const paras = Array.isArray(body) ? body : body ? [body] : [];
  const minH = height === 'tall' ? 'min-h-[78vh]' : 'min-h-[56vh]';

  const grad =
    overlay === 'left'
      ? 'bg-gradient-to-r from-ink via-ink/82 to-ink/30'
      : overlay === 'full'
        ? 'bg-ink/80'
        : 'bg-gradient-to-t from-ink via-ink/82 to-ink/35';

  // Banda scura sfumata, concentrata dietro al testo e trasparente ai bordi:
  // garantisce leggibilità anche quando la foto di sfondo è molto luminosa,
  // senza appiattire l'immagine.
  const scrimPos =
    align === 'center' ? '50% 50%' : overlay === 'bottom' ? '30% 82%' : '26% 58%';
  const scrimStyle = {
    backgroundImage: `radial-gradient(ellipse 78% 64% at ${scrimPos}, rgba(11,22,34,0.88) 0%, rgba(11,22,34,0.5) 48%, rgba(11,22,34,0) 78%)`,
  };

  return (
    <section className={`relative isolate flex ${minH} items-end overflow-hidden ${align === 'center' ? 'items-center' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className={`absolute inset-0 -z-10 ${grad}`} />
      <div className="absolute inset-0 -z-10" style={scrimStyle} aria-hidden />


      <Container wide className="py-20 sm:py-28">
        <div className={`${align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}`}>
          {eyebrow && (
            <Reveal>
              <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>
            </Reveal>
          )}
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.04] tracking-tighter text-bone sm:text-5xl lg:text-6xl">
              {title}
            </h2>
          </Reveal>
          {paras.map((p, i) => (
            <Reveal key={i} delay={140 + i * 70}>
              <p className="mt-5 text-lg leading-relaxed text-bone/85 sm:text-xl">{p}</p>
            </Reveal>
          ))}
          {closer && (
            <Reveal delay={200 + paras.length * 70}>
              <p className="mt-8 font-display text-2xl font-medium leading-snug text-gradient-teal sm:text-3xl">
                {closer}
              </p>
            </Reveal>
          )}
          {cta && (
            <Reveal delay={260 + paras.length * 70}>
              <div className={`mt-9 flex flex-wrap gap-4 ${align === 'center' ? 'justify-center' : ''}`}>
                {cta}
              </div>
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}
