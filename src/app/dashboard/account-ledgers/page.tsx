'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { PMAccountLedger, type PMLedgerFilter } from '@/components/ledger/PMAccountLedger';
import { AccountantAccountLedger } from '@/components/ledger/AccountantAccountLedger';
import { Wallet, Banknote, RefreshCw } from 'lucide-react';

type LedgerType = 'pm' | 'accountant';

interface LedgerUser {
  uid: string;
  name: string;
  branchId?: string;
  role: string;
}

const getUserRole = (user: { employee?: { roles?: { jobTitle?: string }[] } } | null): string =>
  user?.employee?.roles?.[0]?.jobTitle || '';

const PM_ROLES = ['Purchase Manager', 'Purchasing Manager'];
const ACCOUNTANT_ROLES = ['Accountant', 'Manager'];
const EXCLUDED_FROM_PM_LEDGER = new Set([
  'admin',
  'system admin',
  'super admin',
  'superadmin',
  'managing director',
]);

function employeeHasExcludedRole(roles: { jobTitle?: string }[] | undefined): boolean {
  return (roles || []).some((r) =>
    EXCLUDED_FROM_PM_LEDGER.has((r.jobTitle || '').toLowerCase())
  );
}

function parsePmFilter(raw: string | null): PMLedgerFilter {
  if (raw === 'expense' || raw === 'invoice' || raw === 'credit' || raw === 'debit') return raw;
  return 'all';
}

export default function AccountLedgersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<LedgerUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const initialType = (searchParams.get('type') as LedgerType) || 'pm';
  const filterParam = searchParams.get('filter');
  const [ledgerType, setLedgerType] = useState<LedgerType>(
    initialType === 'accountant' ? 'accountant' : 'pm'
  );
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get('user') || '');
  const [ledgerFilter, setLedgerFilter] = useState<PMLedgerFilter>(parsePmFilter(filterParam));

  useEffect(() => {
    const existingUser = authService.getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      setAuthLoading(false);
    }
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    const timer = setTimeout(() => setAuthLoading(false), 3000);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const role = getUserRole(currentUser);
    if (role !== 'Managing Director') {
      router.replace('/dashboard');
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    const type = searchParams.get('type');
    const user = searchParams.get('user') || '';
    const filter = searchParams.get('filter');
    if (type === 'accountant' || type === 'pm') setLedgerType(type);
    setSelectedUserId(user);
    setLedgerFilter(parsePmFilter(filter));
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;

    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const employeesSnapshot = await getDocs(collection(db, 'employees'));
        const list: LedgerUser[] = [];

        employeesSnapshot.docs.forEach((employeeDoc) => {
          const data = employeeDoc.data();
          const roles = data.roles || [];
          const role = roles[0]?.jobTitle || '';
          const isPm =
            roles.some((r: { jobTitle?: string }) => PM_ROLES.includes(r.jobTitle || '')) &&
            !employeeHasExcludedRole(roles);
          const isAccountant = ACCOUNTANT_ROLES.includes(role);

          if (
            (ledgerType === 'pm' && isPm) ||
            (ledgerType === 'accountant' && isAccountant)
          ) {
            list.push({
              uid: employeeDoc.id,
              name: `${data.firstName || 'Unknown'} ${data.lastName || 'User'}`.trim(),
              branchId: data.branchId || 'default-branch',
              role,
            });
          }
        });

        list.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(list);
        setSelectedUserId((prev) => {
          if (prev && list.some((u) => u.uid === prev)) return prev;
          return list[0]?.uid || '';
        });
      } catch (err) {
        console.error('Error loading ledger users:', err);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [authLoading, ledgerType]);

  const updateUrl = (type: LedgerType, uid: string, filter: PMLedgerFilter) => {
    const params = new URLSearchParams();
    params.set('type', type);
    if (uid) params.set('user', uid);
    if (filter && filter !== 'all') params.set('filter', filter);
    router.replace(`/dashboard/account-ledgers?${params.toString()}`);
  };

  const handleTypeChange = (type: LedgerType) => {
    setLedgerType(type);
    setSelectedUserId('');
    updateUrl(type, '', ledgerFilter);
  };

  const handleUserChange = (uid: string) => {
    setSelectedUserId(uid);
    updateUrl(ledgerType, uid, ledgerFilter);
  };

  const selectedUser = users.find((u) => u.uid === selectedUserId);
  const accountantTxFilter = ledgerFilter === 'expense' ? 'payment' : 'all';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
        <span className="text-gray-600 text-lg">Authenticating...</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 p-4 sm:p-6 pb-12 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Ledgers</h1>
              <p className="text-sm text-gray-500">
                View PM and accountant account ledgers across all users
                {ledgerFilter === 'expense' && (
                  <span className="text-indigo-600"> · Expense payments follow-up</span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium shrink-0">
              <button
                onClick={() => handleTypeChange('pm')}
                className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
                  ledgerType === 'pm'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Wallet className="w-4 h-4" />
                PM Account
              </button>
              <button
                onClick={() => handleTypeChange('accountant')}
                className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
                  ledgerType === 'accountant'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Accountant Account
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {ledgerType === 'pm' ? 'Purchase Manager' : 'Accountant / Manager'}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                disabled={usersLoading}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
              >
                {usersLoading ? (
                  <option value="">Loading users...</option>
                ) : users.length === 0 ? (
                  <option value="">No users found</option>
                ) : (
                  users.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.name} ({user.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {ledgerType === 'pm' ? (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-6">
            {selectedUserId ? (
              <PMAccountLedger
                activeLedgerUid={selectedUserId}
                holderName={selectedUser?.name.toUpperCase()}
                branchId={selectedUser?.branchId}
                readOnly
                compactHeader
                initialFilter={ledgerFilter}
              />
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select a purchase manager to view their ledger</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
            {selectedUser ? (
              <AccountantAccountLedger
                branchId={selectedUser.branchId || 'default-branch'}
                holderName={selectedUser.name.toUpperCase()}
                compactHeader
                initialTxFilter={accountantTxFilter}
              />
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select an accountant to view their ledger</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
