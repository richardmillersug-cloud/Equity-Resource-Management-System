'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Merged into /setup/admin */
export default function LegacySystemAdminSetupRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/setup/admin');
  }, [router]);
  return null;
}
