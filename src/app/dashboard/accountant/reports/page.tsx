'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { authService } from '@/lib/firebase/auth';
import { EquityWalletPanel } from '@/components/accountant/EquityWalletPanel';

const getUserRole = (user: { employee?: { roles?: { jobTitle?: string }[] } } | null): string =>
  user?.employee?.roles?.[0]?.jobTitle || '';

export default function FinancialReportsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const existing = authService.getCurrentUser();
    if (existing) {
      if (getUserRole(existing) === 'Managing Director') {
        router.replace('/dashboard/managing-director/expenses?tab=wallet');
        return;
      }
      setChecking(false);
    }

    const unsub = authService.onAuthStateChange((user) => {
      if (getUserRole(user) === 'Managing Director') {
        router.replace('/dashboard/managing-director/expenses?tab=wallet');
      } else {
        setChecking(false);
      }
    });

    const timer = setTimeout(() => setChecking(false), 2500);
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
        <span className="text-gray-600">Loading Equity Wallet…</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <EquityWalletPanel />
    </div>
  );
}
