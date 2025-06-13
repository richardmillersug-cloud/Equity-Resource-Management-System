'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Calendar,
  Building2,
  RefreshCw,
  Download,
  Plus,
  CreditCard,
  Printer,
  Receipt,
  X,
  AlertCircle,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { Invoice, subscribeToInvoices, approveInvoice, rejectInvoice, payInvoice, PaymentMethod, Payment, subscribeToPayments } from '../../../../lib/firebase/purchasing-manager-service';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);

  useEffect(() => {
    const unsubscribeInvoices = subscribeToInvoices((invoiceData) => {
      setInvoices(invoiceData);
      setLoading(false);
    });

    const unsubscribePayments = subscribeToPayments((paymentData) => {
      setPayments(paymentData);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribePayments();
    };
  }, []);

  useEffect(() => {
    let filtered = [...invoices];

    if (statusFilter !== 'all') {
      if (statusFilter === 'partial') {
        // Filter for invoices with partial payments
        filtered = filtered.filter(invoice => {
          const paid = getTotalPaidAmount(invoice.id);
          const remaining = getRemainingAmount(invoice);
          return paid > 0 && remaining > 0;
        });
      } else if (statusFilter === 'unpaid') {
        // Filter for invoices with no payments
        filtered = filtered.filter(invoice => getTotalPaidAmount(invoice.id) === 0);
      } else {
        // Filter by invoice status
        filtered = filtered.filter(invoice => invoice.status === statusFilter);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInvoices(filtered);
  }, [invoices, statusFilter, searchTerm, payments]);

  const handleApprove = async (invoiceId: string) => {
    try {
      await approveInvoice(invoiceId, 'current-user-id');
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const handleReject = async (invoiceId: string) => {
    try {
      await rejectInvoice(invoiceId, 'current-user-id', 'Rejected by purchasing manager');
    } catch (error) {
      console.error('Error rejecting invoice:', error);
    }
  };

  const generatePaymentReference = (invoice: Invoice, paymentMethod: string) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Method prefix
    const methodPrefix = {
      'cash': 'CSH',
      'cheque': 'CHQ',
      'bank_deposit': 'BNK',
      'mobile_money': 'MOB',
      'momo': 'MTN',
      'airtel_pay': 'ATL'
    }[paymentMethod] || 'PAY';
    
    // Invoice number (last 4 characters or full if shorter)
    const invoiceRef = invoice.invoiceNumber.slice(-4).toUpperCase();
    
    // Generate unique reference with retry logic
    let reference: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      reference = `${methodPrefix}-${year}${month}${day}${hours}${minutes}-${invoiceRef}-${sequence}`;
      attempts++;
    } while (
      payments.some(payment => payment.reference === reference) && 
      attempts < maxAttempts
    );
    
    // If still not unique after max attempts, add timestamp
    if (payments.some(payment => payment.reference === reference)) {
      const timestamp = Date.now().toString().slice(-4);
      reference = `${methodPrefix}-${year}${month}${day}${hours}${minutes}-${invoiceRef}-${timestamp}`;
    }
    
    return reference;
  };

  const handleMakePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const remainingAmount = getRemainingAmount(invoice);
    setPaymentAmount(remainingAmount > 0 ? remainingAmount.toString() : invoice.amount.toString());
    
    // Generate initial reference number with default method (cash)
    const initialReference = generatePaymentReference(invoice, 'cash');
    setPaymentReference(initialReference);
    
    setPaymentError('');
    setPaymentSuccess('');
    setShowPaymentModal(true);
  };

  const validatePaymentForm = (): string | null => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      return 'Please enter a valid payment amount';
    }

    const amount = parseFloat(paymentAmount);
    const invoiceAmount = selectedInvoice?.amount || 0;

    if (!isPartialPayment && amount !== invoiceAmount) {
      return 'Payment amount must equal invoice amount for full payment';
    }

    if (isPartialPayment && amount > invoiceAmount) {
      return 'Payment amount cannot exceed invoice amount';
    }

    switch (paymentMethod) {
      case 'cheque':
        if (!chequeNumber.trim()) return 'Cheque number is required';
        if (!chequeDate) return 'Cheque date is required';
        break;
      case 'bank_deposit':
        if (!bankAccount.trim()) return 'Bank account is required';
        if (!bankName.trim()) return 'Bank name is required';
        break;
      case 'mobile_money':
        if (!mobileNumber.trim()) return 'Mobile number is required';
        if (!transactionId.trim()) return 'Transaction ID is required';
        break;
      case 'momo':
      case 'airtel_pay':
        if (!mobileNumber.trim()) return 'Mobile number is required';
        if (!transactionId.trim()) return 'Transaction ID is required';
        if (!merchantCode.trim()) return 'Merchant code is required';
        break;
    }

    return null;
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice) return;

    setPaymentError('');
    setPaymentSuccess('');

    // Validate form
    const validationError = validatePaymentForm();
    if (validationError) {
      setPaymentError(validationError);
      return;
    }

    // Show confirmation dialog
    setShowPaymentConfirmation(true);
  };

  const confirmPayment = async () => {
    if (!selectedInvoice) return;

    setShowPaymentConfirmation(false);
    setProcessingPayment(true);

    try {
      const amount = parseFloat(paymentAmount);
      const balance = isPartialPayment ? selectedInvoice.amount - amount : 0;

      const paymentMethodData: PaymentMethod = {
        type: paymentMethod as PaymentMethod['type'],
        details: {
          ...(paymentMethod === 'cheque' && { 
            chequeNumber, 
            chequeDate: new Date(chequeDate),
            bankName 
          }),
          ...(paymentMethod === 'bank_deposit' && { 
            bankAccount, 
            bankName 
          }),
                     ...(paymentMethod === 'mobile_money' && { 
             mobileNumber,
             transactionId 
           }),
           ...((['momo', 'airtel_pay'].includes(paymentMethod)) && { 
             mobileNumber,
             transactionId,
             merchantCode
           }),
          referenceNumber: paymentReference
        },
        amount,
        balance,
        status: 'pending' as const
      };

      // Process payment through Firebase service
      await payInvoice(
        selectedInvoice.id, 
        paymentMethodData, 
        'current-user-id', // This should be replaced with actual user ID
        isPartialPayment
      );

      setPaymentSuccess(`Payment of ${formatCurrency(amount)} processed successfully!`);
      
      // Reset form after successful payment
      setTimeout(() => {
        setShowPaymentModal(false);
        resetPaymentForm();
      }, 2000);

    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentError(error instanceof Error ? error.message : 'Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

    const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentReference('');
    setChequeNumber('');
    setChequeDate('');
    setBankAccount('');
    setBankName('');
    setMobileNumber('');
    setTransactionId('');
    setMerchantCode('');
    setIsPartialPayment(false);
    setPaymentNotes('');
    setPaymentError('');
    setPaymentSuccess('');
  };

  const getInvoicePayments = (invoiceId: string) => {
    return payments.filter(payment => 
      payment.reference.includes(invoiceId) || 
      payment.description?.includes(invoiceId)
    );
  };

  const getTotalPaidAmount = (invoiceId: string) => {
    const invoicePayments = getInvoicePayments(invoiceId);
    return invoicePayments
      .filter(payment => payment.status === 'completed')
      .reduce((total, payment) => total + payment.amount, 0);
  };

  const getRemainingAmount = (invoice: Invoice) => {
    const totalPaid = getTotalPaidAmount(invoice.id);
    return Math.max(0, invoice.amount - totalPaid);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('Reference number copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPrintModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This would generate and download a PDF
    alert('PDF download functionality would be implemented here');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: any) => {
    // Handle null, undefined, or empty values
    if (!date || date === null || date === undefined) {
      return 'N/A';
    }
    
    try {
      let dateObj: Date;
      
      // Handle different date formats
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else if (date.toDate && typeof date.toDate === 'function') {
        // Firestore timestamp
        dateObj = date.toDate();
      } else if (date.seconds) {
        // Firestore timestamp object
        dateObj = new Date(date.seconds * 1000);
      } else {
        console.warn('Unknown date format:', date);
        return 'Invalid Date';
      }
      
      // Check if the date is valid
      if (!dateObj || isNaN(dateObj.getTime())) {
        console.warn('Invalid date object:', dateObj, 'from:', date);
        return 'Invalid Date';
      }
      
      return new Intl.DateTimeFormat('en-UG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading invoices...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
                <p className="text-gray-600">Review and approve supplier invoices</p>
              </div>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {invoices.filter(i => i.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {invoices.filter(i => i.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(invoices.reduce((sum, i) => sum + i.amount, 0))}
                </p>
                <p className="text-xs text-gray-500">
                  Outstanding: {formatCurrency(invoices.reduce((sum, i) => sum + getRemainingAmount(i), 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Partial Payments</p>
                <p className="text-2xl font-bold text-orange-600">
                  {invoices.filter(i => {
                    const paid = getTotalPaidAmount(i.id);
                    const remaining = getRemainingAmount(i);
                    return paid > 0 && remaining > 0;
                  }).length}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(invoices.filter(i => {
                    const paid = getTotalPaidAmount(i.id);
                    const remaining = getRemainingAmount(i);
                    return paid > 0 && remaining > 0;
                  }).reduce((sum, i) => sum + getTotalPaidAmount(i.id), 0))} collected
                </p>
              </div>
              <Receipt className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search invoices by supplier or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="partial">Partial Payment</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Invoices ({filteredInvoices.length})
            </h2>
          </div>
          
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600">No invoices match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created: {formatDate(invoice.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{invoice.supplierName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </div>
                        {getTotalPaidAmount(invoice.id) > 0 && (
                          <div className="text-xs text-green-600">
                            Paid: {formatCurrency(getTotalPaidAmount(invoice.id))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const remainingAmount = getRemainingAmount(invoice);
                          const totalPaid = getTotalPaidAmount(invoice.id);
                          
                          if (totalPaid === 0) {
                            // No payments made
                            return (
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(invoice.amount)}
                              </div>
                            );
                          } else if (remainingAmount === 0) {
                            // Fully paid
                            return (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-green-600">Paid</span>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                            );
                          } else {
                            // Partial payment
                            const paymentPercentage = (totalPaid / invoice.amount) * 100;
                            return (
                              <div>
                                <div className="text-sm font-medium text-red-600">
                                  {formatCurrency(remainingAmount)}
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {paymentPercentage.toFixed(1)}% paid
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${paymentPercentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.dueDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          <span>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handlePrintInvoice(invoice)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMakePayment(invoice)}
                            className={`${
                              getRemainingAmount(invoice) > 0 
                                ? 'text-green-600 hover:text-green-900' 
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={getRemainingAmount(invoice) > 0 ? 'Make Payment' : 'Fully Paid'}
                            disabled={getRemainingAmount(invoice) === 0}
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          {invoice.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApprove(invoice.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Approve Invoice"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleReject(invoice.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Reject Invoice"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invoice Details Modal */}
        {showModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Invoice Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invoice Number:</span>
                        <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supplier:</span>
                        <span className="font-medium">{selectedInvoice.supplierName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid Amount:</span>
                        <span className="font-medium text-green-600">{formatCurrency(getTotalPaidAmount(selectedInvoice.id))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium text-red-600">{formatCurrency(getRemainingAmount(selectedInvoice))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-medium">{formatDate(selectedInvoice.dueDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                          {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                      {selectedInvoice.items.map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded p-2">
                          <div className="font-medium">{item.description}</div>
                          <div className="text-gray-600">
                            Qty: {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {getInvoicePayments(selectedInvoice.id).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Payment History</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-3">
                        {getInvoicePayments(selectedInvoice.id).map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                payment.status === 'completed' ? 'bg-green-500' :
                                payment.status === 'processing' ? 'bg-yellow-500' :
                                payment.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                                <p className="text-xs text-gray-500">{payment.method} • {formatDate(payment.createdAt)}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payment.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleMakePayment(selectedInvoice);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Make Payment
                  </button>
                  {selectedInvoice.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleApprove(selectedInvoice.id);
                          setShowModal(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          handleReject(selectedInvoice.id);
                          setShowModal(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handlePrintInvoice(selectedInvoice);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Make Payment</h3>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      resetPaymentForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Invoice Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Invoice:</p>
                      <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Supplier:</p>
                      <p className="font-medium">{selectedInvoice.supplierName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Amount:</p>
                      <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedInvoice.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status:</p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {paymentError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{paymentError}</p>
                  </div>
                )}

                {paymentSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-700">{paymentSuccess}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Payment Type Toggle */}
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={!isPartialPayment}
                        onChange={() => {
                          setIsPartialPayment(false);
                          setPaymentAmount(selectedInvoice.amount.toString());
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Full Payment</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={isPartialPayment}
                        onChange={() => {
                          setIsPartialPayment(true);
                          setPaymentAmount('');
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Partial Payment</span>
                    </label>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const newMethod = e.target.value;
                        setPaymentMethod(newMethod);
                        // Regenerate reference number when payment method changes
                        if (selectedInvoice) {
                          const newReference = generatePaymentReference(selectedInvoice, newMethod);
                          setPaymentReference(newReference);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_deposit">Bank Deposit</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="momo">MTN MoMo</option>
                      <option value="airtel_pay">Airtel Money</option>
                    </select>
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount *
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={selectedInvoice.amount}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                      disabled={!isPartialPayment}
                    />
                    {isPartialPayment && paymentAmount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Remaining: {formatCurrency(selectedInvoice.amount - parseFloat(paymentAmount || '0'))}
                      </p>
                    )}
                  </div>

                  {/* Cheque Fields */}
                  {paymentMethod === 'cheque' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cheque Number *
                        </label>
                        <input
                          type="text"
                          value={chequeNumber}
                          onChange={(e) => setChequeNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter cheque number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cheque Date *
                        </label>
                        <input
                          type="date"
                          value={chequeDate}
                          onChange={(e) => setChequeDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter bank name"
                        />
                      </div>
                    </>
                  )}

                  {/* Bank Deposit Fields */}
                  {paymentMethod === 'bank_deposit' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Account *
                        </label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter bank account number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter bank name"
                        />
                      </div>
                    </>
                  )}

                                     {/* Mobile Money Fields */}
                   {paymentMethod === 'mobile_money' && (
                     <>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Mobile Number *
                         </label>
                         <input
                           type="text"
                           value={mobileNumber}
                           onChange={(e) => setMobileNumber(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter mobile number (e.g., 0700123456)"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Transaction ID *
                         </label>
                         <input
                           type="text"
                           value={transactionId}
                           onChange={(e) => setTransactionId(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter transaction ID"
                         />
                       </div>
                     </>
                   )}

                   {/* MTN MoMo Fields */}
                   {paymentMethod === 'momo' && (
                     <>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           MTN Mobile Number *
                         </label>
                         <input
                           type="text"
                           value={mobileNumber}
                           onChange={(e) => setMobileNumber(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter MTN number (e.g., 0780123456)"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Transaction ID *
                         </label>
                         <input
                           type="text"
                           value={transactionId}
                           onChange={(e) => setTransactionId(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter MoMo transaction ID"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Merchant Code *
                         </label>
                         <input
                           type="text"
                           value={merchantCode}
                           onChange={(e) => setMerchantCode(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter MTN MoMo merchant code"
                         />
                         <p className="text-xs text-gray-500 mt-1">
                           MTN MoMo merchant code (e.g., 123456 or MC123456)
                         </p>
                       </div>
                     </>
                   )}

                   {/* Airtel Money Fields */}
                   {paymentMethod === 'airtel_pay' && (
                     <>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Airtel Mobile Number *
                         </label>
                         <input
                           type="text"
                           value={mobileNumber}
                           onChange={(e) => setMobileNumber(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter Airtel number (e.g., 0750123456)"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Transaction ID *
                         </label>
                         <input
                           type="text"
                           value={transactionId}
                           onChange={(e) => setTransactionId(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter Airtel Money transaction ID"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Merchant Code *
                         </label>
                         <input
                           type="text"
                           value={merchantCode}
                           onChange={(e) => setMerchantCode(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Enter Airtel Money merchant code"
                         />
                         <p className="text-xs text-gray-500 mt-1">
                           Airtel Money merchant code (e.g., AM123456 or 789012)
                         </p>
                       </div>
                     </>
                   )}

                  {/* Reference Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Reference Number
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={paymentReference}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        placeholder="Auto-generated reference"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentReference)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                        title="Copy reference number"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedInvoice) {
                            const newReference = generatePaymentReference(selectedInvoice, paymentMethod);
                            setPaymentReference(newReference);
                          }
                        }}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1"
                        title="Generate new reference number"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-gray-500">
                        Auto-generated format: <span className="font-mono">{paymentMethod.toUpperCase().slice(0,3)}-YYMMDDHHMI-XXXX-###</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        Example: CSH-2412151430-INV1-247 (Cash payment on Dec 15, 2024 at 14:30)
                      </p>
                    </div>
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any additional notes (optional)"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      resetPaymentForm();
                    }}
                    disabled={processingPayment}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={!paymentAmount || processingPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {processingPayment && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{processingPayment ? 'Processing...' : 'Process Payment'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Modal */}
        {showPrintModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 print:hidden">
                  <h3 className="text-lg font-semibold text-gray-900">Print Invoice</h3>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Printable Invoice */}
                <div className="bg-white p-8 print:p-0" id="invoice-print">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                    <p className="text-gray-600">Invoice #{selectedInvoice.invoiceNumber}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">From:</h3>
                      <p className="text-gray-600">
                        {selectedInvoice.supplierName}<br/>
                        Supplier Information
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">To:</h3>
                      <p className="text-gray-600">
                        Equity Retail System<br/>
                        Company Address
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <p className="text-sm text-gray-600">Invoice Date:</p>
                      <p className="font-medium">{formatDate(selectedInvoice.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Due Date:</p>
                      <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right font-semibold">Total Amount:</td>
                          <td className="border border-gray-300 px-4 py-2 text-right font-bold">{formatCurrency(selectedInvoice.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    <p>Thank you for your business!</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 print:hidden">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmation Modal */}
        {showPaymentConfirmation && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Payment</h3>
                  <button
                    onClick={() => setShowPaymentConfirmation(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Payment Summary</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><span className="font-medium">Invoice:</span> {selectedInvoice.invoiceNumber}</p>
                      <p><span className="font-medium">Supplier:</span> {selectedInvoice.supplierName}</p>
                      <p><span className="font-medium">Amount:</span> {formatCurrency(parseFloat(paymentAmount || '0'))}</p>
                      <p><span className="font-medium">Method:</span> {paymentMethod.replace('_', ' ').toUpperCase()}</p>
                      <p><span className="font-medium">Reference:</span> <span className="font-mono text-blue-900">{paymentReference}</span></p>
                      {(['momo', 'airtel_pay'].includes(paymentMethod)) && merchantCode && (
                        <p><span className="font-medium">Merchant Code:</span> {merchantCode}</p>
                      )}
                      {(['mobile_money', 'momo', 'airtel_pay'].includes(paymentMethod)) && mobileNumber && (
                        <p><span className="font-medium">Mobile Number:</span> {mobileNumber}</p>
                      )}
                      {(['mobile_money', 'momo', 'airtel_pay'].includes(paymentMethod)) && transactionId && (
                        <p><span className="font-medium">Transaction ID:</span> {transactionId}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p>Please confirm that all payment details are correct before proceeding.</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowPaymentConfirmation(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 