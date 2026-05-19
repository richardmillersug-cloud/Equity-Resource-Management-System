'use client';

import { useState, useEffect, useCallback } from 'react';
import { fundingSourceService, MonthlyFundingAssignmentTotals } from '@/lib/firebase/funding-source-service';
import { authService } from '@/lib/firebase/auth';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Plus,
  Wallet,
  Building,
  Info,
} from 'lucide-react';

interface FundBalance {
  id: string;
  fundType: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
  currentBalance: number;
  totalAllocated: number;
  totalSpent: number;
  lastUpdated: Date;
  branchId: string;
  periodKey?: string;
  dailyCollection?: number;
  profitPercentage?: number;
  sourceRevenue?: number;
}

export default function FundBalancesPage() {
  const [dailyFund, setDailyFund] = useState<FundBalance | null>(null);
  const [grossProfit, setGrossProfit] = useState<FundBalance | null>(null);
  const [monthlyAssignments, setMonthlyAssignments] = useState<MonthlyFundingAssignmentTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const monthLabel = new Date().toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
  const periodKey = fundingSourceService.getPeriodKey(new Date());

  const loadFundBalances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = authService.getCurrentUser();
      const bid = currentUser?.employee?.branchId ?? 'kyengera';

      const [{ dailyFund: d, grossProfit: g }, monthly] = await Promise.all([
        fundingSourceService.getFundBalances(bid),
        fundingSourceService.getMonthlyFundingAssignmentTotals(bid),
      ]);

      setDailyFund(d as FundBalance | null);
      setGrossProfit(g as FundBalance | null);
      setMonthlyAssignments(monthly);

      if (!d && !g) {
        setError('Fund balances not found. Click "Initialize Fund Balances" to create rows for this month.');
      }
    } catch (err: any) {
      console.error('Error loading fund balances:', err);
      setError(`Failed to load fund balances: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFundBalances();
    const unsub = authService.onAuthStateChange(() => {
      loadFundBalances();
    });
    return unsub;
  }, [loadFundBalances]);

  const initializeFundBalances = async () => {
    try {
      setInitializing(true);
      setError(null);
      setSuccess(null);
      
      const currentUser = authService.getCurrentUser();
      const bid = currentUser?.employee?.branchId ?? 'kyengera';

      await fundingSourceService.initializeFundBalances(bid);

      setSuccess(
        `Fund balances for ${monthLabel} (${periodKey}) are ready. Daily Expense Fund starts at UGX 100,000 where a new row was created.`
      );
      
      // Reload balances
      await loadFundBalances();
    } catch (err: any) {
      console.error('Error initializing fund balances:', err);
      setError(`Failed to initialize fund balances: ${err.message}`);
    } finally {
      setInitializing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading Fund Balances</p>
          <p className="text-sm text-gray-400">Fetching fund allocation data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-8 space-y-8">
        
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-700 opacity-90"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Fund Balances
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Current month: {monthLabel} ({periodKey}) — balances and payment totals are scoped to this period.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={loadFundBalances}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh</span>
                </button>
                {(!dailyFund && !grossProfit) && (
                  <button
                    onClick={initializeFundBalances}
                    disabled={initializing}
                    className="bg-green-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-green-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {initializing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Initialize Fund Balances</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {monthlyAssignments && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">This month — recorded at payment time</h3>
            <p className="text-sm text-gray-600 mb-4">
              Amounts assigned to each fund when processing expense payments ({monthlyAssignments.assignmentCount}{' '}
              assignment{monthlyAssignments.assignmentCount === 1 ? '' : 's'} this month).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-blue-800 font-medium">Daily expense fund</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(monthlyAssignments.dailyFundSpent)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-emerald-800 font-medium">Wallet gross profit</p>
                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(monthlyAssignments.grossProfitSpent)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-gray-700 font-medium">Total assigned</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyAssignments.totalSpent)}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800">Success</h3>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fund Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Daily Expense Fund */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Daily Expense Fund</h2>
                  <p className="text-gray-500 text-sm">Fixed daily collection for operations</p>
                </div>
              </div>
            </div>
            
            {dailyFund ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className={`font-bold ${dailyFund.currentBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dailyFund.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Collection:</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(dailyFund.dailyCollection || 100000)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Allocated:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(dailyFund.totalAllocated)}
                  </span>
                </div>
                {monthlyAssignments && (
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
                    <span className="text-gray-600">Paid this month (tracked):</span>
                    <span className="font-medium text-blue-700">
                      {formatCurrency(monthlyAssignments.dailyFundSpent)}
                    </span>
                  </div>
                )}
                {dailyFund.periodKey && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Balance row period</span>
                    <span className="font-mono">{dailyFund.periodKey}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="text-sm text-gray-500">
                    {dailyFund.lastUpdated ? 
                      (dailyFund.lastUpdated instanceof Date ? 
                        dailyFund.lastUpdated.toLocaleDateString() : 
                        new Date(dailyFund.lastUpdated).toLocaleDateString()
                      ) : 'Never'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Daily Expense Fund not initialized</p>
              </div>
            )}
          </div>

          {/* Gross Profit Fund */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Wallet Gross Profit</h2>
                  <p className="text-gray-500 text-sm">Business profit allocation (12%)</p>
                </div>
              </div>
            </div>
            
            {grossProfit ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className={`font-bold ${grossProfit.currentBalance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatCurrency(grossProfit.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Percentage:</span>
                  <span className="font-medium text-green-600">
                    {grossProfit.profitPercentage || 12}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Allocated:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(grossProfit.totalAllocated)}
                  </span>
                </div>
                {monthlyAssignments && (
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
                    <span className="text-gray-600">Paid this month (tracked):</span>
                    <span className="font-medium text-emerald-700">
                      {formatCurrency(monthlyAssignments.grossProfitSpent)}
                    </span>
                  </div>
                )}
                {grossProfit.periodKey && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Balance row period</span>
                    <span className="font-mono">{grossProfit.periodKey}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Source Revenue:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(grossProfit.sourceRevenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="text-sm text-gray-500">
                    {grossProfit.lastUpdated ? 
                      (grossProfit.lastUpdated instanceof Date ? 
                        grossProfit.lastUpdated.toLocaleDateString() : 
                        new Date(grossProfit.lastUpdated).toLocaleDateString()
                      ) : 'Never'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Gross Profit Fund not initialized</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment-time fund guidance */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Payment-Time Fund Assignment</h3>
          <div className="mb-6 p-4 bg-blue-100 rounded-xl flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-semibold text-blue-900">New logic</p>
              <p>
                Funding sources are now assigned only when making payments. No pre-allocation is required -
                simply select the appropriate fund during payment processing.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="rounded-xl bg-white/60 border border-blue-100/80 p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" aria-hidden />
                Daily Expense Fund
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-blue-800">
                <li>Regular operational expenses</li>
                <li>Routine maintenance costs</li>
                <li>Daily supplier payments</li>
                <li>Small emergency expenses (under 50K)</li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/60 border border-blue-100/80 p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" aria-hidden />
                Wallet Gross Profit
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-blue-800">
                <li>Larger investments (over 50K)</li>
                <li>Strategic business expenses</li>
                <li>Equipment purchases</li>
                <li>Business development costs</li>
              </ul>
            </div>
          </div>
        </div>

    </div>
  );
}



