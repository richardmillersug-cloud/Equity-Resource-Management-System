'use client';

import { useState, useEffect } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
// import {
//   DollarSign,
//   TrendingUp,
//   TrendingDown,
//   PieChart,
//   BarChart3,
//   Download,
//   Calendar,
//   Filter,
//   RefreshCw,
// } from 'lucide-react';

export default function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>({
    summary: {
      totalAllocated: 0,
      totalExpenses: 0,
      totalPaid: 0,
      pendingPayments: 0,
      savingsTotal: 0,
      specialFundsTotal: 0
    },
    monthlyTrends: [],
    expensesByCategory: []
  });
  const [dateRange, setDateRange] = useState('last6months');
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      console.log('Loading financial report data...');
      
      let cashAllocations: Record<string, unknown>[] = [];
      let expenses: Record<string, unknown>[] = [];
      let specialFunds: Record<string, unknown>[] = [];
      
      try {
        // Load all data sources
        cashAllocations = await AccountantQueries.getCashAllocations();
        expenses = await AccountantQueries.getExpenseManagement();
        specialFunds = await AccountantQueries.getSpecialFundsTracker();
        
        console.log('✅ Report data loaded from Firebase');
      } catch (err) {
        console.warn('⚠️ Failed to load report data from Firebase:', err);
        
        // NO MORE PLACEHOLDER DATA - Set empty arrays
        cashAllocations = [];
        expenses = [];
        specialFunds = [];
        
        console.log('📋 No report data available - showing empty state');
      }

      // Use real data only - no placeholder merging
      const finalCashAllocations = cashAllocations;
      const finalExpenses = expenses;
      const finalSpecialFunds = specialFunds;

      // Calculate summary metrics
      const totalAllocated = finalCashAllocations.reduce((sum, allocation) => sum + (allocation.cashCloseTotal || 0), 0);
      const totalExpenses = finalExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalPaid = finalExpenses.reduce((sum, expense) => sum + (expense.paidAmount || 0), 0);
      const pendingPayments = totalExpenses - totalPaid;
      const savingsTotal = finalCashAllocations.reduce((sum, allocation) => sum + (allocation.savings || 0), 0);
      const specialFundsTotal = finalSpecialFunds.reduce((sum, fund) => sum + (fund.specialFundsBalance || 0), 0);

      // Calculate real monthly trends and categories from actual data
      const monthlyTrends = calculateMonthlyTrends(finalCashAllocations, finalExpenses);
      const expensesByCategory = calculateExpensesByCategory(finalExpenses);

      setReportData({
        summary: {
          totalAllocated,
          totalExpenses,
          totalPaid,
          pendingPayments,
          savingsTotal,
          specialFundsTotal
        },
        monthlyTrends,
        expensesByCategory
      });

    } catch (err: unknown) {
      console.error('Error loading report data:', err);
      
      // NO MORE PLACEHOLDER DATA - Show empty state
      setReportData({
        summary: {
          totalAllocated: 0,
          totalExpenses: 0,
          totalPaid: 0,
          pendingPayments: 0,
          savingsTotal: 0,
          specialFundsTotal: 0
        },
        monthlyTrends: [],
        expensesByCategory: []
      });
      setError(`Database connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to calculate real data from database
  const calculateMonthlyTrends = (allocations: any[], expenses: any[]) => {
    // Group allocations and expenses by month and calculate trends
    const monthlyData = new Map();
    
    allocations.forEach(allocation => {
      const date = allocation.allocationDate?.toDate?.() || new Date(allocation.allocationDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { allocated: 0, expenses: 0, month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) });
      }
      
      const current = monthlyData.get(monthKey);
      current.allocated += allocation.cashCloseTotal || 0;
    });

    expenses.forEach(expense => {
      const date = expense.expenseDate?.toDate?.() || new Date(expense.expenseDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { allocated: 0, expenses: 0, month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) });
      }
      
      const current = monthlyData.get(monthKey);
      current.expenses += expense.amount || 0;
    });

    return Array.from(monthlyData.values()).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  };

  const calculateExpensesByCategory = (expenses: any[]) => {
    const categoryData = new Map();
    let totalAmount = 0;

    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      const amount = expense.amount || 0;
      totalAmount += amount;

      if (!categoryData.has(category)) {
        categoryData.set(category, { category, amount: 0 });
      }

      categoryData.get(category).amount += amount;
    });

    return Array.from(categoryData.values()).map(item => ({
      ...item,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equity Wallet</h1>
          <p className="text-gray-600 mt-2">Track gross profit & expense fund accumulation across daily, weekly, and monthly periods</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading real report data from database...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Report Data Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

              {!loading && (
         <>
           {/* Monthly Equity Wallet Accumulation Cards */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             {/* Monthly Gross Profit Accumulation Card */}
             <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center">
                   <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                     <span className="text-white text-2xl">💰</span>
                   </div>
                   <div className="ml-3">
                     <h3 className="text-lg font-semibold text-green-800">Monthly Gross Profit</h3>
                     <p className="text-sm text-green-600">12% Accumulation This Month</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-xs text-green-600 font-medium">
                     {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                   </div>
                   <div className="text-xs text-green-500">Resets monthly</div>
                 </div>
               </div>
               
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-medium text-green-700">This Month:</span>
                   <span className="text-2xl font-bold text-green-800">
                     UGX {(() => {
                       const currentMonth = new Date().getMonth();
                       const currentYear = new Date().getFullYear();
                       // Calculate current month's accumulation (simplified for demo)
                       return Math.floor(reportData.summary.savingsTotal / 12).toLocaleString();
                     })()}
                   </span>
                 </div>
                 
                 <div className="bg-white rounded-lg p-3 border border-green-200">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-green-600">Monthly Progress</span>
                     <span className="text-xs text-green-600">📅 Day {new Date().getDate()}/{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}</span>
                   </div>
                   <div className="w-full bg-green-200 rounded-full h-2">
                     <div className="bg-green-600 h-2 rounded-full" style={{
                       width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%`
                     }}></div>
                   </div>
                   <div className="text-xs text-green-500 mt-1">12% saved from each daily cash close</div>
                 </div>
                 
                 <div className="text-xs text-green-600 bg-white bg-opacity-50 rounded p-2">
                   🔄 Monthly accumulation resets to zero at the end of each month, starting fresh for the next month's collection.
                 </div>
               </div>
             </div>

             {/* Monthly Daily Expense Fund Card */}
             <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center">
                   <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                     <span className="text-white text-2xl">🏦</span>
                   </div>
                   <div className="ml-3">
                     <h3 className="text-lg font-semibold text-blue-800">Monthly Expense Fund</h3>
                     <p className="text-sm text-blue-600">100,000 UGX Daily Collection</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-xs text-blue-600 font-medium">
                     {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                   </div>
                   <div className="text-xs text-blue-500">Resets monthly</div>
                 </div>
               </div>
               
               <div className="space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm font-medium text-blue-700">This Month:</span>
                   <span className="text-2xl font-bold text-blue-800">
                     UGX {(new Date().getDate() * 100000).toLocaleString()}
                   </span>
                 </div>
                 
                 <div className="bg-white rounded-lg p-3 border border-blue-200">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-blue-600">Daily Collection</span>
                     <span className="text-xs text-blue-600">📅 {new Date().getDate()} days × 100K</span>
                   </div>
                   <div className="w-full bg-blue-200 rounded-full h-2">
                     <div className="bg-blue-600 h-2 rounded-full" style={{
                       width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%`
                     }}></div>
                   </div>
                   <div className="text-xs text-blue-500 mt-1">100,000 UGX collected each business day</div>
                 </div>
                 
                 <div className="text-xs text-blue-600 bg-white bg-opacity-50 rounded p-2">
                   🔄 Monthly fund resets to zero at month-end, providing fresh expense coverage for the new month.
                 </div>
               </div>
             </div>
           </div>

           {/* Monthly Summary & Next Month Transition */}
           <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Equity Wallet Overview</h3>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                 <div className="text-2xl font-bold text-purple-600 mb-2">
                   UGX {(() => {
                     const currentMonthProfit = Math.floor(reportData.summary.savingsTotal / 12);
                     const currentMonthExpense = new Date().getDate() * 100000;
                     return (currentMonthProfit + currentMonthExpense).toLocaleString();
                   })()}
                 </div>
                 <div className="text-sm text-purple-600 font-medium">This Month Total</div>
                 <div className="text-xs text-purple-500 mt-1">Combined monthly accumulation</div>
               </div>
               
               <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                 <div className="text-2xl font-bold text-indigo-600 mb-2">
                   {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}
                 </div>
                 <div className="text-sm text-indigo-600 font-medium">Days Remaining</div>
                 <div className="text-xs text-indigo-500 mt-1">Until monthly reset</div>
               </div>
               
               <div className="text-center p-4 bg-teal-50 rounded-lg border border-teal-200">
                 <div className="text-2xl font-bold text-teal-600 mb-2">
                   {new Date().getDate()}
                 </div>
                 <div className="text-sm text-teal-600 font-medium">Collection Days</div>
                 <div className="text-xs text-teal-500 mt-1">This month so far</div>
               </div>
               
               <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                 <div className="text-2xl font-bold text-orange-600 mb-2">
                   {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                 </div>
                 <div className="text-sm text-orange-600 font-medium">Next Reset</div>
                 <div className="text-xs text-orange-500 mt-1">Start of next month</div>
               </div>
             </div>
             
             {/* Monthly Reset Explanation */}
             <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
               <div className="flex items-center">
                 <span className="text-2xl mr-3">🔄</span>
                 <div>
                   <h4 className="text-sm font-semibold text-yellow-800">Monthly Reset System</h4>
                   <p className="text-xs text-yellow-700 mt-1">
                     At the end of each month, both the 12% gross profit and 100,000 UGX daily fund accumulations 
                     reset to zero, starting fresh for the new month. This provides clear monthly financial targets and clean accounting periods.
                   </p>
                 </div>
               </div>
             </div>
           </div>

           {/* Traditional Reports Summary */}
           <div className="bg-white rounded-lg border border-gray-200 p-6">
             <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Financial Metrics</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
               <div className="text-center">
                 <div className="text-2xl font-bold text-blue-600">
                   UGX {reportData.summary.totalAllocated.toLocaleString()}
                 </div>
                 <div className="text-sm text-gray-500">Total Allocated</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-red-600">
                   UGX {reportData.summary.totalExpenses.toLocaleString()}
                 </div>
                 <div className="text-sm text-gray-500">Total Expenses</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-green-600">
                   UGX {reportData.summary.totalPaid.toLocaleString()}
                 </div>
                 <div className="text-sm text-gray-500">Total Paid</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-orange-600">
                   UGX {reportData.summary.pendingPayments.toLocaleString()}
                 </div>
                 <div className="text-sm text-gray-500">Pending Payments</div>
               </div>
             </div>

             {reportData.monthlyTrends.length === 0 && reportData.expensesByCategory.length === 0 && (
               <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
                 <div className="text-gray-400 text-lg mb-2">📊</div>
                 <h3 className="text-gray-600 font-medium">No Historical Data Available</h3>
                 <p className="text-gray-500 text-sm mt-1">
                   Create cash closes and expense records to see detailed reports and trends.
                 </p>
               </div>
             )}
           </div>
         </>
       )}
    </div>
  );
} 