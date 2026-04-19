'use client';

import { useState, useEffect, useRef } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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


// ─── monthly gross profit ─────────────────────────────────────────────────────

/** Resolve a Firestore Timestamp, Date, or date string to a JS Date. */
function resolveDate(v: unknown): Date {
  if (!v) return new Date(NaN);
  if (v instanceof Date) return v;
  const ts = v as { toDate?: () => Date };
  if (typeof ts.toDate === 'function') return ts.toDate();
  return new Date(v as string);
}

/**
 * Pick the best date from a cash-close doc.
 * Tries cashCloseDate → createdAt → date → businessDate in order.
 */
function bestDate(d: Record<string, unknown>): Date {
  for (const field of ['cashCloseDate', 'createdAt', 'date', 'businessDate']) {
    const dt = resolveDate(d[field]);
    if (!isNaN(dt.getTime())) return dt;
  }
  return new Date(NaN);
}

/**
 * Fetch all cashCloses for the current calendar month (full scan, in-memory date filter).
 * Tries every date field so docs with only createdAt are still counted.
 * Sums profitAmount per close; falls back to totalCashInTill × profitPercentage%.
 */
async function fetchMonthlyGrossTotal(): Promise<{ total: number; closeCount: number }> {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end   = new Date(y, m + 1, 0, 23, 59, 59, 999);

  let allDocs: Record<string, unknown>[] = [];
  try {
    const snap = await getDocs(collection(db, 'cashCloses'));
    allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Record<string, unknown>[];
  } catch (e) {
    console.warn('cashCloses fetch failed:', e);
    return { total: 0, closeCount: 0 };
  }

  const inMonth = allDocs.filter(d => {
    const dt = bestDate(d);
    return !isNaN(dt.getTime()) && dt >= start && dt <= end;
  });

  let total = 0;
  for (const d of inMonth) {
    const pa = Number(d.profitAmount ?? 0);
    if (pa > 0) { total += pa; continue; }
    const base = Number(d.totalCashInTill ?? d.totalRevenue ?? d.closeCash ?? 0) || 0;
    const pct  = Number(d.profitPercentage) || 12;
    if (base > 0) total += base * pct / 100;
  }

  return { total: Math.round(total), closeCount: inMonth.length };
}

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
  const [monthlyGross, setMonthlyGross] = useState<{ total: number; closeCount: number }>({ total: 0, closeCount: 0 });
  const [displayedGross, setDisplayedGross] = useState(0);
  const [grossCardVisible, setGrossCardVisible] = useState(false);
  const grossAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);


  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  useEffect(() => {
    if (monthlyGross.total === 0) return;
    setGrossCardVisible(false);
    setDisplayedGross(0);
    const delay = setTimeout(() => {
      setGrossCardVisible(true);
      const target = monthlyGross.total;
      const duration = 1400;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      let step = 0;
      if (grossAnimRef.current) clearInterval(grossAnimRef.current);
      grossAnimRef.current = setInterval(() => {
        step++;
        current = step >= steps ? target : Math.round(increment * step);
        setDisplayedGross(current);
        if (step >= steps) clearInterval(grossAnimRef.current!);
      }, duration / steps);
    }, 150);
    return () => {
      clearTimeout(delay);
      if (grossAnimRef.current) clearInterval(grossAnimRef.current);
    };
  }, [monthlyGross.total]);


  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('No authenticated user found');

      // Monthly gross: sum profitAmount (or 12% of till total) for this calendar month
      const gross = await fetchMonthlyGrossTotal();
      setMonthlyGross(gross);

      // Other report data
      let cashAllocations: Record<string, unknown>[] = [];
      let expenses:        Record<string, unknown>[] = [];
      let specialFunds:    Record<string, unknown>[] = [];
      try {
        cashAllocations = await AccountantQueries.getCashAllocations();
        expenses        = await AccountantQueries.getExpenseManagement();
        specialFunds    = await AccountantQueries.getSpecialFundsTracker();
      } catch (err) {
        console.warn('Secondary report data failed:', err);
      }

      const totalAllocated    = cashAllocations.reduce((s, a) => s + Number((a as any).cashCloseTotal ?? 0), 0);
      const totalExpenses     = expenses.reduce((s, e)        => s + Number((e as any).amount ?? 0), 0);
      const totalPaid         = expenses.reduce((s, e)        => s + Number((e as any).paidAmount ?? 0), 0);
      const savingsTotal      = cashAllocations.reduce((s, a) => s + Number((a as any).savings ?? 0), 0);
      const specialFundsTotal = specialFunds.reduce((s, f)    => s + Number((f as any).specialFundsBalance ?? 0), 0);

      setReportData({
        summary: { totalAllocated, totalExpenses, totalPaid, pendingPayments: totalExpenses - totalPaid, savingsTotal, specialFundsTotal },
        monthlyTrends:      calculateMonthlyTrends(cashAllocations, expenses),
        expensesByCategory: calculateExpensesByCategory(expenses),
      });

    } catch (err: unknown) {
      console.error('Error loading report data:', err);
      setMonthlyGross({ total: 0, closeCount: 0 });
      setError('Database connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
             <div
               className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6 shadow-sm transition-all duration-700"
               style={{
                 opacity: grossCardVisible ? 1 : 0,
                 transform: grossCardVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.97)',
               }}
             >
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center">
                   <div
                     className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center"
                     style={{ animation: grossCardVisible ? 'grossIconPulse 2s ease-in-out infinite' : 'none' }}
                   >
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

               <div className="mt-2">
                 <div
                   className="text-3xl font-bold text-green-800 mb-1 tabular-nums transition-all duration-150"
                   style={{ letterSpacing: '-0.5px' }}
                 >
                   UGX {displayedGross.toLocaleString()}
                 </div>
                 <p className="text-sm text-green-600">
                   {monthlyGross.closeCount > 0
                     ? `${monthlyGross.closeCount} cash close${monthlyGross.closeCount === 1 ? '' : 's'} this month`
                     : 'No cash closes recorded yet this month'}
                 </p>
               </div>

               <div className="bg-white rounded-lg p-3 border border-green-200 mt-3">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs text-green-600">Monthly Progress</span>
                   <span className="text-xs text-green-600">
                     📅 {new Date().getDate()} days × 12% profit
                   </span>
                 </div>
                 <div className="w-full bg-green-200 rounded-full h-2">
                   <div
                     className="bg-green-600 h-2 rounded-full transition-all duration-1000 ease-out"
                     style={{
                       width: grossCardVisible
                         ? `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%`
                         : '0%',
                     }}
                   />
                 </div>
                 <div className="text-xs text-green-500 mt-1">
                   12% gross profit tracked from each cash close
                 </div>
               </div>

               <style>{`
                 @keyframes grossIconPulse {
                   0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); transform: scale(1); }
                   50% { box-shadow: 0 0 0 8px rgba(22,163,74,0); transform: scale(1.07); }
                 }
               `}</style>
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
                   UGX {(
                     monthlyGross.total + new Date().getDate() * 100000
                   ).toLocaleString()}
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

         </>
       )}
    </div>
  );
} 