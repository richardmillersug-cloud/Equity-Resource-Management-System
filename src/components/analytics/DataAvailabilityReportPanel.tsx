'use client';

import type { DataAvailabilityReport } from '@/lib/firebase/data-verification-utility';

interface Props {
  dataReport: DataAvailabilityReport;
  onRetry: () => void;
}

export default function DataAvailabilityReportPanel({ dataReport, onRetry }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Current data availability</h3>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {dataReport.summary.availableDataSources}/{dataReport.summary.totalDataSources}
          </div>
          <div className="text-sm text-blue-700">Sources available</div>
        </div>
        <div className="rounded-lg bg-green-50 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {dataReport.summary.readyForAnalytics ? 'Yes' : 'No'}
          </div>
          <div className="text-sm text-green-700">Analytics ready</div>
        </div>
        <div className="rounded-lg bg-purple-50 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            UGX {dataReport.collections.cashCloses.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-purple-700">Cash-close revenue (all time in report)</div>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{dataReport.collections.cashCloses.count}</div>
          <div className="text-sm text-orange-700">Cash close rows</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className={`rounded-lg border p-4 ${dataReport.collections.cashCloses.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <h4 className="mb-2 font-semibold">Cash closes</h4>
          {dataReport.collections.cashCloses.available ? (
            <p className="text-sm text-gray-700">
              {dataReport.collections.cashCloses.count} records · Gross profit UGX{' '}
              {dataReport.collections.cashCloses.totalProfit.toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-red-600">{dataReport.collections.cashCloses.error}</p>
          )}
        </div>
        <div
          className={`rounded-lg border p-4 ${dataReport.collections.expenses.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <h4 className="mb-2 font-semibold">Expenses</h4>
          {dataReport.collections.expenses.available ? (
            <p className="text-sm text-gray-700">
              {dataReport.collections.expenses.count} records · Total UGX{' '}
              {dataReport.collections.expenses.totalExpenses.toLocaleString()}
            </p>
          ) : dataReport.collections.expenses.error?.includes('index') ? (
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Index may be required in Firebase.</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 rounded bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-sm text-red-600">{dataReport.collections.expenses.error}</p>
          )}
        </div>
      </div>

      {dataReport.summary.recommendations.length > 0 && (
        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <h4 className="mb-2 font-semibold text-blue-900">Recommendations</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-900">
            {dataReport.summary.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Generated {new Date(dataReport.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
