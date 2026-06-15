'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/firebase/auth';
import { PMAccountLedger } from '@/components/ledger/PMAccountLedger';
import { RefreshCw } from 'lucide-react';

const getUserRole = (user: { employee?: { roles?: { jobTitle?: string }[] } } | null): string =>
  user?.employee?.roles?.[0]?.jobTitle || '';

export default function PMAccountPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isManagingDirector = getUserRole(currentUser) === 'Managing Director';
  const activeLedgerUid = currentUser?.uid;

  useEffect(() => {
    const existingUser = authService.getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      setAuthLoading(false);
    }
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    const timer = setTimeout(() => setAuthLoading(false), 3000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!authLoading && isManagingDirector) {
      router.replace('/dashboard/account-ledgers?type=pm');
    }
  }, [authLoading, isManagingDirector, router]);

  if (authLoading || isManagingDirector) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
        <span className="text-gray-600 text-lg">{authLoading ? 'Authenticating...' : 'Redirecting...'}</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6 pb-12">
      <div className="w-full">
        {activeLedgerUid && (
          <PMAccountLedger
            activeLedgerUid={activeLedgerUid}
            readOnly={false}
          />
        )}
      </div>
    </div>
  );
}
