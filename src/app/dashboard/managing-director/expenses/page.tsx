'use client';

import { Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import MdExpensesClient from './MdExpensesClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
          <span className="text-gray-600">Loading…</span>
        </div>
      }
    >
      <MdExpensesClient />
    </Suspense>
  );
}
