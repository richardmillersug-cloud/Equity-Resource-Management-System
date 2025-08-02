'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  Filter,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2,
  User
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { PurchasingManagerService } from '../../../../lib/firebase/purchasing-manager-service';

interface SupplierTotal {
  supplierId: string;
  supplierName: string;
  totalUnpaidAmount: number;
  totalPaidAmount: number;
  totalInvoicesCount: number;
  unpaidInvoicesCount: number;
  partialInvoicesCount: number;
  oldestUnpaidDate: Date | null;
  averageInvoiceAmount: number;
  paymentStatus: 'good' | 'warning' | 'critical';
  invoices: InvoiceDetail[];
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  date: Date;
  dueDate: Date | null;
  daysPastDue: number;
}

export default function SupplierTotalsPage() {
  const router = useRouter();
  const [supplierTotals, setSupplierTotals] = useState<SupplierTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'invoices' | 'oldest'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  // Summary totals
  const [summaryData, setSummaryData] = useState({
    totalOutstanding: 0,
    totalSuppliers: 0,
    criticalSuppliers: 0,
    overdueInvoices: 0
  });

  useEffect(() => {
    loadSupplierTotals();
  }, []);

  const loadSupplierTotals = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading supplier totals...');

      // Get all invoices first, then filter client-side to avoid composite index issues
      let invoicesSnapshot;
      try {
        const invoicesQuery = query(
          collection(db, 'invoices'),
          orderBy('createdAt', 'desc')
        );
        invoicesSnapshot = await getDocs(invoicesQuery);
      } catch (indexError) {
        console.warn('Failed to query with createdAt order, trying without order:', indexError);
        // Fallback: get all invoices without ordering
        const fallbackQuery = query(collection(db, 'invoices'));
        invoicesSnapshot = await getDocs(fallbackQuery);
      }
      
      console.log(`📊 Found ${invoicesSnapshot.docs.length} total invoices`);

      const allInvoices = invoicesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()),
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : null,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        };
      });

      // Filter for unpaid invoices (client-side filtering to avoid index issues)
      const unpaidStatuses = ['pending', 'approved', 'partial', 'overdue', 'Pending', 'Approved', 'Partial', 'Overdue', 'Draft'];
      const invoices = allInvoices.filter(invoice => {
        const status = invoice.status?.toLowerCase();
        return status && unpaidStatuses.some(s => s.toLowerCase() === status) && status !== 'paid' && status !== 'rejected';
      });

      console.log(`📋 Filtered to ${invoices.length} unpaid invoices`);

      // Group invoices by supplier and calculate totals
      const supplierMap = new Map<string, SupplierTotal>();

      for (const invoice of invoices) {
        try {
          const supplierId = invoice.supplierId || invoice.supplier_id || 'unknown';
          const supplierName = invoice.supplierName || invoice.supplier_name || `Supplier ${supplierId}`;

          if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
              supplierId,
              supplierName,
              totalUnpaidAmount: 0,
              totalPaidAmount: 0,
              totalInvoicesCount: 0,
              unpaidInvoicesCount: 0,
              partialInvoicesCount: 0,
              oldestUnpaidDate: null,
              averageInvoiceAmount: 0,
              paymentStatus: 'good',
              invoices: []
            });
          }

          const supplierTotal = supplierMap.get(supplierId)!;

          // Calculate remaining amount for this invoice
          const invoiceAmount = Number(invoice.amount || invoice.amountInDigits || 0);
          const paidAmount = Number(invoice.paidAmount || 0);
          const remainingAmount = Math.max(0, invoiceAmount - paidAmount);
          
          const daysPastDue = invoice.dueDate ? 
            Math.max(0, Math.floor((new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

          const invoiceDetail: InvoiceDetail = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber || invoice.fdn || `INV-${invoice.id.slice(0, 8)}`,
            amount: invoiceAmount,
            paidAmount,
            remainingAmount,
            status: invoice.status || 'pending',
            date: invoice.date,
            dueDate: invoice.dueDate,
            daysPastDue
          };

          supplierTotal.invoices.push(invoiceDetail);
          supplierTotal.totalInvoicesCount++;
          supplierTotal.totalPaidAmount += paidAmount;

          if (remainingAmount > 0) {
            supplierTotal.totalUnpaidAmount += remainingAmount;
            
            if (invoice.status?.toLowerCase().includes('partial')) {
              supplierTotal.partialInvoicesCount++;
            } else {
              supplierTotal.unpaidInvoicesCount++;
            }

            // Track oldest unpaid date
            if (!supplierTotal.oldestUnpaidDate || invoice.date < supplierTotal.oldestUnpaidDate) {
              supplierTotal.oldestUnpaidDate = invoice.date;
            }
          }
        } catch (invoiceError) {
          console.warn('Error processing invoice:', invoice.id, invoiceError);
          // Continue processing other invoices
        }
      }

      // Calculate derived fields and payment status
      const supplierTotalsArray = Array.from(supplierMap.values()).map(supplier => {
        supplier.averageInvoiceAmount = supplier.totalInvoicesCount > 0 
          ? (supplier.totalUnpaidAmount + supplier.totalPaidAmount) / supplier.totalInvoicesCount 
          : 0;

        // Determine payment status
        const hasOverdueInvoices = supplier.invoices.some(inv => 
          inv.remainingAmount > 0 && inv.daysPastDue > 0
        );
        const highAmount = supplier.totalUnpaidAmount > 500000; // 500k threshold
        const manyUnpaid = supplier.unpaidInvoicesCount + supplier.partialInvoicesCount > 5;

        if (hasOverdueInvoices && (highAmount || manyUnpaid)) {
          supplier.paymentStatus = 'critical';
        } else if (hasOverdueInvoices || highAmount || manyUnpaid) {
          supplier.paymentStatus = 'warning';
        } else {
          supplier.paymentStatus = 'good';
        }

        return supplier;
      });

      // Calculate summary data
      const totalOutstanding = supplierTotalsArray.reduce((sum, s) => sum + s.totalUnpaidAmount, 0);
      const criticalSuppliers = supplierTotalsArray.filter(s => s.paymentStatus === 'critical').length;
      const overdueInvoices = supplierTotalsArray.reduce((sum, s) => 
        sum + s.invoices.filter(inv => inv.remainingAmount > 0 && inv.daysPastDue > 0).length, 0
      );

      setSummaryData({
        totalOutstanding,
        totalSuppliers: supplierTotalsArray.length,
        criticalSuppliers,
        overdueInvoices
      });

      setSupplierTotals(supplierTotalsArray);

      console.log(`✅ Successfully loaded ${supplierTotalsArray.length} suppliers with outstanding amounts`);

    } catch (err) {
      console.error('Error loading supplier totals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supplier totals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedSuppliers = supplierTotals
    .filter(supplier => {
      const matchesSearch = supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || supplier.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.supplierName;
          bValue = b.supplierName;
          break;
        case 'amount':
          aValue = a.totalUnpaidAmount;
          bValue = b.totalUnpaidAmount;
          break;
        case 'invoices':
          aValue = a.unpaidInvoicesCount + a.partialInvoicesCount;
          bValue = b.unpaidInvoicesCount + b.partialInvoicesCount;
          break;
        case 'oldest':
          aValue = a.oldestUnpaidDate?.getTime() || 0;
          bValue = b.oldestUnpaidDate?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      good: 'bg-green-100 text-green-800 border-green-200'
    };
    
    return `px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading supplier totals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadSupplierTotals}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Supplier Totals</h1>
              <p className="text-gray-600">Outstanding amounts and payment status by supplier</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.totalOutstanding)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryData.totalSuppliers}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Suppliers</p>
                  <p className="text-2xl font-bold text-red-600">{summaryData.criticalSuppliers}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-yellow-600">{summaryData.overdueInvoices}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="good">Good</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="amount">Outstanding Amount</option>
                <option value="name">Supplier Name</option>
                <option value="invoices">Invoice Count</option>
                <option value="oldest">Oldest Unpaid</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>

              {/* Refresh */}
              <button
                onClick={loadSupplierTotals}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">Supplier</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900">Outstanding</th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900">Invoices</th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900">Status</th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900">Oldest Unpaid</th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedSuppliers.map((supplier) => (
                  <React.Fragment key={supplier.supplierId}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(supplier.paymentStatus)}
                          <div>
                            <p className="font-medium text-gray-900">{supplier.supplierName}</p>
                            <p className="text-sm text-gray-500">{supplier.totalInvoicesCount} total invoices</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(supplier.totalUnpaidAmount)}</p>
                        <p className="text-sm text-gray-500">Paid: {formatCurrency(supplier.totalPaidAmount)}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium text-red-600">{supplier.unpaidInvoicesCount}</span> unpaid
                          </p>
                          {supplier.partialInvoicesCount > 0 && (
                            <p className="text-sm">
                              <span className="font-medium text-yellow-600">{supplier.partialInvoicesCount}</span> partial
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={getStatusBadge(supplier.paymentStatus)}>
                          {supplier.paymentStatus.charAt(0).toUpperCase() + supplier.paymentStatus.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-sm text-gray-600">
                        {formatDate(supplier.oldestUnpaidDate)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setExpandedSupplier(
                            expandedSupplier === supplier.supplierId ? null : supplier.supplierId
                          )}
                          className="text-purple-600 hover:text-purple-700 p-2 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Invoice Details */}
                    {expandedSupplier === supplier.supplierId && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-6 py-4">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                              <FileText className="w-4 h-4" />
                              <span>Invoice Details</span>
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 font-medium text-gray-700">Invoice #</th>
                                    <th className="text-right py-2 font-medium text-gray-700">Amount</th>
                                    <th className="text-right py-2 font-medium text-gray-700">Paid</th>
                                    <th className="text-right py-2 font-medium text-gray-700">Outstanding</th>
                                    <th className="text-center py-2 font-medium text-gray-700">Status</th>
                                    <th className="text-center py-2 font-medium text-gray-700">Date</th>
                                    <th className="text-center py-2 font-medium text-gray-700">Due Date</th>
                                    <th className="text-center py-2 font-medium text-gray-700">Days Past Due</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {supplier.invoices
                                    .filter(inv => inv.remainingAmount > 0)
                                    .map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-white transition-colors">
                                      <td className="py-2 font-medium text-gray-900">{invoice.invoiceNumber}</td>
                                      <td className="py-2 text-right">{formatCurrency(invoice.amount)}</td>
                                      <td className="py-2 text-right text-green-600">{formatCurrency(invoice.paidAmount)}</td>
                                      <td className="py-2 text-right font-medium text-red-600">{formatCurrency(invoice.remainingAmount)}</td>
                                      <td className="py-2 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                          invoice.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {invoice.status}
                                        </span>
                                      </td>
                                      <td className="py-2 text-center text-gray-600">{formatDate(invoice.date)}</td>
                                      <td className="py-2 text-center text-gray-600">{formatDate(invoice.dueDate)}</td>
                                      <td className="py-2 text-center">
                                        {invoice.daysPastDue > 0 ? (
                                          <span className="text-red-600 font-medium">{invoice.daysPastDue} days</span>
                                        ) : (
                                          <span className="text-gray-500">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {filteredAndSortedSuppliers.length === 0 && (
              <div className="text-center py-12">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No suppliers found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}