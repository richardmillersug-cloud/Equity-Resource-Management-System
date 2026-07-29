'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { authService } from '@/lib/firebase/auth';
import {
  walletLedgerService,
  type WalletLedgerEntry,
} from '@/lib/firebase/wallet-ledger-service';

type TxFilter = 'all' | 'deposit' | 'expense';

function fmtUGX(n: number): string {
  return `UGX ${Math.round(n || 0).toLocaleString()}`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-UG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isExpense(entry: WalletLedgerEntry): boolean {
  return entry.entryType === 'expense_payment';
}

export interface EquityWalletPanelProps {
  /** Hide the large page title when embedded in another page */
  embedded?: boolean;
  /** Start on expense payments filter */
  initialTxFilter?: TxFilter;
  className?: string;
}

export function EquityWalletPanel({
  embedded = false,
  initialTxFilter = 'all',
  className = '',
}: EquityWalletPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof walletLedgerService.getWalletSummary>
  > | null>(null);
  const [grossVisible, setGrossVisible] = useState(false);
  const [dailyVisible, setDailyVisible] = useState(false);
  const [displayGross, setDisplayGross] = useState(0);
  const [displayDaily, setDisplayDaily] = useState(0);
  const [txFilter, setTxFilter] = useState<TxFilter>(initialTxFilter);
  const grossAnim = useRef<ReturnType<typeof setInterval> | null>(null);
  const dailyAnim = useRef<ReturnType<typeof setInterval> | null>(null);

  const now = new Date();
  const currentPeriodKey = walletLedgerService.getPeriodKey(now);
  const [periodKey, setPeriodKey] = useState(currentPeriodKey);

  const monthOptions: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = walletLedgerService.getPeriodKey(d);
    const label = d.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
    monthOptions.push({ key, label });
  }

  const filteredEntries = useMemo(() => {
    const entries = summary?.entries ?? [];
    if (txFilter === 'deposit') return entries.filter((e) => !isExpense(e));
    if (txFilter === 'expense') return entries.filter(isExpense);
    return entries;
  }, [summary, txFilter]);

  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems: paginatedEntries,
    startIndex: pageStartIndex,
    endIndex: pageEndIndex,
  } = usePagination(filteredEntries, 10);

  function animateCounter(
    target: number,
    setter: (v: number) => void,
    animRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) {
    if (animRef.current) clearInterval(animRef.current);
    if (target === 0) {
      setter(0);
      return;
    }
    const steps = 60;
    const duration = 1400;
    const increment = target / steps;
    let step = 0;
    animRef.current = setInterval(() => {
      step++;
      setter(step >= steps ? target : Math.round(increment * step));
      if (step >= steps) clearInterval(animRef.current!);
    }, duration / steps);
  }

  const load = async (key: string) => {
    setLoading(true);
    setError(null);
    setGrossVisible(false);
    setDailyVisible(false);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const branchId =
        (user as { branchId?: string }).branchId ||
        (user as { employee?: { branchId?: string } }).employee?.branchId ||
        'default-branch';

      try {
        await walletLedgerService.syncMissingExpensePayments({ branchId, periodKey: key });
      } catch (syncErr) {
        console.warn('Equity Wallet expense sync skipped:', syncErr);
      }

      const s = await walletLedgerService.getWalletSummary(branchId, key);
      setSummary(s);
      setCurrentPage(1);

      setTimeout(() => {
        setGrossVisible(true);
        animateCounter(s.grossProfitTotal, setDisplayGross, grossAnim);
      }, 120);
      setTimeout(() => {
        setDailyVisible(true);
        animateCounter(s.dailyExpenseTotal, setDisplayDaily, dailyAnim);
      }, 300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTxFilter(initialTxFilter);
  }, [initialTxFilter]);

  useEffect(() => {
    load(periodKey);
    return () => {
      if (grossAnim.current) clearInterval(grossAnim.current);
      if (dailyAnim.current) clearInterval(dailyAnim.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  const [selYear, selMonth] = periodKey.split('-').map(Number);
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const isCurrentMonth = periodKey === currentPeriodKey;
  const expenseCount = summary?.entries.filter(isExpense).length ?? 0;
  const depositCount = summary?.entries.filter((e) => !isExpense(e)).length ?? 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {!embedded ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Equity Wallet</h1>
              <p className="text-gray-600 mt-1">
                General accounts ledger — cash-close deposits in, expense payments out
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900">Equity Wallet</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                General accounts — deposits in, expense payments out
              </p>
            </>
          )}
        </div>
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {monthOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          <span className="ml-3 text-gray-600">Loading wallet ledger…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Failed to load wallet data</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => load(periodKey)}
            className="mt-3 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6 shadow-sm transition-all duration-700"
              style={{
                opacity: grossVisible ? 1 : 0,
                transform: grossVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">
                  💰
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Gross Profit Wallet</h3>
                  <p className="text-sm text-green-600">12% deposit per cash close</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-green-800 tabular-nums mb-1">
                {fmtUGX(displayGross)}
              </div>
              <p className="text-sm text-green-600">Deposited this month · before expense payments</p>
            </div>

            <div
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6 shadow-sm transition-all duration-700"
              style={{
                opacity: dailyVisible ? 1 : 0,
                transform: dailyVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                  🏦
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">Daily Expense Fund</h3>
                  <p className="text-sm text-blue-600">100,000 UGX per business day</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-800 tabular-nums mb-1">
                {fmtUGX(displayDaily)}
              </div>
              <p className="text-sm text-blue-600">
                {summary.daysCovered > 0
                  ? `Collected on ${summary.daysCovered} business day${summary.daysCovered !== 1 ? 's' : ''}`
                  : 'No daily collections yet this month'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Wallet Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Money In"
                value={fmtUGX(summary.combinedTotal)}
                sub="Gross + Daily deposits"
                color="green"
              />
              <Stat
                label="Expense Payments Out"
                value={`−${fmtUGX(summary.totalExpensePayments)}`}
                sub={`${expenseCount} payment${expenseCount !== 1 ? 's' : ''}`}
                color="red"
              />
              <Stat
                label="Available After Expenses"
                value={fmtUGX(summary.netBalance)}
                sub="What remains in wallet"
                color="purple"
              />
              <Stat
                label="Days Remaining"
                value={isCurrentMonth ? String(daysInMonth - now.getDate()) : '—'}
                sub={isCurrentMonth ? 'Until month end' : 'Past period'}
                color="orange"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">General Accounts Ledger</h3>
                <p className="text-sm text-gray-500">
                  Deposits and expense payments for{' '}
                  {new Date(selYear, selMonth - 1, 1).toLocaleDateString('en-UG', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                {(
                  [
                    { key: 'all', label: `All (${summary.entries.length})` },
                    { key: 'deposit', label: `Deposits (${depositCount})` },
                    { key: 'expense', label: `Expenses (${expenseCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setTxFilter(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 transition-colors ${
                      txFilter === tab.key
                        ? tab.key === 'expense'
                          ? 'bg-red-600 text-white'
                          : tab.key === 'deposit'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-900 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <p className="font-medium">
                  {txFilter === 'expense'
                    ? 'No expense payments for this month'
                    : txFilter === 'deposit'
                      ? 'No cash-close deposits for this month'
                      : 'No ledger entries for this month'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Description</th>
                      <th className="text-left px-4 py-3 font-medium">Source / Paid by</th>
                      <th className="text-right px-4 py-3 font-medium">In</th>
                      <th className="text-right px-4 py-3 font-medium">Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedEntries.map((e) => (
                      <LedgerRow key={e.id} entry={e} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-gray-800 border-t-2 border-gray-200">
                      <td colSpan={4} className="px-4 py-3 text-sm">
                        Month totals
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        +{fmtUGX(summary.combinedTotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700">
                        −{fmtUGX(summary.totalExpensePayments)}
                      </td>
                    </tr>
                    <tr className="bg-indigo-50 font-bold text-gray-900">
                      <td colSpan={5} className="px-4 py-3 text-sm">
                        Available after expenses
                      </td>
                      <td className="px-4 py-3 text-right text-indigo-800">
                        {fmtUGX(summary.netBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              startIndex={pageStartIndex}
              endIndex={pageEndIndex}
              totalItems={filteredEntries.length}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: 'purple' | 'green' | 'blue' | 'orange' | 'red';
}) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`text-center p-4 rounded-lg border ${colors[color]}`}>
      <div className="text-xl font-bold mb-1 break-all">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs mt-1 opacity-75">{sub}</div>
    </div>
  );
}

function LedgerRow({ entry }: { entry: WalletLedgerEntry }) {
  if (isExpense(entry)) {
    const funding =
      entry.fundingSource === 'DAILY_EXPENSE_FUND'
        ? 'Daily Expense Fund'
        : entry.fundingSource === 'WALLET_GROSS_PROFIT'
          ? 'Wallet / Gross Profit'
          : entry.fundingSource || '—';
    return (
      <tr className="hover:bg-red-50/40 transition-colors">
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(entry.date)}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Expense
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 max-w-[260px] truncate">
            {entry.expenseDescription || 'Expense payment'}
          </div>
          {entry.vendor && entry.vendor !== 'Unknown vendor' && (
            <div className="text-xs text-gray-400 truncate max-w-[260px]">{entry.vendor}</div>
          )}
        </td>
        <td className="px-4 py-3 text-gray-600">
          <div className="text-xs">{funding}</div>
          <div className="text-xs text-gray-400">{entry.paidByName || '—'}</div>
        </td>
        <td className="px-4 py-3 text-right text-gray-300">—</td>
        <td className="px-4 py-3 text-right font-semibold text-red-700">
          −{fmtUGX(entry.debitAmount ?? 0)}
        </td>
      </tr>
    );
  }

  const gross = entry.grossProfitDeposit ?? 0;
  const daily = entry.dailyExpenseDeposit ?? 0;
  const totalDeposit = gross + daily;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(entry.date)}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            entry.shiftType === 'day'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          Deposit · {entry.shiftType === 'day' ? 'Day' : entry.shiftType === 'night' ? 'Night' : 'In'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-800">Cash close deposit</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        GP {fmtUGX(gross)}
        {daily > 0 ? ` · Daily ${fmtUGX(daily)}` : ''}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-emerald-700">+{fmtUGX(totalDeposit)}</td>
      <td className="px-4 py-3 text-right text-gray-300">—</td>
    </tr>
  );
}
