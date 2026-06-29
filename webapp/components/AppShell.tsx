'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { MeterKey, METERS, PLANS } from '@/lib/plans';
import { Logo, Button, Container, Badge, cx } from '@/components/ui';
import { MetersStrip } from '@/components/Meters';
import { TopUpModal } from '@/components/TopUpModal';

export function AppShell({
  children,
  showMeters = false,
  active,
}: {
  children: ReactNode;
  showMeters?: boolean;
  active?: string;
}) {
  const { user, logout, markAlertsRead } = useStore();
  const router = useRouter();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topUp, setTopUp] = useState<MeterKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const unread: number = user ? user.alerts.filter((a: any) => !a.read).length : 0;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!user) return null;

  const planName = user.plan ? PLANS[user.plan].name : '—';
  const initials = (user.nome[0] ?? '') + (user.cognome[0] ?? '');

  function openAlerts() {
    setMenuOpen(false);
    setAlertsOpen((v) => {
      const next = !v;
      if (next && unread > 0) markAlertsRead();
      return next;
    });
  }

  function doLogout() {
    logout();
    router.replace('/accedi');
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/85 backdrop-blur-md" ref={barRef}>
        <Container wide className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-6">
            <Logo size={30} href="/dashboard" />
          </div>

          <div className="flex items-center gap-2">
            {/* campanella alert */}
            <div className="relative">
              <button
                onClick={openAlerts}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-mist transition hover:border-teal-300/40 hover:text-bone"
                aria-label="Avvisi"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 font-mono text-[0.6rem] font-bold text-bone">
                    {unread}
                  </span>
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
                  <div className="border-b border-white/8 px-4 py-3">
                    <p className="font-display text-[0.95rem] font-semibold text-bone">Avvisi consumo</p>
                  </div>
                  {user.alerts.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[0.85rem] text-mist/70">
                      Nessun avviso. I tuoi contatori sono in salute.
                    </div>
                  ) : (
                    <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
                      {user.alerts.map((a: any) => {
                        const meta = METERS[a.meter as MeterKey];
                        return (
                          <li key={a.id} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-coral" />
                              <p className="text-[0.86rem] font-medium text-bone">{meta.short} sotto il 10%</p>
                            </div>
                            <p className="mt-1 pl-4 text-[0.78rem] text-mist/80">
                              Restano {Math.round(a.remainingPct * 100)}% di {meta.label.toLowerCase()}.
                            </p>
                            <button
                              onClick={() => {
                                setTopUp(a.meter);
                                setAlertsOpen(false);
                              }}
                              className="mt-1.5 pl-4 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-teal-300 hover:text-teal-200"
                            >
                              Vedi pacchetti →
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* menu utente */}
            <div className="relative">
              <button
                onClick={() => {
                  setAlertsOpen(false);
                  setMenuOpen((v) => !v);
                }}
                className="flex items-center gap-2.5 rounded-full border border-white/10 py-1.5 pl-1.5 pr-3 transition hover:border-teal-300/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-400 font-mono text-[0.72rem] font-bold uppercase text-ink-900">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-[0.82rem] font-medium leading-tight text-bone">{user.nome}</span>
                  <span className="block font-mono text-[0.6rem] uppercase tracking-wider text-teal-300/80">{planName}</span>
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-mist" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
                  <div className="border-b border-white/8 px-4 py-3">
                    <p className="text-[0.9rem] font-semibold text-bone">
                      {user.nome} {user.cognome}
                    </p>
                    <p className="truncate text-[0.78rem] text-mist/80">{user.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone="teal">Piano {planName}</Badge>
                      {user.planMode === 'demo' && <Badge tone="muted">Demo</Badge>}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push('/dashboard');
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-[0.86rem] text-mist transition hover:bg-white/5 hover:text-bone"
                    >
                      Vai alla dashboard
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push('/piani');
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-[0.86rem] text-mist transition hover:bg-white/5 hover:text-bone"
                    >
                      Cambia piano
                    </button>
                    <button
                      onClick={doLogout}
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-[0.86rem] text-coral transition hover:bg-coral/10"
                    >
                      Esci
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>

        {showMeters && (
          <div className="border-t border-white/5 bg-ink-900/40">
            <Container wide className="py-3">
              <MetersStrip onTopUp={setTopUp} />
            </Container>
          </div>
        )}
      </header>

      <main>{children}</main>

      <TopUpModal meter={topUp} onClose={() => setTopUp(null)} />
    </div>
  );
}
