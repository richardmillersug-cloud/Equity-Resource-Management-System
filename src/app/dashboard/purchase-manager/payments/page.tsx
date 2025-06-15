'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Search, 
  Filter, 
  Download, 
  Eye,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  Receipt,
  X
} from 'lucide-react';
import { subscribeToInvoicePayments, InvoicePayment, getInvoicePaymentHistory, PurchasingManagerService } from '@/lib/firebase/purchasing-manager-service';
import { authService } from '@/lib/firebase/auth';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<InvoicePayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<InvoicePayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
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

    setFilteredPayments(filtered);
  }, [payments, searchTerm, filterMethod, filterStatus]);

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
    // Show confirmation dialog
    const confirmed = confirm(
      'Are you sure you want to mark this cheque as bounced?\n\n' +
      'This action will:\n' +
      '• Mark the payment as failed\n' +
      '• Revert invoice amounts if the cheque was previously cleared\n' +
      '• Update the invoice status accordingly\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    // Get bounce reason
    const reason = prompt('Enter the reason for bouncing this cheque:') || 'Cheque bounced - no reason provided';
    
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      const bouncedBy = currentUser?.uid || 'unknown';
      
      await PurchasingManagerService.bounceChequePayment(paymentId, bouncedBy, reason);
      await loadChequeData(); // Refresh cheque data
      setShowChequeActions(null);
      
      // Show success message
      alert('Cheque has been marked as bounced successfully!\nInvoice amounts have been updated accordingly.');
    } catch (error) {
      console.error('Error bouncing cheque:', error);
      alert(`Failed to bounce cheque: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    
    const csvData = filteredPayments.map(payment => ({
      'Payment Reference': payment.paymentReference,
      'Invoice Number': payment.invoiceNumber,
      'Supplier': payment.supplierName,
      'Amount': payment.amount,
      'Payment Method': getPaymentMethodLabel(payment.paymentMethod.type),
      'Installment': payment.installmentNumber,
      'Payment Date': payment.paymentDate.toLocaleDateString(),
              'Paid By': `${payment.paidByName} (${payment.paidBy})`,
      'Notes': payment.notes || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate statistics
  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const cashPayments = payments.filter(p => p.paymentMethod.type === 'cash').length;
  const bankTransfers = payments.filter(p => p.paymentMethod.type === 'bank_deposit').length;
  const mobilePayments = payments.filter(p => ['mobile_money', 'momo', 'airtel_pay'].includes(p.paymentMethod.type)).length;
  const chequePayments = payments.filter(p => p.paymentMethod.type === 'cheque').length;

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            Payment Records
          </h1>
          <p className="text-gray-600 mt-1">Track all payment transactions and installments</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredPayments.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{totalPayments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Payments</p>
              <p className="text-2xl font-bold text-green-600">{cashPayments}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bank Transfers</p>
              <p className="text-2xl font-bold text-purple-600">{bankTransfers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mobile Money</p>
              <p className="text-2xl font-bold text-orange-600">{mobilePayments}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">UGX {totalAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-gray-600" />
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

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by invoice number, supplier, payment reference, or paid by..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
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
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed/Bounced</option>
              </select>
            </div>
          </div>
        </div>
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
                  Installment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-bold text-blue-900 font-mono bg-blue-50 px-2 py-1 rounded">
                        {payment.paymentReference}
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
                              Bounced
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
                        View
                      </button>
                      
                      {/* Cheque Actions */}
                      {payment.paymentMethod.type === 'cheque' && payment.paymentStatus === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleClearCheque(payment.id)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1 px-2 py-1 rounded text-xs"
                            disabled={loading}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Clear
                          </button>
                          <button
                            onClick={() => {
                              handleBounceCheque(payment.id);
                            }}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1 px-2 py-1 rounded text-xs"
                            disabled={loading}
                          >
                            <X className="w-3 h-3" />
                            Bounce
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
                    <div className="mt-1">
                      {selectedPayment.paymentStatus === 'pending' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      {selectedPayment.paymentStatus === 'completed' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      )}
                      {selectedPayment.paymentStatus === 'failed' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Failed/Bounced
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
                  <h3 className="text-lg font-medium text-red-900 mb-4">Bounce Information</h3>
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 