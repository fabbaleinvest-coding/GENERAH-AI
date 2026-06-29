'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Logo, Spinner } from '@/components/ui';

/**
 * Protegge le pagine riservate.
 *  - need="auth"  → richiede login (altrimenti /accedi)
 *  - need="plan"  → richiede login + piano attivo (altrimenti /piani)
 */
export function Guard({
  need = 'auth',
  children,
}: {
  need?: 'auth' | 'plan';
  children: React.ReactNode;
}) {
  const { ready, user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/accedi');
      return;
    }
    if (need === 'plan' && !user.plan) {
      router.replace('/piani');
    }
  }, [ready, user, need, router]);

  const blocked = !ready || !user || (need === 'plan' && !user.plan);

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink">
        <Logo href={null} />
        <Spinner className="h-6 w-6 text-teal-300" />
      </div>
    );
  }

  return <>{children}</>;
}
