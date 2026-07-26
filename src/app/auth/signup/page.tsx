'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Public signup is disabled — only Admin / MD can create accounts. */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login?notice=signup_restricted');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="rounded-xl bg-white px-6 py-8 text-center shadow-md">
        <p className="text-sm text-gray-700">
          Account creation is restricted to Super Admin and Managing Director.
        </p>
        <p className="mt-2 text-xs text-gray-500">Redirecting to login…</p>
      </div>
    </div>
  );
}
