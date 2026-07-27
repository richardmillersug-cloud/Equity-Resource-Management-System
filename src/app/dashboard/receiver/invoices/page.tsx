'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { enhancedInvoiceService, Invoice } from '../../../../lib/firebase/enhanced-invoice';
import InvoicePrintView from '../../../../components/ui/InvoicePrintView';
import { usePagination, PaginationBar } from '../../../../components/ui/Pagination';
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
  Save,
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

  const {
    paginatedItems: paginatedInvoices,
    currentPage: invoicePage,
    setCurrentPage: setInvoicePage,
    rowsPerPage: invoiceRowsPerPage,
    setRowsPerPage: setInvoiceRowsPerPage,
    totalPages: invoiceTotalPages,
    startIndex: invoiceStart,
    endIndex: invoiceEnd,
    totalItems: invoiceTotal,
  } = usePagination(filteredInvoices, 15);

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
      
      // Debug: Log unique statuses to see what's actually in the database
      const uniqueStatuses = [...new Set(data.map(invoice => invoice.status))];
      console.log('Unique Invoice Statuses:', uniqueStatuses);
      console.log('Total Invoices:', data.length);
      
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
      console.log('Invoice Stats:', statsData);
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

  const formatDate = (timestamp: unknown) => {
    return timestamp?.toDate?.()?.toLocaleDateString() || 'N/A';
  };

  const invoiceExportData = useMemo(
    () =>
      filteredInvoices.map((invoice) => ({
        'Invoice Number': invoice.invoiceNumber || 'N/A',
        'Supplier Name': invoice.supplierName || 'N/A',
        Amount: formatAmount(invoice.amount || 0),
        Status: invoice.status || 'N/A',
        'Date Created': formatDate(invoice.createdAt),
        'Due Date': formatDate(invoice.dueDate),
        FDN: invoice.fdn || 'N/A',
        Description: invoice.description || 'N/A',
        Quantity: invoice.quantity || 0,
      })),
    [filteredInvoices]
  );

  // Print invoices list
  const handlePrintInvoices = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for this website to enable printing.');
        return;
      }

      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoices Report - ${currentDate}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
                line-height: 1.4;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #7C3AED;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #7C3AED;
                margin: 0;
                font-size: 28px;
              }
              .header p {
                margin: 5px 0;
                color: #666;
              }
              .invoices-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background: white;
              }
              .invoices-table th {
                background: #7C3AED;
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
              }
              .invoices-table td {
                padding: 8px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 10px;
                vertical-align: top;
              }
              .invoices-table tr:nth-child(even) {
                background: #f9fafb;
              }
              .invoice-number {
                font-weight: bold;
                color: #7C3AED;
              }
              .status-badge {
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 9px;
                font-weight: 500;
                text-transform: uppercase;
              }
              .status-draft { background: #f3f4f6; color: #374151; }
              .status-pending { background: #fef3c7; color: #92400e; }
              .status-approved { background: #d1fae5; color: #065f46; }
              .status-paid { background: #dbeafe; color: #1e40af; }
              .status-rejected { background: #fee2e2; color: #dc2626; }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              @media print {
                body { margin: 0; }
                .invoices-table { break-inside: avoid; }
                .invoices-table th { 
                  background: #7C3AED !important;
                  color: white !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoices Report</h1>
              <p>Generated on ${currentDate} at ${currentTime}</p>
              <p>Total Invoices: ${filteredInvoices.length}</p>
              ${stats ? `
                <p>Pending: ${stats.pending} | Approved: ${stats.approved} | Paid: ${stats.paid}</p>
              ` : ''}
            </div>

            <table class="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>FDN</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${filteredInvoices.map(invoice => `
                  <tr>
                    <td>
                      <div class="invoice-number">${invoice.invoiceNumber || 'N/A'}</div>
                    </td>
                    <td>${invoice.supplierName || 'N/A'}</td>
                    <td>${formatAmount(invoice.amount || 0)}</td>
                    <td>
                      <span class="status-badge status-${(invoice.status || 'draft').toLowerCase()}">
                        ${invoice.status || 'Draft'}
                      </span>
                    </td>
                    <td>${formatDate(invoice.createdAt)}</td>
                    <td>${invoice.fdn || 'N/A'}</td>
                    <td>${(invoice.description || 'N/A').substring(0, 50)}${(invoice.description || '').length > 50 ? '...' : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Invoices Management System - Receiver Dashboard</p>
              <p>This report contains ${filteredInvoices.length} invoices based on current filters</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

    } catch (error) {
      console.error('Error printing invoices:', error);
      alert('Error generating print document. Please try again.');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
          <div className="relative p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                    Invoices Management
                  </h1>
                  <p className="text-purple-100 text-base">Manage and track all invoices from suppliers</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/receiver/invoices/add')}
                className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                <span>Add New Invoice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards - Complete Database Status Breakdown */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {/* Total Invoices */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                </div>
                  <p className="text-gray-500 text-xs font-medium mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.total}</p>
                </div>
              </div>

              {/* Draft */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-500 text-xs font-medium mb-1">Draft</p>
                  <p className="text-2xl font-bold text-gray-600 group-hover:text-gray-700 transition-colors">{stats.draft}</p>
              </div>
            </div>

              {/* Pending */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                </div>
                  <p className="text-gray-500 text-xs font-medium mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 group-hover:text-yellow-700 transition-colors">{stats.pending}</p>
                </div>
              </div>

              {/* Approved */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-500 text-xs font-medium mb-1">Approved</p>
                  <p className="text-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{stats.approved}</p>
              </div>
            </div>

              {/* Paid */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-500 text-xs font-medium mb-1">Paid</p>
                  <p className="text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{stats.paid}</p>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-500 text-xs font-medium mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-red-600 group-hover:text-red-700 transition-colors">{stats.rejected}</p>
                </div>
              </div>
            </div>

            {/* Financial Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Balance</p>
                    <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{formatAmount(stats.pendingAmount || stats.totalAmount)}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-500">Outstanding amount</span>
                </div>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Total Value</p>
                    <p className="text-3xl font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">{formatAmount(stats.totalAmount)}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-500">All invoices value</span>
                </div>
                </div>
                  <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
            </div>
          </>
        )}

        {/* Modern Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search invoices..."
                  className="pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full md:w-64 bg-white shadow-sm"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white shadow-sm"
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

            <div className="flex items-center space-x-3">
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
                className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all duration-200 shadow-sm border border-gray-200 font-medium"
                title="Generate Missing QR Codes"
              >
                <QrCode className="w-5 h-5" />
                <span className="hidden sm:inline">Generate QR</span>
              </button>
              <ExportButtons
                data={invoiceExportData}
                filename="receiver-invoices"
                title="Invoices"
                subtitle={`${filteredInvoices.length} invoice(s) · filtered view`}
              />
              <button 
                onClick={handlePrintInvoices}
                className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all duration-200 shadow-sm border border-gray-200 font-medium"
                title="Print Invoices List"
              >
                <Printer className="w-5 h-5" />
                <span className="hidden sm:inline">Print List</span>
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
              <p className="text-gray-500 max-w-md mx-auto">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No invoices match your current search criteria. Try adjusting your filters or search terms.' 
                  : 'Get started by creating your first invoice.'
                }
              </p>
              {!searchTerm && selectedStatus === 'all' && (
                <button
                  onClick={() => router.push('/dashboard/receiver/invoices/add')}
                  className="mt-6 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 mx-auto transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add First Invoice</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View - visible on small screens */}
              <div className="block md:hidden space-y-4">
                {paginatedInvoices.map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-lg transition-all duration-300"
                  >
                    {/* Header with Invoice Number and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-base font-semibold text-gray-900 mb-1">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          FDN: {invoice.fdn || 'N/A'}
                        </div>
                      </div>
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        <span className="hidden sm:inline">{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                      </span>
                    </div>

                    {/* Supplier */}
                    <div className="flex items-center mb-3">
                      <User className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="text-sm text-gray-900 truncate">{invoice.supplierName}</div>
                    </div>

                    {/* Amount and Quantity */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {formatAmount(invoice.amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Qty: {invoice.quantity || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(invoice.date)}
                      </div>
                    </div>

                    {/* Description */}
                    {invoice.description && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {invoice.description}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                      <button 
                        onClick={() => setSelectedInvoiceForDetails(invoice)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedInvoiceForPrint(invoice)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Print"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateQR(invoice)}
                        className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
                        title="QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedInvoiceForEdit(invoice)}
                        className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View - visible on medium screens and above */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gradient-to-r from-gray-50 to-purple-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Details
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount & Details
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Date
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedInvoices.map((invoice, index) => (
                      <tr key={invoice.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 transition-all duration-300 group border-l-4 border-transparent hover:border-purple-400">
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              FDN: {invoice.fdn || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-xs mt-1">
                              {invoice.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="text-sm text-gray-900 truncate max-w-[150px]">{invoice.supplierName}</div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {formatAmount(invoice.amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty: {invoice.quantity || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            <span>{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span>
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="text-sm text-gray-900">
                              {formatDate(invoice.date)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-medium">
                          <div className="flex flex-wrap gap-1">
                            <button 
                              onClick={() => setSelectedInvoiceForDetails(invoice)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                              title="View Invoice Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => setSelectedInvoiceForPrint(invoice)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleGenerateQR(invoice)}
                              className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors"
                              title="Generate QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => setSelectedInvoiceForEdit(invoice)}
                              className="p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors"
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
            </>
          )}
          {filteredInvoices.length > 0 && (
            <PaginationBar
              currentPage={invoicePage}
              totalPages={invoiceTotalPages}
              rowsPerPage={invoiceRowsPerPage}
              startIndex={invoiceStart}
              endIndex={invoiceEnd}
              totalItems={invoiceTotal}
              onPageChange={setInvoicePage}
              onRowsPerPageChange={setInvoiceRowsPerPage}
              rowsOptions={[10, 15, 25, 50, 100]}
            />
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
                  {formatAmount(filteredInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatAmount(filteredInvoices.filter(i => i.status === 'Approved' || i.status === 'Paid').reduce((sum, invoice) => sum + invoice.amount, 0))}
                </div>
                <div className="text-sm text-gray-600">Approved Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {formatAmount(filteredInvoices.filter(i => i.status === 'Pending').reduce((sum, invoice) => sum + invoice.amount, 0))}
                </div>
                <div className="text-sm text-gray-600">Pending Value</div>
              </div>
            </div>
            
            {/* Status Breakdown */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-600">
                    {filteredInvoices.filter(i => i.status === 'Draft').length}
                  </div>
                  <div className="text-xs text-gray-800">Draft</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">
                    {filteredInvoices.filter(i => i.status === 'Pending').length}
                  </div>
                  <div className="text-xs text-yellow-800">Pending</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {filteredInvoices.filter(i => i.status === 'Approved').length}
                  </div>
                  <div className="text-xs text-green-800">Approved</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {filteredInvoices.filter(i => i.status === 'Paid').length}
                  </div>
                  <div className="text-xs text-blue-800">Paid</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">
                    {filteredInvoices.filter(i => i.status === 'Rejected').length}
                  </div>
                  <div className="text-xs text-red-800">Rejected</div>
                </div>
              </div>
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
//   Close
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
//   Close
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
                                     const updates: unknown = {
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
//   Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="goodsReceived"
                              value="false"
                              defaultChecked={!selectedInvoiceForEdit.goodsReceivedAsInvoiced}
                              className="mr-2"
                            />
//   No
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
//   Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="transportPayment"
                              value="false"
                              defaultChecked={!selectedInvoiceForEdit.hasTransportPayment}
                              className="mr-2"
                            />
//   No
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
//   Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="damages"
                              value="false"
                              defaultChecked={!selectedInvoiceForEdit.hasDamages}
                              className="mr-2"
                            />
//   No
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
//   Cancel
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