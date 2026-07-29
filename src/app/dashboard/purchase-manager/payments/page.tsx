'use client';


import React, { useState, useEffect, useMemo } from 'react';
import { ExportButtons } from '@/components/ui/ExportButtons';
import {
  CheckCircle,
  Search,
  Filter,
  Eye,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  Receipt,
  X,
} from 'lucide-react';
import { subscribeToInvoicePayments, InvoicePayment, getInvoicePaymentHistory, PurchasingManagerService } from '@/lib/firebase/purchasing-manager-service';
import { authService } from '@/lib/firebase/auth';
import { getPaymentAmount, isValidPayment } from '@/lib/firebase/invoice-outstanding';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<InvoicePayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<InvoicePayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingCheques, setPendingCheques] = useState<InvoicePayment[]>([]);
  const [overdueCheques, setOverdueCheques] = useState<InvoicePayment[]>([]);
  const [showChequeActions, setShowChequeActions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToInvoicePayments((paymentsData) => {
      setPayments(paymentsData);
      setLoading(false);
    });

    // Load pending and overdue cheques
    loadChequeData();

    return () => unsubscribe();
  }, []);

  const loadChequeData = async () => {
    try {
      const pending = await PurchasingManagerService.getPendingCheques();
      const overdue = await PurchasingManagerService.getOverdueCheques();
      setPendingCheques(pending);
      setOverdueCheques(overdue);
    } catch (error) {
      console.error('Error loading cheque data:', error);
    }
  };

  useEffect(() => {
    let filtered = payments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        (payment.invoiceNumber && payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (payment.supplierName && payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (payment.paymentReference && payment.paymentReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (payment.paidBy && payment.paidBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (payment.paidByName && payment.paidByName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by payment method
    if (filterMethod !== 'all') {
      filtered = filtered.filter(payment => payment.paymentMethod.type === filterMethod);
    }

    // Filter by payment status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(payment => {
        const status = payment.paymentStatus || 'completed';
        return status === filterStatus;
      });
    }

    // Filter by year
    if (filterYear) {
      const year = parseInt(filterYear);
      filtered = filtered.filter(payment => {
        const paymentDate = payment.paymentDate instanceof Date 
          ? payment.paymentDate 
          : new Date(payment.paymentDate);
        return paymentDate.getFullYear() === year;
      });
    }

    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(payment => {
        const paymentDate = payment.paymentDate instanceof Date 
          ? payment.paymentDate 
          : new Date(payment.paymentDate);
        return paymentDate >= fromDate;
      });
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(payment => {
        const paymentDate = payment.paymentDate instanceof Date 
          ? payment.paymentDate 
          : new Date(payment.paymentDate);
        return paymentDate <= toDate;
      });
    }

    setFilteredPayments(filtered);
  }, [payments, searchTerm, filterMethod, filterStatus, filterYear, filterDateFrom, filterDateTo]);

  const getPaymentMethodColor = (method: string) => {
    const colors = {
      'cash': 'bg-green-100 text-green-800',
      'cheque': 'bg-blue-100 text-blue-800',
      'bank_deposit': 'bg-purple-100 text-purple-800',
      'mobile_money': 'bg-orange-100 text-orange-800',
      'momo': 'bg-yellow-100 text-yellow-800',
      'airtel_pay': 'bg-red-100 text-red-800'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons = {
      'cash': <Banknote className="w-4 h-4" />,
      'cheque': <Receipt className="w-4 h-4" />,
      'bank_deposit': <Building2 className="w-4 h-4" />,
      'mobile_money': <Smartphone className="w-4 h-4" />,
      'momo': <Smartphone className="w-4 h-4" />,
      'airtel_pay': <Smartphone className="w-4 h-4" />
    };
    return icons[method as keyof typeof icons] || <CreditCard className="w-4 h-4" />;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      'cash': 'Cash',
      'cheque': 'Cheque',
      'bank_deposit': 'Bank Deposit',
      'mobile_money': 'Mobile Money',
      'momo': 'MTN MoMo',
      'airtel_pay': 'Airtel Money'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const handleViewDetails = async (payment: InvoicePayment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const handleClearCheque = async (paymentId: string) => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      const clearedBy = currentUser?.uid || 'unknown';
      
      await PurchasingManagerService.clearChequePayment(paymentId, clearedBy);
      await loadChequeData(); // Refresh cheque data
      setShowChequeActions(null);
      
      // Show success message
      alert('Cheque cleared successfully!');
    } catch (error) {
      console.error('Error clearing cheque:', error);
      alert('Failed to clear cheque. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBounceCheque = async (paymentId: string) => {
    const confirmed = confirm(
      'Are you sure you want to mark this cheque as bounced?\n\n' +
      'This action will:\n' +
      '• Mark the payment as failed / red-listed\n' +
      '• Revert invoice amounts if the cheque was previously cleared\n' +
      '• Update the invoice balance accordingly\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    const reason = prompt('Enter the reason for bouncing this cheque:') || 'Cheque bounced - no reason provided';
    
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      const bouncedBy = currentUser?.uid || 'unknown';
      
      await PurchasingManagerService.bounceChequePayment(paymentId, bouncedBy, reason);
      await loadChequeData();
      setShowChequeActions(null);
      
      alert('Cheque has been marked as bounced. Payment is red-listed and invoice balance updated.');
    } catch (error) {
      console.error('Error bouncing cheque:', error);
      alert(`Failed to bounce cheque: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCheque = async (paymentId: string) => {
    const confirmed = confirm(
      'Are you sure you want to cancel this cheque payment?\n\n' +
      'This action will:\n' +
      '• Mark the payment as cancelled / red-listed\n' +
      '• Void the payment — no funds were received\n' +
      '• Keep the invoice balance unchanged (cheque was never cleared)\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    const reason = prompt('Enter the reason for cancelling this cheque:') || 'Cheque cancelled';

    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      const cancelledBy = currentUser?.uid || 'unknown';

      await PurchasingManagerService.cancelChequePayment(paymentId, cancelledBy, reason);
      await loadChequeData();
      setShowChequeActions(null);

      alert('Cheque has been cancelled. The payment transaction is red-listed and the invoice balance is unchanged.');
    } catch (error) {
      console.error('Error cancelling cheque:', error);
      alert(`Failed to cancel cheque: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const paymentExportData = useMemo(
    () =>
      filteredPayments.map((payment) => ({
        'Payment Reference': payment.paymentReference,
        'Invoice Number': payment.invoiceNumber,
        Supplier: payment.supplierName,
        Amount: payment.amount,
        'Payment Method': getPaymentMethodLabel(payment.paymentMethod.type),
        Installment: payment.installmentNumber,
        'Payment Date': payment.paymentDate.toLocaleDateString(),
        'Paid By': `${payment.paidByName} (${payment.paidBy})`,
        Notes: payment.notes || '',
      })),
    [filteredPayments]
  );

  // Calculate statistics based on filtered payments
  // Total Value matches MD/PM dashboards: completed (cleared) payments only when status filter is "all"
  const totalPayments = filteredPayments.length;
  const paymentsForValue =
    filterStatus === 'all'
      ? filteredPayments.filter((p) => isValidPayment(p as unknown as Record<string, unknown>))
      : filteredPayments;
  const totalAmount = paymentsForValue.reduce(
    (sum, payment) => sum + getPaymentAmount(payment as unknown as Record<string, unknown>),
    0
  );
  const cashPayments = filteredPayments.filter(p => p.paymentMethod.type === 'cash').length;
  const bankTransfers = filteredPayments.filter(p => p.paymentMethod.type === 'bank_deposit').length;
  const mobilePayments = filteredPayments.filter(p => ['mobile_money', 'momo', 'airtel_pay'].includes(p.paymentMethod.type)).length;
  const chequePayments = filteredPayments.filter(p => p.paymentMethod.type === 'cheque').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-8">
        
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
          <div className="relative p-6 md:p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Payment Records
                </h1>
                <p className="text-purple-100 text-sm md:text-lg">Track all payment transactions and installments with ease</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{totalPayments}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">All transactions</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Receipt className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Cash Payments</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{cashPayments}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Physical cash</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Banknote className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Bank Transfers</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{bankTransfers}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Bank deposits</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Mobile Money</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{mobilePayments}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Digital payments</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-violet-600 transition-colors">UGX {totalAmount.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-violet-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">
                    {filterStatus === 'all' ? 'Completed payments' : 'Filtered payments'}
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

      {/* Cheque Summary */}
      {(pendingCheques.length > 0 || overdueCheques.length > 0) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cheque Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCheques.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <h3 className="font-medium text-yellow-800">Pending Cheques</h3>
                </div>
                <p className="text-sm text-yellow-700 mb-2">
                  {pendingCheques.length} cheque{pendingCheques.length !== 1 ? 's' : ''} awaiting clearance
                </p>
                <p className="text-xs text-yellow-600">
                  Total Amount: UGX {pendingCheques.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
            )}
            
            {overdueCheques.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="font-medium text-red-800">Overdue Cheques</h3>
                </div>
                <p className="text-sm text-red-700 mb-2">
                  {overdueCheques.length} cheque{overdueCheques.length !== 1 ? 's' : ''} past due date
                </p>
                <p className="text-xs text-red-600">
                  Total Amount: UGX {overdueCheques.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Advanced Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by invoice number, supplier, payment reference, or paid by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-4">
              {/* Payment Method Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900 min-w-[160px]"
                  title={filterMethod !== 'all' ? `Filtering by: ${filterMethod}` : 'Filter by payment method'}
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_deposit">Bank Deposit</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="momo">MTN MoMo</option>
                  <option value="airtel_pay">Airtel Money</option>
                </select>
                {filterMethod !== 'all' && (
                  <span className="text-xs text-purple-600 font-medium ml-2">
                    ({filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'})
                  </span>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900 min-w-[160px]"
                  title={filterStatus !== 'all' ? `Filtering by: ${filterStatus}` : 'Filter by status'}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending Clearance</option>
                  <option value="failed">Bounced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {filterStatus !== 'all' && (
                  <span className="text-xs text-purple-600 font-medium ml-2">
                    ({filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'})
                  </span>
                )}
              </div>

              {/* More Filters Button */}
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 font-medium relative ${
                  showAdvancedFilters 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>More Filters</span>
                {(filterDateFrom || filterDateTo || filterYear) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <ExportButtons
                data={paymentExportData}
                filename="payment-records"
                title="Payment Records"
                subtitle={`${filteredPayments.length} payment(s) · filtered view`}
              />
            </div>
          </div>

          {/* Advanced Filters Section */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-6 mt-4">
              {/* Active Filters Summary */}
              {(filterDateFrom || filterDateTo || filterYear) && (
                <div className="mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Active Filters:</span>
                    </div>
                    <button
                      onClick={() => {
                        setFilterDateFrom('');
                        setFilterDateTo('');
                        setFilterYear('');
                      }}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {filterYear && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                        Year: {filterYear}
                      </span>
                    )}
                    {(filterDateFrom || filterDateTo) && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                        Date: {filterDateFrom || 'Start'} - {filterDateTo || 'End'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
                  >
                    <option value="">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterYear('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Clear Advanced Filters
                </button>
              </div>
            </div>
          )}
        </div>
          
      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
          <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice & Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount & Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//   Installment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//   Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => {
                    const isVoided = (payment as any).isVoided || payment.paymentStatus === 'cancelled' || (payment.paymentStatus === 'failed' && payment.paymentMethod.type === 'cheque');
                    return (
                    <tr key={payment.id} className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className={`text-sm font-bold font-mono px-2 py-1 rounded flex items-center gap-2 ${isVoided ? 'text-red-700 bg-red-100 line-through' : 'text-blue-900 bg-blue-50'}`}>
                            {payment.paymentReference}
                            {isVoided && (
                              <span className="text-xs font-normal no-underline line-through-none bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full" style={{textDecoration: 'none'}}>
                                VOID
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Paid by: {payment.paidByName} ({payment.paidBy})
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payment.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.supplierName}
                      </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                        UGX {payment.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.paymentMethod.type)}`}>
                          {getPaymentMethodIcon(payment.paymentMethod.type)}
                          {getPaymentMethodLabel(payment.paymentMethod.type)}
                        </span>
                      </div>
                      {/* Cheque Status */}
                      {payment.paymentMethod.type === 'cheque' && (
                        <div className="mt-1">
                          {payment.paymentStatus === 'pending' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending Clearance
                            </span>
                          )}
                          {payment.paymentStatus === 'completed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Cleared
                            </span>
                          )}
                          {payment.paymentStatus === 'failed' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Bounced — Not Received
                            </span>
                          )}
                          {payment.paymentStatus === 'cancelled' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Cancelled — Not Received
                            </span>
                          )}
                        </div>
                      )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Payment #{payment.installmentNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                      {payment.paymentDate.toLocaleDateString()}
                          </div>
                    <div className="text-sm text-gray-500">
                      {payment.paymentDate.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(payment)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
//   View
                      </button>
                      
                      {/* Cheque Actions */}
                      {payment.paymentMethod.type === 'cheque' && payment.paymentStatus === 'pending' && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => handleClearCheque(payment.id)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1 px-2 py-1 rounded text-xs border border-green-200 hover:bg-green-50"
                            disabled={loading}
                            title="Confirm cheque cleared — updates invoice balance"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Clear
                          </button>
                          <button
                            onClick={() => handleBounceCheque(payment.id)}
                            className="text-orange-600 hover:text-orange-900 flex items-center gap-1 px-2 py-1 rounded text-xs border border-orange-200 hover:bg-orange-50"
                            disabled={loading}
                            title="Mark cheque as bounced — payment not received, invoice balance unchanged"
                          >
                            <X className="w-3 h-3" />
                            Bounce
                          </button>
                          <button
                            onClick={() => handleCancelCheque(payment.id)}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 hover:bg-red-50"
                            disabled={loading}
                            title="Cancel cheque — payment voided, transaction red-listed"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      )}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterMethod !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No payment records available. Make payments from the Invoices page to see them here.'}
            </p>
            </div>
          )}
        </div>

        {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                  <button
                  onClick={() => setSelectedPayment(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Reference</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.paymentReference}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">UGX {selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(selectedPayment.paymentMethod.type)}`}>
                        {getPaymentMethodIcon(selectedPayment.paymentMethod.type)}
                        {getPaymentMethodLabel(selectedPayment.paymentMethod.type)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Installment Number</label>
                    <p className="mt-1 text-sm text-gray-900">Payment #{selectedPayment.installmentNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.paymentDate.toLocaleDateString()} at {selectedPayment.paymentDate.toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Paid By</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.paidByName} ({selectedPayment.paidBy})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                    <div className="mt-1 flex items-center gap-2">
                      {selectedPayment.paymentStatus === 'pending' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending Clearance
                        </span>
                      )}
                      {selectedPayment.paymentStatus === 'completed' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Cleared / Completed
                        </span>
                      )}
                      {selectedPayment.paymentStatus === 'failed' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Bounced — Not Received
                        </span>
                      )}
                      {selectedPayment.paymentStatus === 'cancelled' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Cancelled — Not Received
                        </span>
                      )}
                      {(selectedPayment as any).isVoided && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-200 text-red-900">
                          RED-LISTED / VOID
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.supplierName}</p>
                  </div>
                </div>
              </div>

              {/* Payment Method Details */}
              {selectedPayment.paymentMethod.details && Object.keys(selectedPayment.paymentMethod.details).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedPayment.paymentMethod.details.chequeNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Cheque Number</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.paymentMethod.details.chequeNumber}</p>
                      </div>
                    )}
                    {selectedPayment.paymentMethod.details.bankName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.paymentMethod.details.bankName}</p>
                      </div>
                    )}
                    {selectedPayment.paymentMethod.details.bankAccount && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Account</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.paymentMethod.details.bankAccount}</p>
                      </div>
                    )}
                    {selectedPayment.paymentMethod.details.mobileNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedPayment.paymentMethod.details.mobileNumber}</p>
                      </div>
                    )}
                    {selectedPayment.paymentMethod.details.transactionId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.paymentMethod.details.transactionId}</p>
                      </div>
                    )}
                    {selectedPayment.paymentMethod.details.referenceNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedPayment.paymentMethod.details.referenceNumber}</p>
                      </div>
                    )}
                      </div>
                    </div>
              )}

              {/* Notes */}
              {selectedPayment.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{selectedPayment.notes}</p>
                  </div>
                </div>
              )}

              {/* Bounce Information */}
              {selectedPayment.paymentStatus === 'failed' && (selectedPayment as any).bounceReason && (
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Bounce Information — Payment Not Received</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-red-700">Bounce Reason</label>
                        <p className="mt-1 text-sm text-red-900">{(selectedPayment as any).bounceReason}</p>
                      </div>
                      {(selectedPayment as any).bouncedAt && (
                        <div>
                          <label className="block text-sm font-medium text-red-700">Bounced Date</label>
                          <p className="mt-1 text-sm text-red-900">
                            {new Date((selectedPayment as any).bouncedAt).toLocaleDateString()} at {new Date((selectedPayment as any).bouncedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-red-700 font-medium">
                      This transaction is red-listed. The invoice balance has been updated to reflect no payment received.
                    </p>
                  </div>
                </div>
              )}

              {/* Cancellation Information */}
              {selectedPayment.paymentStatus === 'cancelled' && (
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Cancellation Information — Payment Not Received</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedPayment as any).cancellationReason && (
                        <div>
                          <label className="block text-sm font-medium text-red-700">Cancellation Reason</label>
                          <p className="mt-1 text-sm text-red-900">{(selectedPayment as any).cancellationReason}</p>
                        </div>
                      )}
                      {(selectedPayment as any).cancelledAt && (
                        <div>
                          <label className="block text-sm font-medium text-red-700">Cancelled Date</label>
                          <p className="mt-1 text-sm text-red-900">
                            {new Date((selectedPayment as any).cancelledAt).toLocaleDateString()} at {new Date((selectedPayment as any).cancelledAt).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-red-700 font-medium">
                      This transaction is red-listed and voided. The invoice balance remains unchanged as the cheque was never cleared.
                    </p>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 