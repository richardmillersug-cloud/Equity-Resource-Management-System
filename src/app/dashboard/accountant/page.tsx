'use client';

import React, { useState, useEffect } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
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
  Clock,
  Plus,
  ExternalLink,
  Calendar,
  Building,
  Smartphone
} from 'lucide-react';
import { useRouter } from 'next/navigation';
// REMOVED: No more placeholder/fake data - using real database data only
import AllocationManagement from '@/components/accountant/AllocationManagement';
import { autoAllocationService, AllocationResult } from '@/lib/firebase/auto-allocation-service';
import ComprehensiveCashCloseForm from '@/components/accountant/ComprehensiveCashCloseForm';

export default function AccountantDashboard() {
  const router = useRouter();
  const [cashAllocations, setCashAllocations] = useState<any[]>([]);
  const [specialFunds, setSpecialFunds] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showAllocationApproval, setShowAllocationApproval] = useState(false);
  const [selectedCashCloseId, setSelectedCashCloseId] = useState<string>('');
  const [showComprehensiveCashClose, setShowComprehensiveCashClose] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    cashCloses: [] as any[],
    expenses: [] as any[],
    specialFunds: [] as any[],
    summary: {
      totalRevenue: 0,
      totalTaxAmount: 0,
      totalProfitAmount: 0,
      totalSpecialFunds: 0,
      totalExpenses: 0,
      pendingApprovals: 0,
      overdueExpenses: 0,
      recentTransactions: 0
    }
  });
  const [dashboardAllocations, setDashboardAllocations] = useState<{[cashCloseId: string]: AllocationResult[]}>({});

  const loadAccountantData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Loading accountant data...');
    
    try {
      console.log('📊 Loading accountant dashboard data...');
      
      let cashClosesData: any[] = [];
      let expensesData: any[] = [];
      let specialFundsData: any[] = [];

      try {
        console.log('📊 Loading cash closes...');
        
        // Try simple service first to avoid index issues
        try {
          const simpleCashCloseService = new SimpleCashCloseService();
          cashClosesData = await simpleCashCloseService.getAllCashClosesSimple();
          console.log('✅ Cash closes loaded with simple service:', cashClosesData?.length || 0);
        } catch (simpleError) {
          console.warn('⚠️ Simple service failed, trying regular service...', simpleError);
          
          // Fallback to regular service
          const cashCloseService = new CashCloseService();
          const currentUser = authService.getCurrentUser();
          
          if (currentUser?.employee?.branchId) {
            // Get cash closes for the user's branch
            cashClosesData = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
          } else {
            // Get all cash closes if no specific branch
            cashClosesData = await cashCloseService.getAll();
          }
          console.log('✅ Cash closes loaded with regular service:', cashClosesData?.length || 0);
        }
      } catch (err) {
        console.warn('⚠️ Failed to load cash closes:', err);
        cashClosesData = [];
        console.log('📋 No cash close data available');
      }

      try {
        console.log('💰 Loading expenses...');
        expensesData = await AccountantQueries.getExpenseManagement();
        console.log('✅ Expenses loaded:', expensesData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load expenses:', err);
        expensesData = [];
        console.log('📋 No expenses data available - will show empty state');
      }

      try {
        console.log('🏦 Loading special funds...');
        specialFundsData = await AccountantQueries.getSpecialFundsTracker();
        console.log('✅ Special funds loaded:', specialFundsData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load special funds:', err);
        specialFundsData = [];
        console.log('📋 No special funds data available - will show empty state');
      }

      // Calculate summary data from loaded data
      const totalRevenue = cashClosesData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
      const totalTaxAmount = cashClosesData.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      const totalProfitAmount = cashClosesData.reduce((sum, item) => sum + (item.profitAmount || 0), 0);
      const totalSpecialFunds = cashClosesData.reduce((sum, item) => sum + (item.specialFunds || 0), 0);
      const totalPurchasingManagerFunds = cashClosesData.reduce((sum, item) => sum + (item.purchasingManagerFunds || 0), 0);
      const totalNetworkPayments = cashClosesData.reduce((sum, item) => {
        return sum + (item.networkPayments?.reduce((netSum: number, payment: any) => netSum + (payment.amount || 0), 0) || 0);
      }, 0);
      const totalShortage = cashClosesData.reduce((sum, item) => sum + Math.max(0, -(item.shortageExcess || 0)), 0);
      const totalExcess = cashClosesData.reduce((sum, item) => sum + Math.max(0, (item.shortageExcess || 0)), 0);
      
      // Store all data in component state
      setCashAllocations(cashClosesData);
      setExpenses(expensesData);
      setSpecialFunds(specialFundsData);
      
      setDashboardData({
        cashCloses: cashClosesData,
        expenses: expensesData,
        specialFunds: specialFundsData,
        summary: {
          totalRevenue,
          totalTaxAmount,
          totalProfitAmount,
          totalSpecialFunds,
          totalExpenses: expensesData.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0),
          pendingApprovals: expensesData.filter((exp: any) => exp.status === 'pending').length,
          overdueExpenses: expensesData.filter((exp: any) => exp.status === 'overdue').length,
          recentTransactions: cashClosesData.filter((item: any) => {
            const itemDate = new Date(item.createdAt?.seconds ? item.createdAt.seconds * 1000 : Date.now());
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= sevenDaysAgo;
          }).length
        }
      });

      // Load allocation data for dashboard cash closes  
      console.log('🔄 Loading allocation data for dashboard...');
      const dashboardAllocationsMap: {[cashCloseId: string]: AllocationResult[]} = {};
      
      await Promise.all(cashClosesData.slice(0, 5).map(async (close: any) => {
        try {
          const allocations = await autoAllocationService.getAllAllocationsByCashCloseId(close.id);
          if (allocations.length > 0) {
            dashboardAllocationsMap[close.id] = allocations;
            console.log(`📊 Found ${allocations.length} allocations for dashboard cash close ${close.id.substring(0, 8)}...`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load allocations for dashboard cash close ${close.id}:`, error);
        }
      }));
      
      setDashboardAllocations(dashboardAllocationsMap);
      console.log('✅ Dashboard allocation data loaded for', Object.keys(dashboardAllocationsMap).length, 'cash closes');

      console.log('📊 Summary:', {
        totalRevenue,
        totalTaxAmount,
        totalProfitAmount,
        totalSpecialFunds,
        totalPurchasingManagerFunds,
        totalNetworkPayments,
        totalShortage,
        totalExcess
      });

    } catch (err: any) {
      console.error('❌ Error loading dashboard data:', err);
      
      // NO MORE PLACEHOLDER DATA - Show real error state instead
      console.log('📋 Database connection failed - showing error state with real data only');
      
      // Set empty data arrays - no fake data
      setCashAllocations([]);
      setExpenses([]);
      setSpecialFunds([]);
      
      setDashboardData({
        cashCloses: [],
        expenses: [],
        specialFunds: [],
        summary: {
          totalRevenue: 0,
          totalTaxAmount: 0,
          totalProfitAmount: 0,
          totalSpecialFunds: 0,
          totalExpenses: 0,
          pendingApprovals: 0,
          overdueExpenses: 0,
          recentTransactions: 0
        }
      });

      setError(`Database connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountantData();

    // Set up real-time subscription for cash allocations
    let unsubscribe: (() => void) | undefined;
    
    const setupRealtimeSubscription = async () => {
      try {
        // Note: Real-time subscription for cash closes would need to be implemented
        // unsubscribe = CashCloseService.subscribeToUpdates((updatedCashCloses: any) => {
        //   console.log('Real-time update - Cash closes:', updatedCashCloses);
        //   setCashAllocations(updatedCashCloses || []);
        // });
        console.log('Real-time subscription for cash closes not yet implemented');
      } catch (err) {
        console.error('Error setting up real-time subscription:', err);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handler for cash allocation form submission
  const handleCashAllocationSubmit = async () => {
    try {
      // Reload dashboard data after successful creation
      await loadAccountantData();
      console.log('✅ Cash allocation created successfully');
    } catch (error) {
      console.error('❌ Error after cash allocation creation:', error);
      // The form will handle its own error display
    }
  };

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
      <div className="w-full min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
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
          
          <div className="flex space-x-3">
            <button
              onClick={loadAccountantData}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading Data
            </button>
            <button
              onClick={() => {
                // Only show allocation management if we have real cash close data
                if (dashboardData.cashCloses.length > 0) {
                  setSelectedCashCloseId(dashboardData.cashCloses[0].id);
                  setShowAllocationApproval(true);
                } else {
                  setError('No cash close data available. Please create a cash close first.');
                }
              }}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={dashboardData.cashCloses.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              {dashboardData.cashCloses.length > 0 ? 'Review Allocations' : 'No Real Data Available'}
            </button>
            <button
              onClick={() => router.push('/dashboard/accountant/cash-close')}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Cash Close
            </button>
          </div>

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

          {/* Allocation Management - also available in error state */}
          <AllocationManagement
            isOpen={showAllocationApproval}
            onClose={() => setShowAllocationApproval(false)}
            onUpdate={loadAccountantData}
            cashCloseId={selectedCashCloseId}
          />
          
          <ComprehensiveCashCloseForm
            isOpen={showComprehensiveCashClose}
            onClose={() => setShowComprehensiveCashClose(false)}
            onSubmit={handleCashAllocationSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
          <p className="text-gray-600">Manage cash allocations and financial oversight</p>
        </div>
        <div className="flex space-x-3">
                            <button
                    onClick={() => {
                      // Only show allocation management if we have real cash close data
                      if (dashboardData.cashCloses.length > 0) {
                        setSelectedCashCloseId(dashboardData.cashCloses[0].id);
                        setShowAllocationApproval(true);
                      } else {
                        alert('No cash close data available. Please create a cash close first.');
                      }
                    }}
                    disabled={dashboardData.cashCloses.length === 0}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {dashboardData.cashCloses.length > 0 ? 'Manage Allocations' : 'No Data - Create Cash Close'}
                  </button>
          <button
            onClick={() => router.push('/dashboard/accountant/cash-close')}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Cash Close
            <ExternalLink className="h-3 w-3 ml-1" />
          </button>
          <button
            onClick={() => router.push('/dashboard/accountant/profits')}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <PieChart className="h-4 w-4 mr-2" />
            Profits Analysis
            <ExternalLink className="h-3 w-3 ml-1" />
          </button>
          <button
            onClick={() => router.push('/dashboard/accountant/expenses')}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Expense Management
            <ExternalLink className="h-3 w-3 ml-1" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              ${dashboardData.summary.totalRevenue?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              From {dashboardData.cashCloses?.length || 0} cash closes
            </p>
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
            <p className="text-2xl font-bold text-gray-900">
              ${dashboardData.summary.totalExpenses?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {dashboardData.summary.pendingApprovals || 0} pending approvals
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Profit Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              ${dashboardData.summary.totalProfitAmount?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-purple-600 mt-1">Net profit after expenses</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Building className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Daily Expense Fund</p>
            <p className="text-2xl font-bold text-gray-900">
              ${dashboardData.summary.totalSpecialFunds?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-orange-600 mt-1">Reserved funds</p>
          </div>
        </div>
      </div>

      {/* Recent Cash Closes */}
      {dashboardData.cashCloses && dashboardData.cashCloses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Cash Closes</h3>
            <p className="text-sm text-gray-600 mt-1">Latest cash close entries from all branches</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Expense Fund</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PM Money</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.cashCloses.slice(0, 5).map((close, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(close.createdAt?.seconds * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${close.totalRevenue?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${close.taxAmount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${close.profitAmount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      ${close.specialFunds?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const allocations = dashboardAllocations[close.id] || [];
                        if (allocations.length === 0) {
                          return (
                            <div className="flex items-center text-gray-400">
                              <Calculator className="h-4 w-4 mr-1" />
                              <span className="text-xs">No allocations</span>
                            </div>
                          );
                        }
                        
                        const totalPM = allocations.reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                        
                        return (
                          <div className="font-medium text-green-600">
                            ${totalPM.toLocaleString()}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const allocations = dashboardAllocations[close.id] || [];
                        if (allocations.length === 0) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No Allocations
                            </span>
                          );
                        }
                        
                        const allocatedCount = allocations.filter(a => a.distributionStatus.purchasingManager === 'allocated').length;
                        const totalShifts = allocations.length;
                        
                        if (allocatedCount === totalShifts) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              All Allocated
                            </span>
                          );
                        } else if (allocatedCount > 0) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Partial ({allocatedCount}/{totalShifts})
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Not Allocated
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const allocations = dashboardAllocations[close.id] || [];
                        const allocatedCount = allocations.filter(a => a.distributionStatus.purchasingManager === 'allocated').length;
                        const totalShifts = allocations.length;
                        const isFullyAllocated = totalShifts > 0 && allocatedCount === totalShifts;
                        
                        return (
                          <button
                            onClick={() => {
                              setSelectedCashCloseId(close.id);
                              setShowAllocationApproval(true);
                            }}
                            disabled={isFullyAllocated}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              isFullyAllocated 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : allocations.length === 0 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : allocatedCount > 0
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isFullyAllocated ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </>
                            ) : allocations.length === 0 ? (
                              <>
                                <Calculator className="w-3 h-3 mr-1" />
                                Create Allocation
                              </>
                            ) : allocatedCount > 0 ? (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                Continue ({allocatedCount}/{totalShifts})
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-3 h-3 mr-1" />
                                Allocate Now
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Expense Fund Tracker */}
      {dashboardData.specialFunds && dashboardData.specialFunds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Daily Expense Fund Tracker</h3>
            <p className="text-sm text-gray-600 mt-1">Current status of daily expense fund allocations</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData.specialFunds.slice(0, 6).map((fund, index) => (
                <div key={index} className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-orange-900">{fund.category || 'Special Fund'}</h4>
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-700">Target Amount:</span>
                      <span className="text-sm font-medium text-orange-900">
                        ${fund.targetAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-700">Current Balance:</span>
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
        </div>
      )}

      {/* Allocation Management */}
      <AllocationManagement
        isOpen={showAllocationApproval}
        onClose={() => setShowAllocationApproval(false)}
        onUpdate={loadAccountantData}
        cashCloseId={selectedCashCloseId}
      />
      
      <ComprehensiveCashCloseForm
        isOpen={showComprehensiveCashClose}
        onClose={() => setShowComprehensiveCashClose(false)}
        onSubmit={handleCashAllocationSubmit}
      />
    </div>
  );
}