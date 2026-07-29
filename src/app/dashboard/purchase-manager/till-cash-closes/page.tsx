'use client';

import React from 'react';
import CashTrackingInterface from '../../../../components/purchase-manager/CashTrackingInterface';

export default function TillCashClosesPage() {
  return (
    <div className="w-full min-h-0 min-w-0 bg-gray-50 -mx-1 px-1 sm:mx-0 sm:px-0">
      <div className="mb-3 sm:mb-6">
        <h1 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-3xl">
          Till Cash Closes
        </h1>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">Network data per shift</p>
      </div>

      <CashTrackingInterface className="w-full" />
    </div>
  );
}
