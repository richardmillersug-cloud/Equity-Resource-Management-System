'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  Download,
  BarChart3,
  LineChart,
  RefreshCw,
  ShoppingCart,
  CreditCard,
  Wallet,
  Receipt,
  ArrowRightLeft,
  CheckCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { authService } from '../../../lib/firebase/auth';
import {
  loadMdMonthlySummaries,
  getPmCurrentMonthTotals,
  getAccountantCurrentMonthTotals,
  type MdMonthlySummaries
} from '../../../lib/firebase/md-monthly-summary';
import { firestoreServices } from '../../../lib/firebase/firestore-service';
import {
  computeQuarterForecast,
  formatCompactUgx,
  formatGrowthPct,
  formatWorkforceHires,
  type QuarterForecast
} from '../../../lib/firebase/md-quarter-forecast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler
);

export default function ManagingDirectorDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1month' | '3months' | '6months' | '12months'>('12months');
  const [monthlySummaries, setMonthlySummaries] = useState<MdMonthlySummaries | null>(null);
  const [forecastSummaries, setForecastSummaries] = useState<MdMonthlySummaries | null>(null);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);

  useEffect(() => {
    const loadExecutiveData = async () => {
      try {
        setLoading(true);
        
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        
        const [monthlyData, forecastData, employees] = await Promise.all([
          loadMdMonthlySummaries(selectedTimeframe),
          loadMdMonthlySummaries('6months'),
          firestoreServices.employee.getAll(),
        ]);
        setMonthlySummaries(monthlyData);
        setForecastSummaries(forecastData);
        setActiveEmployeeCount(
          employees.filter((emp: { employmentStatus?: string }) => emp.employmentStatus === 'Active').length
        );
        
      } catch (error) {
        console.error('Error loading executive dashboard:', error);
        setMonthlySummaries(null);
        setForecastSummaries(null);
        setActiveEmployeeCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadExecutiveData();
  }, [selectedTimeframe]);

  const formatCurrency = (amount) => {
    const value = Number(amount);
    const safeAmount = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  const pmMonthTotals = monthlySummaries ? getPmCurrentMonthTotals(monthlySummaries) : null;
  const accountantMonthTotals = monthlySummaries ? getAccountantCurrentMonthTotals(monthlySummaries) : null;

  const quarterForecast = useMemo<QuarterForecast | null>(() => {
    if (!forecastSummaries) return null;
    return computeQuarterForecast(forecastSummaries, activeEmployeeCount);
  }, [forecastSummaries, activeEmployeeCount]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { usePointStyle: true, padding: 16, font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.06)' },
        ticks: {
          callback: (value: string | number) => {
            const num = Number(value);
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return num;
          }
        }
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any), []);

  const pmMonthlyChartData = useMemo(() => {
    if (!monthlySummaries) return null;
    const labels = monthlySummaries.pm.purchases.map((d) => d.label);
    return {
      labels,
      datasets: [
        {
          label: 'Purchases',
          data: monthlySummaries.pm.purchases.map((d) => d.amount),
          backgroundColor: 'rgba(236, 72, 153, 0.75)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Payments',
          data: monthlySummaries.pm.payments.map((d) => d.amount),
          backgroundColor: 'rgba(139, 92, 246, 0.75)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'This Month Outstanding',
          data: monthlySummaries.pm.monthLoans.map((d) => d.amount),
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Total Outstanding',
          data: monthlySummaries.pm.loans.map((d) => d.amount),
          backgroundColor: 'rgba(249, 115, 22, 0.75)',
          borderColor: 'rgba(249, 115, 22, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  }, [monthlySummaries]);

  const accountantCashChartData = useMemo(() => {
    if (!monthlySummaries) return null;
    const labels = monthlySummaries.accountant.cashClose.map((d) => d.label);
    return {
      labels,
      datasets: [
        {
          label: 'Cash Close Revenue',
          data: monthlySummaries.accountant.cashClose.map((d) => d.amount),
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
        },
        {
          label: 'Expenses',
          data: monthlySummaries.accountant.expenses.map((d) => d.amount),
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
        },
      ],
    };
  }, [monthlySummaries]);

  const pmFundChartData = useMemo(() => {
    if (!monthlySummaries) return null;
    const labels = monthlySummaries.accountant.pmAssigned.map((d) => d.label);
    return {
      labels,
      datasets: [
        {
          label: 'Assigned to PM',
          data: monthlySummaries.accountant.pmAssigned.map((d) => d.amount),
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Used by PM',
          data: monthlySummaries.accountant.pmUsed.map((d) => d.amount),
          backgroundColor: 'rgba(34, 197, 94, 0.75)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  }, [monthlySummaries]);

  if (loading) {
    return (
      <div className="min-h-full p-5">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading Executive Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-5">
      <div className="w-full space-y-6">
        
        {/* Executive Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Executive Dashboard
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as '1month' | '3months' | '6months' | '12months')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="1month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
              </select>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Data Summaries — PM & Accountant */}
        {monthlySummaries && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                    Monthly Data Summaries
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Purchasing Manager and Accountant activity over the selected period
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* PM Monthly Summary */}
                <div className="rounded-xl border border-pink-200 dark:border-pink-800/40 bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/20 dark:to-gray-800 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <ShoppingCart className="w-5 h-5 text-pink-600" />
                    Purchasing Manager — Monthly
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-pink-100 dark:border-pink-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Purchases
                      </p>
                      <p className="text-sm font-bold text-pink-600 mt-1">
                        {formatCurrency(pmMonthTotals?.purchases ?? 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-purple-100 dark:border-purple-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Payments
                      </p>
                      <p className="text-sm font-bold text-purple-600 mt-1">
                        {formatCurrency(pmMonthTotals?.payments ?? 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-amber-100 dark:border-amber-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> This Month Outstanding
                      </p>
                      <p className="text-sm font-bold text-amber-600 mt-1">
                        {formatCurrency(pmMonthTotals?.monthLoans ?? 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-orange-100 dark:border-orange-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Wallet className="w-3 h-3" /> Total Outstanding
                      </p>
                      <p className="text-sm font-bold text-orange-600 mt-1">
                        {formatCurrency(pmMonthTotals?.loans ?? 0)}
                      </p>
                    </div>
                  </div>

                  {monthlySummaries.outstandingBreakdown && (
                    <div className="mb-5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-700/30 p-3 text-xs text-gray-600 dark:text-gray-400 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          Outstanding from invoice paid amounts (matches PM reconciliation).
                        </p>
                        {monthlySummaries.reconciliation?.sumsMatch && (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Sums verified
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-orange-600 font-semibold">Total:</span>{' '}
                          {monthlySummaries.outstandingBreakdown.total.fullyUnpaid.count} fully unpaid (
                          {formatCurrency(monthlySummaries.outstandingBreakdown.total.fullyUnpaid.amount)}),{' '}
                          {monthlySummaries.outstandingBreakdown.total.partiallyPaid.count} partially paid (
                          {formatCurrency(monthlySummaries.outstandingBreakdown.total.partiallyPaid.amount)} remaining)
                        </div>
                        <div>
                          <span className="text-amber-600 font-semibold">This month:</span>{' '}
                          {monthlySummaries.outstandingBreakdown.thisMonth.fullyUnpaid.count} fully unpaid (
                          {formatCurrency(monthlySummaries.outstandingBreakdown.thisMonth.fullyUnpaid.amount)}),{' '}
                          {monthlySummaries.outstandingBreakdown.thisMonth.partiallyPaid.count} partially paid (
                          {formatCurrency(monthlySummaries.outstandingBreakdown.thisMonth.partiallyPaid.amount)} remaining)
                        </div>
                      </div>
                      {monthlySummaries.reconciliation && (
                        <p className="text-gray-500 dark:text-gray-400">
                          {monthlySummaries.reconciliation.totalInvoices.toLocaleString()} total invoices ·{' '}
                          {formatCurrency(monthlySummaries.reconciliation.sumAllInvoices)} invoiced ·{' '}
                          {formatCurrency(monthlySummaries.reconciliation.sumCompletelyPaid)} fully paid
                        </p>
                      )}
                      <Link
                        href="/dashboard/managing-director/outstanding-invoices"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        View full reconciliation →
                      </Link>
                      {monthlySummaries.outstandingBreakdown.pendingCheques.count > 0 && (
                        <p className="text-blue-600 dark:text-blue-400">
                          {monthlySummaries.outstandingBreakdown.pendingCheques.count} pending cheque
                          {monthlySummaries.outstandingBreakdown.pendingCheques.count !== 1 ? 's' : ''} (
                          {formatCurrency(monthlySummaries.outstandingBreakdown.pendingCheques.amount)}) awaiting clearance.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="h-64">
                    {pmMonthlyChartData && <Bar data={pmMonthlyChartData} options={chartOptions} />}
                  </div>
                </div>

                {/* Accountant Monthly Summary */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-gray-800 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Accountant — Monthly
                  </h3>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cash Close</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        {formatCurrency(accountantMonthTotals?.cashClose ?? 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-red-100 dark:border-red-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
                      <p className="text-sm font-bold text-red-600 mt-1">
                        {formatCurrency(accountantMonthTotals?.expenses ?? 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" /> PM Util.
                      </p>
                      <p className="text-sm font-bold text-blue-600 mt-1">
                        {(accountantMonthTotals?.pmUtilization ?? 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="h-64">
                    {accountantCashChartData && <Line data={accountantCashChartData} options={chartOptions} />}
                  </div>
                </div>
              </div>
            </div>

            {/* PM Fund Assignment vs Usage */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                PM Funds — Assigned vs Used (Monthly)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Money allocated to the Purchasing Manager by the accountant compared to payments made by PM
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-72">
                  {pmFundChartData && <Bar data={pmFundChartData} options={chartOptions} />}
                </div>

                <div className="space-y-3">
                  {monthlySummaries.accountant.pmAssigned.map((assigned, idx) => {
                    const used = monthlySummaries.accountant.pmUsed[idx];
                    const utilization = assigned.amount > 0 ? (used.amount / assigned.amount) * 100 : 0;
                    const gap = assigned.amount - used.amount;
                    return (
                      <div
                        key={assigned.monthKey}
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{assigned.label}</span>
                          <span className={`text-xs font-semibold ${utilization >= 80 ? 'text-green-600' : utilization >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {utilization.toFixed(0)}% used
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, utilization)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Assigned: {formatCurrency(assigned.amount)}</span>
                          <span>Gap: {formatCurrency(gap)}</span>
                        </div>
                      </div>
                    );
                  }).slice(-4).reverse()}
                </div>
              </div>
            </div>

            {/* Monthly Summary Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 overflow-x-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Monthly Breakdown Table
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Month</th>
                    <th className="text-right py-3 px-2 font-semibold text-pink-600">Purchases</th>
                    <th className="text-right py-3 px-2 font-semibold text-purple-600">Payments</th>
                    <th className="text-right py-3 px-2 font-semibold text-amber-600">This Month</th>
                    <th className="text-right py-3 px-2 font-semibold text-orange-600">Total Outstanding</th>
                    <th className="text-right py-3 px-2 font-semibold text-emerald-600">Cash Close</th>
                    <th className="text-right py-3 px-2 font-semibold text-red-600">Expenses</th>
                    <th className="text-right py-3 px-2 font-semibold text-blue-600">PM Assigned</th>
                    <th className="text-right py-3 px-2 font-semibold text-green-600">PM Used</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummaries.pm.purchases.map((row, idx) => (
                    <tr key={row.monthKey} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 px-2 font-medium text-gray-900 dark:text-white">{row.label}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.pm.purchases[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.pm.payments[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.pm.monthLoans[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.pm.loans[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.accountant.cashClose[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.accountant.expenses[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.accountant.pmAssigned[idx].amount)}</td>
                      <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(monthlySummaries.accountant.pmUsed[idx].amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Revenue Forecasting — derived from cash close, purchases, and headcount */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Revenue Forecasting (Next Quarter)
              </h3>
              {quarterForecast && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {quarterForecast.nextQuarterLabel} outlook vs. {quarterForecast.currentQuarterLabel}
                  {' · '}
                  based on {quarterForecast.dataMonthsUsed} month{quarterForecast.dataMonthsUsed === 1 ? '' : 's'} of cash-close data
                </p>
              )}
            </div>
            {quarterForecast && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  quarterForecast.confidence === 'high'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : quarterForecast.confidence === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {quarterForecast.confidence} confidence
              </span>
            )}
          </div>

          {quarterForecast ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Projected Revenue</p>
                  <p className={`text-xl font-bold ${quarterForecast.revenueGrowthPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatGrowthPct(quarterForecast.revenueGrowthPct)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">vs. current quarter</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {formatCurrency(quarterForecast.projectedNextQuarterRevenue)} projected
                  </p>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Workforce Demand</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatWorkforceHires(quarterForecast.workforceNewHires)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">estimated need</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {quarterForecast.activeEmployeeCount} active staff today
                  </p>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg">
                  <Package className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Inventory Investment</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCompactUgx(quarterForecast.inventoryInvestment)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">recommended stock level</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    scaled from purchase trends
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Revenue growth uses recent month-over-month cash-close trends (or prior quarter comparison when needed).
                Staffing need assumes {quarterForecast.revenueGrowthPct > 0 ? '6%' : '0%'} efficiency gain offset against projected growth.
                Inventory recommendation reflects current-quarter purchasing scaled to the revenue outlook.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Not enough historical data to generate a next-quarter forecast yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}