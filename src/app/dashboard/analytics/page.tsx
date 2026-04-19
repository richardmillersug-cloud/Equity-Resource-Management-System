'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart as PieChartIcon,
  BarChart3,
  LineChart,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Send,
  Landmark
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
  ArcElement,
  BarElement,
  Filler
} from 'chart.js';
import { Line as ChartJsLine, Bar as ChartJsBar, Doughnut } from 'react-chartjs-2';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  PieChart as RechartsPieChart,
  Cell,
  Pie as RechartsPie,
  Line as RechartsLine
} from 'recharts';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
import { SimpleExpensesService } from '@/lib/firebase/expenses-service-simple';
// Auto-allocation service removed per user request
import { authService } from '@/lib/firebase/auth';
import { DataVerificationUtility, DataAvailabilityReport } from '@/lib/firebase/data-verification-utility';
import DataAvailabilityReportPanel from '@/components/analytics/DataAvailabilityReportPanel';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

function formatCurrencyUgx(value: number): string {
  return `UGX ${Math.round(value).toLocaleString()}`;
}

function expenseItemDate(e: any): Date {
  if (e?.expenseDate instanceof Date) return e.expenseDate;
  if (e?.expenseDate?.seconds) return new Date(e.expenseDate.seconds * 1000);
  if (typeof e?.expenseDate === 'string' && e.expenseDate.trim()) {
    const t = new Date(e.expenseDate);
    if (!Number.isNaN(t.getTime())) return t;
  }
  if (e?.createdAt?.seconds) return new Date(e.createdAt.seconds * 1000);
  if (e?.createdAt instanceof Date) return e.createdAt;
  return new Date(0);
}

/** Prefer business close date, then Firestore-style timestamps, then legacy `date`. */
function getCashCloseSortDate(item: any): Date {
  if (item?.cashCloseDate instanceof Date) return item.cashCloseDate;
  if (item?.cashCloseDate?.seconds != null) return new Date(item.cashCloseDate.seconds * 1000);
  if (typeof item?.cashCloseDate === 'string' && item.cashCloseDate.trim()) {
    const t = new Date(item.cashCloseDate);
    if (!Number.isNaN(t.getTime())) return t;
  }
  if (item?.createdAt instanceof Date) return item.createdAt;
  if (item?.createdAt?.seconds != null) return new Date(item.createdAt.seconds * 1000);
  if (item?.date) return new Date(item.date);
  return new Date(0);
}

/** Revenue for forecasting / rollups when `totalRevenue` is missing on normalized closes */
function getCloseRevenue(close: any): number {
  const tr = Number(close?.totalRevenue);
  if (Number.isFinite(tr) && tr > 0) return tr;
  const till = Number(close?.totalCashInTill);
  if (Number.isFinite(till) && till > 0) return till;
  if (Number.isFinite(tr)) return tr;
  return 0;
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localMonthKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Analysis bounds for a calendar year, optionally narrowed by rolling week/month/quarter from the end of that slice.
 * Current calendar year ends at end-of-today; past years use full Dec 31.
 */
function getAnalysisWindow(
  selectedYear: number,
  timeRange: 'week' | 'month' | 'quarter' | 'year',
  now = new Date()
): { start: Date; end: Date } {
  const cy = now.getFullYear();
  const yearStart = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  let periodEnd: Date;
  if (selectedYear > cy) {
    periodEnd = yearEnd;
  } else if (selectedYear < cy) {
    periodEnd = yearEnd;
  } else {
    periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }
  if (periodEnd > yearEnd) periodEnd = yearEnd;

  let periodStart: Date;
  if (timeRange === 'year') {
    periodStart = yearStart;
  } else {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const rollStart = new Date(periodEnd.getTime() - days * MS_DAY);
    periodStart = rollStart > yearStart ? rollStart : yearStart;
  }

  if (periodStart > periodEnd) {
    periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 0, 0, 0, 0);
  }

  return { start: periodStart, end: periodEnd };
}

function dateInWindow(d: Date, win: { start: Date; end: Date }): boolean {
  if (Number.isNaN(d.getTime())) return false;
  const t = d.getTime();
  return t >= win.start.getTime() && t <= win.end.getTime();
}

function filterCashClosesForWindow(data: any[], win: { start: Date; end: Date }): any[] {
  return data
    .filter((item) => dateInWindow(getCashCloseSortDate(item), win))
    .sort((a, b) => getCashCloseSortDate(a).getTime() - getCashCloseSortDate(b).getTime());
}

