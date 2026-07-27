'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { 
  FileText, 
  Search, 
  DollarSign,
  Building2,
  RefreshCw,
  Receipt,
  Smartphone
} from 'lucide-react';
import { 
  ExpensePaymentService, 
  ExpensePayment 
} from '@/lib/firebase/expense-payment-service';
import { ExpenseService } from '@/lib/firebase/firestore-service';
import { Expense } from '@/lib/firebase/models';
import { FundingSourceDisplay } from '@/components/ui/FundingSourceDisplay';

export default function PaymentRecordsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems: paginatedPayments,
    startIndex: pageStartIndex,
    endIndex: pageEndIndex,
  } = usePagination(filteredPayments, 10);

  const expenseService = new ExpenseService();

  useEffect(() => {
    loadData();
    setupSubscriptions();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [expenses, expensePayments, searchTerm, methodFilter, dateFilter]);

  const setupSubscriptions = () => {
    // Subscribe to expense payments
    const unsubscribePayments = ExpensePaymentService.subscribeToExpensePayments((payments) => {
      setExpensePayments(payments);
    });

    return () => {
      unsubscribePayments();
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load expenses (needed to display expense details in payment records)
      const expensesData = await expenseService.getAll();
      setExpenses(expensesData);
      
    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = expensePayments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment => {
        const expense = expenses.find(e => e.id === payment.expenseId);
        return (
          expense?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense?.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.paidByName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Payment method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.paymentMethod.type === methodFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(payment => {
            const paymentDate = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
            return paymentDate >= filterDate;
          });
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(payment => {
            const paymentDate = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
            return paymentDate >= filterDate;
          });
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(payment => {
            const paymentDate = payment.paymentDate.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
            return paymentDate >= filterDate;
          });
          break;
      }
    }

    // Sort by payment date (newest first)
    filtered.sort((a, b) => {
      const aDate = a.paymentDate.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate);
      const bDate = b.paymentDate.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate);
      return bDate.getTime() - aDate.getTime();
    });

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      cheque: 'Cheque',
      bank_deposit: 'Bank Deposit',
      mobile_money: 'Mobile Money',
      momo: 'MTN MoMo',
      airtel_pay: 'Airtel Money'
    };
    return labels[method] || method;
  };

  const paymentExportData = useMemo(
    () =>
      filteredPayments.map((payment) => {
        const expense = expenses.find((e) => e.id === payment.expenseId);
        return {
          'Payment ID': payment.installmentNumber || 'N/A',
          'Expense Name': expense?.name || 'Unknown Expense',
          Vendor: expense?.vendor || 'N/A',
          'Payment Amount': formatCurrency(payment.amount || 0),
          'Payment Method': getPaymentMethodLabel(payment.paymentMethod.type),
          'Funding Source': payment.fundingSource || 'DAILY_EXPENSE_FUND',
          'Payment Date': formatDate(payment.paymentDate),
          'Paid By': payment.paidByName || 'N/A',
          Reference: payment.paymentReference || 'N/A',
        };
      }),
    [filteredPayments, expenses]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading Payment Records</p>
          <p className="text-sm text-gray-400">Fetching expense payment data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-8 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 shadow-xl">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">Accountant Workspace</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Payment Records</h1>
              <p className="text-blue-200 mt-1 text-sm">View all payments made to receipts and invoices</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <ExportButtons
                data={paymentExportData}
                filename="expense-payment-records"
                title="Expense Payment Records"
                subtitle={`${filteredPayments.length} payment(s) · filtered view`}
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Payments</p>
                <p className="text-2xl font-bold text-blue-900">{filteredPayments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Amount Paid</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(filteredPayments.reduce((sum, payment) => sum + payment.amount, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Cash Payments</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredPayments.filter(p => p.paymentMethod.type === 'cash').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6">
            <div className="flex items-center">
              <Smartphone className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-600">Digital Payments</p>
                <p className="text-2xl font-bold text-orange-900">
                  {filteredPayments.filter(p => ['mobile_money', 'bank_deposit', 'momo', 'airtel_pay'].includes(p.paymentMethod.type)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments by expense, vendor, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="bank_deposit">Bank Deposit</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="momo">MTN MoMo</option>
                <option value="airtel_pay">Airtel Money</option>
              </select>
            </div>
            
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payment Records</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredPayments.length} of {expensePayments.length} payment records
            </p>
          </div>
          
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payment records found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No payments match your current search and filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense/Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Funding Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPayments.map((payment) => {
                    const expense = expenses.find(e => e.id === payment.expenseId);
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <Receipt className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Payment #{payment.installmentNumber}
                              </div>
                              {payment.paymentReference && (
                                <div className="text-sm text-gray-500 font-mono">
                                  Ref: {payment.paymentReference}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                By: {payment.paidByName}
                              </div>
                              {payment.notes && (
                                <div className="text-xs text-gray-500 mt-1 italic">
                                  {payment.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {expense?.name || 'Unknown Expense'}
                            </div>
                            {expense?.vendor && (
                              <div className="text-sm text-gray-500">
                                Vendor: {expense.vendor}
                              </div>
                            )}
                            {expense?.receiptNumber && (
                              <div className="text-xs text-gray-400">
                                Receipt: {expense.receiptNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-green-600">
                            {formatCurrency(payment.amount)}
                          </div>
                          {expense && (
                            <div className="text-xs text-gray-500">
                              of {formatCurrency(expense.amount || 0)}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {payment.paymentMethod.type === 'cash' && <DollarSign className="h-4 w-4 mr-2 text-green-600" />}
                            {payment.paymentMethod.type === 'cheque' && <FileText className="h-4 w-4 mr-2 text-blue-600" />}
                            {['mobile_money', 'momo', 'airtel_pay'].includes(payment.paymentMethod.type) && <Smartphone className="h-4 w-4 mr-2 text-orange-600" />}
                            {payment.paymentMethod.type === 'bank_deposit' && <Building2 className="h-4 w-4 mr-2 text-purple-600" />}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {getPaymentMethodLabel(payment.paymentMethod.type)}
                              </div>
                              {payment.paymentMethod.details?.transactionId && (
                                <div className="text-xs text-gray-500 font-mono">
                                  ID: {payment.paymentMethod.details.transactionId}
                                </div>
                              )}
                              {payment.paymentMethod.details?.chequeNumber && (
                                <div className="text-xs text-gray-500">
                                  Cheque: {payment.paymentMethod.details.chequeNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <FundingSourceDisplay 
                            fundingSource={payment.fundingSource || 'DAILY_EXPENSE_FUND'} 
                            size="sm"
                          />
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDate(payment.paymentDate)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.paymentDate.toDate ? 
                              payment.paymentDate.toDate().toLocaleTimeString() : 
                              new Date(payment.paymentDate).toLocaleTimeString()
                            }
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            startIndex={pageStartIndex}
            endIndex={pageEndIndex}
            totalItems={filteredPayments.length}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </div>
    </div>
  );
}