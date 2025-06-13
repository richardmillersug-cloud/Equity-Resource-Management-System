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
import { realtimeSync } from '../../../lib/firebase/real-time-sync';
import { authService } from '../../../lib/firebase/auth';
import { CashTrackingInterface } from '../../../components/purchase-manager/CashTrackingInterface';
import { ExpenseApprovalsInterface } from '../../../components/purchase-manager/ExpenseApprovalsInterface';
import { db } from '../../../lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

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
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
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

export default function PurchaseManagerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Subscribe to real-time updates
        const unsubscribeCashClose = realtimeSync.subscribeToCollection(
          'cashClose',
          (data) => setCashCloses(data),
          []
        );

        const unsubscribeInvoices = realtimeSync.subscribeToCollection(
          'invoices',
          (data) => setInvoices(data),
          []
        );

        const unsubscribeExpenses = realtimeSync.subscribeToCollection(
          'expenses',
          (data) => setExpenses(data),
          []
        );

        const unsubscribeSuppliers = realtimeSync.subscribeToCollection(
          'suppliers',
          (data) => setSuppliers(data),
          []
        );

        setLoading(false);

        // Cleanup function
        return () => {
          unsubscribeCashClose();
          unsubscribeInvoices();
          unsubscribeExpenses();
          unsubscribeSuppliers();
        };
      } catch (error) {
        console.error('Failed to initialize purchasing manager data:', error);
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Calculate dashboard metrics
  const dashboardMetrics = {
    totalDayCash: cashCloses
      .filter(c => c.shift === 'day')
      .reduce((sum, c) => sum + c.closeCash, 0),
    totalNightCash: cashCloses
      .filter(c => c.shift === 'night')
      .reduce((sum, c) => sum + c.closeCash, 0),
    totalNetworkMoney: cashCloses.reduce((sum, c) => 
      sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0),
    totalExpenses: expenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0),
    totalShortage: cashCloses.reduce((sum, c) => sum + (c.shortage || 0), 0),
    totalExcess: cashCloses.reduce((sum, c) => sum + (c.excess || 0), 0),
    profitMargin: 0.12, // 12% profit margin
    pendingInvoices: invoices.filter(i => i.status === 'pending').length,
    approvedInvoices: invoices.filter(i => i.status === 'approved').length,
    paidInvoices: invoices.filter(i => i.status === 'paid').length,
    totalInvoiceAmount: invoices
      .filter(i => i.status === 'approved')
      .reduce((sum, i) => sum + i.amount, 0)
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    // Implementation for approving invoice
    console.log('Approving invoice:', invoiceId);
    // Update invoice status to approved
  };

  const handleRejectInvoice = async (invoiceId: string) => {
    // Implementation for rejecting invoice
    console.log('Rejecting invoice:', invoiceId);
    // Update invoice status to rejected
  };

  const handlePayInvoice = async (invoiceId: string, paymentMethod: PaymentMethod) => {
    // Implementation for paying invoice
    console.log('Paying invoice:', invoiceId, 'with method:', paymentMethod);
    // Update invoice status to paid and record payment details
  };

  const handleTestPermissions = async () => {
    try {
      console.log('Testing purchasing manager permissions...');
      
      const collections = [
        'invoices',
        'payments', 
        'suppliers',
        'expenses',
        'expenseRequests',
        'cashClose',
        'chequeTracker',
        'installmentPlans'
      ];

      const results: { [key: string]: { success: boolean; error?: string; count?: number } } = {};

      for (const collectionName of collections) {
        try {
          console.log(`Testing access to ${collectionName}...`);
          const q = query(collection(db, collectionName), limit(1));
          const snapshot = await getDocs(q);
          results[collectionName] = {
            success: true,
            count: snapshot.size
          };
          console.log(`✅ ${collectionName}: Access granted (${snapshot.size} documents)`);
        } catch (error: any) {
          results[collectionName] = {
            success: false,
            error: error.message
          };
          console.error(`❌ ${collectionName}: ${error.message}`);
        }
      }
      
      console.log('Permission test results:', results);
      
      const failedCollections = Object.entries(results)
        .filter(([_, result]) => !result.success)
        .map(([collection, _]) => collection);
      
      if (failedCollections.length === 0) {
        alert('✅ All permissions are working correctly!');
      } else {
        alert(`❌ Permission issues found for: ${failedCollections.join(', ')}\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error('Error testing permissions:', error);
      alert('❌ Error testing permissions. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
              <p className="text-gray-600">Manage cash, invoices, payments, and suppliers</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={handleTestPermissions}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Test Permissions
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: DollarSign },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'suppliers', label: 'Suppliers', icon: Users },
              { id: 'cash-tracking', label: 'Cash Tracking', icon: Banknote },
              { id: 'expenses', label: 'Expenses', icon: TrendingUp }
            ].map(tab => {
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Day Cash Close</p>
                    <p className="text-2xl font-bold text-gray-900">
                      UGX {dashboardMetrics.totalDayCash.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Night Cash Close</p>
                    <p className="text-2xl font-bold text-gray-900">
                      UGX {dashboardMetrics.totalNightCash.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Smartphone className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Network Money</p>
                    <p className="text-2xl font-bold text-gray-900">
                      UGX {dashboardMetrics.totalNetworkMoney.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      UGX {dashboardMetrics.totalExpenses.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shortage/Excess and Profit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cash Shortage</p>
                    <p className="text-2xl font-bold text-red-600">
                      UGX {dashboardMetrics.totalShortage.toLocaleString()}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cash Excess</p>
                    <p className="text-2xl font-bold text-green-600">
                      UGX {dashboardMetrics.totalExcess.toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(dashboardMetrics.profitMargin * 100).toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{dashboardMetrics.pendingInvoices}</p>
                  <p className="text-sm text-gray-600">Pending Approval</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{dashboardMetrics.approvedInvoices}</p>
                  <p className="text-sm text-gray-600">Approved</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{dashboardMetrics.paidInvoices}</p>
                  <p className="text-sm text-gray-600">Paid</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    UGX {dashboardMetrics.totalInvoiceAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Amount</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Invoices Requiring Action</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
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
                    {invoices
                      .filter(invoice => 
                        filterStatus === 'all' || invoice.status === filterStatus
                      )
                      .filter(invoice =>
                        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {invoice.supplierName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            UGX {invoice.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invoice.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Eye className="w-4 h-4" />
                              </button>
                              {invoice.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleApproveInvoice(invoice.id)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectInvoice(invoice.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {invoice.status === 'approved' && (
                                <button className="text-purple-600 hover:text-purple-900">
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add other tab content here */}
        {activeTab === 'payments' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Management</h3>
            <p className="text-gray-600">Payment tracking and installment management coming soon...</p>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
            <p className="text-gray-600">Supplier management interface coming soon...</p>
          </div>
        )}

        {activeTab === 'cash-tracking' && (
          <CashTrackingInterface />
        )}

        {activeTab === 'expenses' && (
          <ExpenseApprovalsInterface />
        )}
      </div>
    </div>
  );
} 