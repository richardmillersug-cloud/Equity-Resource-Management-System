'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/firebase/auth';
import { AccountantAccountLedger } from '@/components/ledger/AccountantAccountLedger';
import { RefreshCw } from 'lucide-react';

const getUserRole = (user: { employee?: { roles?: { jobTitle?: string }[] } } | null): string =>
  user?.employee?.roles?.[0]?.jobTitle || '';

export default function YourAccountPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [branchId, setBranchId] = useState('');
  const [holderName, setHolderName] = useState('Equity Shoppers');

  const isManagingDirector = getUserRole(currentUser) === 'Managing Director';

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
      router.replace('/dashboard/account-ledgers?type=accountant');
    }
  }, [authLoading, isManagingDirector, router]);

  useEffect(() => {
    if (!currentUser || isManagingDirector) return;

    const bid =
      currentUser.employee?.branchId ||
      (currentUser as Record<string, unknown>).branchId as string ||
      'default-branch';

    const accountUserName =
      currentUser.displayName?.trim() ||
      [currentUser.employee?.firstName, currentUser.employee?.lastName].filter(Boolean).join(' ').trim() ||
      currentUser.email?.split('@')[0] ||
      '';

    setBranchId(bid);
    if (accountUserName) setHolderName(accountUserName.toUpperCase());
  }, [currentUser, isManagingDirector]);

  if (authLoading || isManagingDirector) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
        <span className="text-gray-600 text-lg">{authLoading ? 'Authenticating...' : 'Redirecting...'}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-8">
      <AccountantAccountLedger
        branchId={branchId}
        holderName={holderName}
      />
    </div>
  );
}
