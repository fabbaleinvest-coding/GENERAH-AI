'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLang, pick } from '@/lib/i18n';
import { nav, common } from '@/lib/content';
import { Logo } from './Brand';
import { IconArrow } from './Icons';

function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center rounded-full border border-teal-200/20 p-0.5 text-xs font-semibold ${compact ? '' : ''}`}
      role="group"
      aria-label="Language"
    >
      {(['it', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 uppercase tracking-wider transition-colors ${
            lang === l ? 'bg-teal-500 text-ink' : 'text-mist hover:text-bone'
          }`}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Nav() {
  const { lang } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-smooth ${
          scrolled
            ? 'border-b border-teal-200/10 bg-ink/80 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-wide items-center justify-between px-5 sm:px-8">
          <Logo size={36} />

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-bone' : 'text-mist hover:text-bone'
                  }`}
                >
                  {pick(lang, item.label)}
                  {active && (
                    <span className="absolute inset-x-4 -bottom-px h-px bg-teal-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <LangToggle />
            <Link
              href="/contatti"
              className="group inline-flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-ink transition-all duration-300 ease-smooth hover:bg-teal-400"
            >
              {pick(lang, common.ctaPrimary)}
              <IconArrow className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile trigger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-teal-200/20 lg:hidden"
            aria-label={open ? pick(lang, common.close) : pick(lang, common.menu)}
            aria-expanded={open}
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-bone transition-all duration-300 ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-px w-5 bg-bone transition-all duration-300 ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 h-px w-5 bg-bone transition-all duration-300 ${
                  open ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 flex flex-col bg-ink/98 backdrop-blur-xl transition-all duration-500 ease-smooth lg:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex flex-1 flex-col justify-center px-7">
          <nav className="flex flex-col gap-1">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-teal-200/10 py-4 font-display text-3xl text-bone"
                style={{
                  transitionDelay: `${i * 40}ms`,
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity .5s ease, transform .5s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {pick(lang, item.label)}
              </Link>
            ))}
          </nav>
          <div className="mt-10 flex items-center justify-between">
            <Link
              href="/contatti"
              className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-semibold text-ink"
            >
              {pick(lang, common.ctaPrimary)}
              <IconArrow className="w-4 h-4" />
            </Link>
            <LangToggle />
          </div>
        </div>
      </div>
    </>
  );
}
