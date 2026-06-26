'use client';

import Link from 'next/link';

export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[22%] bg-bone shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt="GENERAH AI"
        style={{ width: size * 0.82, height: size * 0.82 }}
        className="object-contain"
      />
    </span>
  );
}

export function Wordmark({
  className = '',
  withPayoff = false,
  tone = 'light',
}: {
  className?: string;
  withPayoff?: boolean;
  tone?: 'light' | 'dark';
}) {
  const main = tone === 'light' ? 'text-bone' : 'text-ink';
  return (
    <span className={`flex flex-col leading-none ${className}`}>
      <span className={`font-sans font-extrabold tracking-[0.04em] ${main}`}>
        GENERAH&nbsp;AI
      </span>
      {withPayoff && (
        <span className="mt-1 font-sans text-[0.62em] font-semibold uppercase tracking-[0.34em] text-teal-300">
          Sales never sleep
        </span>
      )}
    </span>
  );
}

export function Logo({
  size = 40,
  className = '',
  withPayoff = false,
  href = '/',
}: {
  size?: number;
  className?: string;
  withPayoff?: boolean;
  href?: string | null;
}) {
  const inner = (
    <span className={`group inline-flex items-center gap-3 ${className}`}>
      <LogoMark size={size} className="transition-transform duration-500 ease-smooth group-hover:rotate-[-6deg]" />
      <Wordmark withPayoff={withPayoff} className="text-[1.05rem]" />
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} aria-label="GENERAH AI — home" className="inline-flex">
      {inner}
    </Link>
  );
}
