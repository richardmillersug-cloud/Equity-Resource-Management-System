'use client';

import { Suspense } from 'react';
import AnalyticsForecastClient from './AnalyticsForecastClient';

export default function AnalyticsForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400" />
        </div>
      }
    >
      <AnalyticsForecastClient />
    </Suspense>
  );
}
