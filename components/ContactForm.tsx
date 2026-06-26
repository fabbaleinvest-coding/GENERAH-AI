'use client';

import { useState } from 'react';
import { useLang, pick } from '@/lib/i18n';
import { IconArrow, IconCheck } from './Icons';

const T = {
  name: { it: 'Nome e cognome', en: 'Full name' },
  company: { it: 'Azienda', en: 'Company' },
  email: { it: 'Email', en: 'Email' },
  phone: { it: 'Telefono', en: 'Phone' },
  sector: { it: 'Settore', en: 'Industry' },
  message: { it: 'Raccontaci il tuo obiettivo', en: 'Tell us your goal' },
  submit: { it: 'Invia richiesta', en: 'Send request' },
  sending: { it: 'Invio in corso…', en: 'Sending…' },
  required: { it: 'Campo obbligatorio', en: 'Required field' },
  okTitle: { it: 'Richiesta ricevuta.', en: 'Request received.' },
  okBody: {
    it: 'Grazie. Ti ricontatteremo a brevissimo per organizzare la tua demo su misura.',
    en: 'Thank you. We’ll get back to you shortly to set up your tailored demo.',
  },
  errBody: {
    it: 'Qualcosa è andato storto. Riprova o scrivici direttamente.',
    en: 'Something went wrong. Try again or write to us directly.',
  },
  another: { it: 'Invia un’altra richiesta', en: 'Send another request' },
};

const sectors = {
  it: ['Azienda B2B', 'Attività B2C', 'Clinica medica', 'Studio odontoiatrico', 'Centro veterinario', 'Altro'],
  en: ['B2B company', 'B2C business', 'Medical clinic', 'Dental practice', 'Veterinary center', 'Other'],
};

type Status = 'idle' | 'sending' | 'ok' | 'error';

export default function ContactForm() {
  const { lang } = useLang();
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    const required = ['name', 'email', 'message'];
    const newErr: Record<string, boolean> = {};
    required.forEach((k) => {
      if (!String(data[k] || '').trim()) newErr[k] = true;
    });
    setErrors(newErr);
    if (Object.keys(newErr).length) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang }),
      });
      if (!res.ok) throw new Error('bad response');
      setStatus('ok');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-3xl border border-teal-400/40 bg-teal-500/[0.08] p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-ink">
          <IconCheck className="h-6 w-6" />
        </span>
        <h3 className="mt-5 font-display text-2xl font-semibold text-bone">{pick(lang, T.okTitle)}</h3>
        <p className="mt-3 text-mist">{pick(lang, T.okBody)}</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 text-sm font-semibold text-teal-300 hover:text-teal-200"
        >
          {pick(lang, T.another)}
        </button>
      </div>
    );
  }

  const fieldBase =
    'w-full rounded-xl border bg-ink-900/70 px-4 py-3 text-bone placeholder-mist/50 outline-none transition-colors focus:border-teal-400 focus:bg-ink-900';
  const errRing = (k: string) => (errors[k] ? 'border-red-400/70' : 'border-teal-200/15');

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">
            {pick(lang, T.name)} *
          </label>
          <input name="name" className={`${fieldBase} ${errRing('name')}`} autoComplete="name" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">
            {pick(lang, T.company)}
          </label>
          <input name="company" className={`${fieldBase} ${errRing('company')}`} autoComplete="organization" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">
            {pick(lang, T.email)} *
          </label>
          <input name="email" type="email" className={`${fieldBase} ${errRing('email')}`} autoComplete="email" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">
            {pick(lang, T.phone)}
          </label>
          <input name="phone" type="tel" className={`${fieldBase} ${errRing('phone')}`} autoComplete="tel" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">
          {pick(lang, T.sector)}
        </label>
        <select name="sector" className={`${fieldBase} border-teal-200/15`} defaultValue="">
          <option value="" disabled className="bg-ink-900">
            —
          </option>
          {sectors[lang].map((s) => (
            <option key={s} value={s} className="bg-ink-900">
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-mist">
          {pick(lang, T.message)} *
        </label>
        <textarea
          name="message"
          rows={4}
          className={`${fieldBase} ${errRing('message')} resize-none`}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-300">{pick(lang, T.errBody)}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3.5 font-semibold text-ink transition-all duration-300 hover:bg-teal-400 disabled:opacity-60 sm:w-auto"
      >
        {status === 'sending' ? pick(lang, T.sending) : pick(lang, T.submit)}
        {status !== 'sending' && (
          <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        )}
      </button>
    </form>
  );
}
