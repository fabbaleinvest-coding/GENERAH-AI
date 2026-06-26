'use client';

import { useEffect, useRef } from 'react';

/**
 * Video di sfondo cinematografico con la foto come poster/fallback.
 * Avvia la riproduzione in modo affidabile (muto forzato via property + play()
 * esplicito), così non resta bloccato sul poster su mobile.
 */
export default function BackgroundVideo({
  src,
  poster,
  className = 'absolute inset-0 -z-10 h-full w-full object-cover',
}: {
  src?: string;
  poster: string;
  className?: string;
}) {
  const hasVideo = !!src && !src.startsWith('__');
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
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

  if (!hasVideo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" aria-hidden className={className} />;
  }

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
