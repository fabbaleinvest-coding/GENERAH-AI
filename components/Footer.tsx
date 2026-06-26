'use client';

import Link from 'next/link';
import { useLang, pick } from '@/lib/i18n';
import { footer, common } from '@/lib/content';
import { Logo } from './Brand';

export default function Footer() {
  const { lang } = useLang();
  return (
    <footer className="relative border-t border-teal-200/10 bg-ink-900">
      <div className="mx-auto max-w-wide px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo size={44} withPayoff />
            <p className="mt-6 max-w-xs font-display text-lg leading-snug text-mist">
              {pick(lang, footer.tagline)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footer.columns.map((col) => (
              <div key={col.title.it}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
                  {pick(lang, col.title)}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href + link.label.it}>
                      <Link
                        href={link.href}
                        className="text-sm text-mist transition-colors hover:text-bone"
                      >
                        {pick(lang, link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-teal-200/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-mist/70">
            {pick(lang, footer.legal)}
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300/80">
            {common.brand} · {pick(lang, common.payoff)}
          </p>
        </div>
      </div>
    </footer>
  );
}
