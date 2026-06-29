'use client';

import { ReactNode } from 'react';
import { Logo, Photo, cx } from '@/components/ui';
import { IMG } from '@/lib/images';

export function AuthScreen({
  image,
  imageAlt,
  caption,
  children,
}: {
  image?: string;
  imageAlt?: string;
  caption?: { title: string; body: string };
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* lato form */}
      <div className="flex flex-col bg-ink">
        <div className="px-6 pt-6 sm:px-10">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="px-6 pb-6 sm:px-10">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-mist/50">
            Ambiente demo · i dati restano sul tuo dispositivo
          </p>
        </div>
      </div>

      {/* lato immagine */}
      <div className="relative hidden lg:block">
        <Photo
          src={image ?? IMG.consoleHero}
          alt={imageAlt ?? 'GENERAH AI console'}
          overlay="bottom"
          rounded=""
          className="h-full"
        >
          {caption && (
            <div className="flex h-full items-end p-12">
              <div className="max-w-sm">
                <p className="font-display text-2xl font-semibold leading-snug text-bone">
                  {caption.title}
                </p>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">{caption.body}</p>
              </div>
            </div>
          )}
        </Photo>
      </div>
    </main>
  );
}
