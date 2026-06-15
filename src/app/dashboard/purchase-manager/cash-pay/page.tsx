'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { authService } from '@/lib/firebase/auth';
import {
  fetchCashPayData,
  buildCashPayRows,
  getMonthOptions,
  getYearOptions,
  getCurrentPeriodKey,
  getCurrentYear,
  type CashPayFilterMode,
  type CashPayDayRow,
} from '@/lib/firebase/cash-pay-service';
import {
  Banknote,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  Wallet,
  Receipt,
  CreditCard,
  PiggyBank,
  ArrowDownUp,
} from 'lucide-react';

function fmtUGX(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
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

function fmtCell(n: number): string {
  return n > 0 ? fmtUGX(n) : '—';
}

const getUserRole = (user: { employee?: { roles?: { jobTitle?: string }[] } } | null): string =>
  user?.employee?.roles?.[0]?.jobTitle || '';

const ORG_WIDE_ROLES = new Set(['Managing Director', 'Admin']);

export default function CashPayPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Awaited<ReturnType<typeof fetchCashPayData>> | null>(
    null
  );

  const [filterMode, setFilterMode] = useState<CashPayFilterMode>('month');
  const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey());
  const [filterYear, setFilterYear] = useState(getCurrentYear());

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const yearOptions = useMemo(() => getYearOptions(), []);

  const filterValue = filterMode === 'month' ? periodKey : filterYear;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const role = getUserRole(user);
      const branchId = ORG_WIDE_ROLES.has(role)
        ? undefined
        : user.employee?.branchId ||
          (user as { branchId?: string }).branchId ||
          'default-branch';

      const data = await fetchCashPayData(branchId);
      setRawData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cash pay data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { rows, totals } = useMemo(() => {
    if (!rawData) return { rows: [], totals: null };
    return buildCashPayRows(rawData, filterMode, filterValue);
  }, [rawData, filterMode, filterValue]);

  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
  } = usePagination(rows, 15);

  const exportCsv = () => {
    const headers = [
      'Date',
      'Cash Close',
      'PM Allocation',
      '12% Gross Profit',
      '100k Sys Fund',
      'Cheques Cleared',
      'Purchases Made',
      'Payments Made',
    ];
    const lines = rows.map((r) =>
      [
        r.date,
        r.totalCashClose,
        r.pmAllocation,
        r.grossProfit12,
        r.daily100k,
        r.chequesCleared,
        r.purchasesMade,
        r.paymentsMade,
      ].join(',')
    );
    if (totals) {
      lines.push(
        [
          'TOTALS',
          totals.totalCashClose,
          totals.pmAllocation,
          totals.grossProfit12,
          totals.daily100k,
          totals.chequesCleared,
          totals.purchasesMade,
          totals.paymentsMade,
        ].join(',')
      );
    }
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-pay-${filterValue}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel =
    filterMode === 'month'
      ? monthOptions.find((o) => o.key === periodKey)?.label ?? periodKey
      : filterYear;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 lg:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownUp className="w-6 h-6 opacity-90" />
              <h1 className="text-2xl lg:text-3xl font-bold">Cash Pay</h1>
            </div>
            <p className="text-emerald-100 max-w-2xl">
              Daily money flow — cash closes, PM allocations, 12% gross profit, 100k sys fund,
              cheques cleared, purchases and payments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 transition text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Period</span>
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setFilterMode('month')}
            className={`px-4 py-2 text-sm font-medium transition ${
              filterMode === 'month'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFilterMode('year')}
            className={`px-4 py-2 text-sm font-medium transition ${
              filterMode === 'year'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Yearly
          </button>
        </div>

        {filterMode === 'month' ? (
          <select
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {monthOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {yearOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <span className="text-sm text-gray-500 sm:ml-auto">
          {rows.length} day{rows.length !== 1 ? 's' : ''} in {periodLabel}
        </span>
      </div>

      {/* Summary cards */}
      {totals && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <SummaryCard icon={<Wallet className="w-4 h-4" />} label="Cash Close" value={totals.totalCashClose} color="emerald" />
          <SummaryCard icon={<Banknote className="w-4 h-4" />} label="PM Allocated" value={totals.pmAllocation} color="blue" />
          <SummaryCard icon={<PiggyBank className="w-4 h-4" />} label="12%" value={totals.grossProfit12} color="green" />
          <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="100k Sys" value={totals.daily100k} color="purple" />
          <SummaryCard icon={<CreditCard className="w-4 h-4" />} label="Cheques" value={totals.chequesCleared} color="amber" />
          <SummaryCard icon={<Receipt className="w-4 h-4" />} label="Purchases" value={totals.purchasesMade} color="orange" />
          <SummaryCard icon={<Banknote className="w-4 h-4" />} label="Payments" value={totals.paymentsMade} color="rose" />
        </div>
      )}

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Daily Money Flow</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              One row per business day — {periodLabel}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Banknote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No cash pay records for this period</p>
              <p className="text-sm mt-1">
                Data appears when cash closes, allocations, or payments are recorded.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Pay Day</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Cash Close</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">PM Allocated</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">12%</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">100k Sys</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Cheques Cleared</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Purchases</th>
                      <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedItems.map((row) => (
                      <DayRow key={row.date} row={row} />
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot>
                      <tr className="bg-emerald-50 font-semibold text-gray-900 border-t-2 border-emerald-200">
                        <td className="px-4 py-3 whitespace-nowrap">Totals</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{fmtUGX(totals.totalCashClose)}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{fmtUGX(totals.pmAllocation)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{fmtUGX(totals.grossProfit12)}</td>
                        <td className="px-4 py-3 text-right text-purple-700">{fmtUGX(totals.daily100k)}</td>
                        <td className="px-4 py-3 text-right text-amber-700">{fmtUGX(totals.chequesCleared)}</td>
                        <td className="px-4 py-3 text-right text-orange-700">{fmtUGX(totals.purchasesMade)}</td>
                        <td className="px-4 py-3 text-right text-rose-700">{fmtUGX(totals.paymentsMade)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                rowsPerPage={rowsPerPage}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={rows.length}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] ?? colors.emerald}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-80">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="text-sm font-bold truncate">{fmtUGX(value)}</div>
    </div>
  );
}

function DayRow({ row }: { row: CashPayDayRow }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{fmtDate(row.date)}</td>
      <td className="px-4 py-3 text-right text-gray-700">{fmtCell(row.totalCashClose)}</td>
      <td className="px-4 py-3 text-right text-blue-700">{fmtCell(row.pmAllocation)}</td>
      <td className="px-4 py-3 text-right text-green-700">{fmtCell(row.grossProfit12)}</td>
      <td className="px-4 py-3 text-right text-purple-700">
        {row.daily100k > 0 ? fmtUGX(row.daily100k) : <span className="text-gray-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3 text-right text-amber-700">{fmtCell(row.chequesCleared)}</td>
      <td className="px-4 py-3 text-right text-orange-700">{fmtCell(row.purchasesMade)}</td>
      <td className="px-4 py-3 text-right text-rose-700">{fmtCell(row.paymentsMade)}</td>
    </tr>
  );
}
