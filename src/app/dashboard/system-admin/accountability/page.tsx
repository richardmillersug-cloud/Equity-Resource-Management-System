'use client';

import React, { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/system-admin/AdminPageHeader';
import { SystemAdminQueries } from '@/lib/firebase/role-based-queries';
import { AlertTriangle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type AccountabilityEntry = Awaited<ReturnType<typeof SystemAdminQueries.getAccountabilityLog>>[number];

function formatTime(ts: Timestamp | undefined) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleString();
}

function actionLabel(log: AccountabilityEntry) {
  const action = log.changes?.action as string | undefined;
  if (action) return action.replace(/_/g, ' ');
  return `${log.actionType} on ${log.tableName}`;
}

export default function AccountabilityPage() {
  const [logs, setLogs] = useState<AccountabilityEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SystemAdminQueries.getAccountabilityLog()
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      log.employeeName?.toLowerCase().includes(q) ||
      log.employeeEmail?.toLowerCase().includes(q) ||
      log.tableName?.toLowerCase().includes(q) ||
      log.actionType?.toLowerCase().includes(q) ||
      String(log.changes?.action || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <AdminPageHeader
        title="System Accountability"
        description="Complete audit trail — every create, update, delete, sign-in, and sign-out"
        breadcrumbs={[{ label: 'Accountability' }]}
      />

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by user, table, or action..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">When</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Who</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatTime(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.employeeName}</div>
                      <div className="text-xs text-gray-500">{log.employeeEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.role || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          log.actionType === 'DELETE'
                            ? 'bg-red-100 text-red-800'
                            : log.actionType === 'CREATE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.tableName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={log.objectRepr}>
                      {actionLabel(log)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8">No accountability records found</p>
          )}
        </div>
      )}
    </div>
  );
}
