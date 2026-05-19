'use client';

import { useState, useEffect, useRef } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { authService } from '@/lib/firebase/auth';
import { walletLedgerService, WalletMonthlySummary, WalletLedgerEntry } from '@/lib/firebase/wallet-ledger-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUGX(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-UG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialReportsPage() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [summary, setSummary]           = useState<WalletMonthlySummary | null>(null);
  const [grossVisible, setGrossVisible] = useState(false);
  const [dailyVisible, setDailyVisible] = useState(false);
  const [displayGross, setDisplayGross] = useState(0);
  const [displayDaily, setDisplayDaily] = useState(0);
  const grossAnim = useRef<ReturnType<typeof setInterval> | null>(null);
  const dailyAnim = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pagination for ledger entries
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems: paginatedEntries,
    startIndex: pageStartIndex,
    endIndex: pageEndIndex,
  } = usePagination(summary?.entries ?? [], 10);

  // month selector – default current month
  const now = new Date();
  const currentPeriodKey = walletLedgerService.getPeriodKey(now);
  const [periodKey, setPeriodKey] = useState(currentPeriodKey);

  // build last-12-months selector options
  const monthOptions: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = walletLedgerService.getPeriodKey(d);
    const label = d.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
    monthOptions.push({ key, label });
  }

  // ── Animated counter helper
  function animateCounter(
    target: number,
    setter: (v: number) => void,
    animRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) {
    if (animRef.current) clearInterval(animRef.current);
    if (target === 0) { setter(0); return; }
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
        (user as any).branchId ||
        (user as any).employee?.branchId ||
        'default-branch';

      const s = await walletLedgerService.getWalletSummary(branchId, key);
      setSummary(s);

      // Animate cards in after a short delay
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
    load(periodKey);
    return () => {
      if (grossAnim.current) clearInterval(grossAnim.current);
      if (dailyAnim.current) clearInterval(dailyAnim.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  // days in selected month
  const [selYear, selMonth] = periodKey.split('-').map(Number);
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const isCurrentMonth = periodKey === currentPeriodKey;
  const dayProgress = isCurrentMonth ? now.getDate() : daysInMonth;

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equity Wallet</h1>
          <p className="text-gray-600 mt-1">
            Real-time ledger — 12% gross profit &amp; 100,000 UGX daily expense fund tracked from every cash close
          </p>
        </div>
        {/* Month selector */}
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {monthOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          <span className="ml-3 text-gray-600">Loading wallet ledger…</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-red-400 text-xl">⚠️</span>
          <div>
            <p className="text-red-800 font-medium">Failed to load wallet data</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && summary && (
        <>
          {/* ── Wallet cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gross Profit Wallet */}
            <div
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6 shadow-sm transition-all duration-700"
              style={{
                opacity: grossVisible ? 1 : 0,
                transform: grossVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">
                    💰
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Gross Profit Wallet</h3>
                    <p className="text-sm text-green-600">12% deposit per cash close</p>
                  </div>
                </div>
                <div className="text-right text-xs text-green-600">
                  <div className="font-medium">
                    {new Date(selYear, selMonth - 1, 1).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-green-500">{summary.entryCount} close{summary.entryCount !== 1 ? 's' : ''} recorded</div>
                </div>
              </div>

              <div className="text-3xl font-bold text-green-800 tabular-nums mb-1" style={{ letterSpacing: '-0.5px' }}>
                {fmtUGX(displayGross)}
              </div>
              <p className="text-sm text-green-600 mb-3">
                {summary.entryCount > 0
                  ? `Accumulated across ${summary.entryCount} cash close${summary.entryCount !== 1 ? 's' : ''}`
                  : 'No cash closes recorded yet for this month'}
              </p>

              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex justify-between text-xs text-green-600 mb-2">
                  <span>Month progress</span>
                  <span>📅 {dayProgress} / {daysInMonth} days</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(dayProgress / daysInMonth) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-green-500 mt-1">12% of each day&apos;s totalCashInTill deposited on close</p>
              </div>
            </div>

            {/* Daily Expense Fund Wallet */}
            <div
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6 shadow-sm transition-all duration-700"
              style={{
                opacity: dailyVisible ? 1 : 0,
                transform: dailyVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                    🏦
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">Daily Expense Fund</h3>
                    <p className="text-sm text-blue-600">100,000 UGX per business day</p>
                  </div>
                </div>
                <div className="text-right text-xs text-blue-600">
                  <div className="font-medium">
                    {new Date(selYear, selMonth - 1, 1).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-blue-500">{summary.daysCovered} day{summary.daysCovered !== 1 ? 's' : ''} covered</div>
                </div>
              </div>

              <div className="text-3xl font-bold text-blue-800 tabular-nums mb-1" style={{ letterSpacing: '-0.5px' }}>
                {fmtUGX(displayDaily)}
              </div>
              <p className="text-sm text-blue-600 mb-3">
                {summary.daysCovered > 0
                  ? `100k collected on ${summary.daysCovered} business day${summary.daysCovered !== 1 ? 's' : ''}`
                  : 'No daily collections recorded yet for this month'}
              </p>

              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between text-xs text-blue-600 mb-2">
                  <span>Days covered</span>
                  <span>📅 {summary.daysCovered} / {daysInMonth} days</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((summary.daysCovered / daysInMonth) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-blue-500 mt-1">Collected once per business day regardless of shift count</p>
              </div>
            </div>
          </div>

          {/* ── Overview row ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Wallet Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Combined Total"
                value={fmtUGX(summary.combinedTotal)}
                sub="Gross + Daily"
                color="purple"
              />
              <Stat
                label="Gross Profit"
                value={fmtUGX(summary.grossProfitTotal)}
                sub={`${summary.entryCount} closes`}
                color="green"
              />
              <Stat
                label="Expense Fund"
                value={fmtUGX(summary.dailyExpenseTotal)}
                sub={`${summary.daysCovered} days`}
                color="blue"
              />
              <Stat
                label="Days Remaining"
                value={isCurrentMonth ? String(daysInMonth - now.getDate()) : '—'}
                sub={isCurrentMonth ? 'Until month end' : 'Past period'}
                color="orange"
              />
            </div>
          </div>

          {/* ── Ledger table ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ledger — Cash Close Deposits</h3>
              <span className="text-sm text-gray-500">{summary.entries.length} entries</span>
            </div>

            {summary.entries.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <div className="text-4xl mb-3">📒</div>
                <p className="font-medium">No ledger entries for this month</p>
                <p className="text-sm mt-1">Deposits are recorded automatically when a cash close is submitted.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Shift</th>
                      <th className="text-right px-4 py-3 font-medium">Revenue</th>
                      <th className="text-right px-4 py-3 font-medium">Gross (12%)</th>
                      <th className="text-right px-4 py-3 font-medium">Daily 100k</th>
                      <th className="text-right px-4 py-3 font-medium">Total Deposit</th>
                      <th className="text-left px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedEntries.map((e) => (
                      <LedgerRow key={e.id} entry={e} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-gray-800 border-t-2 border-gray-200">
                      <td colSpan={3} className="px-4 py-3 text-sm">Totals</td>
                      <td className="px-4 py-3 text-right text-green-700">{fmtUGX(summary.grossProfitTotal)}</td>
                      <td className="px-4 py-3 text-right text-blue-700">{fmtUGX(summary.dailyExpenseTotal)}</td>
                      <td className="px-4 py-3 text-right text-purple-700">{fmtUGX(summary.combinedTotal)}</td>
                      <td />
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
              totalItems={summary?.entries.length ?? 0}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </div>

          {/* ── Info note ── */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <span className="text-yellow-500 text-xl">🔄</span>
            <div>
              <p className="text-sm font-semibold text-yellow-800">Monthly Reset</p>
              <p className="text-xs text-yellow-700 mt-1">
                Ledger entries are per-month. At month end the gross profit and daily expense fund balances
                reset to zero, giving clean accounting periods. Historical months remain accessible via the
                month selector above.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: 'purple' | 'green' | 'blue' | 'orange';
}) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    green:  'bg-green-50  border-green-200  text-green-600',
    blue:   'bg-blue-50   border-blue-200   text-blue-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
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
  const totalDeposit = entry.grossProfitDeposit + entry.dailyExpenseDeposit;
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
          {entry.shiftType === 'day' ? '☀️ Day' : '🌙 Night'}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-gray-600">
        {fmtUGX(entry.sourceRevenue)}
      </td>
      <td className="px-4 py-3 text-right font-medium text-green-700">
        {fmtUGX(entry.grossProfitDeposit)}
      </td>
      <td className="px-4 py-3 text-right font-medium text-blue-700">
        {entry.dailyExpenseDeposit > 0 ? (
          fmtUGX(entry.dailyExpenseDeposit)
        ) : (
          <span className="text-gray-400 text-xs italic">already collected</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-purple-700">
        {fmtUGX(totalDeposit)}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
        {entry.notes || '—'}
      </td>
    </tr>
  );
}
