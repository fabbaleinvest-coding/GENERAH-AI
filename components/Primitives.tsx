'use client';

export function Container({
  children,
  className = '',
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto px-5 sm:px-8 ${wide ? 'max-w-wide' : 'max-w-content'} ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.28em] text-teal-300 ${className}`}
    >
      <span className="h-px w-6 bg-teal-400/60" aria-hidden />
      {children}
    </span>
  );
}

/* Lazy image served from CDN. Plain <img> keeps deploys robust for external hosts. */
export function Img({
  src,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </span>
  );
}
