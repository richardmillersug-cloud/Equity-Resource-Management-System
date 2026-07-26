'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, UserPlus } from 'lucide-react';
import { authService, AuthUser } from '@/lib/firebase/auth';
import { canCreateSystemAccounts } from '@/lib/firebase/admin-access';
import SignupForm from '@/components/auth/SignupForm';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';

export default function CreateAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const apply = (authUser: AuthUser | null) => {
      if (!authUser) {
        router.replace('/auth/login');
        return;
      }
      if (!canCreateSystemAccounts(authUser)) {
        setDenied(true);
        setUser(authUser);
        setLoading(false);
        return;
      }
      setDenied(false);
      setUser(authUser);
      setLoading(false);
    };

    apply(authService.getCurrentUser());
    const unsub = authService.onAuthStateChange(apply);
    return unsub;
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-3 text-gray-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Access restricted</h1>
        <p className="mt-2 text-sm text-gray-600">
          Only Super Admin (Admin) and Managing Director can create accounts. No other role has
          access.
        </p>
        <button
          type="button"
          onClick={() => router.push(authService.getDefaultDashboardPath(user))}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const createdBy = user
    ? {
        uid: user.uid,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : user.displayName || user.email,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <UserPlus className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-600">
            Admin & Managing Director only — create logins for retail system roles
          </p>
        </div>
      </div>

      <SignupForm managedCreation createdBy={createdBy} />
    </div>
  );
}
