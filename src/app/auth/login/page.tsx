'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AuthContainer from '../../../components/auth/AuthContainer';
import { authService } from '@/lib/firebase/auth';
import { getEmploymentLoginBlockMessage } from '@/lib/firebase/employment-access';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blocked = searchParams.get('blocked');
  const statusParam = searchParams.get('status');
  const notice = searchParams.get('notice');
  const status =
    statusParam === 'Terminated' || statusParam === 'Inactive' ? statusParam : null;

  const loginError =
    blocked ||
    (status ? getEmploymentLoginBlockMessage(status) : null) ||
    (notice === 'signup_restricted'
      ? 'Account creation is restricted to Super Admin and Managing Director. Please sign in.'
      : null);

  return (
    <AuthContainer
      defaultMode="login"
      loginError={loginError}
      onAuthSuccess={(user) => {
        router.push(authService.getDefaultDashboardPath(user));
      }}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
