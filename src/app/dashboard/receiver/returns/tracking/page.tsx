'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Package,
  Calendar,
  User,
  Eye,
  Search,
  Filter,
  Upload,
  Edit
} from 'lucide-react';
import { EnhancedReturnNoteService, ReturnNote, RETURN_STATUSES } from '../../../../../lib/firebase/enhanced-return-note';

const returnNoteService = new EnhancedReturnNoteService();

export default function ReturnNotesTrackingPage() {
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReturnNote, setSelectedReturnNote] = useState<ReturnNote | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReturnNote | null>(null);

  useEffect(() => {
    loadReturnNotes();
  }, []);

  const loadReturnNotes = async () => {
    try {
      setLoading(true);
      const notes = await returnNoteService.getAll();
      
      // Debug: Log all return notes and their statuses
      console.log('🔍 All return notes from database:', notes.length);
      console.log('📊 Status breakdown:');
      const statusCounts = notes.reduce((acc: any, note) => {
        acc[note.status] = (acc[note.status] || 0) + 1;
        return acc;
      }, {});
      console.table(statusCounts);
      
      // Filter for return notes that are in the tracking phase
      // Including 'draft' status as submitted return notes might start as draft
      const trackingNotes = notes.filter(note => 
        ['draft', 'pending', 'approved', 'picked_up', 'received'].includes(note.status)
      );
      
      console.log(`✅ Showing ${trackingNotes.length} return notes in tracking (filtered from ${notes.length} total)`);
      setReturnNotes(trackingNotes);
    } catch (error) {
      console.error('Error loading return notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReturnNoteStatus = async (id: string, newStatus: string) => {
    try {
      await returnNoteService.update(id, { 
        status: newStatus
      });
      
      // If marking as received, show receipt modal
      if (newStatus === 'received') {
        const updatedNote = returnNotes.find(note => note.id === id);
        if (updatedNote) {
          setReceiptData({ ...updatedNote, status: newStatus });
          setShowReceiptModal(true);
        }
      }
      
      // Reload the data
      await loadReturnNotes();
      alert(`Return note status updated to ${newStatus}!`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const generateReceipt = (returnNote: ReturnNote) => {
    setReceiptData(returnNote);
    setShowReceiptModal(true);
  };

  const printReceipt = () => {
    if (!receiptData) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return Receipt - ${receiptData.returnNoteNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-section {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              justify-content: center;
              margin-bottom: 20px;
            }
            .company-logo {
              width: 60px;
              height: 60px;
              border: 1px solid #d1d5db;
              background: white;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .company-info h1 {
              font-size: 18px;
              color: #1f2937;
              margin: 0 0 4px 0;
              font-weight: bold;
            }
            .company-info p {
              color: #6b7280;
              font-size: 12px;
              margin: 2px 0;
            }
            .receipt-title {
              text-align: center;
              margin: 20px 0;
            }
            .title-box {
              font-size: 20px;
              font-weight: bold;
              border: 2px solid #374151;
              padding: 10px 30px;
              display: inline-block;
              background: white;
            }
            .receipt-number {
              font-size: 14px;
              color: #374151;
              font-weight: bold;
              margin-top: 8px;
            }
            .receipt-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .details-section h3 {
              font-size: 16px;
              color: #374151;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            .detail-row .label {
              font-weight: 600;
              color: #6b7280;
              min-width: 120px;
            }
            .detail-row .value {
              color: #111827;
              text-align: right;
              flex: 1;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              background: white;
              border: 1px solid #e5e7eb;
            }
            .items-table th {
              background: #f9fafb;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
              font-size: 12px;
              text-transform: uppercase;
            }
            .items-table td {
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            .total-section {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              padding: 20px;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            .total-row.final {
              border-top: 2px solid #374151;
              padding-top: 12px;
              margin-top: 12px;
              font-weight: bold;
              font-size: 16px;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 40px;
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #e5e7eb;
            }
            .signature-box {
              text-align: center;
            }
            .signature-box .line {
              border-bottom: 1px solid #374151;
              margin-bottom: 8px;
              height: 40px;
            }
            .signature-box .title {
              font-size: 12px;
              color: #6b7280;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
            }
            .received-stamp {
              background: #10b981;
              color: white;
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: bold;
              display: inline-block;
              margin-top: 10px;
            }
            @media print {
              body { margin: 0; }
              .receipt-container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <!-- Header -->
            <div class="receipt-header">
              <div class="company-section">
                <div class="company-logo">
                  <img src="/equity-logo.png" alt="Equity Logo" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="company-info">
                  <h1>UNISON TECHNOLOGIES AND INNOVATION LTD</h1>
                  <p>EQUITY SHOPPERS SUPERMARKET</p>
                  <p>KYENGERA, KAMPALA-MASAKA</p>
                  <p style="color: #2563eb;">unisontechnologiesaninnovation@gmail.com</p>
                  <p style="color: #2563eb;">equityshoppers@gmail.com</p>
                </div>
              </div>
            </div>
            
            <!-- Receipt Title and Number -->
            <div class="receipt-title">
              <h3 class="title-box">GOODS RETURN RECEIPT</h3>
              <div class="receipt-number">Receipt #: RR${receiptData.returnNoteNumber || receiptData.id?.slice(-4) || '0000'}</div>
              <div class="received-stamp">✓ GOODS RECEIVED</div>
            </div>
            
            <!-- Receipt Details -->
            <div class="receipt-details">
              <div class="details-section">
                <h3>Return Information</h3>
                <div class="detail-row">
                  <span class="label">Return Note #:</span>
                  <span class="value">${receiptData.returnNoteNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Original Return Date:</span>
                  <span class="value">${receiptData.returnDate.toDate().toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Goods Received Date:</span>
                  <span class="value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Received Time:</span>
                  <span class="value">${new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div class="details-section">
                <h3>Supplier Information</h3>
                <div class="detail-row">
                  <span class="label">Supplier:</span>
                  <span class="value">${receiptData.supplierName}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Return Reason:</span>
                  <span class="value">${receiptData.reason}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Items:</span>
                  <span class="value">${receiptData.items.length}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Quantity:</span>
                  <span class="value">${receiptData.totalQuantity || receiptData.items?.length || 0}</span>
                </div>
              </div>
            </div>
            
            <!-- Items Received Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 5%">#</th>
                  <th style="width: 30%">Item Name</th>
                  <th style="width: 15%">Category</th>
                  <th style="width: 10%">Qty</th>
                  <th style="width: 8%">Unit</th>
                  <th style="width: 12%">Unit Price</th>
                  <th style="width: 12%">Total Value</th>
                  <th style="width: 8%">Condition</th>
                </tr>
              </thead>
              <tbody>
                ${receiptData.items.map((item, index) => `
                  <tr>
                    <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                    <td style="font-weight: 600;">
                      ${item.itemName}
                      ${item.batchNumber ? `<div style="font-size: 11px; color: #6b7280;">Batch: ${item.batchNumber}</div>` : ''}
                      ${item.expiryDate ? `<div style="font-size: 11px; color: #dc2626;">Exp: ${item.expiryDate.toDate().toLocaleDateString()}</div>` : ''}
                    </td>
                    <td>${item.category || 'N/A'}</td>
                    <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                    <td style="text-align: center;">${item.unit}</td>
                    <td style="text-align: right;">UGX ${item.unitPrice.toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 600;">UGX ${(item.totalValue || (item.quantity * item.unitPrice) || 0).toLocaleString()}</td>
                    <td style="text-align: center;"><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">RECEIVED</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <!-- Total Section -->
            <div class="total-section">
              <div class="total-row">
                <span>Total Items Received:</span>
                <span>${receiptData.items.length}</span>
              </div>
              <div class="total-row">
                <span>Total Quantity Received:</span>
                <span>${receiptData.totalQuantity || receiptData.items?.length || 0}</span>
              </div>
              <div class="total-row final">
                <span>Total Value Received:</span>
                <span>UGX ${(receiptData.totalValue || receiptData.items?.reduce((sum, item) => sum + (item.totalValue || (item.quantity * item.unitPrice) || 0), 0) || 0).toLocaleString()}</span>
              </div>
            </div>
            
            ${receiptData.notes ? `
            <!-- Notes -->
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 8px 0; color: #374151;">Additional Notes</h3>
              <p style="margin: 0; color: #6b7280;">${receiptData.notes}</p>
            </div>
            ` : ''}
            
            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">
                <div class="line"></div>
                <div class="title">Received By</div>
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div class="title">Supplier Representative</div>
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div class="title">Warehouse Manager</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>This is a computer-generated receipt confirming the return of goods.</p>
              <p>Generated on ${new Date().toLocaleString()} | Equity Shoppers Supermarket</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
    }
  };

  const getStatusColor = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    const color = statusConfig?.color || 'gray';
    
    switch (color) {
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status.toUpperCase();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'picked_up': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'received': return <Package className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getDaysElapsed = (date: any) => {
    const now = new Date();
    const returnDate = date.toDate ? date.toDate() : new Date(date);
    const diffTime = now.getTime() - returnDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredReturnNotes = returnNotes.filter(note => {
    const matchesSearch = note.returnNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading return notes tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Return Notes Tracking</h1>
          </div>
          <p className="text-blue-100 text-lg">Track return notes until items are brought back to business</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by return note number or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="picked_up">Picked Up</option>
                <option value="received">Items Received</option>
              </select>
            </div>

            <button
              onClick={loadReturnNotes}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Edit className="w-8 h-8 text-gray-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-900">
                  {returnNotes.filter(note => note.status === 'draft').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">
                  {returnNotes.filter(note => note.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Approved & Ready</p>
                <p className="text-2xl font-bold text-gray-900">
                  {returnNotes.filter(note => note.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Truck className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Out for Pickup</p>
                <p className="text-2xl font-bold text-gray-900">
                  {returnNotes.filter(note => note.status === 'picked_up').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Items Received</p>
                <p className="text-2xl font-bold text-gray-900">
                  {returnNotes.filter(note => note.status === 'received').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Notes Tracking List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Return Notes in Transit</h2>
            <p className="text-gray-600 mt-1">Track items from approval to receipt</p>
          </div>

          {filteredReturnNotes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Return Notes to Track</h3>
              <p className="text-gray-500">All return notes are either in draft/pending state or have been processed.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReturnNotes.map((returnNote) => (
                <div key={returnNote.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        {getStatusIcon(returnNote.status)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {returnNote.returnNoteNumber}
                        </h3>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(returnNote.status)}`}>
                          {getStatusLabel(returnNote.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Supplier:</span>
                          <p className="text-gray-900">{returnNote.supplierName}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Items:</span>
                          <p className="text-gray-900">{returnNote.items.length} items</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Total Value:</span>
                          <p className="text-gray-900">UGX {(returnNote.totalValue || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Days Elapsed:</span>
                          <p className={`font-semibold ${getDaysElapsed(returnNote.returnDate) > 7 ? 'text-red-600' : 'text-gray-900'}`}>
                            {getDaysElapsed(returnNote.returnDate)} days
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Return Date: {returnNote.returnDate.toDate().toLocaleDateString()}</span>
                        </div>
                        {returnNote.expectedPickupDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Expected Pickup: {returnNote.expectedPickupDate.toDate().toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedReturnNote(returnNote)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                      
                      {returnNote.status === 'draft' && (
                        <button
                          onClick={() => updateReturnNoteStatus(returnNote.id, 'pending')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Submit for Approval
                        </button>
                      )}

                      {returnNote.status === 'pending' && (
                        <button
                          onClick={() => updateReturnNoteStatus(returnNote.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </button>
                      )}
                      
                      {returnNote.status === 'approved' && (
                        <button
                          onClick={() => updateReturnNoteStatus(returnNote.id, 'picked_up')}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Mark Picked Up
                        </button>
                      )}
                      
                      {returnNote.status === 'picked_up' && (
                        <button
                          onClick={() => updateReturnNoteStatus(returnNote.id, 'received')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Received
                        </button>
                      )}
                      
                      {returnNote.status === 'received' && (
                        <button
                          onClick={() => generateReceipt(returnNote)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Print Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Simple Modal for Return Note Details */}
      {selectedReturnNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Return Note Details</h2>
                <button
                  onClick={() => setSelectedReturnNote(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Return Note #:</span>
                  <p className="text-gray-900">{selectedReturnNote.returnNoteNumber}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedReturnNote.status)}`}>
                    {getStatusLabel(selectedReturnNote.status)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Supplier:</span>
                  <p className="text-gray-900">{selectedReturnNote.supplierName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Total Value:</span>
                  <p className="text-gray-900">UGX {(selectedReturnNote.totalValue || 0).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-600">Items ({selectedReturnNote.items.length}):</span>
                <div className="mt-2 space-y-2">
                  {selectedReturnNote.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{item.itemName}</p>
                          <p className="text-sm text-gray-600">{item.quantity} {item.unit} × UGX {item.unitPrice.toLocaleString()}</p>
                          <p className="text-sm text-blue-600">{item.reason}</p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          UGX {(item.totalValue || (item.quantity * item.unitPrice)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReturnNote.notes && (
                <div>
                  <span className="font-medium text-gray-600">Notes:</span>
                  <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReturnNote.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedReturnNote(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Goods Return Receipt</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 mt-1">Receipt for return note: {receiptData.returnNoteNumber}</p>
            </div>

            <div className="p-6">
              {/* Receipt Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-3 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">✓ GOODS RECEIVED</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Return Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Return Note #:</span>
                        <span className="font-medium">{receiptData.returnNoteNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Return Date:</span>
                        <span className="font-medium">{receiptData.returnDate.toDate().toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Goods Received Date:</span>
                        <span className="font-medium">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Received Time:</span>
                        <span className="font-medium">{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Supplier Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supplier:</span>
                        <span className="font-medium">{receiptData.supplierName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Return Reason:</span>
                        <span className="font-medium">{receiptData.reason}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items:</span>
                        <span className="font-medium">{receiptData.items.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">UGX {(receiptData.totalValue || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border">
                  <h3 className="font-semibold text-gray-900 mb-3">Items Received</h3>
                  <div className="space-y-2">
                    {receiptData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.itemName}</p>
                          <p className="text-sm text-gray-600">{item.quantity} {item.unit} × UGX {item.unitPrice.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">UGX {(item.totalValue || (item.quantity * item.unitPrice)).toLocaleString()}</p>
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">RECEIVED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {receiptData.notes && (
                  <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <h4 className="font-medium text-blue-900 mb-1">Additional Notes</h4>
                    <p className="text-blue-800 text-sm">{receiptData.notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={printReceipt}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}