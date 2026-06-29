'use client';

import { MeterKey, METERS, overageFor, euro, num } from '@/lib/plans';
import { useStore } from '@/lib/store';
import { Button, Badge, cx } from '@/components/ui';
import { meterState } from '@/components/Meters';

export function TopUpModal({ meter, onClose }: { meter: MeterKey | null; onClose: () => void }) {
  const { user, topUp } = useStore();
  if (!meter || !user) return null;

  const meta = METERS[meter];
  const packs = overageFor(meter);
  const m = user.meters[meter];
  const { remaining, pct, tone } = meterState(m.total, m.used);

  function buy(qty: number) {
    topUp(meter!, qty);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/8 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {tone === 'crit' && (
                <Badge tone="coral" className="mb-3">
                  Soglia 10% raggiunta
                </Badge>
              )}
              <h2 className="font-display text-2xl font-semibold tracking-tight text-bone">{meta.label}</h2>
              <p className="mt-1.5 text-[0.92rem] text-mist">{meta.desc}</p>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-mist transition hover:bg-white/5 hover:text-bone" aria-label="Chiudi">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-ink/60 px-4 py-3">
            <div className={cx('h-2.5 w-2.5 rounded-full', tone === 'crit' ? 'bg-coral' : tone === 'warn' ? 'bg-amber' : 'bg-teal-400')} />
            <p className="text-[0.88rem] text-mist">
              Ti restano{' '}
              <span className="font-semibold text-bone">
                {num(remaining)} {meta.unit}
              </span>{' '}
              {m.total > 0 && <span className="text-mist/70">({Math.round(pct * 100)}% del piano)</span>}. Aggiungi capacità senza cambiare piano.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {packs.map((p, i) => {
            const best = i === packs.length - 1;
            return (
              <div
                key={p.label}
                className={cx(
                  'flex flex-col rounded-2xl border p-4 transition',
                  best ? 'border-teal-300/40 bg-teal-400/5' : 'border-white/8 bg-ink/40'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-bone">{p.label}</p>
                  {best && <Badge tone="teal">Miglior prezzo</Badge>}
                </div>
                <p className="mt-1 text-[0.78rem] text-mist/70">
                  {p.qty === 1 ? 'a consumo' : `${num(p.qty)} ${meta.unit}`} · {euro(p.perUnit)}/{meta.unit}
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="font-display text-2xl font-semibold text-bone">{euro(p.price)}</p>
                  <Button size="sm" variant={best ? 'primary' : 'outline'} onClick={() => buy(p.qty === 1 ? 100 : p.qty)}>
                    {p.qty === 1 ? 'Attiva a consumo' : 'Aggiungi'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/8 px-6 py-4">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-mist/50">
            Ambiente demo · l&apos;aggiunta è simulata, nessun addebito reale
          </p>
        </div>
      </div>
    </div>
  );
}
