'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { enhancedInvoiceService, Invoice } from '../../../lib/firebase/enhanced-invoice';
import { QRCodeService } from '../../../lib/utils/qr-code';
import { 
  FileText, 
  Calendar, 
  User, 
  Package, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  ArrowLeft
} from 'lucide-react';

export default function PublicInvoicePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const invoiceId = params.id as string;
  const refNumber = searchParams.get('ref');

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }

      const invoiceData = await enhancedInvoiceService.getById(invoiceId);
      
      if (!invoiceData) {
        throw new Error('Invoice not found');
      }

      // Verify the reference number if provided
      if (refNumber && invoiceData.invoiceNumber !== refNumber) {
        throw new Error('Invalid invoice reference');
      }

      setInvoice(invoiceData);

      // Generate QR code for this invoice
      try {
        const qrUrl = await QRCodeService.generateInvoiceQRCode(invoiceData.id, invoiceData.invoiceNumber);
        setQrCodeUrl(qrUrl);
      } catch (qrError) {
        console.warn('Failed to generate QR code:', qrError);
      }

    } catch (err) {
      console.error('Error loading invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    return timestamp?.toDate?.()?.toLocaleDateString() || 'N/A';
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'Draft':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'Pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'Approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Paid':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Paid':
        return 'bg-blue-100 text-blue-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = async (text: string) => {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.log('Clipboard API failed:', err);
      }
    }
    
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  };

  const handleShare = async () => {
    if (navigator.share && invoice) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `View invoice from ${invoice.supplierName} for ${formatAmount(invoice.amount)}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
        // Fallback to copying URL
        const success = await copyToClipboard(window.location.href);
        if (success) {
          alert('Invoice link copied to clipboard!');
        } else {
          alert('Unable to copy link. Please copy the URL manually from your browser.');
        }
      }
    } else {
      // Fallback to copying URL
      const success = await copyToClipboard(window.location.href);
      if (success) {
        alert('Invoice link copied to clipboard!');
      } else {
        alert('Unable to copy link. Please copy the URL manually from your browser.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Invoice...</h2>
          <p className="text-gray-600">Please wait while we fetch the invoice data.</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested invoice could not be found.'}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
                <p className="text-gray-600">Public Invoice View</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              {qrCodeUrl && (
                <div className="w-16 h-16 border-2 border-gray-200 rounded-lg overflow-hidden">
                  <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            {getStatusIcon(invoice.status)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-600" />
                Invoice Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">FDN:</span>
                  <span className="font-medium">{invoice.fdn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDate(invoice.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-lg text-purple-600 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {formatAmount(invoice.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-purple-600" />
                Supplier Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Supplier Name:</span>
                  <p className="font-medium">{invoice.supplierName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Goods Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-purple-600" />
                Goods Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Description:</span>
                  <p className="font-medium">{invoice.description}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{invoice.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Goods Received as Invoiced:</span>
                  <span className={`font-medium ${invoice.goodsReceivedAsInvoiced ? 'text-green-600' : 'text-red-600'}`}>
                    {invoice.goodsReceivedAsInvoiced ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
                Payment Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount in Digits:</span>
                  <span className="font-medium">{formatAmount(invoice.amountInDigits)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Amount in Words:</span>
                  <p className="font-medium">{invoice.amountInWords}</p>
                </div>
                {invoice.hasTransportPayment && invoice.transportAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transport Payment:</span>
                    <span className="font-medium">{formatAmount(invoice.transportAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">
              This is a public view of Invoice {invoice.invoiceNumber} from EQUI Technologies and Innovations Ltd.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Generated on {new Date().toLocaleDateString()} | Scan QR code to view this invoice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 