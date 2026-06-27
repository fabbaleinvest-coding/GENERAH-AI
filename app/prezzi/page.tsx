'use client';

import { useLang, pick } from '@/lib/i18n';
import { pricing } from '@/lib/content/pricing';
import { VIDEO } from '@/lib/images';
import PageHero from '@/components/PageHero';
import { Container, Eyebrow } from '@/components/Primitives';
import Reveal from '@/components/Reveal';
import { IconCheck, IconArrow } from '@/components/Icons';
import Link from 'next/link';

function fmtInt(n: number, lang: 'it' | 'en') {
  return new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-US').format(n);
}
function euro(n: number, lang: 'it' | 'en') {
  return new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function PlanCard({ plan, lang }: { plan: typeof pricing.plans[number]; lang: 'it' | 'en' }) {
  const L = pricing.labels;
  const popular = plan.popular;
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-500 ${
        popular
          ? 'border-teal-400/50 bg-gradient-to-b from-teal-500/[0.12] to-ink-900 shadow-[0_30px_80px_-40px_rgba(42,133,118,0.55)] lg:-mt-4 lg:mb-4'
          : 'border-teal-200/12 bg-ink-900/70 hover:border-teal-200/25'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-7 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink">
          {pick(lang, L.mostPopular)}
        </span>
      )}
      <h3 className="font-display text-2xl font-semibold text-bone">{plan.name}</h3>
      <p className="mt-2 min-h-[2.5rem] text-sm leading-snug text-mist">{pick(lang, plan.blurb)}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-semibold tracking-tight text-bone">
          {euro(plan.monthly, lang)}
        </span>
        <span className="text-sm text-mist">{pick(lang, L.perMonth)}</span>
      </div>
      <div className="mt-1.5 text-xs text-mist/70">
        {pick(lang, L.setup)}: <span className="text-mist">{euro(plan.setup, lang)}</span>
      </div>

      {/* Includes */}
      <dl className="mt-6 space-y-2 rounded-2xl bg-white/[0.03] p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-mist">{pick(lang, L.phone)}</dt>
          <dd className="font-mono font-medium text-bone">{fmtInt(plan.includes.phone, lang)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-mist">{pick(lang, L.video)}</dt>
          <dd className="font-mono font-medium text-bone">
            {plan.includes.video > 0 ? fmtInt(plan.includes.video, lang) : '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-mist">{pick(lang, L.marketing)}</dt>
          <dd className="font-mono font-medium text-bone">{fmtInt(plan.includes.marketing, lang)}</dd>
        </div>
      </dl>

      <ul className="mt-6 flex-1 space-y-3">
        {pick(lang, plan.features).map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
              <IconCheck className="h-3 w-3" />
            </span>
            <span className="text-[0.9rem] leading-relaxed text-bone/85">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/contatti"
        className={`group mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 ${
          popular
            ? 'bg-teal-500 text-ink hover:bg-teal-400'
            : 'bg-white/[0.06] text-bone ring-1 ring-inset ring-teal-200/20 hover:bg-white/[0.1]'
        }`}
      >
        {pick(lang, L.cta)}
        <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

export default function PricingPage() {
  const { lang } = useLang();
  return (
    <>
      <PageHero
        image={pricing.hero.image}
        video={VIDEO.pricing}
        eyebrow={pick(lang, pricing.hero.eyebrow)}
        title={pick(lang, pricing.hero.title)}
        sub={pick(lang, pricing.hero.sub)}
      />

      {/* Plans */}
      <Container wide className="py-20 sm:py-24">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {pricing.plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 70}>
              <PlanCard plan={p} lang={lang} />
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-mist/60">
          {lang === 'it'
            ? 'Prezzi IVA esclusa. Le conversazioni WhatsApp in risposta a chi ti scrive (entro 24h) sono illimitate e gratuite.'
            : 'Prices exclude VAT. WhatsApp conversations replying to people who message you (within 24h) are unlimited and free.'}
        </p>
      </Container>

      {/* Overage */}
      <section className="border-t border-teal-200/10 bg-ink-900/50 py-20 sm:py-28">
        <Container wide>
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>{pick(lang, pricing.overageIntro.eyebrow)}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
                {pick(lang, pricing.overageIntro.title)}
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 text-lg leading-relaxed text-mist">
                {pick(lang, pricing.overageIntro.sub)}
              </p>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricing.overage.map((t, ti) => (
              <Reveal key={t.title.it} delay={ti * 80}>
                <div className="flex h-full flex-col rounded-3xl border border-teal-200/12 bg-ink-900/70 p-6">
                  <h3 className="font-display text-lg font-semibold text-bone">
                    {pick(lang, t.title)}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-mist/80">{pick(lang, t.note)}</p>
                  <div className="mt-5 divide-y divide-teal-200/10">
                    {t.rows.map((r) => (
                      <div key={r.qty.it} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <div className="text-sm font-medium text-bone">{pick(lang, r.qty)}</div>
                          <div className="font-mono text-[0.7rem] text-mist/70">{pick(lang, r.unit)}</div>
                        </div>
                        <div className="font-mono text-sm font-semibold text-teal-300">
                          {pick(lang, r.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Savings vs employee */}
      <section className="border-t border-teal-200/10 bg-ink-900/50 py-20 sm:py-28">
        <Container wide>
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>{pick(lang, pricing.savings.eyebrow)}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
                {pick(lang, pricing.savings.title)}
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-5 text-lg leading-relaxed text-mist">
                {pick(lang, pricing.savings.sub)}
              </p>
            </Reveal>
          </div>

          {/* Key stats */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {pricing.savings.stats.map((s, i) => (
              <Reveal key={s.value} delay={i * 70}>
                <div className="h-full rounded-2xl border border-teal-200/12 bg-ink-900/70 p-6 text-center">
                  <div className="font-display text-4xl font-semibold tracking-tight text-teal-300">
                    {s.value}
                  </div>
                  <div className="mt-2 text-sm leading-snug text-mist">{pick(lang, s.label)}</div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Per-plan saving cards */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {pricing.savings.rows.map((r, i) => {
              const positive = r.vsOne >= 0;
              return (
                <Reveal key={r.plan} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-3xl border border-teal-200/12 bg-ink-900/70 p-6">
                    <h3 className="font-display text-xl font-semibold text-bone">{r.plan}</h3>

                    {/* Aumento di produttività — metrica separata */}
                    <div className="mt-4 flex items-baseline gap-2 rounded-2xl bg-white/[0.04] px-4 py-3">
                      <span className="font-display text-3xl font-semibold tracking-tight text-teal-300">
                        {r.productivity.toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        ×
                      </span>
                      <span className="text-xs leading-snug text-mist">
                        {pick(lang, pricing.savings.cols.productivity)}
                      </span>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-mist">{pick(lang, pricing.savings.cols.annual)}</dt>
                        <dd className="font-mono font-medium text-bone">{euro(r.annual, lang)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-mist">{pick(lang, pricing.savings.cols.vsOne)}</dt>
                        <dd className={`font-mono font-medium ${positive ? 'text-teal-300' : 'text-mist/70'}`}>
                          {positive ? '+' : ''}{euro(r.vsOne, lang)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-5 rounded-2xl bg-teal-500/[0.1] p-4 ring-1 ring-inset ring-teal-300/20">
                      <div className="text-xs leading-snug text-mist">
                        {pick(lang, pricing.savings.cols.vsProductivity)}
                      </div>
                      <div className="mt-1 font-display text-3xl font-semibold tracking-tight text-teal-200">
                        {euro(r.vsProductivity, lang)}
                        <span className="text-base font-normal text-mist">/{lang === 'it' ? 'anno' : 'yr'}</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <p className="mt-8 max-w-3xl text-xs leading-relaxed text-mist/60">
              {pick(lang, pricing.savings.note)}
            </p>
          </Reveal>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28">
        <Container className="max-w-3xl">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              {lang === 'it' ? 'Domande frequenti' : 'Frequently asked'}
            </h2>
          </Reveal>
          <div className="mt-10 space-y-4">
            {pricing.faq.map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <details className="group rounded-2xl border border-teal-200/12 bg-ink-900/60 p-5 [&_summary]:cursor-pointer">
                  <summary className="flex items-center justify-between gap-4 font-display text-lg font-medium text-bone marker:content-['']">
                    {pick(lang, f.q)}
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-teal-200/25 text-teal-300 transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">{pick(lang, f.a)}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
