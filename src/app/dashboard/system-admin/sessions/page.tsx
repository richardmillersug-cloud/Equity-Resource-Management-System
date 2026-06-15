'use client';

import React, { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/system-admin/AdminPageHeader';
import { SystemAdminQueries } from '@/lib/firebase/role-based-queries';
import { AlertTriangle, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type SessionEntry = Awaited<ReturnType<typeof SystemAdminQueries.getLoginSessions>>[number];

function formatTime(ts: Timestamp | undefined) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleString();
}

function DeviceIcon({ type }: { type?: string }) {
  if (type === 'mobile') return <Smartphone className="w-4 h-4" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function locationLabel(s: SessionEntry) {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : s.ipAddress || 'Unknown';
}

export default function LoginSessionsPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SystemAdminQueries.getLoginSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) => {
    if (showActiveOnly && !s.isActive) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      s.employeeName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.ipAddress?.toLowerCase().includes(q) ||
      s.browser?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Login Sessions"
        description="Who logged in, from which device, IP address, and geographic location"
        breadcrumbs={[{ label: 'Sessions' }]}
      />

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="search"
          placeholder="Search user, IP, city, browser..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Active sessions only
        </label>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logout</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Browser / OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.employeeName}</div>
                      <div className="text-xs text-gray-500">{s.email}</div>
                      <div className="text-xs text-indigo-600">{s.role}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatTime(s.loginTime)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {s.logoutTime ? formatTime(s.logoutTime) : '—'}
                      {s.sessionDuration > 0 && (
                        <div className="text-xs text-gray-400">{s.sessionDuration} min</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <DeviceIcon type={s.deviceType} />
                        <span className="capitalize">{s.deviceType || 'unknown'}</span>
                      </div>
                      <div className="text-xs text-gray-400">{s.screenResolution}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{s.browser}</div>
                      <div className="text-xs text-gray-400">{s.os}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{locationLabel(s)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.ipAddress || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Ended'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No login sessions recorded yet. Sessions are captured on each sign-in.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
