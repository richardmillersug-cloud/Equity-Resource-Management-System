'use client';

import React, { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/system-admin/AdminPageHeader';
import { SystemAdminQueries } from '@/lib/firebase/role-based-queries';
import { AlertTriangle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface SecurityRow {
  employeeId: string;
  employeeName: string;
  email: string;
  employmentStatus: string;
  jobTitle: string;
  lastActivity: Timestamp | null;
  totalActions: number;
  activityLevel: string;
}

export default function SystemUsersPage() {
  const [users, setUsers] = useState<SecurityRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SystemAdminQueries.getSecurityOverview()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      u.employeeName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.jobTitle.toLowerCase().includes(q)
    );
  });

  const activityColor = (level: string) => {
    if (level === 'ACTIVE') return 'bg-green-100 text-green-800';
    if (level === 'LOW_ACTIVITY') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      <AdminPageHeader
        title="User Directory"
        description="All system accounts with employment status and activity levels"
        breadcrumbs={[{ label: 'Users' }]}
      />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search name, email, role..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((u) => (
                  <tr key={u.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.employeeName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.jobTitle}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          u.employmentStatus === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.employmentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${activityColor(u.activityLevel)}`}>
                        {u.activityLevel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.totalActions}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {u.lastActivity
                        ? new Date(u.lastActivity.seconds * 1000).toLocaleString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
