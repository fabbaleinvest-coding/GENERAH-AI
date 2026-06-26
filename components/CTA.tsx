'use client';

import Link from 'next/link';
import { IconArrow } from './Icons';

type Variant = 'primary' | 'ghost' | 'light';

const styles: Record<Variant, string> = {
  primary:
    'bg-teal-500 text-ink hover:bg-teal-400 shadow-[0_8px_30px_-8px_rgba(42,133,118,0.6)]',
  ghost:
    'bg-transparent text-bone ring-1 ring-inset ring-teal-200/25 hover:ring-teal-200/60 hover:bg-white/[0.03]',
  light: 'bg-bone text-ink hover:bg-white',
};

export default function CTA({
  href,
  children,
  variant = 'primary',
  arrow = true,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[0.95rem] font-semibold tracking-tight transition-all duration-300 ease-smooth ${styles[variant]} ${className}`}
    >
      <span>{children}</span>
      {arrow && (
        <IconArrow className="w-4 h-4 transition-transform duration-300 ease-smooth group-hover:translate-x-1" />
      )}
    </Link>
  );
}
