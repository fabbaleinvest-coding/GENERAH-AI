type IconProps = { className?: string };

const base = 'stroke-current';

export function IconTarget({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconDatabase({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
      <path d="M4.5 5.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
      <path d="M4.5 11.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
    </svg>
  );
}

export function IconFlow({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 6h6a4 4 0 0 1 4 4v.4M7 18h6a4 4 0 0 0 4-4v-.4" />
    </svg>
  );
}

export function IconWave({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h1.5M19.5 12H21" />
      <path d="M7 8v8M10 5v14M13.5 7.5v9M17 9.5v5" />
    </svg>
  );
}

export function IconVideo({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="12" height="12" rx="2.4" />
      <path d="M15 10.2l5-2.6v8.8l-5-2.6" />
      <circle cx="9" cy="12" r="2.2" />
    </svg>
  );
}

export function IconBrain({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.5a3 3 0 0 0-5.7-1.3A2.8 2.8 0 0 0 4 9a2.8 2.8 0 0 0 .7 4.6A3 3 0 0 0 6.5 19a3 3 0 0 0 5.5-1.7z" />
      <path d="M12 5.5a3 3 0 0 1 5.7-1.3A2.8 2.8 0 0 1 20 9a2.8 2.8 0 0 1-.7 4.6A3 3 0 0 1 17.5 19a3 3 0 0 1-5.5-1.7z" />
      <path d="M12 5.5v12" />
    </svg>
  );
}

export function IconInfinity({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12c0-2 1.4-3.4 3-3.4 1.2 0 2.2.8 3 2 .8 1.2 1.8 2.8 3.5 2.8 1.6 0 2.5-1.4 2.5-3.4s-.9-3.4-2.5-3.4c-1.7 0-2.7 1.6-3.5 2.8-.8 1.2-1.8 2-3 2-1.6 0-3-1.4-3-3.4" transform="translate(0 1.2)" />
    </svg>
  );
}

export function IconSpark({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </svg>
  );
}

export function IconArrow({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconCheck({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

export const iconByKey: Record<string, (p: IconProps) => JSX.Element> = {
  target: IconTarget,
  database: IconDatabase,
  flow: IconFlow,
  wave: IconWave,
  video: IconVideo,
  brain: IconBrain,
  infinity: IconInfinity,
  spark: IconSpark,
};
