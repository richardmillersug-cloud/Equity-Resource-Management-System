'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enhancedInvoiceService, Invoice } from '../../../../lib/firebase/enhanced-invoice';
import InvoicePrintView from '../../../../components/ui/InvoicePrintView';
import { QRCodeService } from '../../../../lib/utils/qr-code';
import { Timestamp } from 'firebase/firestore';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  User,
  Package,
  Eye,
  Edit,
  Trash2,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  QrCode,
  Save
} from 'lucide-react';

interface InvoiceStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  totalAmount: number;
  pendingAmount: number;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceForQR, setSelectedInvoiceForQR] = useState<Invoice | null>(null);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<Invoice | null>(null);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<Invoice | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    loadInvoices();
    loadStats();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, selectedStatus]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await enhancedInvoiceService.getAll([], { 
        orderBy: 'date', 
        orderDirection: 'desc' 
      });
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await enhancedInvoiceService.getInvoiceStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.supplierName && invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.fdn && invoice.fdn.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.description && invoice.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus);
    }

    setFilteredInvoices(filtered);
  };

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      await enhancedInvoiceService.updateInvoiceStatus(invoiceId, newStatus);
      await loadInvoices();
      await loadStats();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Error updating invoice status');
    }
  };

  const handleUpdateInvoice = async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      setLoading(true);
      // For receivers, all edits automatically set status to Pending for approval
      const updatesWithPendingStatus = {
        ...updates,
        status: 'Pending' as Invoice['status'], // Always set to Pending for receiver edits
        updatedAt: Timestamp.now()
      };
      
      await enhancedInvoiceService.update(invoiceId, updatesWithPendingStatus);
      await loadInvoices();
      await loadStats();
      setSelectedInvoiceForEdit(null);
      
      // Show success message with pending approval notice
      alert('Invoice updated successfully! Changes are pending approval from the purchasing manager.');
    } catch (error) {
      console.error('Error updating invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update invoice: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async (invoice: Invoice) => {
    try {
      setSelectedInvoiceForQR(invoice);
      
      // First try to use the stored QR code
      if (invoice.qrCodeURL) {
        console.log('Using stored QR code from invoice');
        setQrCodeUrl(invoice.qrCodeURL);
      } else {
        console.log('No stored QR code, generating new one');
        const qrUrl = await QRCodeService.generateShareableQRCode({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          supplierName: invoice.supplierName,
          amount: invoice.amount,
          date: formatDate(invoice.date)
        });
        setQrCodeUrl(qrUrl);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Error generating QR code');
    }
  };

  const handleCloseQRModal = () => {
    setSelectedInvoiceForQR(null);
    setQrCodeUrl('');
  };

  const handleDownloadQR = () => {
    if (qrCodeUrl && selectedInvoiceForQR) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR_Invoice_${selectedInvoiceForQR.invoiceNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'Draft':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'Pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Paid':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Invoices...</h2>
          <p className="text-gray-600">Please wait while we fetch your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-purple-600" />
                Invoices Management
              </h1>
              <p className="text-gray-600 mt-2">Manage and track all invoices from suppliers</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/receiver/invoices/add')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Invoice</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatAmount(stats.totalAmount)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoices..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full md:w-64"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    await enhancedInvoiceService.generateMissingQRCodes();
                    await loadInvoices();
                    alert('QR codes generated for invoices that were missing them!');
                  } catch (error) {
                    console.error('Error generating QR codes:', error);
                    alert('Error generating QR codes');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Generate Missing QR Codes"
              >
                <QrCode className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No invoices match your current filters.' 
                  : 'Get started by creating your first invoice.'
                }
              </p>
              {!searchTerm && selectedStatus === 'all' && (
                <button
                  onClick={() => router.push('/dashboard/receiver/invoices/add')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add First Invoice</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-gray-500">FDN: {invoice.fdn}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{invoice.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{invoice.supplierName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{formatAmount(invoice.amount)}</div>
                        <div className="text-sm text-gray-500">Qty: {invoice.quantity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(invoice.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{formatDate(invoice.date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedInvoiceForDetails(invoice)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceForPrint(invoice)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateQR(invoice)}
                            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceForEdit(invoice)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredInvoices.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </span>
              <span className="text-sm font-medium text-gray-900">
                Total Value: {formatAmount(filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
              </span>
            </div>
          </div>
        )}

        {/* Print Modal */}
        {selectedInvoiceForPrint && (
          <InvoicePrintView 
            invoice={selectedInvoiceForPrint}
            onClose={() => setSelectedInvoiceForPrint(null)}
          />
        )}

        {/* QR Code Modal */}
        {selectedInvoiceForQR && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">QR Code for Invoice</h2>
                  <button
                    onClick={handleCloseQRModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="text-center">
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900">{selectedInvoiceForQR.invoiceNumber}</h3>
                    <p className="text-sm text-gray-600">{selectedInvoiceForQR.supplierName}</p>
                    <p className="text-sm text-purple-600 font-medium">{formatAmount(selectedInvoiceForQR.amount)}</p>
                  </div>
                  
                  {qrCodeUrl ? (
                    <div className="mb-6">
                      <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-48 h-48 border border-gray-200 rounded-lg" />
                      <p className="text-xs text-gray-500 mt-2">Scan to view invoice details</p>
                    </div>
                  ) : (
                    <div className="mb-6 flex items-center justify-center w-48 h-48 mx-auto border border-gray-200 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDownloadQR}
                      disabled={!qrCodeUrl}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handleCloseQRModal}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoiceForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
                  <button
                    onClick={() => setSelectedInvoiceForDetails(null)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Invoice Header */}
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-purple-900">{selectedInvoiceForDetails.invoiceNumber}</h3>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedInvoiceForDetails.status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoiceForDetails.status)}`}>
                        {selectedInvoiceForDetails.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-purple-700 text-sm">FDN: {selectedInvoiceForDetails.fdn}</p>
                </div>

                {/* Invoice Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                      <p className="text-gray-900">{selectedInvoiceForDetails.supplierName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <p className="text-2xl font-bold text-purple-600">{formatAmount(selectedInvoiceForDetails.amount)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <p className="text-gray-900">{selectedInvoiceForDetails.quantity}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <p className="text-gray-900">{formatDate(selectedInvoiceForDetails.date)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <p className="text-gray-900">{selectedInvoiceForDetails.description}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Goods Received</label>
                      <p className={`font-medium ${selectedInvoiceForDetails.goodsReceivedAsInvoiced ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedInvoiceForDetails.goodsReceivedAsInvoiced ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transport Payment</label>
                      <p className={`font-medium ${selectedInvoiceForDetails.hasTransportPayment ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedInvoiceForDetails.hasTransportPayment ? 'Yes' : 'No'}
                        {selectedInvoiceForDetails.transportAmount && ` - ${formatAmount(selectedInvoiceForDetails.transportAmount)}`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Damages</label>
                      <p className={`font-medium ${selectedInvoiceForDetails.hasDamages ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedInvoiceForDetails.hasDamages ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {(selectedInvoiceForDetails.missingItems || selectedInvoiceForDetails.notes) && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                    {selectedInvoiceForDetails.missingItems && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Missing Items</label>
                        <p className="text-gray-900 text-sm">{selectedInvoiceForDetails.missingItems}</p>
                      </div>
                    )}
                    {selectedInvoiceForDetails.missingReason && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Missing Reason</label>
                        <p className="text-gray-900 text-sm">{selectedInvoiceForDetails.missingReason}</p>
                      </div>
                    )}
                    {selectedInvoiceForDetails.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <p className="text-gray-900 text-sm">{selectedInvoiceForDetails.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setSelectedInvoiceForPrint(selectedInvoiceForDetails);
                      setSelectedInvoiceForDetails(null);
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    onClick={() => {
                      handleGenerateQR(selectedInvoiceForDetails);
                      setSelectedInvoiceForDetails(null);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Generate QR</span>
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceForDetails(null)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Invoice Modal */}
        {selectedInvoiceForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-2xl font-bold text-gray-900">Edit Invoice</h2>
                   <button
                     onClick={() => setSelectedInvoiceForEdit(null)}
                     className="text-gray-400 hover:text-gray-600 p-2"
                   >
                     ✕
                   </button>
                 </div>
                 
                 {/* Approval Notice */}
                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                   <div className="flex items-start">
                     <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                     <div>
                       <h3 className="text-sm font-medium text-amber-800">Approval Required</h3>
                       <p className="text-sm text-amber-700 mt-1">
                         All edits made by receivers require approval from the purchasing manager. 
                         This invoice will automatically be set to "Pending" status after saving changes.
                       </p>
                     </div>
                   </div>
                 </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                                     const updates: any = {
                     amount: parseFloat(formData.get('amount') as string),
                     quantity: parseInt(formData.get('quantity') as string),
                     description: formData.get('description') as string,
                     goodsReceivedAsInvoiced: formData.get('goodsReceived') === 'true',
                     hasTransportPayment: formData.get('transportPayment') === 'true',
                     hasDamages: formData.get('damages') === 'true'
                     // Note: Status will be automatically set to 'Pending' in handleUpdateInvoice
                   };

                   // Only add optional fields if they have values
                   const transportAmount = formData.get('transportAmount') as string;
                   if (transportAmount && transportAmount.trim() !== '') {
                     updates.transportAmount = parseFloat(transportAmount);
                   }

                   const missingItems = formData.get('missingItems') as string;
                   if (missingItems && missingItems.trim() !== '') {
                     updates.missingItems = missingItems.trim();
                   }

                   const missingReason = formData.get('missingReason') as string;
                   if (missingReason && missingReason.trim() !== '') {
                     updates.missingReason = missingReason.trim();
                   }

                   const notes = formData.get('notes') as string;
                   if (notes && notes.trim() !== '') {
                     updates.notes = notes.trim();
                   }
                  handleUpdateInvoice(selectedInvoiceForEdit.id, updates);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          value={selectedInvoiceForEdit.invoiceNumber}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                        <input
                          type="text"
                          value={selectedInvoiceForEdit.supplierName}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (UGX)</label>
                        <input
                          type="number"
                          name="amount"
                          defaultValue={selectedInvoiceForEdit.amount}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          name="quantity"
                          defaultValue={selectedInvoiceForEdit.quantity}
                          required
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                                             <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                         <input
                           type="text"
                           value={selectedInvoiceForEdit.status}
                           disabled
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                         />
                         <p className="text-xs text-amber-600 mt-1">
                           ⚠️ All edits will set status to "Pending" for manager approval
                         </p>
                       </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          name="description"
                          defaultValue={selectedInvoiceForEdit.description}
                          required
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Goods Received as Invoiced?</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="goodsReceived"
                              value="true"
                              defaultChecked={selectedInvoiceForEdit.goodsReceivedAsInvoiced}
                              className="mr-2"
                            />
                            Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="goodsReceived"
                              value="false"
                              defaultChecked={!selectedInvoiceForEdit.goodsReceivedAsInvoiced}
                              className="mr-2"
                            />
                            No
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transport Payment Required?</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="transportPayment"
                              value="true"
                              defaultChecked={selectedInvoiceForEdit.hasTransportPayment}
                              className="mr-2"
                            />
                            Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="transportPayment"
                              value="false"
                              defaultChecked={!selectedInvoiceForEdit.hasTransportPayment}
                              className="mr-2"
                            />
                            No
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transport Amount (UGX)</label>
                        <input
                          type="number"
                          name="transportAmount"
                          defaultValue={selectedInvoiceForEdit.transportAmount || ''}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Any Damages?</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="damages"
                              value="true"
                              defaultChecked={selectedInvoiceForEdit.hasDamages}
                              className="mr-2"
                            />
                            Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="damages"
                              value="false"
                              defaultChecked={!selectedInvoiceForEdit.hasDamages}
                              className="mr-2"
                            />
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional Information */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Missing Items</label>
                      <textarea
                        name="missingItems"
                        defaultValue={selectedInvoiceForEdit.missingItems || ''}
                        rows={2}
                        placeholder="Describe any missing items..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Missing Reason</label>
                      <textarea
                        name="missingReason"
                        defaultValue={selectedInvoiceForEdit.missingReason || ''}
                        rows={2}
                        placeholder="Explain why items are missing..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        defaultValue={selectedInvoiceForEdit.notes || ''}
                        rows={3}
                        placeholder="Additional notes..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForEdit(null)}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 