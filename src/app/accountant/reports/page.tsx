'use client';

import React, { useState, useEffect } from 'react';
import { AccountantQueries } from '../../../lib/firebase/role-based-queries';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  FileText,
  Calculator,
  Target,
  AlertCircle
} from 'lucide-react';

interface ReportData {
  cashAllocations: any[];
  expenses: any[];
  specialFunds: any[];
}

interface FinancialSummary {
  totalAllocated: number;
  totalExpenses: number;
  totalPaid: number;
  pendingPayments: number;
  savingsTotal: number;
  specialFundsTotal: number;
}

export default function FinancialReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({
    cashAllocations: [],
    expenses: [],
    specialFunds: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allocations, expenses, funds] = await Promise.all([
        AccountantQueries.getCashAllocations(),
        AccountantQueries.getExpenseManagement(),
        AccountantQueries.getSpecialFundsTracker()
      ]);

      setReportData({
        cashAllocations: allocations || [],
        expenses: expenses || [],
        specialFunds: funds || []
      });
    } catch (err: any) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialSummary = (): FinancialSummary => {
    const totalAllocated = reportData.cashAllocations.reduce((sum, allocation) => 
      sum + (allocation.cashCloseTotal || 0), 0);
    
    const totalExpenses = reportData.expenses.reduce((sum, expense) => 
      sum + (expense.amount || 0), 0);
    
    const totalPaid = reportData.expenses.reduce((sum, expense) => 
      sum + (expense.paidAmount || 0), 0);
    
    const pendingPayments = totalExpenses - totalPaid;
    
    const savingsTotal = reportData.cashAllocations.reduce((sum, allocation) => 
      sum + (allocation.savings || 0), 0);
    
    const specialFundsTotal = reportData.specialFunds.reduce((sum, fund) => 
      sum + (fund.specialFundsBalance || 0), 0);

    return {
      totalAllocated,
      totalExpenses,
      totalPaid,
      pendingPayments,
      savingsTotal,
      specialFundsTotal
    };
  };

  const getExpensesByCategory = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    reportData.expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / calculateFinancialSummary().totalExpenses) * 100
    }));
  };

  const getMonthlyTrends = () => {
    const monthlyData: { [key: string]: { allocated: number; expenses: number; } } = {};
    
    // Process allocations
    reportData.cashAllocations.forEach(allocation => {
      if (allocation.allocationDate?.seconds) {
        const date = new Date(allocation.allocationDate.seconds * 1000);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { allocated: 0, expenses: 0 };
        }
        monthlyData[monthKey].allocated += allocation.cashCloseTotal || 0;
      }
    });

    // Process expenses
    reportData.expenses.forEach(expense => {
      if (expense.expenseDate?.seconds) {
        const date = new Date(expense.expenseDate.seconds * 1000);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { allocated: 0, expenses: 0 };
        }
        monthlyData[monthKey].expenses += expense.amount || 0;
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        ...data
      }));
  };

  const summary = calculateFinancialSummary();
  const expensesByCategory = getExpensesByCategory();
  const monthlyTrends = getMonthlyTrends();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadReportData}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="summary">Financial Summary</option>
              <option value="detailed">Detailed Analysis</option>
              <option value="trends">Trend Analysis</option>
              <option value="allocations">Cash Allocations</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Allocated</p>
            <p className="text-2xl font-bold text-gray-900">${summary.totalAllocated.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">Cash allocations</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">${summary.totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">All categories</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Savings Total</p>
            <p className="text-2xl font-bold text-gray-900">${summary.savingsTotal.toLocaleString()}</p>
            <p className="text-xs text-purple-600 mt-1">12% allocation</p>
          </div>
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {monthlyTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{trend.month}</span>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-green-600">${trend.allocated.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Allocated</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600">${trend.expenses.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Expenses</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Expenses by Category</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {expensesByCategory.slice(0, 5).map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{category.category}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${category.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cash Allocations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Cash Allocations</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.cashAllocations.slice(0, 5).map((allocation) => (
                  <tr key={allocation.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {allocation.allocationDate?.seconds ? 
                        new Date(allocation.allocationDate.seconds * 1000).toLocaleDateString() : 
                        'N/A'
                      }
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      ${allocation.cashCloseTotal?.toLocaleString() || '0'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        allocation.allocationStatus === 'BALANCED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {allocation.allocationStatus || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Status Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-800">Fully Paid</span>
              <span className="text-sm font-bold text-green-900">
                {reportData.expenses.filter(e => e.paymentStatus === 'FULLY_PAID').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-800">Partially Paid</span>
              <span className="text-sm font-bold text-yellow-900">
                {reportData.expenses.filter(e => e.paymentStatus === 'PARTIALLY_PAID').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-800">Unpaid</span>
              <span className="text-sm font-bold text-red-900">
                {reportData.expenses.filter(e => e.paymentStatus === 'UNPAID').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">Total Pending</span>
              <span className="text-sm font-bold text-gray-900">
                ${summary.pendingPayments.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Financial Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Cash Flow Efficiency</h4>
            <p className="text-sm text-blue-700">
              {summary.totalPaid > 0 ? 
                `${((summary.totalPaid / summary.totalExpenses) * 100).toFixed(1)}% of expenses have been paid` :
                'No payments recorded yet'
              }
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Savings Performance</h4>
            <p className="text-sm text-green-700">
              {summary.totalAllocated > 0 ? 
                `${((summary.savingsTotal / summary.totalAllocated) * 100).toFixed(1)}% allocated to savings` :
                'No allocations recorded yet'
              }
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Budget Utilization</h4>
            <p className="text-sm text-purple-700">
              {summary.totalAllocated > 0 ? 
                `${((summary.totalExpenses / summary.totalAllocated) * 100).toFixed(1)}% of allocated funds used` :
                'No budget data available'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 