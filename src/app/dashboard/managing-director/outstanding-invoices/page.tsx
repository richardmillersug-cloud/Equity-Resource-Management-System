'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  DollarSign,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Receipt
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { usePagination, PaginationBar } from '../../../../components/ui/Pagination';
import {
  reconcileOutstandingFromPaidAmount,
  getInvoiceAmount,
  getInvoiceDate,
  safeNumber,
  type OutstandingReconciliation,
} from '../../../../lib/firebase/invoice-outstanding';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  date: Date;
  dueDate: Date | null;
}

interface ReconciliationSummary extends OutstandingReconciliation {}

type TabFilter = 'unpaid' | 'partial' | 'all';

function classifyInvoice(amount: number, paid: number): 'paid' | 'partial' | 'unpaid' {
  const remaining = Math.max(0, amount - paid);
  if (amount > 0 && paid >= amount) return 'paid';
  if (paid > 0 && paid < amount) return 'partial';
  if (remaining > 0) return 'unpaid';
  return 'paid';
}

export default function OutstandingInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceRow[]>([]);
  const [partialInvoices, setPartialInvoices] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      let invoicesSnapshot;
      try {
        invoicesSnapshot = await getDocs(
          query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
        );
      } catch {
        invoicesSnapshot = await getDocs(query(collection(db, 'invoices')));
      }

      const unpaid: InvoiceRow[] = [];
      const partial: InvoiceRow[] = [];
      const invoiceRecords: Array<{ id: string } & Record<string, unknown>> = [];

      invoicesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        invoiceRecords.push({ id: doc.id, ...data });
        const amount = getInvoiceAmount(data);
        const paidAmount = safeNumber(data.paidAmount);
        const remainingAmount = Math.max(0, amount - paidAmount);
        const category = classifyInvoice(amount, paidAmount);

        const row: InvoiceRow = {
          id: doc.id,
          invoiceNumber: data.invoiceNumber || data.fdn || `INV-${doc.id.slice(0, 8)}`,
          supplierName: data.supplierName || data.supplier_name || 'Unknown Supplier',
          amount,
          paidAmount,
          remainingAmount,
          status: data.status || 'Pending',
          date: getInvoiceDate(data) ?? new Date(),
          dueDate: data.dueDate?.toDate?.() ?? null
        };

        if (category === 'partial') {
          partial.push(row);
        } else if (category === 'unpaid') {
          unpaid.push(row);
        }
      });

      const summary = reconcileOutstandingFromPaidAmount(invoiceRecords);

      setUnpaidInvoices(unpaid);
      setPartialInvoices(partial);
      setSummary(summary);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading outstanding invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const displayedInvoices = useMemo(() => {
    let list: InvoiceRow[] = [];
    if (activeTab === 'unpaid') list = unpaidInvoices;
    else if (activeTab === 'partial') list = partialInvoices;
    else list = [...unpaidInvoices, ...partialInvoices];

    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      inv =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.supplierName.toLowerCase().includes(term) ||
        inv.status.toLowerCase().includes(term)
    );
  }, [activeTab, unpaidInvoices, partialInvoices, searchTerm]);

  const {
    paginatedItems: pagedInvoices,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    totalItems
  } = usePagination(displayedInvoices, 25);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading outstanding invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadInvoices}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Outstanding Invoices
                </h1>
                <p className="text-sm text-gray-600">
                  Verify unpaid and partially paid invoice totals
                  {lastUpdated && (
                    <span className="text-gray-400">
                      {' '}
                      · Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={loadInvoices}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Reconciliation Panel */}
          {summary && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Outstanding Reconciliation
                </h2>
                {summary.sumsMatch ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Sums verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                    <XCircle className="w-3 h-3" />
                    Sum mismatch
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Sum of all invoices</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(summary.sumAllInvoices)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      Less: completely paid ({summary.countCompletelyPaid})
                    </span>
                    <span className="font-mono font-medium text-green-600">
                      − {formatCurrency(summary.sumCompletelyPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      Less: partial payments ({summary.countPartial})
                    </span>
                    <span className="font-mono font-medium text-green-600">
                      − {formatCurrency(summary.sumPartialPayments)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-3 mt-2">
                    <span className="font-semibold text-blue-900">
                      Total outstanding
                    </span>
                    <span className="font-mono font-bold text-blue-900 text-lg">
                      {formatCurrency(summary.totalOutstanding)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      Fully unpaid remaining ({summary.countFullyUnpaid})
                    </span>
                    <span className="font-mono font-medium text-red-600">
                      {formatCurrency(summary.sumFullyUnpaidRemaining)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">
                      Partially paid remaining ({summary.countPartial})
                    </span>
                    <span className="font-mono font-medium text-yellow-600">
                      {formatCurrency(summary.sumPartialRemaining)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 bg-gray-50 rounded-lg px-3 mt-2">
                    <span className="font-semibold text-gray-900">
                      Sum of remaining balances
                    </span>
                    <span className="font-mono font-bold text-gray-900 text-lg">
                      {formatCurrency(
                        summary.sumFullyUnpaidRemaining + summary.sumPartialRemaining
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.totalInvoices} total invoices in database
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total Outstanding
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {formatCurrency(summary.totalOutstanding)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Fully Unpaid
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">
                      {summary.countFullyUnpaid}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(summary.sumFullyUnpaidRemaining)}
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
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {summary.countPartial}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(summary.sumPartialRemaining)} remaining
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Fully Paid
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {summary.countCompletelyPaid}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(summary.sumCompletelyPaid)}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs + Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2">
              {(
                [
                  { key: 'all', label: 'All Outstanding' },
                  { key: 'unpaid', label: 'Fully Unpaid' },
                  { key: 'partial', label: 'Partially Paid' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-xs opacity-75">
                    (
                    {tab.key === 'all'
                      ? unpaidInvoices.length + partialInvoices.length
                      : tab.key === 'unpaid'
                        ? unpaidInvoices.length
                        : partialInvoices.length}
                    )
                  </span>
                </button>
              ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search invoice or supplier..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Invoice
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Supplier
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Paid
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Remaining
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No invoices match your filter
                    </td>
                  </tr>
                ) : (
                  pagedInvoices.map(inv => {
                    const isPartial = inv.paidAmount > 0;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                          {inv.supplierName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(inv.date)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-900">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                          {formatCurrency(inv.remainingAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isPartial
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isPartial ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {pagedInvoices.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">
                      Page totals ({displayedInvoices.length} invoices)
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatCurrency(
                        displayedInvoices.reduce((s, i) => s + i.amount, 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-green-600">
                      {formatCurrency(
                        displayedInvoices.reduce((s, i) => s + i.paidAmount, 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                      {formatCurrency(
                        displayedInvoices.reduce((s, i) => s + i.remainingAmount, 0)
                      )}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {totalItems > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
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
      </div>
    </div>
  );
}
