'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserX,
  Users,
} from 'lucide-react';
import { authService, AuthUser } from '@/lib/firebase/auth';
import { isManagingDirectorUser } from '@/lib/firebase/admin-access';
import { firestoreServices } from '@/lib/firebase/firestore-service';
import type { Employee } from '@/lib/firebase/models';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';

const PM_TITLES = new Set(['purchase manager', 'purchasing manager']);

function isPmEmployee(emp: Employee): boolean {
  return (emp.roles || []).some((r) => PM_TITLES.has((r.jobTitle || '').toLowerCase()));
}

function displayName(emp: Employee): string {
  return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || emp.id;
}

export default function MdPmAccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selected, setSelected] = useState<Employee | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const apply = (authUser: AuthUser | null) => {
      if (!authUser) {
        router.replace('/auth/login');
        return;
      }
      if (!isManagingDirectorUser(authUser)) {
        setDenied(true);
        setUser(authUser);
        setAuthLoading(false);
        return;
      }
      setDenied(false);
      setUser(authUser);
      setAuthLoading(false);
    };

    apply(authService.getCurrentUser());
    return authService.onAuthStateChange(apply);
  }, [router]);

  const loadPmAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await firestoreServices.employee.getAll();
      const pms = (all as Employee[])
        .filter(isPmEmployee)
        .sort((a, b) => displayName(a).localeCompare(displayName(b)));
      setEmployees(pms);
    } catch (err) {
      console.error('Failed to load PM accounts:', err);
      setError('Failed to load Purchase Manager accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || denied) return;
    loadPmAccounts();
  }, [authLoading, denied, loadPmAccounts]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const role = emp.roles?.[0]?.jobTitle || '';
      return (
        displayName(emp).toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.phone?.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q)
      );
    });
  }, [employees, searchTerm]);

  const openDelete = (emp: Employee) => {
    setSelected(emp);
    setConfirmText('');
    setError(null);
    setSuccess(null);
  };

  const closeDelete = () => {
    if (deleting) return;
    setSelected(null);
    setConfirmText('');
  };

  const handleDelete = async () => {
    if (!selected || !user) return;
    if (selected.id === user.uid) {
      setError('You cannot delete your own account.');
      return;
    }
    if (confirmText !== 'DELETE') {
      setError('Type DELETE exactly to confirm.');
      return;
    }

    const name = displayName(selected);
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await firestoreServices.employee.delete(selected.id);

      try {
        await firestoreServices.audit.logAction(
          'employees',
          'DELETE',
          user.uid,
          selected.id,
          {
            action: 'md_delete_pm_account',
            email: selected.email,
            name,
            deletedBy: user.uid,
          },
          `PM account deleted by MD: ${name} (${selected.email})`
        );
      } catch (auditErr) {
        console.warn('Audit log failed after PM delete:', auditErr);
      }

      setEmployees((prev) => prev.filter((e) => e.id !== selected.id));
      setSelected(null);
      setConfirmText('');
      setSuccess(`${name} has been deleted. They can no longer sign in.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to delete PM account:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete account. Check Firestore rules if permission was denied.'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-3 text-gray-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Access restricted</h1>
        <p className="mt-2 text-sm text-gray-600">
          Only the Managing Director can delete Purchase Manager accounts.
        </p>
        <button
          type="button"
          onClick={() => router.push(authService.getDefaultDashboardPath(user))}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <UserX className="h-7 w-7 text-rose-600" />
              Purchase Manager Accounts
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and permanently delete Purchase Manager accounts. Deletion removes their
              employee record so they cannot sign in.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPmAccounts}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && !selected && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">PM accounts</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Users className="h-5 w-5 text-rose-500" />
            {employees.length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Warning
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Deletion cannot be undone. Ledger history for that user remains in payments and
            allocations but the account can no longer log in.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone…"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <HydrationSafeLoader />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">
            {employees.length === 0
              ? 'No Purchase Manager accounts found.'
              : 'No accounts match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => {
                  const role = emp.roles?.[0]?.jobTitle || 'Purchase Manager';
                  const isSelf = user?.uid === emp.id;
                  return (
                    <tr key={emp.id} className="hover:bg-rose-50/40">
                      <td className="px-4 py-3 font-medium text-gray-900">{displayName(emp)}</td>
                      <td className="px-4 py-3 text-gray-600">{emp.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            emp.employmentStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : emp.employmentStatus === 'Terminated'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {emp.employmentStatus || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isSelf}
                          title={isSelf ? 'Cannot delete your own account' : 'Delete account'}
                          onClick={() => openDelete(emp)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 p-2">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete PM account</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Permanently remove{' '}
                  <span className="font-semibold text-gray-900">{displayName(selected)}</span>
                  {selected.email ? (
                    <>
                      {' '}
                      (<span className="text-gray-800">{selected.email}</span>)
                    </>
                  ) : null}
                  . This cannot be undone.
                </p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-medium text-gray-700">
              Type <span className="font-mono text-rose-600">DELETE</span> to confirm
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="DELETE"
                disabled={deleting}
              />
            </label>

            {error && selected && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || confirmText !== 'DELETE'}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
