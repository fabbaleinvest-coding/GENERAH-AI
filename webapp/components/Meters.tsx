'use client';

import { MeterKey, METERS, METER_ORDER, num } from '@/lib/plans';
import { useStore } from '@/lib/store';
import { cx } from '@/components/ui';

export function meterState(total: number, used: number) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? remaining / total : 0;
  const tone = total === 0 ? 'off' : pct <= 0.1 ? 'crit' : pct <= 0.25 ? 'warn' : 'ok';
  return { remaining, pct, tone } as const;
}

const TONE_BAR: Record<string, string> = {
  ok: 'bg-teal-400',
  warn: 'bg-amber',
  crit: 'bg-coral',
  off: 'bg-white/15',
};

const TONE_TEXT: Record<string, string> = {
  ok: 'text-teal-200',
  warn: 'text-amber-soft',
  crit: 'text-coral',
  off: 'text-mist/50',
};

export function MeterBar({
  meter,
  total,
  used,
  onTopUp,
  compact,
}: {
  meter: MeterKey;
  total: number;
  used: number;
  onTopUp?: (m: MeterKey) => void;
  compact?: boolean;
}) {
  const meta = METERS[meter];
  const { remaining, pct, tone } = meterState(total, used);
  const widthPct = total > 0 ? Math.round(pct * 100) : 0;

  return (
    <div className={cx('rounded-2xl border border-white/8 bg-ink-900/50 p-4', compact && 'p-3.5')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cx('font-mono uppercase tracking-[0.14em] text-mist/70', compact ? 'text-[0.6rem]' : 'text-[0.64rem]')}>
            {meta.short}
          </p>
          <p className={cx('mt-1 font-display font-semibold text-bone', compact ? 'text-lg' : 'text-2xl')}>
            {total === 0 ? '—' : num(remaining)}
            {total > 0 && <span className="ml-1 text-xs font-normal text-mist">{meta.unit}</span>}
          </p>
        </div>
        <span className={cx('font-mono text-[0.66rem]', TONE_TEXT[tone])}>
          {total === 0 ? 'non incluso' : `${widthPct}%`}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={cx('h-full rounded-full transition-all duration-700', TONE_BAR[tone])}
          style={{ width: `${total > 0 ? Math.max(widthPct, 2) : 0}%` }}
        />
      </div>

      {!compact && (
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[0.72rem] text-mist/70">
            {total === 0 ? 'Disponibile come aggiunta' : `${num(used)} / ${num(total)} ${meta.unit} usati`}
          </span>
          {onTopUp && (
            <button
              onClick={() => onTopUp(meter)}
              className={cx(
                'font-mono text-[0.66rem] uppercase tracking-[0.12em] transition',
                tone === 'crit' ? 'text-coral hover:text-coral/80' : 'text-teal-300 hover:text-teal-200'
              )}
            >
              + Ricarica
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MetersStrip({ onTopUp }: { onTopUp?: (m: MeterKey) => void }) {
  const { user } = useStore();
  if (!user) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {METER_ORDER.map((k) => (
        <MeterBar key={k} meter={k} total={user.meters[k].total} used={user.meters[k].used} onTopUp={onTopUp} compact />
      ))}
    </div>
  );
}
