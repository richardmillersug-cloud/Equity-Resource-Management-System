'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  X,
  AlertCircle,
  Eye,
  PlusCircle,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { authService } from '../../../../lib/firebase/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Date;
  status: string;
  referenceType: 'allocation' | 'invoice_payment' | 'expense_payment';
  referenceId: string;
  counterparty?: string;   // accountant name or supplier name
  raw: any;
}

interface PendingAllocation {
  id: string;
  amount: number;
  description: string;
  date: Date;
  accountantName?: string;
  businessDate?: string;
  shiftType?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (v: any): Date => {
  if (!v) return new Date(0);
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
};

const fmt = (d: Date) =>
  d.getTime() === 0 ? 'N/A' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtTime = (d: Date) =>
  d.getTime() === 0 ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const fmtCurrency = (n: number) =>
  `UGX ${Math.abs(isNaN(n) ? 0 : n).toLocaleString()}`;

const safeNum = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PMAccountPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [pending, setPending] = useState<PendingAllocation[]>([]);

  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // ── Deposit modal ──────────────────────────────────────────────────────────

  const DEPOSIT_SOURCES = [
    'Cash on Hand',
    'Bank Transfer',
    'Petty Cash',
    'Management Advance',
    'Supplier Refund',
    'Other',
  ] as const;

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositForm, setDepositForm] = useState({
    amount: '',
    source: 'Cash on Hand' as string,
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Check synchronously first (covers already-authenticated page reloads)
    const existingUser = authService.getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      setAuthLoading(false);
    }
    // Also subscribe so we catch the auth-restored event if it fires async
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    // Safety: if neither fires within 3 s, stop loading
    const timer = setTimeout(() => setAuthLoading(false), 3000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser?.uid) {
      loadData(currentUser.uid);
    } else if (!authLoading && !currentUser) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, currentUser?.uid]);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadData = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [allocSnap, invPaySnap, expPaySnap, depositSnap] = await Promise.all([
        getDocs(collection(db, 'cashAllocations')),
        getDocs(collection(db, 'invoicePayments')),
        getDocs(collection(db, 'expensePayments')),
        getDocs(collection(db, 'pmDeposits')),
      ]);

      const entries: LedgerEntry[] = [];
      const pendingList: PendingAllocation[] = [];

      // ── Credits: accepted cash allocations ─────────────────────────────
      allocSnap.docs.forEach(d => {
        const data = d.data();
        const allocatedTo = data.allocatedTo || data.pmId || data.recipientId;
        if (allocatedTo !== uid) return;

        if (data.status === 'pending') {
          pendingList.push({
            id: d.id,
            amount: safeNum(data.amount),
            description: data.description || `Allocation – ${data.businessDate || ''}`,
            date: toDate(data.createdAt || data.allocationDate),
            accountantName: data.allocatorName || data.accountantName,
            businessDate: data.businessDate,
            shiftType: data.shiftType,
          });
        } else if (data.status === 'accepted') {
          entries.push({
            id: d.id,
            type: 'credit',
            amount: safeNum(data.amount),
            description: data.description || `Cash allocation accepted`,
            date: toDate(data.acceptedAt || data.actionDate || data.createdAt),
            status: 'accepted',
            referenceType: 'allocation',
            referenceId: d.id,
            counterparty: data.allocatorName || data.accountantName,
            raw: data,
          });
        }
      });

      // ── Debits: invoice payments ───────────────────────────────────────
      invPaySnap.docs.forEach(d => {
        const data = d.data();
        if (data.paidBy !== uid && data.createdBy !== uid) return;
        entries.push({
          id: d.id,
          type: 'debit',
          amount: safeNum(data.paymentAmount ?? data.amount),
          description: data.description || `Invoice payment${data.invoiceNumber ? ` – INV ${data.invoiceNumber}` : ''}`,
          date: toDate(data.paymentDate || data.createdAt),
          status: data.paymentStatus || 'paid',
          referenceType: 'invoice_payment',
          referenceId: data.invoiceId || d.id,
          counterparty: data.supplierName || data.paidByName,
          raw: data,
        });
      });

      // ── Debits: expense payments ───────────────────────────────────────
      expPaySnap.docs.forEach(d => {
        const data = d.data();
        if (data.paidBy !== uid && data.createdBy !== uid) return;
        entries.push({
          id: d.id,
          type: 'debit',
          amount: safeNum(data.paymentAmount ?? data.amount),
          description: data.description || `Expense payment`,
          date: toDate(data.paymentDate || data.createdAt),
          status: data.paymentStatus || 'paid',
          referenceType: 'expense_payment',
          referenceId: data.expenseId || d.id,
          counterparty: data.paidByName,
          raw: data,
        });
      });

      // ── Credits: manual deposits from other sources ────────────────────
      depositSnap.docs.forEach(d => {
        const data = d.data();
        if (data.pmId !== uid) return;
        entries.push({
          id: d.id,
          type: 'credit',
          amount: safeNum(data.amount),
          description: data.description || `Deposit – ${data.source || 'Other'}`,
          date: toDate(data.depositDate || data.createdAt),
          status: 'completed',
          referenceType: 'manual_deposit',
          referenceId: d.id,
          counterparty: data.source,
          raw: data,
        });
      });

      // Sort newest first
      entries.sort((a, b) => b.date.getTime() - a.date.getTime());
      pendingList.sort((a, b) => b.date.getTime() - a.date.getTime());

      setLedger(entries);
      setPending(pendingList);
    } catch (err: any) {
      console.error('Error loading PM account data:', err);
      alert(`Failed to load account data: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Accept allocation ──────────────────────────────────────────────────────

  const handleAccept = async (alloc: PendingAllocation) => {
    if (!currentUser?.uid) return;
    setAcceptingId(alloc.id);
    try {
      await updateDoc(doc(db, 'cashAllocations', alloc.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: currentUser.uid,
        acceptedByName: currentUser.employee
          ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
          : currentUser.email,
        actionDate: serverTimestamp(),
        actionBy: currentUser.uid,
      });
      await loadData(currentUser.uid);
    } catch (err: any) {
      alert(`Failed to accept allocation: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Manual deposit ─────────────────────────────────────────────────────────

  const handleManualDeposit = async () => {
    if (!currentUser?.uid) return;
    const amount = parseFloat(depositForm.amount);
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }
    setDepositSaving(true);
    try {
      const pmName = currentUser.employee
        ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
        : currentUser.email;
      await addDoc(collection(db, 'pmDeposits'), {
        pmId: currentUser.uid,
        pmName,
        amount,
        source: depositForm.source,
        description: depositForm.description || `Deposit from ${depositForm.source}`,
        depositDate: Timestamp.fromDate(new Date(depositForm.date)),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
      setShowDeposit(false);
      setDepositForm({ amount: '', source: 'Cash on Hand', description: '', date: new Date().toISOString().slice(0, 10) });
      await loadData(currentUser.uid);
    } catch (err: any) {
      alert(`Failed to record deposit: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setDepositSaving(false);
    }
  };


  const totalReceived = ledger
    .filter(e => e.type === 'credit')
    .reduce((s, e) => s + safeNum(e.amount), 0);

  const totalSpent = ledger
    .filter(e => e.type === 'debit')
    .reduce((s, e) => s + safeNum(e.amount), 0);

  const balance = totalReceived - totalSpent;

  const pendingTotal = pending.reduce((s, p) => s + safeNum(p.amount), 0);

  // Running balance for ledger display (oldest first → newest first reverse)
  const withRunning = (() => {
    const oldest = [...ledger].reverse();
    let running = 0;
    const mapped = oldest.map(e => {
      running += e.type === 'credit' ? safeNum(e.amount) : -safeNum(e.amount);
      return { ...e, runningBalance: running };
    });
    return mapped.reverse();
  })();

  // Date range boundaries
  const dateRangeStart = (() => {
    const now = new Date();
    if (dateRange === 'today') {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    if (dateRange === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d;
    }
    if (dateRange === 'month') {
      const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
    }
    return null;
  })();

  const filtered = withRunning.filter(e => {
    const matchFilter = filter === 'all' || e.type === filter;
    const matchDate = !dateRangeStart || e.date >= dateRangeStart;
    const matchSearch =
      !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.counterparty ?? '').toLowerCase().includes(search.toLowerCase()) ||
      e.referenceId.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchDate && matchSearch;
  });

  // Pending filtered to today if dateRange === 'today'
  const filteredPending = pending.filter(p =>
    !dateRangeStart || p.date >= dateRangeStart
  );

  // ── Loading ────────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
        <span className="text-gray-600 text-lg">{authLoading ? 'Authenticating...' : 'Loading account...'}</span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">PM Account</h1>
              <p className="text-sm text-gray-500">Personal ledger — all received funds and payments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeposit(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Deposit
            </button>
            <button
              onClick={() => currentUser?.uid && loadData(currentUser.uid)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Balance + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Balance — hero card */}
          <div className={`lg:col-span-2 rounded-2xl p-6 text-white shadow-lg ${
            balance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
          }`}>
            <p className="text-sm font-medium text-white/80 mb-1">Current Balance</p>
            <p className="text-4xl font-bold tracking-tight">{fmtCurrency(balance)}</p>
            <p className={`text-sm mt-2 font-medium ${balance >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>
              {balance >= 0 ? `Available to spend` : `Overspent by ${fmtCurrency(Math.abs(balance))}`}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-500">Total Received</p>
              <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{fmtCurrency(totalReceived)}</p>
            <p className="text-xs text-gray-400 mt-1">{ledger.filter(e => e.type === 'credit').length} allocations</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <ArrowUpCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-700">{fmtCurrency(totalSpent)}</p>
            <p className="text-xs text-gray-400 mt-1">{ledger.filter(e => e.type === 'debit').length} payments</p>
          </div>
        </div>

        {/* Pending Allocations */}
        {filteredPending.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">
                Pending Allocations — {fmtCurrency(pendingTotal)} awaiting your acceptance
              </h3>
            </div>
            <div className="space-y-3">
              {filteredPending.map(alloc => (
                <div key={alloc.id} className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-gray-900">{fmtCurrency(alloc.amount)}</span>
                      {alloc.shiftType && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                          {alloc.shiftType}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{alloc.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {alloc.accountantName && <span>From: {alloc.accountantName}</span>}
                      {alloc.businessDate && <span>Business date: {alloc.businessDate}</span>}
                      <span>{fmt(alloc.date)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAccept(alloc)}
                    disabled={acceptingId === alloc.id}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    {acceptingId === alloc.id
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <CheckCircle className="w-4 h-4" />}
                    Accept & Deposit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ledger */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Ledger header + controls */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="font-semibold text-gray-900 text-lg">Transaction Ledger</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Date range filter */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  {(['today', 'week', 'month', 'all'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDateRange(d)}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        dateRange === d ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {d === 'today' ? 'Today' : d === 'week' ? '7 Days' : d === 'month' ? 'This Month' : 'All Time'}
                    </button>
                  ))}
                </div>
                {/* Type filter */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  {(['all', 'credit', 'debit'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 font-medium transition-colors ${
                        filter === f
                          ? f === 'credit' ? 'bg-emerald-600 text-white'
                          : f === 'debit' ? 'bg-red-600 text-white'
                          : 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'credit' ? 'Received' : 'Payments'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by description, counterparty or reference..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Ledger table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Balance</th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No transactions found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {search || filter !== 'all'
                          ? 'Try adjusting your search or filter.'
                          : dateRange !== 'all'
                          ? 'No transactions in this period. Try "All Time" or accept a pending allocation.'
                          : 'Accept an allocation to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(entry => (
                    <tr key={`${entry.referenceType}-${entry.id}`} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="text-sm text-gray-900">{fmt(entry.date)}</div>
                        <div className="text-xs text-gray-400">{fmtTime(entry.date)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-gray-900 max-w-[260px] truncate">
                          {entry.description}
                        </div>
                        {entry.counterparty && (
                          <div className="text-xs text-gray-400 mt-0.5">{entry.counterparty}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                          entry.type === 'credit'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {entry.type === 'credit'
                            ? <ArrowDownCircle className="w-3 h-3" />
                            : <ArrowUpCircle className="w-3 h-3" />}
                          {entry.type === 'credit' ? 'Received' : 'Payment'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          entry.type === 'credit' ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {entry.type === 'credit' ? '+' : '−'} {fmtCurrency(entry.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right hidden sm:table-cell">
                        <span className={`text-sm font-mono font-medium ${
                          entry.runningBalance >= 0 ? 'text-gray-700' : 'text-red-600'
                        }`}>
                          {fmtCurrency(entry.runningBalance)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">
                      {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="text-xs text-emerald-600 font-medium">
                        +{fmtCurrency(filtered.filter(e => e.type === 'credit').reduce((s, e) => s + safeNum(e.amount), 0))}
                      </div>
                      <div className="text-xs text-red-600 font-medium">
                        −{fmtCurrency(filtered.filter(e => e.type === 'debit').reduce((s, e) => s + safeNum(e.amount), 0))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right hidden sm:table-cell">
                      <span className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {fmtCurrency(balance)}
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                    selectedEntry.type === 'credit'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedEntry.type === 'credit'
                      ? <ArrowDownCircle className="w-3 h-3" />
                      : <ArrowUpCircle className="w-3 h-3" />}
                    {selectedEntry.type === 'credit' ? 'Received' : 'Payment'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{fmt(selectedEntry.date)}</p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Amount */}
              <div className={`rounded-xl p-4 text-center ${
                selectedEntry.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {selectedEntry.type === 'credit' ? 'Amount Received' : 'Amount Paid'}
                </p>
                <p className={`text-3xl font-bold ${
                  selectedEntry.type === 'credit' ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {selectedEntry.type === 'credit' ? '+' : '−'} {fmtCurrency(selectedEntry.amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Balance after: {fmtCurrency(selectedEntry.runningBalance)}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Description', value: selectedEntry.description },
                  { label: selectedEntry.type === 'credit' ? 'From' : 'To / Ref', value: selectedEntry.counterparty },
                  { label: 'Date', value: `${fmt(selectedEntry.date)} ${fmtTime(selectedEntry.date)}` },
                  { label: 'Type', value: selectedEntry.referenceType.replace(/_/g, ' ') },
                  { label: 'Reference ID', value: selectedEntry.referenceId.slice(-12) },
                  { label: 'Status', value: selectedEntry.status },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[220px] truncate capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deposit Modal ─────────────────────────────────────────────────── */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Record Deposit</h2>
                  <p className="text-xs text-gray-500">Add funds from another source</p>
                </div>
              </div>
              <button onClick={() => setShowDeposit(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositForm.amount}
                    onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
                <select
                  value={depositForm.source}
                  onChange={e => setDepositForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DEPOSIT_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={depositForm.date}
                    onChange={e => setDepositForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  value={depositForm.description}
                  onChange={e => setDepositForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Petty cash top-up from management"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowDeposit(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleManualDeposit}
                disabled={depositSaving || !depositForm.amount}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {depositSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {depositSaving ? 'Saving...' : 'Record Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
