'use client';

import { useState, useEffect, useRef } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { authService } from '@/lib/firebase/auth';
import {
  walletLedgerService,
  WalletMonthlySummary,
  WalletLedgerEntry,
} from '@/lib/firebase/wallet-ledger-service';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  CheckCheck,
  RefreshCw,
  TrendingUp,
  Wallet,
  Calendar,
  ChevronDown,
  Receipt,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-UG', { day: '2-digit', month: 'short' });
}

/** Deterministic account number from branchId — same input always gives same output */
function generateAccountNumber(branchId: string): string {
  let hash = 5381;
  for (let i = 0; i < branchId.length; i++) {
    hash = ((hash << 5) + hash + branchId.charCodeAt(i)) & 0x7fffffff;
  }
  const digits = String(hash).padStart(10, '1').slice(0, 10);
  // Format: 1001 XXXX XXXX (12 digits)
  return `1001 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
}

function maskAccountNumber(acct: string): string {
  // show first 4 and last 4, mask the middle
  const parts = acct.split(' ');
  if (parts.length < 3) return acct;
  return `${parts[0]} •••• ${parts[2]}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TxTypeFilter = 'all' | 'deposit' | 'payment';
type ShiftFilter = 'all' | 'day' | 'night';

export default function YourAccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WalletMonthlySummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);
  const balanceAnim = useRef<ReturnType<typeof setInterval> | null>(null);

  const [txFilter, setTxFilter] = useState<TxTypeFilter>('all');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');

  const [branchId, setBranchId] = useState('');
  const [holderName, setHolderName] = useState('Equity Shoppers');


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

  function animateBalance(target: number) {
    if (balanceAnim.current) clearInterval(balanceAnim.current);
    if (target === 0) { setDisplayBalance(0); return; }
    const steps = 70;
    const duration = 1600;
    const step_size = target / steps;
    let step = 0;
    balanceAnim.current = setInterval(() => {
      step++;
      setDisplayBalance(step >= steps ? target : Math.round(step_size * step));
      if (step >= steps) clearInterval(balanceAnim.current!);
    }, duration / steps);
  }

  const load = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const bid =
        user.employee?.branchId ||
        (user as Record<string, unknown>).branchId as string ||
        'default-branch';

      const accountUserName =
        user.displayName?.trim() ||
        [user.employee?.firstName, user.employee?.lastName].filter(Boolean).join(' ').trim() ||
        user.email?.split('@')[0] ||
        '';

      setBranchId(bid);
      if (accountUserName) setHolderName(accountUserName.toUpperCase());

      const s = await walletLedgerService.getWalletSummary(bid, key);
      setSummary(s);
      setTimeout(() => animateBalance(s.netBalance), 150);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load(periodKey);
    return () => { if (balanceAnim.current) clearInterval(balanceAnim.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  const accountNumber = generateAccountNumber(branchId || 'default-branch');

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEntries = summary?.entries.filter((e) => {
    if (txFilter === 'deposit' && e.entryType === 'expense_payment') return false;
    if (txFilter === 'payment' && e.entryType !== 'expense_payment') return false;
    if (txFilter === 'deposit' && shiftFilter !== 'all' && e.shiftType !== shiftFilter) return false;
    return true;
  }) ?? [];

  // Pagination
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

  const [selYear, selMonth] = periodKey.split('-').map(Number);
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const isCurrentMonth = periodKey === currentPeriodKey;
  const dayProgress = isCurrentMonth ? now.getDate() : daysInMonth;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-8 space-y-8">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">Accountant Workspace</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Your Account</h1>
            <p className="text-blue-200 mt-1 text-sm">Equity Shoppers Wallet Account</p>
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-blue-200" />
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
            >
              {monthOptions.map((o) => (
                <option key={o.key} value={o.key} className="text-gray-900 bg-white">{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* ── Bank Card ── */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl select-none"
        style={{ aspectRatio: '1.586 / 1', maxHeight: 340 }}
      >
        {/* Card background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600" />

        {/* Decorative circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute left-1/2 -bottom-32 w-80 h-80 rounded-full bg-emerald-900/40" />

        {/* Chip graphic */}
        <div className="absolute top-8 left-8">
          <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-inner grid grid-cols-3 gap-px p-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-yellow-400/60 rounded-sm" />
            ))}
          </div>
        </div>

        {/* Wifi / contactless icon */}
        <div className="absolute top-8 right-8 opacity-60">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-none stroke-white stroke-2">
            <path d="M12 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            <path d="M8.5 17.5a5 5 0 0 1 7 0" strokeLinecap="round" />
            <path d="M5 14a9 9 0 0 1 14 0" strokeLinecap="round" />
            <path d="M1.5 10.5a13.5 13.5 0 0 1 21 0" strokeLinecap="round" />
          </svg>
        </div>

        {/* Card content */}
        <div className="absolute inset-0 flex flex-col justify-between p-8">
          {/* Top: logo */}
          <div className="flex items-center gap-2 mt-6">
            <Wallet className="w-5 h-5 text-emerald-200" />
            <span className="text-emerald-100 font-bold text-sm tracking-widest uppercase">
              Equity Shoppers
            </span>
          </div>

          {/* Middle: balance */}
          <div>
            <p className="text-emerald-300 text-xs tracking-widest uppercase mb-1">
              Available Balance
            </p>
            {loading ? (
              <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <p className="text-white text-4xl font-bold tabular-nums tracking-tight">
                {fmtUGX(displayBalance)}
              </p>
            )}
          </div>

          {/* Bottom: account number + holder */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-emerald-300 text-xs tracking-widest uppercase mb-1">
                Account Number
              </p>
              <div className="flex items-center gap-3">
                <p className="text-white font-mono text-lg tracking-widest">
                  {showFull ? accountNumber : maskAccountNumber(accountNumber)}
                </p>
                <button
                  onClick={() => setShowFull((v) => !v)}
                  className="text-emerald-300 hover:text-white transition-colors text-xs underline underline-offset-2"
                >
                  {showFull ? 'hide' : 'show'}
                </button>
                <button
                  onClick={handleCopy}
                  className="text-emerald-300 hover:text-white transition-colors"
                  title="Copy account number"
                >
                  {copied
                    ? <CheckCheck className="w-4 h-4 text-green-300" />
                    : <Copy className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-300 text-xs tracking-widest uppercase mb-1">
                Account Holder
              </p>
              <p className="text-white font-semibold text-sm tracking-wide">{holderName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-red-800 font-medium text-sm">Failed to load account data</p>
            <p className="text-red-600 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ── Sub-account summary cards ── */}
      {!loading && summary && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {/* Gross Profit Wallet */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
                  Gross Profit (12%)
                </p>
                <p className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">
                  {fmtUGX(summary.grossProfitTotal)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {summary.daysCovered} cash close{summary.daysCovered !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Daily Expense Fund */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
                  Daily Expense Fund
                </p>
                <p className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">
                  {fmtUGX(summary.dailyExpenseTotal)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {summary.daysCovered} business day{summary.daysCovered !== 1 ? 's' : ''} covered
                </p>
              </div>
            </div>

            {/* Payments Out */}
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">
                  Payments Out
                </p>
                <p className="text-xl font-bold text-red-700 tabular-nums mt-0.5">
                  -{fmtUGX(summary.totalExpensePayments)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Net: {fmtUGX(summary.netBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Month progress bar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">
                {new Date(selYear, selMonth - 1, 1).toLocaleDateString('en-UG', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span>Day {dayProgress} / {daysInMonth}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(dayProgress / daysInMonth) * 100}%` }}
              />
            </div>
          </div>

          {/* ── Transaction history ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-800">Transactions</h2>
                </div>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                  {filteredEntries.length}{filteredEntries.length !== summary.entries.length ? ` / ${summary.entries.length}` : ''} transaction{summary.entries.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Quick filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Type toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  {(['all', 'deposit', 'payment'] as TxTypeFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setTxFilter(f); if (f !== 'deposit') setShiftFilter('all'); }}
                      className={`px-3 py-1.5 transition-colors ${
                        txFilter === f
                          ? f === 'payment'
                            ? 'bg-red-600 text-white'
                            : f === 'deposit'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-900 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : 'Payments'}
                    </button>
                  ))}
                </div>

                {/* Shift sub-filter — only when Deposits is active */}
                {txFilter === 'deposit' && (
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                    {(['all', 'day', 'night'] as ShiftFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setShiftFilter(s)}
                        className={`px-3 py-1.5 transition-colors ${
                          shiftFilter === s
                            ? s === 'day'
                              ? 'bg-amber-500 text-white'
                              : s === 'night'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-700 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {s === 'all' ? 'All Shifts' : s === 'day' ? 'Day' : 'Night'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {summary.entries.length === 0 ? 'No transactions this period' : 'No transactions match this filter'}
                </p>
                <p className="text-xs mt-1">
                  {summary.entries.length === 0 ? 'Deposits and expense payments appear here' : 'Try a different filter above'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {paginatedEntries.map((entry) => (
                  <TransactionRow key={entry.id} entry={entry} />
                ))}
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

            {/* Footer totals */}
            {summary.entries.length > 0 && (
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total deposited</span>
                  <span className="text-sm font-semibold text-emerald-700">+{fmtUGX(summary.combinedTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total payments out</span>
                  <span className="text-sm font-semibold text-red-600">-{fmtUGX(summary.totalExpensePayments)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="text-xs text-gray-700 font-medium">Net balance</span>
                  <span className="text-sm font-bold text-gray-900">{fmtUGX(summary.netBalance)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 h-14 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
        </div>
      )}
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ entry }: { entry: WalletLedgerEntry }) {
  const isDebit = entry.entryType === 'expense_payment';

  if (isDebit) {
    const amount = entry.debitAmount ?? 0;
    return (
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-red-50/40 transition-colors">
        {/* Icon */}
        <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <ArrowUpRight className="w-4 h-4 text-red-500" />
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {entry.expenseDescription || 'Expense Payment'}
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Payment
            </span>
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-gray-400">{fmtDate(entry.date)}</p>
            {entry.vendor && entry.vendor !== 'Unknown vendor' && (
              <span className="text-xs text-gray-400 truncate max-w-[120px]">{entry.vendor}</span>
            )}
          </div>
        </div>

        {/* Fund source tag */}
        <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs text-gray-400 mr-4">
          <span className={entry.fundingSource === 'DAILY_EXPENSE_FUND' ? 'text-blue-500' : 'text-emerald-600'}>
            {entry.fundingSource === 'DAILY_EXPENSE_FUND' ? 'Daily Fund' : 'Gross Profit'}
          </span>
          {entry.paidByName && (
            <span className="text-gray-300 truncate max-w-[100px]">{entry.paidByName}</span>
          )}
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-red-600">-{fmtUGX(amount)}</p>
          <p className="text-xs text-gray-400">{fmtShortDate(entry.date)}</p>
        </div>
      </div>
    );
  }

  // Deposit entry (legacy or entryType === 'deposit')
  const total = (entry.grossProfitDeposit ?? 0) + (entry.dailyExpenseDeposit ?? 0);

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
        <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          Cash Close Deposit
          <span
            className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              entry.shiftType === 'day'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {entry.shiftType === 'day' ? 'Day' : 'Night'}
          </span>
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-gray-400">
            {fmtDate(entry.date)}
          </p>
          {(entry.dailyExpenseDeposit ?? 0) > 0 && (
            <span className="text-xs text-blue-500">+100k daily</span>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs text-gray-400 mr-4">
        <span className="text-green-600">+{fmtUGX(entry.grossProfitDeposit ?? 0)} profit</span>
        {(entry.dailyExpenseDeposit ?? 0) > 0
          ? <span className="text-blue-500">+{fmtUGX(entry.dailyExpenseDeposit ?? 0)} daily</span>
          : <span className="italic text-gray-300">daily ×</span>
        }
      </div>

      {/* Total amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-emerald-700">+{fmtUGX(total)}</p>
        <p className="text-xs text-gray-400">{fmtShortDate(entry.date)}</p>
      </div>
    </div>
  );
}
