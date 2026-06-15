'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy URL — merged into Admin console. */
export default function SystemAdminRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/admin');
  }, [router]);
  return null;
}
