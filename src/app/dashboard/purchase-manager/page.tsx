'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CreditCard,
  Building2,
  FileText,
  Users,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  Check,
  X,
  Plus,
  Banknote,
  Smartphone,
  University
} from 'lucide-react';
import { InterfaceDatabaseConnector } from '../../../lib/firebase/interface-database-connector';
import { CashTrackingInterface } from '../../../components/purchase-manager/CashTrackingInterface';
import { ExpenseApprovalsInterface } from '../../../components/purchase-manager/ExpenseApprovalsInterface';

// Types for the purchasing manager system
interface CashClose {
  id: string;
  employeeId: string;
  branchId: string;
  shift: 'day' | 'night';
  closeCash: number;
  actualAmount: number;
  expectedAmount: number;
  cashPresent: number;
  airtel: number;
  mtn: number;
  stanbicBank: number;
  equityBank: number;
  absaBank: number;
  pesaPal: number;
  shortage: number;
  excess: number;
  date: Date;
  time: string;
}

interface Invoice {
  id: string;
  receiverId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  items: InvoiceItem[];
  createdAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  installmentPlan?: InstallmentPlan;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PaymentMethod {
  type: 'cash' | 'cheque' | 'bank_deposit' | 'mobile_money' | 'momo' | 'airtel_pay';
  details: {
    chequeNumber?: string;
    bankAccount?: string;
    mobileNumber?: string;
    referenceNumber?: string;
  };
}

interface InstallmentPlan {
  id: string;
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: Installment[];
}

interface Installment {
  id: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: Date;
  paymentMethod?: PaymentMethod;
}

interface Supplier {
  id: string;
  supplierName: string;
  contactPerson: string;
  emailAddress: string;
  phoneNumber: string;
  address: string;
  paymentTerms: string;
  creditLimit: number;
  currentBalance: number;
  status: 'active' | 'inactive' | 'blacklisted';
}

interface Expense {
  id: string;
  employeeId: string;
  name: string;
  amount: number;
  type: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAYTODAY';
  status: 'pending' | 'approved' | 'rejected';
  date: Date;
  note?: string;
  paidAmount: number;
}

interface Payment {
  id: string;
  invoiceId: string;
  supplierId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  status: 'completed' | 'pending' | 'failed';
  paymentDate: Date;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate: Date;
}

export default function PurchaseManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    try {
      // Subscribe to real-time data using InterfaceDatabaseConnector
      const unsubscribeCashClose = InterfaceDatabaseConnector.subscribeToCashCloseData(
        (data) => {
          console.log('Cash Close data received:', data);
          setCashCloses(data);
        },
        (error) => console.error('Cash Close subscription error:', error)
      );
      subscriptions.push(unsubscribeCashClose);

      const unsubscribeInvoices = InterfaceDatabaseConnector.subscribeToInvoicesData(
        (data) => {
          console.log('Invoices data received:', data);
          setInvoices(data);
        },
        (error) => console.error('Invoices subscription error:', error)
      );
      subscriptions.push(unsubscribeInvoices);

      const unsubscribeExpenses = InterfaceDatabaseConnector.subscribeToExpensesData(
        (data) => {
          console.log('Expenses data received:', data);
          setExpenses(data);
        },
        (error) => console.error('Expenses subscription error:', error)
      );
      subscriptions.push(unsubscribeExpenses);

      const unsubscribeSuppliers = InterfaceDatabaseConnector.subscribeToSuppliersData(
        (data) => {
          console.log('Suppliers data received:', data);
          setSuppliers(data);
        },
        (error) => console.error('Suppliers subscription error:', error)
      );
      subscriptions.push(unsubscribeSuppliers);

      const unsubscribePayments = InterfaceDatabaseConnector.subscribeToPaymentsData(
        (data) => {
          console.log('Payments data received:', data);
          setPayments(data);
        },
        (error) => console.error('Payments subscription error:', error)
      );
      subscriptions.push(unsubscribePayments);

      const unsubscribePurchaseOrders = InterfaceDatabaseConnector.subscribeToPurchaseOrdersData(
        (data) => {
          console.log('Purchase Orders data received:', data);
          setPurchaseOrders(data);
        },
        (error) => console.error('Purchase Orders subscription error:', error)
      );
      subscriptions.push(unsubscribePurchaseOrders);

      setLoading(false);

    } catch (error) {
      console.error('Failed to initialize purchasing manager data:', error);
      setError('Failed to connect to database. Please refresh the page.');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Calculate dashboard metrics from real data
  const dashboardMetrics = {
    totalDayCash: cashCloses
      .filter(c => c.shift === 'day')
      .reduce((sum, c) => sum + (c.closeCash || 0), 0),
    totalNightCash: cashCloses
      .filter(c => c.shift === 'night')
      .reduce((sum, c) => sum + (c.closeCash || 0), 0),
    totalNetworkMoney: cashCloses.reduce((sum, c) => 
      sum + (c.airtel || 0) + (c.mtn || 0) + (c.stanbicBank || 0) + 
      (c.equityBank || 0) + (c.absaBank || 0) + (c.pesaPal || 0), 0),
    totalExpenses: expenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0),
    totalShortage: cashCloses.reduce((sum, c) => sum + (c.shortage || 0), 0),
    totalExcess: cashCloses.reduce((sum, c) => sum + (c.excess || 0), 0),
    pendingInvoices: invoices.filter(i => i.status === 'pending').length,
    approvedInvoices: invoices.filter(i => i.status === 'approved').length,
    paidInvoices: invoices.filter(i => i.status === 'paid').length,
    totalInvoiceAmount: invoices
      .filter(i => i.status === 'approved')
      .reduce((sum, i) => sum + (i.amount || 0), 0),
    activeSuppliers: suppliers.filter(s => s.status === 'active').length,
    totalSuppliers: suppliers.length,
    completedPayments: payments.filter(p => p.status === 'completed').length,
    totalPaymentAmount: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0),
    pendingOrders: purchaseOrders.filter(po => po.status === 'pending').length,
    totalOrderValue: purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      await InterfaceDatabaseConnector.approveInvoice(invoiceId, 'current-user-id');
      console.log('Invoice approved:', invoiceId);
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await InterfaceDatabaseConnector.approveExpense(expenseId, 'current-user-id');
      console.log('Expense approved:', expenseId);
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date | any) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        <div className="ml-4 text-lg text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchasing Manager Dashboard</h1>
              <p className="text-gray-600">Real-time data from Firestore • Manage cash, invoices, payments, and suppliers</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => InterfaceDatabaseConnector.getDashboardAnalytics().then(console.log)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Get Analytics
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cash</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(dashboardMetrics.totalDayCash + dashboardMetrics.totalNightCash)}
                </p>
                <p className="text-xs text-gray-500">
                  Day: {formatCurrency(dashboardMetrics.totalDayCash)} | Night: {formatCurrency(dashboardMetrics.totalNightCash)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Invoices</p>
                <p className="text-2xl font-semibold text-gray-900">{invoices.length}</p>
                <p className="text-xs text-gray-500">
                  {dashboardMetrics.pendingInvoices} pending • {dashboardMetrics.approvedInvoices} approved
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suppliers</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardMetrics.totalSuppliers}</p>
                <p className="text-xs text-gray-500">
                  {dashboardMetrics.activeSuppliers} active
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Payments</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(dashboardMetrics.totalPaymentAmount)}</p>
                <p className="text-xs text-gray-500">
                  {dashboardMetrics.completedPayments} completed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: DollarSign },
                { id: 'invoices', label: 'Invoices', icon: FileText },
                { id: 'payments', label: 'Payments', icon: CreditCard },
                { id: 'suppliers', label: 'Suppliers', icon: Users },
                { id: 'cash-tracking', label: 'Cash Tracking', icon: Banknote },
                { id: 'expenses', label: 'Expenses', icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Dashboard Overview</h3>
                
                {/* Real-time data display */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Recent Invoices</h4>
                    <div className="space-y-2">
                      {invoices.slice(0, 5).map((invoice) => (
                        <div key={invoice.id} className="flex justify-between items-center p-2 bg-white rounded">
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">{invoice.supplierName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Active Suppliers</h4>
                    <div className="space-y-2">
                      {suppliers.filter(s => s.status === 'active').slice(0, 5).map((supplier) => (
                        <div key={supplier.id} className="flex justify-between items-center p-2 bg-white rounded">
                          <div>
                            <p className="font-medium">{supplier.supplierName}</p>
                            <p className="text-sm text-gray-500">{supplier.contactPerson}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatCurrency(supplier.creditLimit)}</p>
                            <p className="text-xs text-gray-500">Credit Limit</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Invoice Management</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices
                        .filter(invoice => 
                          (filterStatus === 'all' || invoice.status === filterStatus) &&
                          (searchTerm === '' || 
                           (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (invoice.supplierName && invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())))
                        )
                        .map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.supplierName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(invoice.amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.status === 'approved' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invoice.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {invoice.status === 'pending' && (
                              <button
                                onClick={() => handleApproveInvoice(invoice.id)}
                                className="text-green-600 hover:text-green-900 mr-2"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'cash-tracking' && (
              <CashTrackingInterface />
            )}

            {activeTab === 'expenses' && (
              <ExpenseApprovalsInterface />
            )}

            {/* Add other tab content as needed */}
            {activeTab === 'suppliers' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Supplier Management</h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {suppliers.map((supplier) => (
                        <tr key={supplier.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{supplier.supplierName}</div>
                            <div className="text-sm text-gray-500">{supplier.emailAddress}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{supplier.contactPerson}</div>
                            <div className="text-sm text-gray-500">{supplier.phoneNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(supplier.creditLimit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              supplier.status === 'active' ? 'bg-green-100 text-green-800' :
                              supplier.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {supplier.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Payment History</h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment.referenceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.paymentMethod}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.paymentDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 