/** One bucket per calendar day in the window (local dates) for PM-style daily charts */
function buildDailyAccountsSeries(
  closes: any[],
  expenses: any[],
  window: { start: Date; end: Date }
): {
  labels: string[];
  revenue: number[];
  profit: number[];
  tax: number[];
  expenseAmounts: number[];
} {
  const startDay = startOfDayLocal(window.start);
  const endDay = startOfDayLocal(window.end);
  const keys: string[] = [];
  const labels: string[] = [];
  const cursor = new Date(startDay.getTime());
  while (cursor.getTime() <= endDay.getTime()) {
    keys.push(localDateKey(cursor));
    labels.push(`${cursor.getMonth() + 1}/${cursor.getDate()}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  if (keys.length === 0) {
    return { labels: [], revenue: [], profit: [], tax: [], expenseAmounts: [] };
  }
  const keyToIndex = new Map(keys.map((k, i) => [k, i]));
  const revenue = keys.map(() => 0);
  const profit = keys.map(() => 0);
  const tax = keys.map(() => 0);
  const expenseAmounts = keys.map(() => 0);

  closes.forEach((close) => {
    const dt = getCashCloseSortDate(close);
    if (Number.isNaN(dt.getTime())) return;
    const key = localDateKey(dt);
    const idx = keyToIndex.get(key);
    if (idx === undefined) return;
    revenue[idx] += Number(close.totalRevenue) || 0;
    profit[idx] += Number(close.profitAmount) || 0;
    tax[idx] += Number(close.taxAmount) || 0;
  });

  expenses.forEach((e) => {
    const dt = expenseItemDate(e);
    if (Number.isNaN(dt.getTime())) return;
    const key = localDateKey(dt);
    const idx = keyToIndex.get(key);
    if (idx === undefined) return;
    expenseAmounts[idx] += Number(e.amount) || 0;
  });

  return { labels, revenue, profit, tax, expenseAmounts };
}

/** One bucket per calendar month overlapping the analysis window (local month boundaries) */
function buildMonthlyAccountsSeries(
  closes: any[],
  expenses: any[],
  window: { start: Date; end: Date }
): {
  labels: string[];
  revenue: number[];
  profit: number[];
  tax: number[];
  expenseAmounts: number[];
} {
  const startMonth = new Date(window.start.getFullYear(), window.start.getMonth(), 1);
  const endMonth = new Date(window.end.getFullYear(), window.end.getMonth(), 1);
  const keys: string[] = [];
  const labels: string[] = [];
  const cur = new Date(startMonth.getTime());
  while (cur.getTime() <= endMonth.getTime()) {
    keys.push(localMonthKey(cur));
    labels.push(cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    cur.setMonth(cur.getMonth() + 1);
  }
  if (keys.length === 0) {
    return { labels: [], revenue: [], profit: [], tax: [], expenseAmounts: [] };
  }
  const keyToIndex = new Map(keys.map((k, i) => [k, i]));
  const revenue = keys.map(() => 0);
  const profit = keys.map(() => 0);
  const tax = keys.map(() => 0);
  const expenseAmounts = keys.map(() => 0);

  closes.forEach((close) => {
    const dt = getCashCloseSortDate(close);
    if (Number.isNaN(dt.getTime())) return;
    const key = localMonthKey(dt);
    const idx = keyToIndex.get(key);
    if (idx === undefined) return;
    revenue[idx] += Number(close.totalRevenue) || 0;
    profit[idx] += Number(close.profitAmount) || 0;
    tax[idx] += Number(close.taxAmount) || 0;
  });

  expenses.forEach((e) => {
    const dt = expenseItemDate(e);
    if (Number.isNaN(dt.getTime())) return;
    const key = localMonthKey(dt);
    const idx = keyToIndex.get(key);
    if (idx === undefined) return;
    expenseAmounts[idx] += Number(e.amount) || 0;
  });

  return { labels, revenue, profit, tax, expenseAmounts };
}

interface AnalyticsData {
  cashCloses: any[];
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  expenses: any[];
}

interface KPIMetric {
  title: string;
  value: string;
  change: number;
  changeText: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface PredictionData {
  date: string;
  predicted: number;
  actual?: number;
  confidence: number;
}

/** Next 7 calendar days from today; moving average of recent close revenue with mild trend. Always 7 rows. */
function generateSalesPredictions(cashCloses: any[]): PredictionData[] {
  const revenues = cashCloses.map((c) => getCloseRevenue(c));
  const n = revenues.length;
  const predictions: PredictionData[] = [];

  let average = 0;
  if (n > 0) {
    const lookback = Math.min(5, n);
    const recent = revenues.slice(-lookback);
    average = recent.reduce((sum, rev) => sum + rev, 0) / lookback;
  }

  let trendFactor = 1;
  if (n >= 2) {
    const prev = revenues[n - 2];
    const last = revenues[n - 1];
    if (prev !== 0 && Number.isFinite(prev) && Number.isFinite(last)) {
      const recentTrend = last / prev;
      trendFactor = Math.min(Math.max(recentTrend * 0.1 + 0.9, 0.8), 1.2);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const predicted = Math.round(average * trendFactor);

    let confidence = Math.max(28, 68 - i * 5);
    if (n === 0) confidence = Math.max(5, 20 - i * 2);
    else if (n === 1) confidence = Math.max(12, 40 - i * 4);
    else if (n === 2) confidence = Math.max(18, 50 - i * 4);
    else if (n < 5) confidence = Math.max(24, confidence - 8);

    predictions.push({
      date: d.toISOString().split('T')[0],
      predicted,
      confidence,
    });
  }

  return predictions;
}

type SalesPredictionChartRow = {
  date: string;
  revenue?: number;
  predicted?: number;
  confidence?: number;
};

/**
 * Actuals: each calendar day from the 1st through today in the **current** month (local), from all loaded closes.
 * Then forecast points: next 7 days (from `predictions`) so the line continues without duplicating in-month future days.
 */
function buildSalesPredictionChartData(
  allCloses: any[],
  predictions: PredictionData[],
  now = new Date()
): SalesPredictionChartRow[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayDay = now.getDate();

  const byKey = new Map<string, number>();
  allCloses.forEach((close) => {
    const dt = getCashCloseSortDate(close);
    if (Number.isNaN(dt.getTime())) return;
    if (dt.getFullYear() !== y || dt.getMonth() !== m) return;
    if (dt.getDate() > todayDay) return;
    const k = localDateKey(dt);
    byKey.set(k, (byKey.get(k) || 0) + getCloseRevenue(close));
  });

  const rows: SalesPredictionChartRow[] = [];
  for (let d = 1; d <= todayDay; d++) {
    const day = new Date(y, m, d);
    const k = localDateKey(day);
    rows.push({
      date: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: byKey.get(k) ?? 0,
    });
  }

  predictions.forEach((p) => {
    const dt = new Date(`${p.date}T12:00:00`);
    rows.push({
      date: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      predicted: p.predicted,
      confidence: p.confidence,
    });
  });

  return rows;
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    cashCloses: [],
    timeRange: 'year',
    expenses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('year');
  const [dataReport, setDataReport] = useState<DataAvailabilityReport | null>(null);
  /** Full cash-close list for prediction chart (current calendar month actuals), independent of year/period filter */
  const [allCashClosesSnapshot, setAllCashClosesSnapshot] = useState<any[]>([]);

  const yearOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    return Array.from({ length: 26 }, (_, i) => cy - i);
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange, selectedYear]);

  const loadDataReport = async (): Promise<DataAvailabilityReport | null> => {
    try {
      console.log('🔍 Loading data verification report...');
      const report = await DataVerificationUtility.generateDataAvailabilityReport();
      setDataReport(report);
      console.log('📊 Data report loaded:', report);
      return report;
    } catch (error) {
      console.error('❌ Failed to load data report:', error);
      return null;
    }
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Loading real analytics data from database...');
      
      // ✅ SAME PATTERN as other working pages - get user inside the function
      const authenticatedUser = authService.getCurrentUser();
      
      if (!authenticatedUser) {
        console.log('❌ No authenticated user found');
        setError('Please log in to access the Analytics Dashboard');
        setAllCashClosesSnapshot([]);
        setLoading(false);
        return;
      }
      
      console.log('👤 User authenticated:', {
        uid: authenticatedUser.uid,
        roles: authenticatedUser.employee?.roles?.map((r) => r.jobTitle) ?? [],
      });
      
      // Set the current user state for other components
      setCurrentUser(authenticatedUser);
      
      const availabilityReport = await loadDataReport();
      
      // Load cash closes data with enhanced error handling
      let cashClosesData: any[] = [];
      let dataSource = 'unknown';
      
      try {
        console.log('🔄 Attempting to load cash closes with SimpleCashCloseService...');
        const simpleCashCloseService = new SimpleCashCloseService();
        cashClosesData = await simpleCashCloseService.getAllCashClosesSimple();
        dataSource = 'SimpleCashCloseService';
        console.log('✅ Cash closes loaded via SimpleCashCloseService:', cashClosesData?.length || 0);
        
        if (cashClosesData.length === 0) {
          console.log('⚠️ No cash closes found, this might indicate:');
          console.log('   - No data in cashCloses collection');
          console.log('   - Firestore permissions issues');
          console.log('   - Missing composite indexes');
        }
        
      } catch (simpleError) {
        console.warn('⚠️ SimpleCashCloseService failed:', simpleError);
        console.log('🔄 Falling back to regular CashCloseService...');
        
        try {
          const cashCloseService = new CashCloseService();
          cashClosesData = await cashCloseService.getAll([]);
          dataSource = 'CashCloseService';
          console.log('✅ Cash closes loaded via CashCloseService:', cashClosesData?.length || 0);
        } catch (regularError: unknown) {
          console.error('❌ Both services failed:', { simpleError, regularError });
          const msg = regularError instanceof Error ? regularError.message : String(regularError);
          throw new Error(`Failed to load cash closes: ${msg}`);
        }
      }

      // Log sample of loaded data for verification
      if (cashClosesData.length > 0) {
        console.log('📋 Sample cash close record:', {
          id: cashClosesData[0].id,
          date: cashClosesData[0].date || 'No date',
          totalRevenue: cashClosesData[0].totalRevenue || 0,
          profitAmount: cashClosesData[0].profitAmount || 0,
          createdAt: cashClosesData[0].createdAt ? 'Has timestamp' : 'No timestamp',
          source: dataSource
        });
      }

      setAllCashClosesSnapshot(cashClosesData);

      const analysisWindow = getAnalysisWindow(selectedYear, selectedTimeRange);
      const filteredCashCloses = filterCashClosesForWindow(cashClosesData, analysisWindow);
      console.log(`📅 Filtered to ${selectedYear} · ${selectedTimeRange}:`, {
        original: cashClosesData.length,
        filtered: filteredCashCloses.length,
        windowStart: analysisWindow.start.toISOString(),
        windowEnd: analysisWindow.end.toISOString(),
      });
      
      // Allocation loading removed per user request

      let filteredExpenses: any[] = [];
      try {
        const expenseSvc = new SimpleExpensesService();
        const allExpenses = await expenseSvc.getAllExpensesSimple();
        filteredExpenses = allExpenses.filter((e) => {
          const dt = expenseItemDate(e);
          return !Number.isNaN(dt.getTime()) && dateInWindow(dt, analysisWindow);
        });
        console.log('✅ Expenses for analytics period:', filteredExpenses.length);
      } catch (expErr) {
        console.warn('⚠️ Could not load expenses for charts:', expErr);
      }

      setAnalyticsData({
        cashCloses: filteredCashCloses,
        timeRange: selectedTimeRange,
        expenses: filteredExpenses,
      });

      console.log('✅ Real database analytics data loaded successfully:', {
        cashCloses: filteredCashCloses.length,
        dataSource,
        timeRange: selectedTimeRange,
        year: selectedYear,
        reportExpenses: availabilityReport?.collections.expenses.count ?? 0,
      });

    } catch (err: any) {
      console.error('❌ Failed to load real analytics data:', err);
      setError(`Database connection failed: ${err.message}`);
      setAllCashClosesSnapshot([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPIMetric[] => {
    const { cashCloses } = analyticsData;
    const exp = dataReport?.collections.expenses;
    const spec = dataReport?.collections.specialFunds;
    const alloc = dataReport?.collections.allocations;

    const expenseTotal = exp?.available ? exp.totalExpenses : 0;
    const expensePaid = exp?.available ? exp.totalPaid : 0;
    const expenseRemaining = exp?.available ? exp.totalRemaining : 0;
    const fundBalance = spec?.available ? spec.totalBalance : 0;
    const pmTotal = alloc?.available ? alloc.totalPMAllocated : 0;
    const pmCount = alloc?.available ? alloc.count : 0;
    const pmAllocated = alloc?.available ? alloc.allocationStats.allocated : 0;
    const allocationRate =
      alloc?.available && pmCount > 0 ? (pmAllocated / pmCount) * 100 : 0;

    if (!cashCloses.length) {
      return [
        {
          title: 'Total Revenue',
          value: 'UGX 0',
          change: 0,
          changeText: 'No cash closes in range',
          icon: <DollarSign className="h-6 w-6" />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        },
        {
          title: 'Gross Profit',
          value: 'UGX 0',
          change: 0,
          changeText: 'No cash closes in range',
          icon: <TrendingUp className="h-6 w-6" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        },
        {
          title: 'Expenses (tracked)',
          value: `UGX ${expenseTotal.toLocaleString()}`,
          change: 0,
          changeText: exp?.available
            ? `${exp.count} records · UGX ${expensePaid.toLocaleString()} paid`
            : 'No expense data',
          icon: <Receipt className="h-6 w-6" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
        },
        {
          title: alloc?.available ? 'PM allocation rate' : 'Daily expense funds',
          value: alloc?.available && pmCount > 0 ? `${allocationRate.toFixed(0)}%` : `UGX ${fundBalance.toLocaleString()}`,
          change: 0,
          changeText: alloc?.available
            ? `${pmAllocated}/${pmCount} allocated · UGX ${pmTotal.toLocaleString()}`
            : spec?.available
              ? `${spec.count} fund record(s)`
              : 'No fund / allocation summary',
          icon: alloc?.available ? <Send className="h-6 w-6" /> : <Wallet className="h-6 w-6" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
        },
      ];
    }

    const totalRevenue = cashCloses.reduce((sum, close) => sum + (close.totalRevenue || 0), 0);
    const totalProfit = cashCloses.reduce((sum, close) => sum + (close.profitAmount || 0), 0);

    const midPoint = Math.floor(cashCloses.length / 2);
    const firstHalf = cashCloses.slice(0, midPoint);
    const secondHalf = cashCloses.slice(midPoint);

    const firstHalfRevenue = firstHalf.reduce((sum, close) => sum + (close.totalRevenue || 0), 0);
    const secondHalfRevenue = secondHalf.reduce((sum, close) => sum + (close.totalRevenue || 0), 0);
    const revenueChange =
      firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

    const firstHalfProfit = firstHalf.reduce((sum, close) => sum + (close.profitAmount || 0), 0);
    const secondHalfProfit = secondHalf.reduce((sum, close) => sum + (close.profitAmount || 0), 0);
    const profitChange =
      firstHalfProfit > 0 ? ((secondHalfProfit - firstHalfProfit) / firstHalfProfit) * 100 : 0;

    return [
      {
        title: 'Total Revenue',
        value: `UGX ${totalRevenue.toLocaleString()}`,
        change: revenueChange,
        changeText: `${Math.abs(revenueChange).toFixed(1)}% vs previous period`,
        icon: <DollarSign className="h-6 w-6" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      {
        title: 'Gross Profit',
        value: `UGX ${totalProfit.toLocaleString()}`,
        change: profitChange,
        changeText: `${Math.abs(profitChange).toFixed(1)}% vs previous period`,
        icon: <TrendingUp className="h-6 w-6" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      },
      {
        title: 'Expenses (tracked)',
        value: `UGX ${expenseTotal.toLocaleString()}`,
        change: 0,
        changeText: exp?.available
          ? `${exp.count} records · UGX ${expenseRemaining.toLocaleString()} remaining`
          : 'Expense feed unavailable',
        icon: <Receipt className="h-6 w-6" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
      },
      {
        title: alloc?.available ? 'PM allocation rate' : 'Daily expense funds',
        value: alloc?.available && pmCount > 0 ? `${allocationRate.toFixed(0)}%` : `UGX ${fundBalance.toLocaleString()}`,
        change: allocationRate >= 80 ? 5 : -5,
        changeText: alloc?.available
          ? `UGX ${pmTotal.toLocaleString()} across ${pmCount} shift(s)`
          : spec?.available
            ? `${spec.count} fund record(s)`
            : 'No fund / allocation summary',
        icon: alloc?.available ? <Send className="h-6 w-6" /> : <Wallet className="h-6 w-6" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
      },
    ];
  };

  const analysisWindow = useMemo(
    () => getAnalysisWindow(selectedYear, selectedTimeRange),
    [selectedYear, selectedTimeRange]
  );

  const analysisDayCount = useMemo(() => {
    const a = startOfDayLocal(analysisWindow.start);
    const b = startOfDayLocal(analysisWindow.end);
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / MS_DAY) + 1);
  }, [analysisWindow]);

  const periodDescription = useMemo(() => {
    const cy = new Date().getFullYear();
    if (selectedTimeRange === 'year') {
      if (selectedYear < cy) return `Full calendar ${selectedYear}`;
      if (selectedYear > cy) return `Full calendar ${selectedYear} (future)`;
      return `${selectedYear} (Jan 1 – today)`;
    }
    const n = selectedTimeRange === 'week' ? 7 : selectedTimeRange === 'month' ? 30 : 90;
    return `Last ${n} days within ${selectedYear}`;
  }, [selectedYear, selectedTimeRange]);

  /** Wider windows use calendar-month buckets so line/bar charts stay readable */
  const useMonthlyChartBuckets = useMemo(() => analysisDayCount > 31, [analysisDayCount]);

  const accountsChartSeries = useMemo(() => {
    if (useMonthlyChartBuckets) {
      const s = buildMonthlyAccountsSeries(
        analyticsData.cashCloses,
        analyticsData.expenses,
        analysisWindow
      );
      return { granularity: 'month' as const, ...s };
    }
    const s = buildDailyAccountsSeries(
      analyticsData.cashCloses,
      analyticsData.expenses,
      analysisWindow
    );
    return { granularity: 'day' as const, ...s };
  }, [useMonthlyChartBuckets, analyticsData.cashCloses, analyticsData.expenses, analysisWindow]);

  const revenueData = useMemo(() => {
    const { cashCloses } = analyticsData;
    if (accountsChartSeries.granularity === 'month') {
      return accountsChartSeries.labels.map((label, i) => ({
        date: label,
        revenue: accountsChartSeries.revenue[i] ?? 0,
        profit: accountsChartSeries.profit[i] ?? 0,
        tax: accountsChartSeries.tax[i] ?? 0,
      }));
    }
    return cashCloses.map((close) => ({
      date: getCashCloseSortDate(close).toLocaleDateString(),
      revenue: close.totalRevenue || 0,
      profit: close.profitAmount || 0,
      tax: close.taxAmount || 0,
    }));
  }, [analyticsData.cashCloses, accountsChartSeries]);

  const expenseData = useMemo(() => {
    const { cashCloses } = analyticsData;
    const totalRevenue = cashCloses.reduce((sum, close) => sum + (close.totalRevenue || 0), 0);
    const totalProfit = cashCloses.reduce((sum, close) => sum + (close.profitAmount || 0), 0);
    const totalExpenses = totalRevenue - totalProfit;
    return [
      { name: 'Gross Profit', value: totalProfit, color: '#10B981' },
      { name: 'Operating Expenses', value: totalExpenses, color: '#3B82F6' },
      { name: 'Revenue', value: totalRevenue, color: '#8B5CF6' },
    ];
  }, [analyticsData.cashCloses]);

  const profitData = useMemo(() => {
    const { cashCloses } = analyticsData;
    if (accountsChartSeries.granularity === 'month') {
      return accountsChartSeries.labels.map((label, i) => ({
        period: label,
        revenue: accountsChartSeries.revenue[i] ?? 0,
        profit: accountsChartSeries.profit[i] ?? 0,
        expenses: (accountsChartSeries.revenue[i] ?? 0) - (accountsChartSeries.profit[i] ?? 0),
      }));
    }
    const byDay = new Map<
      string,
      { period: string; revenue: number; profit: number; expenses: number }
    >();
    cashCloses.forEach((close) => {
      const date = getCashCloseSortDate(close);
      const key = localDateKey(date);
      if (!key) return;
      const period = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!byDay.has(key)) {
        byDay.set(key, { period, revenue: 0, profit: 0, expenses: 0 });
      }
      const row = byDay.get(key)!;
      const rev = Number(close.totalRevenue) || 0;
      const prof = Number(close.profitAmount) || 0;
      row.revenue += rev;
      row.profit += prof;
      row.expenses += rev - prof;
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);
  }, [analyticsData.cashCloses, accountsChartSeries]);

  const predictions = useMemo(
    () => generateSalesPredictions(analyticsData.cashCloses),
    [analyticsData.cashCloses]
  );

  const predictionAvgConfidence = useMemo(() => {
    if (!predictions.length) return 0;
    return Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length);
  }, [predictions]);

  const salesPredictionChartData = useMemo(
    () => buildSalesPredictionChartData(allCashClosesSnapshot, predictions),
    [allCashClosesSnapshot, predictions]
  );

  const kpis = calculateKPIs();

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  const lineCurveTension = accountsChartSeries.granularity === 'month' ? 0.25 : 0.35;

  const accountsTrendLineData = useMemo(
    () => ({
      labels: accountsChartSeries.labels,
      datasets: [
        {
          label: 'Revenue (cash closes)',
          data: accountsChartSeries.revenue,
          backgroundColor: 'rgba(16, 185, 129, 0.22)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 3,
          fill: true,
          tension: lineCurveTension,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: accountsChartSeries.granularity === 'month' ? 5 : 4,
        },
        {
          label: 'Gross profit',
          data: accountsChartSeries.profit,
          backgroundColor: 'rgba(59, 130, 246, 0.22)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          fill: true,
          tension: lineCurveTension,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: accountsChartSeries.granularity === 'month' ? 5 : 4,
        },
        {
          label: 'Tax (cash closes)',
          data: accountsChartSeries.tax,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 2,
          fill: true,
          tension: lineCurveTension,
          pointRadius: accountsChartSeries.granularity === 'month' ? 4 : 3,
        },
        {
          label: 'Expenses booked',
          data: accountsChartSeries.expenseAmounts,
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 3,
          fill: true,
          tension: lineCurveTension,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: accountsChartSeries.granularity === 'month' ? 5 : 4,
        },
      ],
    }),
    [accountsChartSeries, lineCurveTension]
  );

  const accountsFlowBarData = useMemo(
    () => ({
      labels: accountsChartSeries.labels,
      datasets: [
        {
          label: 'Revenue',
          data: accountsChartSeries.revenue,
          backgroundColor: 'rgba(16, 185, 129, 0.88)',
          borderColor: 'rgba(5, 150, 105, 1)',
          borderWidth: 1,
        },
        {
          label: 'Gross profit',
          data: accountsChartSeries.profit,
          backgroundColor: 'rgba(59, 130, 246, 0.88)',
          borderColor: 'rgba(30, 64, 175, 1)',
          borderWidth: 1,
        },
        {
          label: 'Expenses',
          data: accountsChartSeries.expenseAmounts,
          backgroundColor: 'rgba(239, 68, 68, 0.88)',
          borderColor: 'rgba(185, 28, 28, 1)',
          borderWidth: 1,
        },
      ],
    }),
    [accountsChartSeries]
  );

  const revenueCompositionDoughnut = useMemo(() => {
    const { cashCloses } = analyticsData;
    const totalRevenue = cashCloses.reduce((s, c) => s + (Number(c.totalRevenue) || 0), 0);
    const totalProfit = cashCloses.reduce((s, c) => s + (Number(c.profitAmount) || 0), 0);
    const totalTax = cashCloses.reduce((s, c) => s + (Number(c.taxAmount) || 0), 0);
    const other = Math.max(0, totalRevenue - totalProfit - totalTax);
    const parts = [
      { label: 'Gross profit', value: totalProfit, color: '#10B981' },
      { label: 'Tax', value: totalTax, color: '#8B5CF6' },
      { label: 'Other / costs (from close)', value: other, color: '#3B82F6' },
    ].filter((p) => p.value > 0);
    if (parts.length === 0) {
      return {
        labels: ['No cash-close totals'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#E5E7EB'],
            borderColor: '#fff',
            borderWidth: 2,
          },
        ],
      };
    }
    return {
      labels: parts.map((p) => p.label),
      datasets: [
        {
          data: parts.map((p) => p.value),
          backgroundColor: parts.map((p) => p.color),
          borderColor: '#fff',
          borderWidth: 3,
        },
      ],
    };
  }, [analyticsData.cashCloses]);

  const expenseCategoryDoughnut = useMemo(() => {
    const map = new Map<string, number>();
    analyticsData.expenses.forEach((e) => {
      const cat = String(e.category || e.expenseType || e.type || 'General');
      map.set(cat, (map.get(cat) || 0) + (Number(e.amount) || 0));
    });
    const palette = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899'];
    if (map.size === 0) {
      return {
        labels: ['No expenses in range'],
        datasets: [{ data: [1], backgroundColor: ['#E5E7EB'], borderColor: '#fff', borderWidth: 2 }],
      };
    }
    const labels = Array.from(map.keys());
    const data = Array.from(map.values());
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };
  }, [analyticsData.expenses]);

  const accountsChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false as const,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 16,
            font: { size: 11, weight: 'bold' as const },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(5, 150, 105, 0.5)',
          borderWidth: 1,
          cornerRadius: 12,
          callbacks: {
            label(ctx: { dataset: { label?: string }; parsed: number | { y: number } }) {
              const y =
                typeof ctx.parsed === 'number' ? ctx.parsed : (ctx.parsed as { y: number }).y;
              return `${ctx.dataset.label ?? ''}: ${formatCurrencyUgx(y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { weight: 'normal' as const },
            maxRotation: accountsChartSeries.granularity === 'month' ? 35 : 45,
            minRotation: 0,
          },
        },
        y: {
          grid: { color: 'rgba(0, 0, 0, 0.08)', drawBorder: false },
          ticks: {
            font: { weight: 'normal' as const },
            callback: (tickValue: string | number) =>
              `${(Number(tickValue) / 1_000_000).toFixed(1)}M`,
          },
        },
      },
      datasets: {
        bar: {
          maxBarThickness: accountsChartSeries.granularity === 'month' ? 56 : 32,
        },
      },
    }),
    [accountsChartSeries.granularity]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '52%',
      plugins: {
        legend: { position: 'right' as const, labels: { usePointStyle: true, padding: 12 } },
        tooltip: {
          callbacks: {
            label(ctx: { parsed: number | { x: number; y: number }; dataset: { data: unknown[] } }) {
              const v =
                typeof ctx.parsed === 'number' ? ctx.parsed : (ctx.parsed as { x: number }).x;
              const arr = ctx.dataset.data as number[];
              const total = arr.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
              return `${formatCurrencyUgx(v)} (${pct}%)`;
            },
          },
        },
      },
    }),
    []
  );

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
          <p className="text-lg font-semibold text-gray-700">Loading Analytics</p>
          <p className="text-sm text-gray-400">Fetching cash closes and allocation records…</p>
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
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">Business Intelligence</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-blue-200 mt-1 text-sm">Predictive analytics and real-time performance insights</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
              <span className="text-xs font-medium text-blue-100 whitespace-nowrap">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="text-gray-900 bg-white">{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
              <span className="text-xs font-medium text-blue-100 whitespace-nowrap">Period</span>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
              >
                <option value="year" className="text-gray-900 bg-white">Full year</option>
                <option value="month" className="text-gray-900 bg-white">Last 30 days</option>
                <option value="quarter" className="text-gray-900 bg-white">Last 90 days</option>
                <option value="week" className="text-gray-900 bg-white">Last 7 days</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadAnalyticsData()}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!error && analyticsData.cashCloses.length === 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">No cash closes in this date range</p>
              <p className="text-sm text-amber-800">
                The Chart.js &quot;Accounts data analysis&quot; section still appears below — expense lines may show
                data. Try another <strong>year</strong> or a longer <strong>period</strong>, or add cash closes in
                Firestore.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedTimeRange('year');
                setSelectedYear((y) => y - 1);
              }}
              className="rounded-lg bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-800"
            >
              Previous calendar year
            </button>
            <button
              type="button"
              onClick={() => void loadAnalyticsData()}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 hover:bg-amber-100"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {authService.hasAnyRole(['Accountant', 'Admin']) && (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-emerald-900">Accountant workspace</h2>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Jump to operational tools while you review trends below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/accountant/cash-close"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Daily cash close
              </Link>
              <Link
                href="/dashboard/accountant/profits"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Profit analysis
              </Link>
              <Link
                href="/dashboard/accountant/expenses"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <Receipt className="h-3.5 w-3.5" />
                Expenses
              </Link>
              <Link
                href="/dashboard/accountant/fund-balances"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <Landmark className="h-3.5 w-3.5" />
                Fund balances
              </Link>
              <Link
                href="/dashboard/accountant/allocations"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <Send className="h-3.5 w-3.5" />
                PM allocations
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-800 font-medium">Failed to load analytics data: {error}</p>
        </div>
      )}


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full -translate-y-8 translate-x-8"
              style={{ background: 'currentColor' }} />
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl ${kpi.bgColor} flex items-center justify-center shadow-sm`}>
                <div className={kpi.color}>{kpi.icon}</div>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                kpi.change > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {kpi.change > 0
                  ? <ArrowUpRight className="h-3 w-3" />
                  : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(kpi.change).toFixed(1)}%
              </div>
            </div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{kpi.title}</h3>
            <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1.5">{kpi.changeText}</p>
          </div>
        ))}
      </div>

      {/* Accounts analysis — Chart.js (same family as PM dashboard) */}
      <div
        id="accounts-chartjs-analysis"
        className="grid scroll-mt-4 grid-cols-1 gap-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-4 lg:grid-cols-4"
      >
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-lg lg:col-span-3">
          <div className="mb-2 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Chart.js · PM-style
          </div>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Accounts data analysis</h2>
              <p className="text-sm text-gray-600">
                Revenue, gross profit, tax (from cash closes), and booked expenses — same Chart.js style as the
                Purchase Manager trends view.
                <span className="font-semibold text-emerald-700">
                  {' '}
                  {analysisDayCount} day{analysisDayCount === 1 ? '' : 's'} · {periodDescription}
                  {useMonthlyChartBuckets ? ' · Chart buckets: calendar month' : ' · Chart buckets: day'}
                </span>
              </p>
            </div>
          </div>
          <div className="mb-10 h-80">
            <ChartJsLine data={accountsTrendLineData} options={accountsChartOptions} />
          </div>
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-1 text-lg font-bold text-gray-900">
              {useMonthlyChartBuckets ? 'Monthly comparison (bars)' : 'Daily comparison (bars)'}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              {useMonthlyChartBuckets
                ? 'Side-by-side totals by calendar month in the selected window.'
                : 'Side-by-side revenue, gross profit, and expense amounts for each day in the window.'}
            </p>
            <div className="h-72">
              <ChartJsBar data={accountsFlowBarData} options={accountsChartOptions} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg">
            <h3 className="mb-1 text-sm font-bold text-gray-900">Revenue composition</h3>
            <p className="mb-3 text-xs text-gray-500">Selected period (cash closes)</p>
            <div className="h-56">
              <Doughnut data={revenueCompositionDoughnut} options={doughnutOptions} />
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg">
            <h3 className="mb-1 text-sm font-bold text-gray-900">Expenses by category</h3>
            <p className="mb-3 text-xs text-gray-500">Expense records in selected period</p>
            <div className="h-56">
              <Doughnut data={expenseCategoryDoughnut} options={doughnutOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue &amp; Gross Profit Trends</h3>
              <p className="text-sm text-gray-400">
                {useMonthlyChartBuckets ? 'Monthly totals (cash closes)' : 'Daily performance (cash closes)'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <LineChart className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`UGX ${value.toLocaleString()}`, '']}
                />
                <RechartsLegend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stackId="2" stroke="#6366F1" strokeWidth={2} fill="url(#profGrad)" name="Gross Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Money Allocation</h3>
              <p className="text-sm text-gray-400">Distribution breakdown</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <PieChartIcon className="h-4 w-4 text-purple-500" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <RechartsPie data={expenseData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RechartsPie>
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`UGX ${value.toLocaleString()}`, '']}
                />
                <RechartsLegend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Analysis */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gross Profit Analysis</h3>
              <p className="text-sm text-gray-400">Revenue vs expenses</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={profitData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`UGX ${value.toLocaleString()}`, '']}
                />
                <RechartsLegend />
                <RechartsBar dataKey="revenue" fill="#10B981" name="Revenue" radius={[4, 4, 0, 0]} />
                <RechartsBar dataKey="profit" fill="#6366F1" name="Gross Profit" radius={[4, 4, 0, 0]} />
                <RechartsBar dataKey="expenses" fill="#F87171" name="Expenses" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Predictions */}
      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <Target className="h-4 w-4 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sales Predictions</h3>
            </div>
            <p className="text-sm text-gray-400 ml-10">
              Actual revenue this month · 7-day forward forecast from your selected period
            </p>
          </div>
        </div>

        {analyticsData.cashCloses.length < 3 && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <span>
              <span className="font-semibold">Limited history.</span>{' '}
              {analyticsData.cashCloses.length === 0
                ? 'Forecasts default to zero until cash closes exist in the selected window.'
                : 'Widen the year or period for a steadier baseline.'}
            </span>
          </div>
        )}

        {/* Prediction Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
          {predictions.map((prediction, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-3"
            >
              <p className="text-xs font-medium text-gray-400 mb-2">
                {new Date(prediction.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-sm font-bold text-gray-900 mb-2 leading-tight">
                UGX {prediction.predicted.toLocaleString()}
              </p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                prediction.confidence >= 70 ? 'bg-emerald-100 text-emerald-700' :
                prediction.confidence >= 50 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {prediction.confidence}%
              </span>
            </div>
          ))}
        </div>

        {/* Prediction Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={salesPredictionChartData}>
              <defs>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" angle={-32} textAnchor="end" height={58} tick={{ fontSize: 10 }} minTickGap={10} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value: any) => {
                  const v = Number(value);
                  if (!Number.isFinite(v)) return ['—', ''];
                  return [`UGX ${v.toLocaleString()}`, ''];
                }}
              />
              <RechartsLegend />
              <RechartsLine type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={false} name="Actual revenue (this month)" connectNulls={false} />
              <RechartsLine type="monotone" dataKey="predicted" stroke="#8B5CF6" strokeWidth={2.5} strokeDasharray="6 4" dot={false} name="Predicted (next 7 days)" connectNulls={false} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Summary & Database Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Summary */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Database Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                value: analyticsData.cashCloses.length,
                label: 'Cash Closes',
                sub: `${selectedYear} · ${selectedTimeRange === 'week' ? 'Last 7 days' : selectedTimeRange === 'month' ? 'Last 30 days' : selectedTimeRange === 'quarter' ? 'Last 90 days' : 'Full year'}`,
                color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
              },
              {
                value: dataReport?.collections.allocations.count ?? 0,
                label: 'PM Allocations',
                sub: dataReport?.collections.allocations.available ? `${dataReport.collections.allocations.allocationStats.allocated} allocated` : 'No feed',
                color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
              },
              {
                value: predictions.length,
                label: 'Forecast Days',
                sub: predictions.length > 0 ? `${predictionAvgConfidence}% avg confidence` : '—',
                color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
              },
              {
                value: `UGX ${analyticsData.cashCloses.reduce((s, c) => s + (c.totalRevenue || 0), 0).toLocaleString()}`,
                label: 'Total Revenue',
                sub: 'From database records',
                color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100',
              },
            ].map((item, i) => (
              <div key={i} className={`rounded-xl ${item.bg} border ${item.border} p-4`}>
                <p className={`text-2xl font-bold ${item.color} leading-tight`}>{item.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-gray-500 text-sm">Loading from database…</span>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-semibold text-sm">
                  {error.includes('authentication') ? 'Authentication Required' : 'Connection Failed'}
                </span>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
                {error.includes('authentication') && (
                  <ul className="list-disc list-inside mt-2 space-y-0.5 text-xs text-red-600">
                    <li>Ensure you are logged in</li>
                    <li>Role must be Accountant, Manager, Admin, or MD</li>
                    <li>Check permissions in Firebase console</li>
                  </ul>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.location.href = '/dashboard'} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 transition-colors">
                  Go to Dashboard
                </button>
                <button onClick={loadAnalyticsData} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 transition-colors">
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle className="w-4 h-4" />
                Connected to Firebase Firestore
              </div>
              {[
                { dot: 'bg-emerald-500', label: 'Cash Closes', count: `${analyticsData.cashCloses.length} records`, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
                { dot: 'bg-blue-500', label: 'Allocation Results', count: `${dataReport?.collections.allocations.count ?? 0} records`, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
                { dot: 'bg-violet-500', label: 'Predictions', count: `${predictions.length} forecasts`, bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700' },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between rounded-xl ${row.bg} border ${row.border} px-4 py-2.5`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.dot}`} />
                    <span className={`text-sm font-medium ${row.text}`}>{row.label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${row.text}`}>{row.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-gray-600">Live · Firebase Firestore</span>
                </div>
                <span className="text-xs text-gray-400">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
