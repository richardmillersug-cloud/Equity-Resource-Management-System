'use client';

import React from 'react';
import CashTrackingInterface from '../../../../components/purchase-manager/CashTrackingInterface';

export default function TillCashClosesPage() {
  return (
    <div className="w-full min-h-full bg-gray-50 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Till Cash Closes - Network Data Per Shift</h1>
          <p className="text-gray-600 mt-2">Monitor till cash flow data with detailed network payment breakdown by shift (☀️ Day / 🌙 Night)</p>
          <div className="mt-3 flex items-center space-x-4 text-sm">
            <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full">
              ✅ Same data source as Accountant Dashboard
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              📱 Enhanced network data extraction from shifts/tills
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
              👤 User account lookup integrated
            </span>
          </div>
        </div>
        
        {/* Cash Tracking Interface */}
        <CashTrackingInterface className="w-full" />
    </div>
  );
}
