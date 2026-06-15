'use client';

import React, { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/system-admin/AdminPageHeader';
import { SystemAdminQueries } from '@/lib/firebase/role-based-queries';
import { AlertTriangle, Shield, Activity, UserX } from 'lucide-react';

interface SecurityRow {
  employeeId: string;
  employeeName: string;
  email: string;
  employmentStatus: string;
  jobTitle: string;
  lastActivity: { seconds: number } | null;
  totalActions: number;
  activityLevel: string;
}

export default function SecurityOverviewPage() {
  const [users, setUsers] = useState<SecurityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SystemAdminQueries.getSecurityOverview()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const active = users.filter((u) => u.activityLevel === 'ACTIVE').length;
  const low = users.filter((u) => u.activityLevel === 'LOW_ACTIVITY').length;
  const inactive = users.filter((u) => u.activityLevel === 'INACTIVE').length;
  const terminated = users.filter((u) => u.employmentStatus !== 'Active').length;

  const atRisk = users.filter(
    (u) => u.activityLevel === 'INACTIVE' && u.employmentStatus === 'Active'
  );

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader
        title="Security Overview"
        description="Access patterns, inactive accounts, and compliance monitoring"
        breadcrumbs={[{ label: 'Security' }]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active (7d)', value: active, icon: Activity, color: 'text-green-600' },
          { label: 'Low activity', value: low, icon: Shield, color: 'text-yellow-600' },
          { label: 'Inactive (30d+)', value: inactive, icon: UserX, color: 'text-red-600' },
          { label: 'Non-active accounts', value: terminated, icon: AlertTriangle, color: 'text-orange-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : item.value}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          At-risk accounts (active but no recent activity)
        </h2>
        {loading ? (
          <div className="flex justify-center h-32 items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : atRisk.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
            No at-risk accounts detected.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-800 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-800 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-800 uppercase">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {atRisk.map((u) => (
                  <tr key={u.employeeId}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.employeeName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">{u.jobTitle}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.lastActivity
                        ? new Date(u.lastActivity.seconds * 1000).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
