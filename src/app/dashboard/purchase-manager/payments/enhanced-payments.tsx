'use client';


import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  subscribeToInvoicePayments,
  InvoicePayment,
  PaymentAnalytics,
  PaymentSummary,
  getPaymentAnalytics,
  getAllPaymentSummaries,
  searchPayments,
} from '@/lib/firebase/purchasing-manager-service';

export default function EnhancedPaymentsPage() {
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<InvoicePayment[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<PaymentSummary[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [installmentFilter, setInstallmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // View modes
  const [viewMode, setViewMode] = useState<'payments' | 'summaries' | 'analytics'>('payments');
  const [selectedPayment, setSelectedPayment] = useState<InvoicePayment | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToInvoicePayments((paymentsData) => {
      setPayments(paymentsData);
      setLoading(false);
    });

    // Load analytics and summaries
    loadAnalytics();
    loadPaymentSummaries();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payments, searchTerm, selectedPaymentMethod, selectedSupplier, installmentFilter, dateFrom, dateTo]);

  const loadAnalytics = async () => {
    try {
      const analyticsData = await getPaymentAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadPaymentSummaries = async () => {
    try {
      const summaries = await getAllPaymentSummaries();
      setPaymentSummaries(summaries);
    } catch (error) {
      console.error('Error loading payment summaries:', error);
    }
  };

  const applyFilters = async () => {
    try {
      const criteria: unknown = {};
      
      if (dateFrom) criteria.dateFrom = new Date(dateFrom);
      if (dateTo) criteria.dateTo = new Date(dateTo);
      if (selectedPaymentMethod !== 'all') criteria.paymentMethod = selectedPaymentMethod;
      if (searchTerm) {
        criteria.invoiceNumber = searchTerm;
        criteria.supplierName = searchTerm;
        criteria.paymentReference = searchTerm;
      }

      let filtered = payments;
      
      if (Object.keys(criteria).length > 0) {
        filtered = await searchPayments(criteria);
      }

      // Apply additional client-side filters
      if (selectedSupplier !== 'all') {
        filtered = filtered.filter(p => p.supplierName === selectedSupplier);
      }
      
      if (installmentFilter !== 'all') {
        const installmentNum = parseInt(installmentFilter);
        filtered = filtered.filter(p => p.installmentNumber === installmentNum);
      }

      setFilteredPayments(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
      setFilteredPayments(payments);
    }
  };

  const getUniqueSuppliers = () => {
    return [...new Set(payments.map(p => p.supplierName))].sort();
  };

  const getInstallmentNumbers = () => {
    return [...new Set(payments.map(p => p.installmentNumber))].sort((a, b) => a - b);
  };

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

  const exportToCSV = () => {
    const csvData = filteredPayments.map(payment => ({
      'Payment Reference': payment.paymentReference,
      'Invoice Number': payment.invoiceNumber,
      'Supplier': payment.supplierName,
      'Amount': payment.amount,
      'Running Total': payment.runningTotal || 0,
      'Remaining After Payment': payment.remainingAfterPayment || 0,
      'Payment Method': payment.paymentMethod.type,
      'Installment': payment.installmentNumber,
      'Payment Date': payment.paymentDate.toLocaleDateString(),
              'Paid By': `${payment.paidByName} (${payment.paidBy})`,
      'Status': payment.paymentStatus || 'completed',
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
    a.download = `enhanced_payment_records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

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
            Enhanced Payment Tracking
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive payment analysis with installment tracking</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
//   Export
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => setViewMode('payments')}
            className={`px-6 py-3 font-medium ${
              viewMode === 'payments' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Individual Payments ({filteredPayments.length})
            </div>
          </button>
          <button
            onClick={() => setViewMode('summaries')}
            className={`px-6 py-3 font-medium ${
              viewMode === 'summaries' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Payment Summaries ({paymentSummaries.length})
            </div>
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-6 py-3 font-medium ${
              viewMode === 'analytics' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Analytics & Insights
            </div>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalPayments}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">UGX {analytics.totalAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Payment</p>
                <p className="text-2xl font-bold text-purple-600">UGX {Math.round(analytics.averagePaymentSize).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Suppliers</p>
                <p className="text-2xl font-bold text-orange-600">{Object.keys(analytics.paymentsBySupplier).length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Methods</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(analytics.paymentsByMethod).length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Suppliers</option>
              {getUniqueSuppliers().map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={installmentFilter}
              onChange={(e) => setInstallmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Installments</option>
              {getInstallmentNumbers().map(num => (
                <option key={num} value={num.toString()}>Payment #{num}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="From Date"
            />
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'payments' && (
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
                    Amount & Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Installment Info
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
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {payment.paymentReference}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.paymentMethod.type)}`}>
                            {getPaymentMethodIcon(payment.paymentMethod.type)}
                            {payment.paymentMethod.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          By: {payment.paidByName} ({payment.paidBy})
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
                        {payment.runningTotal && (
                          <div className="text-xs text-green-600">
                            Running Total: UGX {payment.runningTotal.toLocaleString()}
                          </div>
                        )}
                        {payment.remainingAfterPayment !== undefined && (
                          <div className="text-xs text-orange-600">
                            Remaining: UGX {payment.remainingAfterPayment.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          #{payment.installmentNumber}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Payment #{payment.installmentNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.paymentStatus || 'completed'}
                          </div>
                        </div>
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
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
//   View
                      </button>
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
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment Summaries View */}
      {viewMode === 'summaries' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment History
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Methods Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//   Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentSummaries.map((summary) => (
                  <tr key={summary.invoiceId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {summary.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {summary.supplierName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: UGX {summary.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-green-600">
                          UGX {summary.totalPaid.toLocaleString()} paid
                        </div>
                        <div className="text-sm text-red-600">
                          UGX {summary.remainingAmount.toLocaleString()} remaining
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(summary.totalPaid / summary.totalAmount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {summary.paymentCount} payment{summary.paymentCount !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: UGX {Math.round(summary.averagePaymentAmount).toLocaleString()}
                        </div>
                        {summary.lastPaymentDate && (
                          <div className="text-xs text-gray-500">
                            Last: {summary.lastPaymentDate.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {summary.paymentMethods.map((method, index) => (
                          <span key={index} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(method)}`}>
                            {getPaymentMethodIcon(method)}
                            {method.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        summary.status === 'paid' ? 'bg-green-100 text-green-800' :
                        summary.status === 'partial' ? 'bg-orange-100 text-orange-800' :
                        summary.status === 'overpaid' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {summary.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Payment Methods Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(analytics.paymentsByMethod).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(method)}
                    <span className="font-medium">{method.replace('_', ' ')}</span>
                  </div>
                  <span className="font-bold text-gray-900">UGX {amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Installment Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Installment Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {Object.entries(analytics.installmentDistribution).map(([installment, count]) => (
                <div key={installment} className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">#{installment}</div>
                  <div className="text-sm text-gray-600">{count} payment{count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Suppliers by Payment Volume</h3>
            <div className="space-y-3">
              {Object.entries(analytics.paymentsBySupplier)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([supplier, amount]) => (
                <div key={supplier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{supplier}</span>
                  <span className="font-bold text-gray-900">UGX {amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Payment Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(analytics.monthlyPayments)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 12)
                .map(([month, amount]) => (
                <div key={month} className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">UGX {amount.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">{month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 