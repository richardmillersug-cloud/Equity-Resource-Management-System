'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Receipt,
  DollarSign,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { usePagination, PaginationBar } from '../../../../components/ui/Pagination';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { EquityWalletPanel } from '@/components/accountant/EquityWalletPanel';

type PaymentBucket = 'unpaid' | 'partial' | 'paid';
type PaymentTab = 'all' | PaymentBucket;
type PageSection = 'wallet' | 'register';

interface ExpenseRow {
  id: string;
  description: string;
  vendor: string;
  category: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentBucket;
  status: string;
  fundingSource: string;
  createdBy: string;
  date: Date;
}

interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  countUnpaid: number;
  countPartial: number;
  countPaid: number;
  sumUnpaidRemaining: number;
  sumPartialRemaining: number;
  ledgerPaymentsTotal: number;
  ledgerPaymentsCount: number;
}

function safeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toJsDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const withToDate = value as { toDate?: () => Date };
    if (typeof withToDate.toDate === 'function') return withToDate.toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function classifyPayment(amount: number, paid: number): PaymentBucket {
  if (amount > 0 && paid >= amount) return 'paid';
  if (paid > 0 && paid < amount) return 'partial';
  return 'unpaid';
}

export default function MdExpensesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<PageSection>(
    searchParams.get('tab') === 'register' ? 'register' : 'wallet'
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<PaymentTab>('all');
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setSection(searchParams.get('tab') === 'register' ? 'register' : 'wallet');
  }, [searchParams]);

  const selectSection = (next: PageSection) => {
    setSection(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/dashboard/managing-director/expenses?${params.toString()}`);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let expensesSnap;
      try {
        expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')));
      } catch {
        expensesSnap = await getDocs(collection(db, 'expenses'));
      }

      let paymentsSnap;
      try {
        paymentsSnap = await getDocs(
          query(collection(db, 'expensePayments'), orderBy('paymentDate', 'desc'))
        );
      } catch {
        paymentsSnap = await getDocs(collection(db, 'expensePayments'));
      }

      const rows: ExpenseRow[] = expensesSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        const amount = safeNumber(data.amount);
        const paidAmount = safeNumber(data.paidAmount);
        const remainingAmount = Math.max(
          0,
          safeNumber(data.remainingBalance) || amount - paidAmount
        );
        return {
          id: docSnap.id,
          description: data.description || data.expenseDescription || 'Expense',
          vendor: data.vendor || data.supplierName || '—',
          category: data.category || data.expenseType || data.type || 'General',
          amount,
          paidAmount,
          remainingAmount,
          paymentStatus: classifyPayment(amount, paidAmount),
          status: data.status || 'pending',
          fundingSource: data.fundingSource || '',
          createdBy: data.createdByName || data.createdBy || data.submittedBy || '—',
          date: toJsDate(data.expenseDate ?? data.date ?? data.createdAt),
        };
      });

      rows.sort((a, b) => b.date.getTime() - a.date.getTime());

      const paymentsTotal = paymentsSnap.docs.reduce((sum, docSnap) => {
        const data = docSnap.data();
        return sum + safeNumber(data.amount ?? data.paymentAmount);
      }, 0);

      const unpaid = rows.filter((r) => r.paymentStatus === 'unpaid');
      const partial = rows.filter((r) => r.paymentStatus === 'partial');
      const paid = rows.filter((r) => r.paymentStatus === 'paid');

      setExpenses(rows);
      setSummary({
        totalExpenses: rows.length,
        totalAmount: rows.reduce((s, r) => s + r.amount, 0),
        totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
        totalRemaining: rows.reduce((s, r) => s + r.remainingAmount, 0),
        countUnpaid: unpaid.length,
        countPartial: partial.length,
        countPaid: paid.length,
        sumUnpaidRemaining: unpaid.reduce((s, r) => s + r.remainingAmount, 0),
        sumPartialRemaining: partial.reduce((s, r) => s + r.remainingAmount, 0),
        ledgerPaymentsTotal: paymentsTotal,
        ledgerPaymentsCount: paymentsSnap.size,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading MD expenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayedExpenses = useMemo(() => {
    let list = expenses;
    if (activeTab !== 'all') {
      list = expenses.filter((e) => e.paymentStatus === activeTab);
    }
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (e) =>
        e.description.toLowerCase().includes(term) ||
        e.vendor.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term) ||
        e.createdBy.toLowerCase().includes(term) ||
        e.status.toLowerCase().includes(term)
    );
  }, [expenses, activeTab, searchTerm]);

  const {
    paginatedItems: pagedExpenses,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(displayedExpenses, 25);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: Date | null) => {
    if (!date || date.getTime() === 0) return 'N/A';
    return date.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const expenseExportData = useMemo(
    () =>
      displayedExpenses.map((e) => ({
        Description: e.description,
        Vendor: e.vendor,
        Category: e.category,
        Date: formatDate(e.date),
        Amount: formatCurrency(e.amount),
        Paid: formatCurrency(e.paidAmount),
        Remaining: formatCurrency(e.remainingAmount),
        'Payment Status': e.paymentStatus,
        Status: e.status,
        'Created By': e.createdBy,
      })),
    [displayedExpenses]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4 sm:p-6">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Expenses & Equity Wallet
              </h1>
              <p className="text-sm text-gray-600">
                General accounts wallet and expense register in one place
                {lastUpdated && (
                  <span className="text-gray-400">
                    {' '}
                    · Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/account-ledgers?type=accountant&filter=expense"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm text-sm"
            >
              Accountant ledger
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </Link>
            <button
              onClick={loadData}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 inline-flex flex-wrap gap-1">
          <button
            onClick={() => selectSection('wallet')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              section === 'wallet'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Equity Wallet
          </button>
          <button
            onClick={() => selectSection('register')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              section === 'register'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Expense Register
          </button>
        </div>

        {section === 'wallet' && (
          <div className="bg-white/60 rounded-2xl border border-indigo-100 p-4 sm:p-6">
            <EquityWalletPanel embedded initialTxFilter="expense" />
          </div>
        )}

        {section === 'register' && (
          <>
            {loading && (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading expenses...</p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadData}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && summary && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                          Total Remaining
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">
                          {formatCurrency(summary.totalRemaining)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {summary.totalExpenses} expenses · {formatCurrency(summary.totalAmount)}{' '}
                          total
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">Unpaid</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-600">
                          {summary.countUnpaid}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatCurrency(summary.sumUnpaidRemaining)}
                        </p>
                      </div>
                      <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                          Partially Paid
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600">
                          {summary.countPartial}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatCurrency(summary.sumPartialRemaining)} remaining
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                          Ledger Payments
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          {summary.ledgerPaymentsCount}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatCurrency(summary.ledgerPaymentsTotal)} posted
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { key: 'all', label: 'All', count: expenses.length },
                          {
                            key: 'unpaid',
                            label: 'Unpaid',
                            count: expenses.filter((e) => e.paymentStatus === 'unpaid').length,
                          },
                          {
                            key: 'partial',
                            label: 'Partial',
                            count: expenses.filter((e) => e.paymentStatus === 'partial').length,
                          },
                          {
                            key: 'paid',
                            label: 'Paid',
                            count: expenses.filter((e) => e.paymentStatus === 'paid').length,
                          },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setActiveTab(tab.key);
                            setCurrentPage(1);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.key
                              ? 'bg-purple-700 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tab.label}
                          <span className="ml-1 text-xs opacity-75">({tab.count})</span>
                        </button>
                      ))}
                    </div>
                    <div className="relative flex-1 sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search expense, vendor, category..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <ExportButtons
                      data={expenseExportData}
                      filename="md-expenses"
                      title="MD Expenses"
                      subtitle={`${displayedExpenses.length} expense(s) · ${activeTab}`}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Expense</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">
                            Remaining
                          </th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pagedExpenses.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              No expenses match your filter
                            </td>
                          </tr>
                        ) : (
                          pagedExpenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 max-w-[240px] truncate">
                                  {expense.description}
                                </div>
                                <div className="text-xs text-gray-400">{expense.category}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">
                                {expense.vendor}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatDate(expense.date)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-gray-900">
                                {formatCurrency(expense.amount)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-green-600">
                                {formatCurrency(expense.paidAmount)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                                {formatCurrency(expense.remainingAmount)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    expense.paymentStatus === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : expense.paymentStatus === 'partial'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {expense.paymentStatus === 'paid'
                                    ? 'Paid'
                                    : expense.paymentStatus === 'partial'
                                      ? 'Partial'
                                      : 'Unpaid'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {expense.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {totalItems > 0 && (
                    <div className="border-t border-gray-200 px-4 py-3">
                      <PaginationBar
                        currentPage={currentPage}
                        totalPages={totalPages}
                        rowsPerPage={rowsPerPage}
                        startIndex={startIndex}
                        endIndex={endIndex}
                        totalItems={totalItems}
                        onPageChange={setCurrentPage}
                        onRowsPerPageChange={setRowsPerPage}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
