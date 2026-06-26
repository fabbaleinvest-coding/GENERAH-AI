'use client';

import { useLang, pick } from '@/lib/i18n';
import { IMG } from '@/lib/images';
import { Container, Eyebrow } from '@/components/Primitives';
import Reveal from '@/components/Reveal';
import ContactForm from '@/components/ContactForm';

const copy = {
  eyebrow: { it: 'Contatti', en: 'Contact' },
  title: { it: 'Mettiamo GENERAH AI\nal lavoro per te.', en: 'Let’s put GENERAH AI\nto work for you.' },
  sub: {
    it: 'Raccontaci la tua attività e il tuo obiettivo. Prepareremo una demo su misura del tuo settore, con i tuoi servizi e il tuo tono di voce.',
    en: 'Tell us about your business and your goal. We’ll prepare a demo tailored to your industry, with your services and your tone of voice.',
  },
  promiseTitle: { it: 'Cosa succede dopo', en: 'What happens next' },
  promises: {
    it: [
      'Ti ricontattiamo entro 24 ore lavorative',
      'Analizziamo insieme il tuo flusso di acquisizione',
      'Vedi GENERAH AI in azione sul tuo caso reale',
    ],
    en: [
      'We get back to you within 24 working hours',
      'We review your acquisition flow together',
      'You see GENERAH AI in action on your real case',
    ],
  },
};

export default function ContactPage() {
  const { lang } = useLang();
  return (
    <>
      {/* Hero compatto con foto */}
      <section className="relative isolate overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG.contactHub}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/80 via-ink/88 to-ink" />
        <Container wide>
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>{pick(lang, copy.eyebrow)}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-5 whitespace-pre-line font-display text-4xl font-semibold leading-[1.02] tracking-tighter text-bone sm:text-6xl">
                {pick(lang, copy.title)}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">{pick(lang, copy.sub)}</p>
            </Reveal>
          </div>
        </Container>
      </section>

      <Container wide className="pb-28">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Reveal>
            <div className="rounded-3xl border border-teal-200/12 bg-ink-900/60 p-6 sm:p-9">
              <ContactForm />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="lg:pt-4">
              <h2 className="font-display text-xl font-semibold text-bone">
                {pick(lang, copy.promiseTitle)}
              </h2>
              <ol className="mt-6 space-y-6">
                {pick(lang, copy.promises).map((p, i) => (
                  <li key={p} className="flex gap-4">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-teal-400/40 font-mono text-sm font-semibold text-teal-300">
                      {i + 1}
                    </span>
                    <span className="pt-1.5 text-[0.98rem] leading-relaxed text-bone/85">{p}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-10 rounded-2xl border border-teal-200/10 bg-white/[0.02] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300/80">
                  GENERAH AI
                </p>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  {lang === 'it'
                    ? 'Acquisisci. Coltiva. Converti. Senza limiti. Senza sosta. Senza pari.'
                    : 'Acquire. Nurture. Convert. No limits. No pause. No equal.'}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </>
  );
}
