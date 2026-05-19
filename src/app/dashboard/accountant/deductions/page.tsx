'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  MinusCircle,
  Clock,
  User,
  Building,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  Eye,
  RefreshCw
} from 'lucide-react';
import { dailyDeductionService, DailyDeductionSummary } from '@/lib/firebase/daily-deduction-service';

export default function DeductionsPage() {
  const [deductions, setDeductions] = useState<DailyDeductionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('last30days');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showOnlyDailyExpense, setShowOnlyDailyExpense] = useState(false);

  useEffect(() => {
    loadDeductions();
  }, [dateFilter, fromDate, toDate]);

  const loadDeductions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let startDate: string;
      let endDate: string;

      if (fromDate && toDate) {
        startDate = fromDate;
        endDate = toDate;
      } else {
        const today = new Date();
        endDate = today.toISOString().split('T')[0];
        
        switch (dateFilter) {
          case 'today':
            startDate = endDate;
            break;
          case 'last7days':
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case 'last30days':
            startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          case 'last90days':
            startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
          default:
            startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
      }

      const history = await dailyDeductionService.getDeductionHistory(startDate, endDate);
      setDeductions(history);
    } catch (err: any) {
      setError('Failed to load deductions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDeductions = () => {
    if (!showOnlyDailyExpense) return deductions;
    return deductions.filter(d => d.dailyExpenseFund.applied);
  };

  const filteredDeductions = useMemo(
    () => getFilteredDeductions(),
    [deductions, showOnlyDailyExpense]
  );

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems: paginatedDeductions,
    startIndex: pageStartIndex,
    endIndex: pageEndIndex,
  } = usePagination(filteredDeductions, 10);

  const calculateTotals = () => {
    const filteredDeductions = getFilteredDeductions();
    
    const totalDailyExpense = filteredDeductions.reduce((sum, d) => 
      sum + (d.dailyExpenseFund.applied ? d.dailyExpenseFund.amount : 0), 0
    );
    
    const totalGrossProfit = filteredDeductions.reduce((sum, d) => 
      sum + d.grossProfit.totalAmount, 0
    );
    
    const daysWithDailyExpense = filteredDeductions.filter(d => d.dailyExpenseFund.applied).length;
    
    return {
      totalDailyExpense,
      totalGrossProfit,
      daysWithDailyExpense,
      totalRecords: filteredDeductions.length
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportToCSV = () => {
    const filteredDeductions = getFilteredDeductions();
    const headers = [
      'Date',
      'Daily Expense Applied',
      'Daily Expense Amount',
      'Shift Type',
      'Applied By',
      'Applied At',
      'Gross Profit Total',
      'Gross Profit Allocations Count'
    ];

    const csvData = filteredDeductions.map(deduction => [
      deduction.date,
      deduction.dailyExpenseFund.applied ? 'Yes' : 'No',
      deduction.dailyExpenseFund.amount,
      deduction.dailyExpenseFund.shiftType || 'N/A',
      deduction.dailyExpenseFund.appliedBy || 'N/A',
      deduction.dailyExpenseFund.appliedAt ? 
        new Date(deduction.dailyExpenseFund.appliedAt.seconds * 1000).toLocaleString() : 'N/A',
      deduction.grossProfit.totalAmount,
      deduction.grossProfit.allocations.length
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deductions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <MinusCircle className="h-8 w-8 mr-3 text-orange-600" />
                Daily Deductions Tracker
              </h1>
              <p className="text-gray-600 mt-2">
                Track daily expense fund (100k daily deduction) and gross profit (12%) deductions
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadDeductions}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <MinusCircle className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-orange-600">DAILY EXPENSE</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Daily Deductions (100k)</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.totalDailyExpense)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totals.daysWithDailyExpense} days applied
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600">GROSS PROFIT</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total 12% Deductions</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(totals.totalGrossProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Across all allocations
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600">COVERAGE</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Days Tracked</p>
              <p className="text-2xl font-bold text-blue-600">{totals.totalRecords}</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((totals.daysWithDailyExpense / Math.max(totals.totalRecords, 1)) * 100)}% with daily deduction applied
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600">COMBINED</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.totalDailyExpense + totals.totalGrossProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Daily expense + Gross profit
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter Deductions
            </h3>
            <span className="text-sm text-gray-500">
              Showing {getFilteredDeductions().length} of {deductions.length} records
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select 
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'custom') {
                    setFromDate('');
                    setToDate('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="last90days">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyDailyExpense}
                  onChange={(e) => setShowOnlyDailyExpense(e.target.checked)}
                  className="mr-2 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Show only days with daily deduction applied</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading deductions data...</p>
          </div>
        )}

        {/* Deductions List */}
        {!loading && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Daily Deductions History</h3>
              <p className="text-sm text-gray-600 mt-1">
                Complete history of daily expense fund and gross profit deductions
              </p>
            </div>

            {getFilteredDeductions().length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No deductions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No deduction records match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Daily Deduction (100k)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross Profit (12%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shift Applied
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applied At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedDeductions.map((deduction, index) => (
                      <tr key={deduction.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(deduction.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500">{deduction.date}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {deduction.dailyExpenseFund.applied ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-green-600">
                                  {formatCurrency(deduction.dailyExpenseFund.amount)}
                                </div>
                                <div className="text-xs text-gray-500">Applied</div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <XCircle className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm text-gray-500">Not applied</div>
                                <div className="text-xs text-gray-400">UGX 0</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <TrendingUp className="h-4 w-4 text-purple-600 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-purple-600">
                                {formatCurrency(deduction.grossProfit.totalAmount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {deduction.grossProfit.allocations.length} allocation(s)
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {deduction.dailyExpenseFund.applied ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              deduction.dailyExpenseFund.shiftType === 'day' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {deduction.dailyExpenseFund.shiftType?.charAt(0).toUpperCase() + 
                               (deduction.dailyExpenseFund.shiftType?.slice(1) || '')} Shift
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {deduction.dailyExpenseFund.applied && deduction.dailyExpenseFund.appliedAt ? (
                            <div>
                              <div>
                                {new Date(deduction.dailyExpenseFund.appliedAt.seconds * 1000).toLocaleTimeString()}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(deduction.dailyExpenseFund.appliedAt.seconds * 1000).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
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
              totalItems={filteredDeductions.length}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
