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
import { Invoice, subscribeToInvoices, approveInvoice, rejectInvoice, PaymentMethod, InvoicePayment, subscribeToInvoicePayments, makeInvoicePayment, getInvoicePaymentHistory } from '../../../../lib/firebase/purchasing-manager-service';
import { authService } from '../../../../lib/firebase/auth';
import InvoicePrintView from '../../../../components/ui/InvoicePrintView';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<InvoicePayment[]>([]);
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

    const unsubscribePayments = subscribeToInvoicePayments((paymentData) => {
      setInvoicePayments(paymentData);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribePayments();
    };
  }, []);

  useEffect(() => {
    let filtered = [...invoices];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        (invoice.supplierName && invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredInvoices(filtered);
  }, [invoices, statusFilter, searchTerm]);

  const handleApprove = async (invoiceId: string) => {
    try {
      const currentUser = authService.getCurrentUser();
      const currentUserId = currentUser?.uid || 'anonymous-user';
      await approveInvoice(invoiceId, currentUserId);
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const handleReject = async (invoiceId: string) => {
    try {
      const currentUser = authService.getCurrentUser();
      const currentUserId = currentUser?.uid || 'anonymous-user';
      await rejectInvoice(invoiceId, currentUserId, 'Rejected by purchasing manager');
    } catch (error) {
      console.error('Error rejecting invoice:', error);
    }
  };

  const generatePaymentReference = (invoice: Invoice, paymentMethod: string) => {
    if (!invoice || !paymentMethod) {
      throw new Error('Invoice and payment method are required');
    }

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
    const invoiceNumber = invoice.invoiceNumber || 'UNKNOWN';
    const invoiceRef = invoiceNumber.slice(-4).toUpperCase();
    
    // Get next installment number
    const nextInstallment = (invoice.paymentCount || 0) + 1;
    
    // Generate reference: METHOD-YYMMDDHHNN-INVOICE-INSTALLMENT
    return `${methodPrefix}-${year}${month}${day}${hours}${minutes}-${invoiceRef}-${nextInstallment.toString().padStart(2, '0')}`;
  };

  const handleMakePayment = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const remainingAmount = invoice.remainingAmount || invoice.amount;
    setPaymentAmount(remainingAmount.toString());
    
    // Generate initial reference number with default method (cash)
    try {
      const initialReference = generatePaymentReference(invoice, 'cash');
      setPaymentReference(initialReference);
    } catch (error) {
      console.error('Error generating initial payment reference:', error);
      setPaymentReference('');
    }
    
    // Get payment history for this invoice
    try {
      const history = await getInvoicePaymentHistory(invoice.id);
      setPaymentHistory(history || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    }
    
    setPaymentError('');
    setPaymentSuccess('');
    setShowPaymentModal(true);
  };

  const validatePaymentForm = (): string | null => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      return 'Please enter a valid payment amount';
    }

    const amount = parseFloat(paymentAmount);
    const remainingAmount = selectedInvoice?.remainingAmount || selectedInvoice?.amount || 0;

    if (amount > remainingAmount) {
      return 'Payment amount cannot exceed remaining amount';
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
            referenceNumber: merchantCode
          }),
        },
        amount,
        status: 'cleared' as const
      };

      // Get current user ID and name
      const currentUser = authService.getCurrentUser();
      const currentUserId = currentUser?.uid || 'anonymous-user';
      const currentUserName = currentUser?.displayName || 
                             (currentUser?.employee ? 
                              `${currentUser.employee.firstName} ${currentUser.employee.lastName}` : 
                              'Unknown User');

      // Process payment through new Firebase service
      await makeInvoicePayment(
        selectedInvoice.id, 
        amount,
        paymentMethodData, 
        currentUserId,
        currentUserName,
        paymentNotes
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
    return invoicePayments.filter(payment => payment.invoiceId === invoiceId);
  };

  const getPaymentCount = (invoiceId: string) => {
    return getInvoicePayments(invoiceId).length;
  };

  const copyToClipboard = async (text: string) => {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log('Reference number copied to clipboard');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        console.log('Reference number copied to clipboard (fallback)');
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Copy functionality not supported in this browser. Please copy manually: ' + text);
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

  const handleExportToCSV = async () => {
    try {
      // Get all payment histories for the filtered invoices
      const invoiceDataWithPayments = await Promise.all(
        (filteredInvoices || []).map(async (invoice) => {
          try {
            const paymentHistory = await getInvoicePaymentHistory(invoice.id);
            return { invoice, paymentHistory: paymentHistory || [] };
          } catch (error) {
            console.error(`Error fetching payment history for invoice ${invoice.id}:`, error);
            return { invoice, paymentHistory: [] };
          }
        })
      );

      // Create CSV data
      const csvData = [];
      const headers = [
        'Invoice Number',
        'Supplier Name',
        'Invoice Date',
        'Due Date',
        'Total Amount (UGX)',
        'Status',
        'Payment Date',
        'Payment Amount (UGX)',
        'Balance After Payment (UGX)',
        'Payment Method',
        'Payment Status',
        'Transaction ID',
        'Paid By',
        'Received By',
        'Installment Number'
      ];
      
      csvData.push(headers);

      // Add data rows
      invoiceDataWithPayments.forEach(({ invoice, paymentHistory }) => {
        if (paymentHistory && paymentHistory.length > 0) {
          // Calculate payment totals similar to print view logic
          const totalPayments = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
          const isInvoiceFullyPaid = totalPayments >= invoice.amount;
          
          paymentHistory.forEach((payment, index) => {
            // Calculate running total and balance
            const runningTotal = paymentHistory.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0);
            const remainingBalance = runningTotal >= invoice.amount ? 0 : Math.max(0, invoice.amount - runningTotal);
            
            // If invoice is fully paid, treat all payments as completed
            const displayStatus = isInvoiceFullyPaid ? 'completed' : (payment.paymentStatus || 'completed');
            
            const row = [
              invoice.invoiceNumber || '',
              invoice.supplierName || '',
              formatDate(invoice.date),
              formatDate(invoice.dueDate),
              invoice.amount.toString(),
              invoice.status || '',
              formatDate(payment.paymentDate),
              payment.amount.toString(),
              remainingBalance.toString(),
              payment.paymentMethod?.type || '',
              displayStatus === 'completed' ? 'PAID' : 
                displayStatus === 'pending' ? 'PENDING' :
                displayStatus === 'failed' ? 'FAILED' :
                displayStatus === 'cancelled' ? 'CANCELLED' : 'UNKNOWN',
              payment.paymentMethod?.details?.transactionId || 
                payment.paymentMethod?.details?.chequeNumber || 
                payment.paymentReference?.slice(-8) || '',
              payment.paidByName || '',
              payment.approvedBy || '',
              payment.installmentNumber?.toString() || ''
            ];
            csvData.push(row);
          });
        } else {
          // Invoice without payments
          const row = [
            invoice.invoiceNumber || '',
            invoice.supplierName || '',
            formatDate(invoice.date),
            formatDate(invoice.dueDate),
            invoice.amount.toString(),
            invoice.status || '',
            '', // No payment date
            '', // No payment amount
            invoice.amount.toString(), // Full balance remaining
            '', // No payment method
            'UNPAID',
            '', // No transaction ID
            '', // No paid by
            '', // No received by
            '' // No installment number
          ];
          csvData.push(row);
        }
      });

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(field => {
          // Escape quotes and wrap in quotes if necessary
          const escaped = field.toString().replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
            ? `"${escaped}"` 
            : escaped;
        }).join(',')
      ).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `invoices_with_payments_${dateStr}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <DollarSign className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen" style={{ padding: '20px' }}>
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
    <div className="w-screen h-screen p-5">
      <div className="w-full space-y-8">
        
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                    Invoice Management
                  </h1>
                  <p className="text-purple-100 text-lg">Review, approve, and manage supplier invoices with ease</p>
                </div>
              </div>
              <button 
                onClick={() => window.location.href = '/dashboard/receiver/invoices/add'}
                className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                <span>New Invoice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Invoices</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{(invoices || []).length}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">All invoices</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Pending Approval</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">
                  {(invoices || []).filter(i => i.status === 'pending').length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Awaiting review</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Approved</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {(invoices || []).filter(i => i.status === 'approved').length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Ready for payment</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Partial Payments</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {(invoices || []).filter(i => i.status === 'partial').length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Partially paid</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Receipt className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  {formatCurrency((invoices || []).reduce((sum, i) => sum + i.amount, 0))}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">
                    Outstanding: {formatCurrency((invoices || []).reduce((sum, i) => sum + (i.remainingAmount || i.amount), 0))}
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search invoices by supplier, invoice number, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <button 
                onClick={handleExportToCSV}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Invoices List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Invoices ({(filteredInvoices || []).length})
            </h2>
          </div>
          
          {!filteredInvoices || filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FileText className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-500 max-w-md mx-auto">No invoices match your current search criteria. Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gradient-to-r from-gray-50 to-purple-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount & Payments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
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
                <tbody className="bg-white divide-y divide-gray-100">
                  {(filteredInvoices || []).map((invoice, index) => (
                    <tr key={invoice.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 transition-all duration-300 group border-l-4 border-transparent hover:border-purple-400">
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
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            Total: {formatCurrency(invoice.amount)}
                          </div>
                          {(invoice.paidAmount || 0) > 0 && (
                            <div className="text-xs text-green-600 font-medium">
                              Paid: {formatCurrency(invoice.paidAmount || 0)}
                            </div>
                          )}
                          {(invoice.remainingAmount || invoice.amount) > 0 && invoice.status !== 'paid' && (
                            <div className="text-xs text-red-600 font-medium">
                              Due: {formatCurrency(invoice.remainingAmount || invoice.amount)}
                            </div>
                          )}
                          {(invoice.paymentCount || 0) > 0 && (
                            <div className="text-xs text-blue-600">
                              {invoice.paymentCount} installment{(invoice.paymentCount || 0) > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const paidAmount = invoice.paidAmount || 0;
                          const remainingAmount = invoice.remainingAmount || invoice.amount;
                          
                          if (invoice.status === 'paid') {
                            return (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm font-medium text-green-600">Fully Paid</span>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                            );
                          } else if (invoice.status === 'partial') {
                            const paymentPercentage = (paidAmount / invoice.amount) * 100;
                            return (
                              <div>
                                <div className="text-sm font-medium text-orange-600">
                                  {formatCurrency(remainingAmount)} remaining
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {paymentPercentage.toFixed(1)}% paid
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${paymentPercentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(invoice.amount)} due
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
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentHistory([]);
                              setShowModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {(invoice.paymentCount || 0) > 0 && (
                            <button 
                              onClick={async () => {
                                try {
                                  const history = await getInvoicePaymentHistory(invoice.id);
                                  setPaymentHistory(history || []);
                                  setSelectedInvoice(invoice);
                                  setShowModal(true);
                                } catch (error) {
                                  console.error('Error fetching payment history:', error);
                                  setPaymentHistory([]);
                                }
                              }}
                              className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded"
                              title={`View ${invoice.paymentCount} Payment${(invoice.paymentCount || 0) > 1 ? 's' : ''}`}
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleMakePayment(invoice)}
                            className={`p-1 rounded ${
                              invoice.status !== 'paid' 
                                ? 'text-green-600 hover:text-green-900 hover:bg-green-50' 
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={
                              invoice.status === 'paid' ? 'Fully Paid' :
                              invoice.status === 'partial' ? `Pay Remaining ${formatCurrency(invoice.remainingAmount || 0)}` :
                              `Make Payment - ${formatCurrency(invoice.amount)}`
                            }
                            disabled={invoice.status === 'paid'}
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handlePrintInvoice(invoice)}
                            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          
                          {invoice.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApprove(invoice.id)}
                                className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                                title="Approve Invoice"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleReject(invoice.id)}
                                className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
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

        {/* Invoice Summary */}
        {filteredInvoices && filteredInvoices.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {filteredInvoices.length}
                </div>
                <div className="text-sm text-gray-600">Total Invoices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0))}
                </div>
                <div className="text-sm text-gray-600">Total Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(filteredInvoices.reduce((sum, invoice) => sum + (invoice.remainingAmount || invoice.amount), 0))}
                </div>
                <div className="text-sm text-gray-600">Outstanding</div>
              </div>
            </div>
            
            {/* Status Breakdown */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">
                    {filteredInvoices.filter(i => i.status === 'pending').length}
                  </div>
                  <div className="text-xs text-yellow-800">Pending</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {filteredInvoices.filter(i => i.status === 'approved').length}
                  </div>
                  <div className="text-xs text-blue-800">Approved</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">
                    {filteredInvoices.filter(i => i.status === 'partial').length}
                  </div>
                  <div className="text-xs text-orange-800">Partial</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {filteredInvoices.filter(i => i.status === 'paid').length}
                  </div>
                  <div className="text-xs text-green-800">Paid</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">
                    {filteredInvoices.filter(i => i.status === 'rejected').length}
                  </div>
                  <div className="text-xs text-red-800">Rejected</div>
                </div>
              </div>
            </div>
          </div>
        )}

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

                <div className="space-y-6">
                  {/* Payment Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Payment Summary
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(selectedInvoice.amount)}</div>
                        <div className="text-sm text-gray-600">Total Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedInvoice.paidAmount || 0)}</div>
                        <div className="text-sm text-gray-600">Paid Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(selectedInvoice.remainingAmount || selectedInvoice.amount)}</div>
                        <div className="text-sm text-gray-600">Remaining</div>
                      </div>
                    </div>
                    
                    {/* Payment Progress Bar */}
                    {(selectedInvoice.paidAmount || 0) > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Payment Progress</span>
                          <span>{(((selectedInvoice.paidAmount || 0) / selectedInvoice.amount) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((selectedInvoice.paidAmount || 0) / selectedInvoice.amount) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-600">Installments:</span>
                          <span className="font-medium ml-1">{selectedInvoice.paymentCount || 0}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                            {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      {selectedInvoice.lastPaymentDate && (
                        <div className="text-sm text-gray-600">
                          Last Payment: {formatDate(selectedInvoice.lastPaymentDate)}
                        </div>
                      )}
                    </div>
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
                          <span className="text-gray-600">Created Date:</span>
                          <span className="font-medium">{formatDate(selectedInvoice.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due Date:</span>
                          <span className="font-medium">{formatDate(selectedInvoice.dueDate)}</span>
                        </div>
                        {selectedInvoice.paidAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Paid Date:</span>
                            <span className="font-medium text-green-600">{formatDate(selectedInvoice.paidAt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">FDN:</span>
                          <span className="font-medium">{selectedInvoice.fdn || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                      {(selectedInvoice.items || []).map((item, index) => (
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
                  {paymentHistory && paymentHistory.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Receipt className="w-4 h-4 mr-2" />
                        Payment History ({paymentHistory.length} installments)
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                          {(paymentHistory || []).map((payment, index) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded border">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                  #{payment.installmentNumber}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-xs text-gray-500">{payment.paymentReference}</p>
                                    <button
                                      onClick={() => copyToClipboard(payment.paymentReference)}
                                      className="text-xs text-blue-500 hover:text-blue-700"
                                      title="Copy Reference"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {payment.paymentMethod.type.replace('_', ' ')} • {formatDate(payment.paymentDate)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  {payment.paymentStatus || 'Completed'}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">
                                  By: {payment.paidByName} ({payment.paidBy})
                                </p>
                                <p className="text-xs text-gray-500">
                                  Running Total: {formatCurrency(payment.runningTotal || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Paid:</span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(selectedInvoice.paidAmount || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Remaining:</span>
                              <span className="font-bold text-red-600">
                                {formatCurrency(selectedInvoice.remainingAmount || selectedInvoice.amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  
                  <div className="flex space-x-3">
                    {selectedInvoice.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            handleApprove(selectedInvoice.id);
                            setShowModal(false);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            handleReject(selectedInvoice.id);
                            setShowModal(false);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                    
                    {selectedInvoice.status !== 'paid' && (
                      <button
                        onClick={() => {
                          setShowModal(false);
                          handleMakePayment(selectedInvoice);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {selectedInvoice.status === 'partial' 
                            ? `Pay ${formatCurrency(selectedInvoice.remainingAmount || 0)}` 
                            : 'Make Payment'
                          }
                        </span>
                      </button>
                    )}
                    
                    {selectedInvoice.status === 'paid' && (
                      <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fully Paid</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setShowModal(false);
                        handlePrintInvoice(selectedInvoice);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                  </div>
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
                      <p className="text-gray-600">Paid Amount:</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(selectedInvoice.paidAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Remaining:</p>
                      <p className="font-bold text-lg text-red-600">{formatCurrency(selectedInvoice.remainingAmount || selectedInvoice.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payments Made:</p>
                      <p className="font-medium">{selectedInvoice.paymentCount || 0} payment{(selectedInvoice.paymentCount || 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {paymentHistory && paymentHistory.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Payment History ({paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''})
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-3">
                        {(paymentHistory || []).map((payment, index) => (
                          <div key={payment.id} className="bg-white rounded-lg border shadow-sm p-4">
                            {/* Payment Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                #{payment.installmentNumber}
                              </div>
                              <div>
                                  <p className="font-semibold text-lg text-green-600">{formatCurrency(payment.amount)}</p>
                                  <p className="text-xs text-gray-500 font-mono">{payment.paymentReference}</p>
                              </div>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                  payment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.paymentStatus === 'completed' ? '✓ Completed' :
                                   payment.paymentStatus === 'pending' ? '⏳ Pending' :
                                   payment.paymentStatus === 'failed' ? '✗ Failed' :
                                   payment.paymentStatus || 'Unknown'}
                                </div>
                              </div>
                            </div>

                            {/* Payment Details Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600 font-medium">Date & Time:</p>
                                <p className="text-gray-900">
                                  {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {new Date(payment.paymentDate).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-gray-600 font-medium">Payment Method:</p>
                                <p className="text-gray-900 capitalize">
                                  {payment.paymentMethod.type.replace('_', ' ')}
                                </p>
                                {payment.paymentMethod.details.chequeNumber && (
                                  <p className="text-gray-500 text-xs">
                                    Cheque: {payment.paymentMethod.details.chequeNumber}
                                  </p>
                                )}
                                {payment.paymentMethod.details.transactionId && (
                                  <p className="text-gray-500 text-xs">
                                    TxID: {payment.paymentMethod.details.transactionId}
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-gray-600 font-medium">Paid By:</p>
                                <p className="text-gray-900">{payment.paidByName || 'Unknown'}</p>
                                <p className="text-gray-500 text-xs">ID: {payment.paidBy}</p>
                              </div>

                              <div>
                                <p className="text-gray-600 font-medium">Received By:</p>
                                <p className="text-gray-900">{selectedInvoice.supplierName}</p>
                                <p className="text-gray-500 text-xs">Supplier</p>
                              </div>

                              {/* Running totals */}
                              <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Running Total:</span>
                                  <span className="text-gray-900 font-medium">{formatCurrency(payment.runningTotal || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Remaining After:</span>
                                  <span className="text-gray-900 font-medium">{formatCurrency(payment.remainingAfterPayment || 0)}</span>
                                </div>
                              </div>

                              {/* Notes if available */}
                              {payment.notes && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-gray-600 font-medium text-xs">Notes:</p>
                                  <p className="text-gray-700 text-xs italic">{payment.notes}</p>
                                </div>
                              )}

                              {/* Approval info if available */}
                              {payment.approvedBy && payment.approvedAt && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-gray-600 font-medium text-xs">Approved By:</p>
                                  <p className="text-gray-700 text-xs">
                                    {payment.approvedBy} on {formatDate(payment.approvedAt)}
                                  </p>
                                </div>
                              )}

                              {/* Cheque specific info */}
                              {payment.paymentMethod.type === 'cheque' && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {payment.paymentMethod.details.bankName && (
                                      <div>
                                        <span className="text-gray-600">Bank:</span>
                                        <span className="ml-1 text-gray-900">{payment.paymentMethod.details.bankName}</span>
                                      </div>
                                    )}
                                    {payment.paymentMethod.details.chequeDate && (
                                      <div>
                                        <span className="text-gray-600">Cheque Date:</span>
                                        <span className="ml-1 text-gray-900">
                                          {formatDate(payment.paymentMethod.details.chequeDate)}
                                        </span>
                                      </div>
                                    )}
                                    {payment.clearedAt && (
                                      <div>
                                        <span className="text-gray-600">Cleared:</span>
                                        <span className="ml-1 text-green-600">{formatDate(payment.clearedAt)}</span>
                                      </div>
                                    )}
                                    {payment.bouncedAt && (
                                      <div>
                                        <span className="text-gray-600">Bounced:</span>
                                        <span className="ml-1 text-red-600">{formatDate(payment.bouncedAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
                          try {
                            const newReference = generatePaymentReference(selectedInvoice, newMethod);
                            setPaymentReference(newReference);
                          } catch (error) {
                            console.error('Error generating payment reference:', error);
                          }
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
                      max={selectedInvoice.remainingAmount || selectedInvoice.amount}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                    />
                    {paymentAmount && (
                      <div className="text-xs text-gray-500 mt-1">
                        <p>New remaining: {formatCurrency((selectedInvoice.remainingAmount || selectedInvoice.amount) - parseFloat(paymentAmount || '0'))}</p>
                        <p>This will be payment #{(selectedInvoice.paymentCount || 0) + 1}</p>
                      </div>
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
                            try {
                              const newReference = generatePaymentReference(selectedInvoice, paymentMethod);
                              setPaymentReference(newReference);
                            } catch (error) {
                              console.error('Error generating payment reference:', error);
                            }
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

        {/* Enhanced Print Modal with Payment Details */}
        {showPrintModal && selectedInvoice && (
          <InvoicePrintView 
            invoice={selectedInvoice as any}
            onClose={() => setShowPrintModal(false)}
          />
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
                  {/* Balance Information */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Balance Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(selectedInvoice.amount)}</div>
                        <div className="text-xs text-gray-600">Total Invoice</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(selectedInvoice.paidAmount || 0)}</div>
                        <div className="text-xs text-gray-600">Already Paid</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{formatCurrency(selectedInvoice.remainingAmount || selectedInvoice.amount)}</div>
                        <div className="text-xs text-gray-600">Current Balance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{formatCurrency(parseFloat(paymentAmount || '0'))}</div>
                        <div className="text-xs text-gray-600">This Payment</div>
                      </div>
                    </div>
                    
                    {/* Balance After Payment */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Balance After Payment:</span>
                        <span className={`text-lg font-bold ${
                          (selectedInvoice.remainingAmount || selectedInvoice.amount) - parseFloat(paymentAmount || '0') <= 0 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {formatCurrency(Math.max(0, (selectedInvoice.remainingAmount || selectedInvoice.amount) - parseFloat(paymentAmount || '0')))}
                        </span>
                      </div>
                      {(selectedInvoice.remainingAmount || selectedInvoice.amount) - parseFloat(paymentAmount || '0') <= 0 && (
                        <div className="mt-2 flex items-center space-x-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-medium">This payment will fully settle the invoice</span>
                        </div>
                      )}
                      {(selectedInvoice.remainingAmount || selectedInvoice.amount) - parseFloat(paymentAmount || '0') > 0 && (
                        <div className="mt-2 flex items-center space-x-2 text-orange-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Partial payment - {formatCurrency((selectedInvoice.remainingAmount || selectedInvoice.amount) - parseFloat(paymentAmount || '0'))} will remain
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Payment Details</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><span className="font-medium">Invoice:</span> {selectedInvoice.invoiceNumber}</p>
                      <p><span className="font-medium">Supplier:</span> {selectedInvoice.supplierName}</p>
                      <p><span className="font-medium">Payment Amount:</span> {formatCurrency(parseFloat(paymentAmount || '0'))}</p>
                      <p><span className="font-medium">Payment Method:</span> {paymentMethod.replace('_', ' ').toUpperCase()}</p>
                      <p><span className="font-medium">Payment Reference:</span> <span className="font-mono text-blue-900">{paymentReference}</span></p>
                      <p><span className="font-medium">Installment Number:</span> #{(selectedInvoice.paymentCount || 0) + 1}</p>
                      {(['momo', 'airtel_pay'].includes(paymentMethod)) && merchantCode && (
                        <p><span className="font-medium">Merchant Code:</span> {merchantCode}</p>
                      )}
                      {(['mobile_money', 'momo', 'airtel_pay'].includes(paymentMethod)) && mobileNumber && (
                        <p><span className="font-medium">Mobile Number:</span> {mobileNumber}</p>
                      )}
                      {(['mobile_money', 'momo', 'airtel_pay'].includes(paymentMethod)) && transactionId && (
                        <p><span className="font-medium">Transaction ID:</span> {transactionId}</p>
                      )}
                      {paymentNotes && (
                        <p><span className="font-medium">Notes:</span> {paymentNotes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p>Please verify the balance information and payment details before confirming.</p>
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