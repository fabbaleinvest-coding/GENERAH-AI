'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  PLAN_LIST,
  PlanId,
  METERS,
  evaluateDiscount,
  priceWithDiscount,
  euro,
  num,
} from '@/lib/plans';
import { Guard } from '@/components/Guard';
import { AppShell } from '@/components/AppShell';
import { Container, Button, Badge, Eyebrow, cx } from '@/components/ui';

const FEATURE_ROWS: { key: 'phone' | 'video' | 'whatsapp' | 'ads' }[] = [
  { key: 'phone' },
  { key: 'video' },
  { key: 'whatsapp' },
  { key: 'ads' },
];

function PlanCard({
  planId,
  code,
  onActivate,
  busy,
}: {
  planId: PlanId;
  code: string;
  onActivate: (id: PlanId) => void;
  busy: PlanId | null;
}) {
  const priced = useMemo(() => priceWithDiscount(planId, code || null), [planId, code]);
  const { base, featurePlan, canone, setup, upgradeApplied, discount } = priced;
  const discounted = canone !== base.canone || setup !== base.setup;
  const highlight = base.highlight;

  return (
    <div
      className={cx(
        'relative flex flex-col rounded-3xl border p-6 transition',
        highlight ? 'border-teal-300/45 bg-teal-400/[0.04]' : 'border-white/10 bg-ink-900/40'
      )}
    >
      {highlight && (
        <div className="absolute -top-3 left-6">
          <Badge tone="teal">Più scelto</Badge>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-semibold text-bone">{base.name}</h3>
        {upgradeApplied && <Badge tone="amber">Feature {featurePlan.name}</Badge>}
      </div>
      <p className="mt-2 min-h-[2.5rem] text-[0.86rem] leading-snug text-mist">{base.tagline}</p>

      {/* prezzo */}
      <div className="mt-5 border-t border-white/8 pt-5">
        <div className="flex items-end gap-2">
          {discounted && <span className="font-display text-lg text-mist/50 line-through">{euro(base.canone)}</span>}
          <span className="font-display text-4xl font-semibold tracking-tight text-bone">{euro(canone)}</span>
          <span className="mb-1 text-[0.82rem] text-mist">/mese</span>
        </div>
        <p className="mt-1.5 text-[0.82rem] text-mist">
          Setup una tantum:{' '}
          {setup !== base.setup ? (
            <>
              <span className="text-mist/50 line-through">{euro(base.setup)}</span>{' '}
              <span className="font-medium text-teal-200">{euro(setup)}</span>
            </>
          ) : (
            <span className="font-medium text-bone/90">{euro(setup)}</span>
          )}
        </p>
      </div>

      {/* feature */}
      <ul className="mt-5 space-y-2.5">
        {FEATURE_ROWS.map(({ key }) => {
          const meta = METERS[key];
          const val = featurePlan[key];
          return (
            <li key={key} className="flex items-center justify-between gap-2 text-[0.86rem]">
              <span className="flex items-center gap-2 text-mist">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-teal-300" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {meta.short}
              </span>
              <span className="font-mono text-[0.8rem] text-bone">
                {val === 0 ? '—' : `${num(val)} ${meta.unit}`}
              </span>
            </li>
          );
        })}
      </ul>

      {upgradeApplied && (
        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/5 px-3 py-2 text-[0.76rem] leading-snug text-amber-soft">
          Con il tuo codice paghi {base.name} ma ricevi tutte le capacità del piano {featurePlan.name}.
        </p>
      )}

      <div className="mt-6 pt-2">
        <Button
          size="md"
          variant={highlight ? 'primary' : 'outline'}
          className="w-full"
          onClick={() => onActivate(planId)}
          disabled={busy !== null}
        >
          {busy === planId ? 'Attivazione…' : 'Attiva in demo'}
        </Button>
        <p className="mt-2 text-center font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mist/50">
          Gratis · pagamento PayPal in arrivo
        </p>
      </div>
    </div>
  );
}

function PianiInner() {
  const { activatePlan } = useStore();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<PlanId | null>(null);

  const info = useMemo(() => (code.trim() ? evaluateDiscount(code) : null), [code]);

  function activate(id: PlanId) {
    setBusy(id);
    setTimeout(() => {
      activatePlan(id, code.trim() || null, 'demo');
      router.push('/onboarding');
    }, 600);
  }

  return (
    <Container wide className="py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <Eyebrow>Scegli il tuo piano</Eyebrow>
        </div>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-bone sm:text-5xl">
          Quanta potenza vuoi mettere al lavoro?
        </h1>
        <p className="mt-4 text-[1.02rem] leading-relaxed text-mist">
          Attiva subito in modalità demo, senza pagare. Hai un codice promozionale? Inseriscilo per
          vedere il prezzo aggiornarsi in tempo reale su ogni piano.
        </p>
      </div>

      {/* codice sconto */}
      <div className="mx-auto mt-9 max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
          <label className="mb-2 block font-mono text-[0.66rem] uppercase tracking-[0.16em] text-teal-300/80">
            Codice promozionale
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Es. EXTRASPECIAL10"
              className="w-full rounded-xl border border-white/10 bg-ink/70 px-4 py-3 font-mono text-[0.9rem] text-bone placeholder:text-mist/40 focus:border-teal-300/60 focus:outline-none"
            />
            {code && (
              <button
                onClick={() => setCode('')}
                className="shrink-0 rounded-xl border border-white/10 px-4 text-[0.85rem] text-mist transition hover:border-coral/40 hover:text-coral"
              >
                Pulisci
              </button>
            )}
          </div>
          {info && (
            <div
              className={cx(
                'mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[0.84rem]',
                info.ok ? 'border border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border border-coral/40 bg-coral/10 text-coral'
              )}
            >
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2">
                {info.ok ? <path d="M5 13l4 4L19 7" /> : <path d="M12 8v5M12 16h.01M12 3l9 16H3z" />}
              </svg>
              <span>
                {info.ok ? (
                  <>
                    <span className="font-semibold">Codice valido.</span> {info.message}
                  </>
                ) : (
                  info.message
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* griglia piani */}
      <div className="mt-10 grid gap-5 lg:grid-cols-4">
        {PLAN_LIST.map((p) => (
          <PlanCard key={p.id} planId={p.id} code={code} onActivate={activate} busy={busy} />
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[0.82rem] text-mist/70">
        Tutti i prezzi sono IVA esclusa. In modalità demo i contatori vengono impostati come da piano
        scelto e potrai testare l&apos;intero flusso senza alcun addebito.
      </p>
    </Container>
  );
}

export default function PianiPage() {
  return (
    <Guard need="auth">
      <AppShell>
        <PianiInner />
      </AppShell>
    </Guard>
  );
}
