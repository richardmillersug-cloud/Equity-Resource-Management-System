'use client';

import React, { useState, useEffect } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calculator,
  Calendar,
  FileText,
  Receipt,
  Building,
  AlertCircle,
  Download,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';

interface ProfitRecord {
  id: string;
  date: string;
  grossProfit: number;
  totalExpenses: number;
  accountantExpenses: number;
  tillExpenses: number;
  specialFunds: number;
  netProfit: number;
  profitMargin: number;
  expenseRatio: number;
  source: string; // cash close ID
}

interface ExpenseBreakdown {
  general: number;
  ura: number;
  emergencies: number;
  dayToDay: number;
}

interface ProfitSummary {
  totalGrossProfit: number;
  totalExpenses: number;
  totalSpecialFunds: number;
  totalNetProfit: number;
  averageProfitMargin: number;
  expenseRatio: number;
  recordCount: number;
}

export default function ProfitsPage() {
  const [profitRecords, setProfitRecords] = useState<ProfitRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ProfitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'grossProfit' | 'specialFunds' | 'netProfit' | 'expenses'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems: paginatedRecords,
    startIndex: pageStartIndex,
    endIndex: pageEndIndex,
  } = usePagination(filteredRecords, 10);

  // Summary data
  const [summary, setSummary] = useState<ProfitSummary>({
    totalGrossProfit: 0,
    totalExpenses: 0,
    totalSpecialFunds: 0,
    totalNetProfit: 0,
    averageProfitMargin: 0,
    expenseRatio: 0,
    recordCount: 0
  });

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Helper function to load cash closes
  const loadCashCloses = async (currentUser: any): Promise<any[]> => {
    let cashCloses: any[] = [];
    
    // Try simple service first, then fallback to full service
    try {
      cashCloses = await SimpleCashCloseService.getAllCashClosesSimple();
    } catch (simpleError) {
      console.warn('Simple service failed, trying full service:', simpleError);
      
      try {
        const cashCloseService = new CashCloseService();
        if (currentUser?.branchId) {
          cashCloses = await cashCloseService.getBranchCashCloses(currentUser.branchId);
        } else {
          cashCloses = await cashCloseService.getAll();
        }
      } catch (fullError) {
        console.error('Both services failed:', fullError);
        throw new Error('Failed to load cash close data');
      }
    }
    
    return cashCloses;
  };

  // Helper function to load expenses from expenses table
  const loadExpenses = async (): Promise<any[]> => {
    try {
      const expenses = await AccountantQueries.getExpenseManagement();
      return expenses || [];
    } catch (error) {
      console.warn('Failed to load expenses:', error);
      return [];
    }
  };

  // Helper function to calculate accountant expenses for a specific date
  // This matches expenses from the expenses table to the cash close date
  const calculateAccountantExpensesForDate = (expenses: any[], date: Date): number => {
    const dateStr = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    // Filter expenses for the same date and sum their amounts
    // This pulls from ALL expenses in the expense table for the specific day
    const dayExpenses = expenses.filter(expense => {
      if (!expense.expenseDate) return false;
      
      // Handle different date formats (Firestore Timestamp, Date object, or string)
      let expenseDate: Date;
      if (expense.expenseDate.toDate) {
        expenseDate = expense.expenseDate.toDate();
      } else if (expense.expenseDate instanceof Date) {
        expenseDate = expense.expenseDate;
      } else {
        expenseDate = new Date(expense.expenseDate);
      }
      
      const expenseDateStr = expenseDate.toISOString().split('T')[0];
      return expenseDateStr === dateStr;
    });
    
    return dayExpenses.reduce((total, expense) => total + (expense.amount || 0), 0);
  };

  const loadProfitData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentUser = authService.getCurrentUser();
      
      // Fetch cash closes and expenses in parallel
      const [cashCloses, expenses] = await Promise.all([
        loadCashCloses(currentUser),
        loadExpenses()
      ]);

      // Process cash closes into profit records
      const profitData: ProfitRecord[] = cashCloses.map(cashClose => {
        // Calculate expenses from tills
        const tillExpenses = cashClose.shifts?.reduce((total: number, shift: any) => {
          return total + shift.tills?.reduce((tillTotal: number, till: any) => {
            return tillTotal + (till.expenseDetails?.reduce((expenseTotal: number, expense: any) => {
              return expenseTotal + (expense.amount || 0);
            }, 0) || 0);
          }, 0) || 0;
        }, 0) || 0;

        // Get cash close date for matching expenses
        const cashCloseDate = cashClose.createdAt?.toDate?.() || cashClose.cashCloseDate?.toDate?.() || new Date();
        
        // Calculate accountant expenses from expenses table for this date
        const accountantExpenses = calculateAccountantExpensesForDate(expenses, cashCloseDate);
        
        const totalExpenses = tillExpenses + accountantExpenses;
        const grossProfit = cashClose.profitAmount || 0;
        const specialFunds = cashClose.specialFunds || 0;
        const netProfit = grossProfit - totalExpenses;
        const revenue = cashClose.totalRevenue || 0;
        
        return {
          id: cashClose.id,
          date: cashCloseDate.toISOString(),
          grossProfit,
          totalExpenses,
          accountantExpenses,
          tillExpenses,
          specialFunds,
          netProfit,
          profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
          expenseRatio: grossProfit > 0 ? (totalExpenses / grossProfit) * 100 : 0,
          source: cashClose.id
        };
      });

      // Sort by date (newest first) by default
      profitData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setProfitRecords(profitData);
      setFilteredRecords(profitData);
      
    } catch (err) {
      console.error('Error loading profit data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profit data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const calculateSummary = (records: ProfitRecord[]) => {
    if (records.length === 0) {
      setSummary({
        totalGrossProfit: 0,
        totalExpenses: 0,
        totalSpecialFunds: 0,
        totalNetProfit: 0,
        averageProfitMargin: 0,
        expenseRatio: 0,
        recordCount: 0
      });
      return;
    }

    const totalGrossProfit = records.reduce((sum, record) => sum + record.grossProfit, 0);
    const totalExpenses = records.reduce((sum, record) => sum + record.totalExpenses, 0);
    const totalSpecialFunds = records.reduce((sum, record) => sum + record.specialFunds, 0);
    const totalNetProfit = records.reduce((sum, record) => sum + record.netProfit, 0);
    const averageProfitMargin = records.reduce((sum, record) => sum + record.profitMargin, 0) / records.length;
    const expenseRatio = totalGrossProfit > 0 ? (totalExpenses / totalGrossProfit) * 100 : 0;

    setSummary({
      totalGrossProfit,
      totalExpenses,
      totalSpecialFunds,
      totalNetProfit,
      averageProfitMargin,
      expenseRatio,
      recordCount: records.length
    });
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...profitRecords];

    // Date filtering
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= from && recordDate <= to;
      });
    } else if (fromDate) {
      const from = new Date(fromDate);
      filtered = filtered.filter(record => new Date(record.date) >= from);
    } else if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(record => new Date(record.date) <= to);
    } else if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.date);
            const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
            return recordDateOnly.getTime() === today.getTime();
          });
          break;
        case 'last7days':
          const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(record => new Date(record.date) >= last7Days);
          break;
        case 'last30days':
          const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(record => new Date(record.date) >= last30Days);
          break;
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'grossProfit':
          aValue = a.grossProfit;
          bValue = b.grossProfit;
          break;
        case 'specialFunds':
          aValue = a.specialFunds;
          bValue = b.specialFunds;
          break;
        case 'netProfit':
          aValue = a.netProfit;
          bValue = b.netProfit;
          break;
        case 'expenses':
          aValue = a.totalExpenses;
          bValue = b.totalExpenses;
          break;
        default:
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setFilteredRecords(filtered);
  };

  // Export functionality
  const exportToCSV = () => {
    const headers = ['Date', 'Gross Profit', 'Daily Expense Fund', 'Till Expenses', 'Accountant Expenses (from expenses table)', 'Total Expenses', 'Net Profit', 'Profit Margin %', 'Expense Ratio %'];
    const csvData = filteredRecords.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.grossProfit,
      record.specialFunds,
      record.tillExpenses,
      record.accountantExpenses,
      record.totalExpenses,
      record.netProfit,
      record.profitMargin.toFixed(2),
      record.expenseRatio.toFixed(2)
    ]);

    // Add summary row
    const summaryRow = [
      'TOTALS',
      summary.totalGrossProfit,
      summary.totalSpecialFunds,
      filteredRecords.reduce((sum, r) => sum + r.tillExpenses, 0),
      filteredRecords.reduce((sum, r) => sum + r.accountantExpenses, 0),
      summary.totalExpenses,
      summary.totalNetProfit,
      summary.averageProfitMargin.toFixed(2),
      summary.expenseRatio.toFixed(2)
    ];

    const csvContent = [headers, ...csvData, [], summaryRow]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `profit-analysis-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadProfitData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profitRecords, dateFilter, fromDate, toDate, sortBy, sortOrder]);

  useEffect(() => {
    calculateSummary(filteredRecords);
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading Profit Analysis</p>
          <p className="text-sm text-gray-400">Fetching cash close and expense records…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">Accountant Workspace</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Profit Analysis</h1>
            <p className="text-blue-200 mt-1 text-sm">Track profits and expenses to calculate actual profit saved</p>
          </div>
          <button
            onClick={loadProfitData}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-medium transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Total Gross Profit</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalGrossProfit)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-600">Daily Expense Fund Allocated</p>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(summary.totalSpecialFunds)}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(summary.totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Net Profit (After Expenses)</p>
              <p className={`text-2xl font-bold ${summary.totalNetProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                {formatCurrency(summary.totalNetProfit)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center">
            <Calculator className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Avg Profit Margin</p>
              <p className="text-2xl font-bold text-purple-900">{formatPercentage(summary.averageProfitMargin)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filter & Analysis Controls</h3>
          <span className="text-sm text-gray-500">
            {filteredRecords.length} records
          </span>
        </div>
        
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Range */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Calendar className="inline h-3 w-3 mr-1" />
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateFilter('custom');
                }}
                className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Quick Presets</label>
            <select 
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') {
                  setFromDate('');
                  setToDate('');
                }
              }}
              className="w-36 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sort By</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="date">Date</option>
              <option value="grossProfit">Gross Profit</option>
              <option value="specialFunds">Special Funds</option>
              <option value="netProfit">Net Profit</option>
              <option value="expenses">Expenses</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Order</label>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            title="Export to CSV"
          >
            <Download className="h-3 w-3 mr-1" />
            CSV
          </button>
        </div>
      </div>

      {/* Profit Analysis Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Profit Analysis Records</h3>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown of profits vs expenses</p>
        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No profit records found</h3>
            <p className="mt-1 text-sm text-gray-500">Records will appear here once cash closes are processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Special Funds</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Till Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title="All expenses from expenses table for this date">
                    Accountant Expenses
                    <span className="text-xs normal-case block text-gray-400 mt-1">(from expenses table)</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense Ratio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{new Date(record.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(record.grossProfit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      {formatCurrency(record.specialFunds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      {formatCurrency(record.tillExpenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                      {formatCurrency(record.accountantExpenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(record.totalExpenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={record.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(record.netProfit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatPercentage(record.profitMargin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatPercentage(record.expenseRatio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          startIndex={pageStartIndex}
          endIndex={pageEndIndex}
          totalItems={filteredRecords.length}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>
    </div>
  );
}
