'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Old Forecasting URL → merged Analytics & Forecasting page */
export default function ForecastingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/managing-director/analytics?tab=forecast');
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400" />
    </div>
  );
}
