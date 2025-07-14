'use client';

import React, { useState, useEffect } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Calculator,
  PieChart,
  Receipt,
  Wallet,
  RefreshCw,
  Clock
} from 'lucide-react';
import { getPlaceholderData, mergeWithPlaceholders } from '@/lib/placeholders/accountant-data';

export default function AccountantDashboard() {
  const { t } = useLanguage();
  const [cashAllocations, setCashAllocations] = useState<any[]>([]);
  const [specialFunds, setSpecialFunds] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [dashboardData, setDashboardData] = useState({
    cashAllocations: [] as any[],
    expenses: [] as any[],
    specialFunds: [] as any[],
    summary: {
      totalAllocated: 0,
      totalExpenses: 0,
      totalPaid: 0,
      pendingPayments: 0,
      savingsTotal: 0,
      specialFundsTotal: 0
    }
  });

  const loadAccountantData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Debug current user
      const currentUser = authService.getCurrentUser();
      console.log('Current user in accountant dashboard:', currentUser);
      setDebugInfo(`User: ${currentUser?.email || 'None'}, Role: ${currentUser?.employee?.roles?.[0]?.jobTitle || 'None'}`);
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      if (!currentUser.employee) {
        throw new Error('No employee data found for user');
      }

      console.log('🔄 Loading accountant dashboard data...');
      console.log('👤 User:', { uid: currentUser.uid, email: currentUser.email });

      // Load data with error handling for each operation
      let cashAllocationsData: any[] = [];
      let expensesData: any[] = [];
      let specialFundsData: any[] = [];

      try {
        console.log('📊 Loading cash allocations...');
        cashAllocationsData = await AccountantQueries.getCashAllocations();
        console.log('✅ Cash allocations loaded:', cashAllocationsData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load cash allocations:', err);
        cashAllocationsData = getPlaceholderData('cashAllocations') as any[];
        console.log('📋 Using placeholder cash allocations:', cashAllocationsData.length);
      }

      try {
        console.log('💰 Loading expenses...');
        expensesData = await AccountantQueries.getExpenseManagement();
        console.log('✅ Expenses loaded:', expensesData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load expenses:', err);
        expensesData = getPlaceholderData('expenses') as any[];
        console.log('📋 Using placeholder expenses:', expensesData.length);
      }

      try {
        console.log('🏦 Loading special funds...');
        specialFundsData = await AccountantQueries.getSpecialFundsTracker();
        console.log('✅ Special funds loaded:', specialFundsData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load special funds:', err);
        specialFundsData = getPlaceholderData('specialFunds') as any[];
        console.log('📋 Using placeholder special funds:', specialFundsData.length);
      }

      // Use placeholder data if real data is empty
      const finalCashAllocations = mergeWithPlaceholders(cashAllocationsData, getPlaceholderData('cashAllocations') as any[]);
      const finalExpenses = mergeWithPlaceholders(expensesData, getPlaceholderData('expenses') as any[]);
      const finalSpecialFunds = mergeWithPlaceholders(specialFundsData, getPlaceholderData('specialFunds') as any[]);

      // Set individual state for backward compatibility
      setCashAllocations(finalCashAllocations);
      setExpenses(finalExpenses);
      setSpecialFunds(finalSpecialFunds);

      // Calculate summary
      const totalAllocated = finalCashAllocations.reduce((sum, allocation) => sum + (allocation.cashCloseTotal || 0), 0);
      const totalExpenses = finalExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalPaid = finalExpenses.reduce((sum, expense) => sum + (expense.paidAmount || 0), 0);
      const pendingPayments = totalExpenses - totalPaid;
      const savingsTotal = finalCashAllocations.reduce((sum, allocation) => sum + (allocation.savings || 0), 0);
      const specialFundsTotal = finalSpecialFunds.reduce((sum, fund) => sum + (fund.specialFundsBalance || 0), 0);

      setDashboardData({
        cashAllocations: finalCashAllocations,
        expenses: finalExpenses,
        specialFunds: finalSpecialFunds,
        summary: {
          totalAllocated,
          totalExpenses,
          totalPaid,
          pendingPayments,
          savingsTotal,
          specialFundsTotal
        }
      });

      console.log('✅ Dashboard data loaded successfully');
      console.log('📊 Summary:', {
        totalAllocated,
        totalExpenses,
        totalPaid,
        pendingPayments,
        savingsTotal,
        specialFundsTotal
      });

    } catch (err: any) {
      console.error('❌ Error loading dashboard data:', err);
      
      // Fallback to placeholder data
      console.log('📋 Using all placeholder data as fallback');
      const placeholderCashAllocations = getPlaceholderData('cashAllocations') as any[];
      const placeholderExpenses = getPlaceholderData('expenses') as any[];
      const placeholderSpecialFunds = getPlaceholderData('specialFunds') as any[];
      const placeholderSummary = getPlaceholderData('summary') as any;
      
      setCashAllocations(placeholderCashAllocations);
      setExpenses(placeholderExpenses);
      setSpecialFunds(placeholderSpecialFunds);
      
      setDashboardData({
        cashAllocations: placeholderCashAllocations,
        expenses: placeholderExpenses,
        specialFunds: placeholderSpecialFunds,
        summary: placeholderSummary
      });
      
      setError('Using demo data - some features may be limited');
      setDebugInfo(prev => `${prev} | Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountantData();

    // Set up real-time subscription for cash allocations
    let unsubscribe: (() => void) | null = null;
    
    const setupRealtimeSubscription = async () => {
      try {
        unsubscribe = AccountantQueries.subscribeCashAllocations((updatedAllocations: any) => {
          console.log('Real-time update - Cash allocations:', updatedAllocations);
          setCashAllocations(updatedAllocations || []);
        });
      } catch (err) {
        console.error('Error setting up real-time subscription:', err);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BALANCED': return 'text-green-600 bg-green-100';
      case 'UNBALANCED': return 'text-red-600 bg-red-100';
      case 'CORRECT': return 'text-green-600 bg-green-100';
      case 'INCORRECT': return 'text-red-600 bg-red-100';
      case 'FULLY_PAID': return 'text-green-600 bg-green-100';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-100';
      case 'UNPAID': return 'text-red-600 bg-red-100';
      case 'OVERPAID': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'BALANCED':
      case 'CORRECT':
      case 'FULLY_PAID':
        return <CheckCircle className="h-4 w-4" />;
      case 'UNBALANCED':
      case 'INCORRECT':
      case 'UNPAID':
        return <XCircle className="h-4 w-4" />;
      case 'PARTIALLY_PAID':
      case 'OVERPAID':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accountant dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">{debugInfo}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <div className="mt-2 text-xs text-red-600">
                <p><strong>Debug Info:</strong> {debugInfo}</p>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={loadAccountantData}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Loading Data
        </button>

        {/* Show empty dashboard with sample data for testing */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accountant Dashboard (Demo Mode)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Allocated</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
                <p className="text-xs text-gray-400 mt-1">No data available</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
                <p className="text-xs text-gray-400 mt-1">No data available</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Paid Amount</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
                <p className="text-xs text-gray-400 mt-1">No data available</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
                <p className="text-xs text-gray-400 mt-1">No data available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Financial Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('accountant.financialManagement', 'Financial Overview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('accountant.totalAllocated', 'Total Allocated')}</p>
              <p className="text-2xl font-bold text-gray-900">${dashboardData.summary.totalAllocated.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('accountant.expenseTracking', 'Total Expenses')}</p>
              <p className="text-2xl font-bold text-gray-900">${dashboardData.summary.totalExpenses.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900">${dashboardData.summary.totalPaid.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">${dashboardData.summary.pendingPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calculator className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Create Cash Allocation</h3>
                <p className="text-sm text-gray-500">Allocate funds to departments</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Manage Expenses</h3>
                <p className="text-sm text-gray-500">Track and process expenses</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Financial Reports</h3>
                <p className="text-sm text-gray-500">Generate financial reports</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Cash Allocations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Cash Allocations</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Savings (12%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Special Funds
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Savings Validation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cashAllocations.slice(0, 10).map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(allocation.allocationDate?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${allocation.cashCloseTotal?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${allocation.savings?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${allocation.specialFunds?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${allocation.purchasingManager?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(allocation.allocationStatus)}`}>
                        {getStatusIcon(allocation.allocationStatus)}
                        <span className="ml-1">{allocation.allocationStatus}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(allocation.savingsValidation)}`}>
                        {getStatusIcon(allocation.savingsValidation)}
                        <span className="ml-1">{allocation.savingsValidation}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Management */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Management</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.slice(0, 10).map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.expenseDate?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.description || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${expense.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${expense.paidAmount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${expense.remainingBalance?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.paymentStatus)}`}>
                        {getStatusIcon(expense.paymentStatus)}
                        <span className="ml-1">{expense.paymentStatus?.replace('_', ' ')}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Special Funds Tracker */}
      {specialFunds.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Funds Tracker</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {specialFunds.map((fund) => (
              <div key={fund.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Fund Balance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Special Funds Balance:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${fund.specialFundsBalance?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Savings Balance:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${fund.savingsBalance?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm text-gray-500">
                      {new Date(fund.lastUpdated?.seconds * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 