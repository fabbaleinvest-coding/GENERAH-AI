'use client';

import { Eyebrow } from './Primitives';
import Reveal from './Reveal';
import { IconCheck } from './Icons';

export default function FeatureRow({
  id,
  num,
  tag,
  title,
  lead,
  points,
  image,
  align = 'right',
}: {
  id?: string;
  num: string;
  tag: string;
  title: string;
  lead: string;
  points: string[];
  image: string;
  align?: 'left' | 'right';
}) {
  const imageFirst = align === 'left';
  return (
    <div
      id={id}
      className="grid items-center gap-10 scroll-mt-24 lg:grid-cols-2 lg:gap-16"
    >
      {/* Image side */}
      <Reveal className={imageFirst ? 'lg:order-1' : 'lg:order-2'}>
        <div className="group relative overflow-hidden rounded-3xl">
          <span
            className="pointer-events-none absolute left-5 top-5 z-10 font-mono text-sm font-medium text-bone/80"
            aria-hidden
          >
            {num}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover transition-transform duration-[1.2s] ease-smooth group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-ink/40 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-bone/10" />
        </div>
      </Reveal>

      {/* Text side */}
      <Reveal delay={120} className={imageFirst ? 'lg:order-2' : 'lg:order-1'}>
        <Eyebrow>{tag}</Eyebrow>
        <h3 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
          {title}
        </h3>
        <p className="mt-5 text-lg leading-relaxed text-mist">{lead}</p>
        <ul className="mt-7 space-y-3.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              <span className="text-[0.98rem] leading-relaxed text-bone/85">{p}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
