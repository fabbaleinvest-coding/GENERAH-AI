'use client';

import Link from 'next/link';
import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode, forwardRef } from 'react';
import { LOGO_MARK } from '@/lib/logo';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ── Logo ──────────────────────────────────────────────────────────────────
export function Logo({
  size = 34,
  withText = true,
  href = '/',
  className,
}: {
  size?: number;
  withText?: boolean;
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK}
        alt="GENERAH AI"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain"
      />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.02rem] font-semibold tracking-tight text-bone">
            GENERAH AI
          </span>
          <span className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-teal-300/80">
            Sales never sleep
          </span>
        </span>
      )}
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} aria-label="GENERAH AI — home" className="shrink-0">
      {inner}
    </Link>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'amber';
type BtnSize = 'sm' | 'md' | 'lg';

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-all duration-300 ease-smooth disabled:opacity-40 disabled:pointer-events-none select-none';

const btnVariants: Record<BtnVariant, string> = {
  primary:
    'bg-teal-400 text-ink-900 hover:bg-teal-300 hover:shadow-[0_12px_36px_-10px_rgba(52,164,143,0.6)]',
  outline:
    'border border-teal-300/30 text-bone hover:border-teal-300/70 hover:bg-teal-400/10',
  ghost: 'text-mist hover:text-bone hover:bg-white/5',
  danger: 'border border-coral/40 text-coral hover:bg-coral/10',
  amber: 'bg-amber text-ink-900 hover:bg-amber-soft',
};

const btnSizes: Record<BtnSize, string> = {
  sm: 'px-3.5 py-2 text-[0.82rem]',
  md: 'px-5 py-2.5 text-[0.9rem]',
  lg: 'px-7 py-3.5 text-[0.95rem]',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  href,
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cx(btnBase, btnVariants[variant], btnSizes[size], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

// ── Container ────────────────────────────────────────────────────────────────
export function Container({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cx('mx-auto w-full px-5 sm:px-8', wide ? 'max-w-wide' : 'max-w-content', className)}>
      {children}
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }
>(function Field({ label, hint, className, ...rest }, ref) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.82rem] font-medium text-bone/80">{label}</span>
      <input
        ref={ref}
        className={cx(
          'w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-[0.95rem] text-bone placeholder:text-mist/40',
          'transition focus:border-teal-300/60 focus:bg-ink-900 focus:outline-none',
          className
        )}
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-mist/70">{hint}</span>}
    </label>
  );
});

export function SelectField({
  label,
  children,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.82rem] font-medium text-bone/80">{label}</span>
      <div className="relative">
        <select
          className={cx(
            'w-full appearance-none rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-[0.95rem] text-bone',
            'transition focus:border-teal-300/60 focus:bg-ink-900 focus:outline-none',
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}

// ── Photo con overlay testo ──────────────────────────────────────────────────
export function Photo({
  src,
  alt,
  className,
  overlay = 'left',
  children,
  rounded = 'rounded-3xl',
  ratio,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  overlay?: 'left' | 'bottom' | 'center' | 'none';
  children?: ReactNode;
  rounded?: string;
  ratio?: string; // es. 'aspect-[16/9]'
  priority?: boolean;
}) {
  const grad =
    overlay === 'left'
      ? 'bg-gradient-to-r from-ink via-ink/70 to-ink/10'
      : overlay === 'bottom'
        ? 'bg-gradient-to-t from-ink via-ink/55 to-transparent'
        : overlay === 'center'
          ? 'bg-ink/55'
          : '';
  return (
    <div className={cx('relative overflow-hidden', rounded, ratio, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {overlay !== 'none' && <div className={cx('absolute inset-0', grad)} />}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  tone = 'teal',
  className,
}: {
  children: ReactNode;
  tone?: 'teal' | 'amber' | 'coral' | 'muted';
  className?: string;
}) {
  const tones = {
    teal: 'border-teal-300/30 text-teal-200 bg-teal-400/10',
    amber: 'border-amber/40 text-amber-soft bg-amber/10',
    coral: 'border-coral/40 text-coral bg-coral/10',
    muted: 'border-white/10 text-mist bg-white/5',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.66rem] uppercase tracking-[0.16em]',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-teal-300/80">
      <span className="h-px w-6 bg-teal-300/50" />
      {children}
    </span>
  );
}

export function Spinner({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={cx('animate-spin', className)} style={style} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
