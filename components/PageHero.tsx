'use client';

import { useEffect, useRef } from 'react';
import { Container, Eyebrow } from './Primitives';
import Reveal from './Reveal';

export default function PageHero({
  image,
  video,
  eyebrow,
  title,
  sub,
  align = 'left',
}: {
  image: string;
  video?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  align?: 'left' | 'center';
}) {
  const hasVideo = !!video && !video.startsWith('__');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    v.addEventListener('canplay', tryPlay, { once: true });
    v.addEventListener('loadeddata', tryPlay, { once: true });
    return () => {
      v.removeEventListener('canplay', tryPlay);
      v.removeEventListener('loadeddata', tryPlay);
    };
  }, []);

  return (
    <section className="relative isolate flex min-h-[64vh] items-end overflow-hidden pb-16 pt-32 sm:min-h-[72vh] sm:pb-24">
      {/* Background: drone-POV video with the photo as poster/fallback */}
      {hasVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={image}
          aria-hidden
        >
          <source src={video} type="video/mp4" />
        </video>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      )}
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
