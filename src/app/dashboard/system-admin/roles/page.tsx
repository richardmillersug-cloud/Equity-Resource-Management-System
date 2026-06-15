'use client';

import React, { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/system-admin/AdminPageHeader';
import { SystemAdminQueries } from '@/lib/firebase/role-based-queries';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

type RoleWithUsers = Awaited<ReturnType<typeof SystemAdminQueries.getAllRolesWithUsers>>[number];

const categoryColors: Record<string, string> = {
  system: 'bg-indigo-100 text-indigo-800',
  executive: 'bg-violet-100 text-violet-800',
  finance: 'bg-green-100 text-green-800',
  supply_chain: 'bg-orange-100 text-orange-800',
  hr: 'bg-pink-100 text-pink-800',
  operations: 'bg-gray-100 text-gray-800',
};

export default function SystemRolesPage() {
  const [roles, setRoles] = useState<RoleWithUsers[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SystemAdminQueries.getAllRolesWithUsers()
      .then(setRoles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="System Roles"
        description="Every role in Equi with permissions and assigned users"
        breadcrumbs={[{ label: 'Roles' }]}
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(role.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
            >
              <div className="flex items-center gap-3">
                {expanded.has(role.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{role.jobTitle}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        categoryColors[role.category] || categoryColors.operations
                      }`}
                    >
                      {role.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shrink-0 ml-2">
                {role.userCount} user{role.userCount !== 1 ? 's' : ''}
              </span>
            </button>

            {expanded.has(role.id) && (
              <div className="border-t border-gray-100 px-4 pb-4">
                <div className="mt-3 mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => (
                      <span key={p} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Dashboard: {role.dashboardPath}</p>
                </div>

                {role.users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full mt-3 text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-2 pr-4">Name</th>
                          <th className="pb-2 pr-4">Email</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2">Branch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {role.users.map((u) => (
                          <tr key={u.id}>
                            <td className="py-2 pr-4 font-medium text-gray-900">{u.name}</td>
                            <td className="py-2 pr-4 text-gray-600">{u.email}</td>
                            <td className="py-2 pr-4">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  u.status === 'Active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="py-2 text-gray-500">{u.branchId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-3 italic">No users assigned to this role</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
