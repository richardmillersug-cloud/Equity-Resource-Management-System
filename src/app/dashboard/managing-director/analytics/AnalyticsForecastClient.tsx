'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  RefreshCw,
  Package,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Truck,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { firestoreServices } from '@/lib/firebase/firestore-service';
import {
  buildMdSystemAnalytics,
  buildMdSystemForecast,
  type MdSystemAnalytics,
  type MdSystemForecast,
} from '@/lib/firebase/md-supplier-insights';
import { EQUITY_BRAND, staffBrandStyle } from '@/components/staff/brand';
import { useTheme } from '@/contexts/ThemeContext';

type TabKey = 'analytics' | 'forecast';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatPct(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

const cardClass =
  'bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-lg border border-[#6A2B81]/15 dark:border-[#6A2B81]/40 backdrop-blur-sm';
const muted = 'text-gray-500 dark:text-gray-400';
const heading = 'text-gray-900 dark:text-white';
const rowMuted = 'text-gray-600 dark:text-gray-300';
const brandBtn =
  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90';
const brandSelect =
  'rounded-lg border border-[#6A2B81]/25 bg-white px-3 py-2 text-sm dark:border-[#6A2B81]/50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6A2B81]/40';

export default function AnalyticsForecastClient() {
  const { actualTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'forecast' ? 'forecast' : 'analytics';

  const pageStyle =
    actualTheme === 'dark'
      ? {
          ...staffBrandStyle,
          background: `linear-gradient(160deg, #1a0f22 0%, #120818 40%, #1a1208 70%, #0f1a12 100%)`,
        }
      : {
          ...staffBrandStyle,
          background: `linear-gradient(160deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 38%, ${EQUITY_BRAND.orangeSoft} 70%, ${EQUITY_BRAND.greenSoft} 100%)`,
        };

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<MdSystemAnalytics | null>(null);
  const [forecast, setForecast] = useState<MdSystemForecast | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('quarterly');
  const [timeframe, setTimeframe] = useState<'3months' | '6months' | '12months'>('6months');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'forecast' ? 'forecast' : 'analytics');
  }, [searchParams]);

  const setActiveTab = (next: TabKey) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'forecast') params.set('tab', 'forecast');
    else params.delete('tab');
    const qs = params.toString();
    router.replace(
      qs
        ? `/dashboard/managing-director/analytics?${qs}`
        : '/dashboard/managing-director/analytics'
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [suppliers, invoices, cashCloses, expenses, employees, branches] = await Promise.all([
        firestoreServices.supplier.getAll(),
        firestoreServices.invoice.getAll(),
        firestoreServices.cashClose.getAll([], {
          orderBy: 'createdAt',
          orderDirection: 'desc',
          limit: 500,
        }),
        firestoreServices.expense.getAll(),
        firestoreServices.employee.getAll(),
        firestoreServices.branch.getAll(),
      ]);

      const supplierRows = suppliers as any[];
      const invoiceRows = invoices as any[];
      const closeRows = cashCloses as any[];

      setAnalytics(
        buildMdSystemAnalytics({
          suppliers: supplierRows,
          invoices: invoiceRows,
          cashCloses: closeRows,
          expenses: expenses as any[],
          employees: employees as any[],
          branches: branches as any[],
          period,
        })
      );
      setForecast(
        buildMdSystemForecast({
          suppliers: supplierRows,
          invoices: invoiceRows,
          cashCloses: closeRows,
          timeframe,
        })
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics/forecast load failed:', err);
      setError('Failed to load insights from system data.');
      setAnalytics(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [period, timeframe]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" style={pageStyle}>
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#F3EAF7] dark:border-[#4A1D5C]"
            style={{ borderTopColor: EQUITY_BRAND.purple }}
          />
          <p className={`font-medium ${rowMuted}`}>Loading insights from system data…</p>
        </div>
      </div>
    );
  }

  if (error || !analytics || !forecast) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6" style={pageStyle}>
        <div className={`mx-auto max-w-lg p-8 text-center ${cardClass}`}>
          <BarChart3 className="mx-auto mb-3 h-12 w-12" style={{ color: EQUITY_BRAND.purple }} />
          <h2 className={`text-lg font-semibold ${heading}`}>No insights data</h2>
          <p className={`mt-1 text-sm ${muted}`}>
            {error || 'Add suppliers, invoices, or cash closes to see analytics and forecasts.'}
          </p>
          <button
            type="button"
            onClick={load}
            className={`${brandBtn} mt-4`}
            style={{ backgroundColor: EQUITY_BRAND.purple }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6" style={pageStyle}>
      <div className="w-full space-y-6">
        <div
          className={`${cardClass} overflow-hidden p-6`}
          style={{
            borderTopWidth: 3,
            borderTopColor: EQUITY_BRAND.purple,
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: EQUITY_BRAND.orange }}
              >
                Equity Shoppers
              </p>
              <h1 className={`flex items-center gap-2 text-2xl font-bold ${heading}`}>
                <BarChart3 className="h-7 w-7" style={{ color: EQUITY_BRAND.purple }} />
                Analytics & Forecasting
              </h1>
              <p className={`mt-1 text-sm ${muted}`}>
                System data only — supplier route frequency, invoices, cash closes, expenses, and
                staff
              </p>
              {lastUpdated && (
                <p className={`mt-2 text-xs ${muted}`}>
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tab === 'analytics' ? (
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as typeof period)}
                  className={brandSelect}
                >
                  <option value="monthly">This month</option>
                  <option value="quarterly">Last 3 months</option>
                  <option value="yearly">Last 12 months</option>
                </select>
              ) : (
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
                  className={brandSelect}
                >
                  <option value="3months">Next 3 months</option>
                  <option value="6months">Next 6 months</option>
                  <option value="12months">Next 12 months</option>
                </select>
              )}
              <button
                type="button"
                onClick={load}
                className={brandBtn}
                style={{ backgroundColor: EQUITY_BRAND.purple }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div
            className="mt-5 flex gap-2 border-b"
            style={{ borderColor: `${EQUITY_BRAND.purple}33` }}
          >
            <TabButton
              active={tab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              icon={<BarChart3 className="h-4 w-4" />}
              label="Analytics"
            />
            <TabButton
              active={tab === 'forecast'}
              onClick={() => setActiveTab('forecast')}
              icon={<Activity className="h-4 w-4" />}
              label="Forecasting"
            />
          </div>
        </div>

        {tab === 'analytics' ? (
          <AnalyticsPanel data={analytics} />
        ) : (
          <ForecastPanel data={forecast} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'text-[#6A2B81] dark:text-[#c4a0d4]'
          : 'border-transparent text-gray-500 hover:text-[#6A2B81] dark:text-gray-400 dark:hover:text-[#c4a0d4]'
      }`}
      style={active ? { borderBottomColor: EQUITY_BRAND.purple, color: EQUITY_BRAND.purple } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  accentBg,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accentBg: string;
  accentColor: string;
}) {
  return (
    <div className={`${cardClass} min-w-0 p-3 sm:p-5`}>
      <div
        className="mb-2 w-fit rounded-lg p-1.5 sm:mb-3 sm:p-2"
        style={{ backgroundColor: accentBg, color: accentColor }}
      >
        {icon}
      </div>
      <p className={`truncate text-base font-bold sm:text-2xl ${heading}`} title={value}>
        {value}
      </p>
      <p className={`truncate text-xs sm:text-sm ${rowMuted}`} title={label}>
        {label}
      </p>
      <p className={`mt-1 truncate text-[10px] sm:text-xs ${muted}`} title={hint}>
        {hint}
      </p>
    </div>
  );
}

function AnalyticsPanel({ data }: { data: MdSystemAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <MetricCard
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.greenSoft}
          accentColor={EQUITY_BRAND.green}
          label="Cash close sales"
          value={formatCurrency(data.cashCloseSales)}
          hint={`${data.cashCloseCount} closes · MoM ${formatPct(data.salesGrowthPct)}`}
        />
        <MetricCard
          icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.purpleSoft}
          accentColor={EQUITY_BRAND.purple}
          label="Invoice purchase spend"
          value={formatCurrency(data.invoiceSpend)}
          hint={`${data.invoiceCount} invoices · avg ${formatCurrency(data.avgInvoiceAmount)}`}
        />
        <MetricCard
          icon={<Truck className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.orangeSoft}
          accentColor={EQUITY_BRAND.orange}
          label="Suppliers"
          value={String(data.suppliersActive)}
          hint={`${data.suppliersWithRoute} with route days · ${data.suppliersTotal} total`}
        />
        <MetricCard
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.purpleSoft}
          accentColor={EQUITY_BRAND.purpleDark}
          label="Active staff / branches"
          value={`${data.activeEmployees} / ${data.branches}`}
          hint={`Expenses ${formatCurrency(data.expenseTotal)} (${data.expenseCount})`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <h2 className={`mb-4 flex items-center gap-2 text-lg font-semibold ${heading}`}>
            <Truck className="h-5 w-5" style={{ color: EQUITY_BRAND.orange }} />
            Top suppliers by invoice spend
          </h2>
          {data.topSuppliersBySpend.length === 0 ? (
            <p className={`text-sm ${muted}`}>No supplier invoices in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    <th className="py-2 pr-3">Supplier</th>
                    <th className="py-2 pr-3">Route days</th>
                    <th className="py-2 pr-3 text-right">Invoices</th>
                    <th className="py-2 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.topSuppliersBySpend.map((s) => (
                    <tr key={s.id}>
                      <td className={`py-2.5 pr-3 font-medium ${heading}`}>{s.name}</td>
                      <td className={`py-2.5 pr-3 ${rowMuted}`}>
                        {s.routeDays.length > 0 ? s.routeDays.join(', ') : '—'}
                      </td>
                      <td className={`py-2.5 pr-3 text-right ${rowMuted}`}>{s.invoiceCount}</td>
                      <td className={`py-2.5 text-right font-medium ${heading}`}>
                        {formatCurrency(s.invoiceAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${cardClass} p-5`}>
          <h2 className={`mb-4 flex items-center gap-2 text-lg font-semibold ${heading}`}>
            <Calendar className="h-5 w-5" style={{ color: EQUITY_BRAND.purple }} />
            Supplier route coverage
          </h2>
          <div className="space-y-3">
            {data.routeDayCoverage.map((row) => (
              <div key={row.day} className="flex items-center gap-3">
                <span className={`w-24 text-sm ${rowMuted}`}>{row.day}</span>
                <div className="h-2 flex-1 rounded-full bg-[#F3EAF7] dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: EQUITY_BRAND.purple,
                      width: `${Math.min(
                        100,
                        data.suppliersTotal > 0
                          ? (row.supplierCount / data.suppliersTotal) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <span className={`w-8 text-right text-sm font-medium ${heading}`}>
                  {row.supplierCount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className={`mb-1 flex items-center gap-2 text-lg font-semibold ${heading}`}>
          <TrendingUp className="h-5 w-5" style={{ color: EQUITY_BRAND.green }} />
          Supplier frequency vs invoices ({data.periodLabel})
        </h2>
        <p className={`mb-4 text-sm ${muted}`}>
          Expected visits from route days; actual visits from invoice counts in the period.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-600 dark:text-gray-400">
                <th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">Days / week</th>
                <th className="py-2 pr-3 text-right">Expected</th>
                <th className="py-2 pr-3 text-right">Invoices</th>
                <th className="py-2 pr-3 text-right">Fulfillment</th>
                <th className="py-2 text-right">Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[...data.supplierFrequency]
                .sort((a, b) => {
                  const tier = (pct: number | null) =>
                    pct === null ? 3 : pct >= 80 ? 0 : pct >= 50 ? 1 : 2;
                  const byTier = tier(a.fulfillmentPct) - tier(b.fulfillmentPct);
                  if (byTier !== 0) return byTier;
                  const aPct = a.fulfillmentPct ?? -1;
                  const bPct = b.fulfillmentPct ?? -1;
                  return bPct - aPct || a.name.localeCompare(b.name);
                })
                .slice(0, 25)
                .map((s) => (
                <tr key={s.id} className={!s.isActive ? 'opacity-60' : undefined}>
                  <td className={`py-2.5 pr-3 font-medium ${heading}`}>{s.name}</td>
                  <td className={`py-2.5 pr-3 ${rowMuted}`}>
                    {s.daysPerWeek > 0 ? s.daysPerWeek : '—'}
                  </td>
                  <td className={`py-2.5 pr-3 text-right ${rowMuted}`}>
                    {s.expectedVisits > 0 ? s.expectedVisits : '—'}
                  </td>
                  <td className={`py-2.5 pr-3 text-right ${rowMuted}`}>{s.invoiceCount}</td>
                  <td className="py-2.5 pr-3 text-right">
                    {s.fulfillmentPct === null ? (
                      <span className={muted}>—</span>
                    ) : (
                        <span
                          className={
                            s.fulfillmentPct >= 80
                              ? ''
                              : s.fulfillmentPct >= 50
                                ? ''
                                : ''
                          }
                          style={{
                            color:
                              s.fulfillmentPct >= 80
                                ? EQUITY_BRAND.green
                                : s.fulfillmentPct >= 50
                                  ? EQUITY_BRAND.orange
                                  : '#DC2626',
                          }}
                        >
                          {s.fulfillmentPct}%
                        </span>
                    )}
                  </td>
                  <td className={`py-2.5 text-right font-medium ${heading}`}>
                    {s.invoiceAmount > 0 ? formatCurrency(s.invoiceAmount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <TrendList
          title="Monthly cash close sales"
          icon={<Building2 className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: EQUITY_BRAND.green }} />}
          rows={data.monthlyCashSales}
          growth={data.salesGrowthPct}
        />
        <TrendList
          title="Monthly invoice purchase spend"
          icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: EQUITY_BRAND.purple }} />}
          rows={data.monthlyInvoiceSpend}
          growth={data.invoiceSpendGrowthPct}
        />
      </div>
    </div>
  );
}

function ForecastPanel({ data }: { data: MdSystemForecast }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="rounded-full px-2.5 py-1 font-medium"
          style={{
            backgroundColor: EQUITY_BRAND.purpleSoft,
            color: EQUITY_BRAND.purple,
          }}
        >
          Confidence: {data.confidence} ({data.dataPointsUsed} months with data)
        </span>
        <span className={muted}>{data.timeframeLabel}</span>
      </div>

      {data.notes.length > 0 && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: `${EQUITY_BRAND.orange}66`,
            backgroundColor: EQUITY_BRAND.orangeSoft,
            color: EQUITY_BRAND.purpleDark,
          }}
        >
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4" style={{ color: EQUITY_BRAND.orange }} />
            Data notes
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <MetricCard
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.greenSoft}
          accentColor={EQUITY_BRAND.green}
          label="Projected cash sales"
          value={formatCurrency(data.projectedSales)}
          hint={`Avg month ${formatCurrency(data.currentMonthlySales)} · ${formatPct(data.salesGrowthPct)}`}
        />
        <MetricCard
          icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.purpleSoft}
          accentColor={EQUITY_BRAND.purple}
          label="Projected purchase spend"
          value={formatCurrency(data.projectedPurchaseSpend)}
          hint={`Avg month ${formatCurrency(data.currentMonthlyPurchaseSpend)} · ${formatPct(data.purchaseGrowthPct)}`}
        />
        <MetricCard
          icon={<Truck className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.orangeSoft}
          accentColor={EQUITY_BRAND.orange}
          label="Suppliers with route days"
          value={String(data.supplierFrequencyOutlook.filter((s) => s.routeDays.length > 0).length)}
          hint={`${data.supplierFrequencyOutlook.filter((s) => s.invoiceCount > 0).length} with recent invoices`}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
          accentBg={EQUITY_BRAND.purpleSoft}
          accentColor={EQUITY_BRAND.purpleDark}
          label="Avg MoM sales growth"
          value={formatPct(data.salesGrowthPct)}
          hint={`Purchases MoM ${formatPct(data.purchaseGrowthPct)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <h2 className={`mb-4 flex items-center gap-2 text-lg font-semibold ${heading}`}>
            <Calendar className="h-5 w-5" style={{ color: EQUITY_BRAND.purple }} />
            Upcoming supplier route schedule
          </h2>
          <p className={`mb-3 text-xs ${muted}`}>
            Built from supplier route days and invoice weekday patterns (last 90 days). Tags show
            whether each supplier is expected from route, invoices, or both.
          </p>
          {data.upcomingRouteSchedule.length === 0 ? (
            <p className={`text-sm ${muted}`}>
              No upcoming deliveries — add route days or record invoices to infer delivery days.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {data.upcomingRouteSchedule.map((slot) => (
                <li
                  key={slot.dateKey}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-700/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium ${heading}`}>
                      {slot.day} · {slot.dateKey}
                    </span>
                    <span className={`text-xs ${muted}`}>{slot.suppliers.length} suppliers</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {slot.suppliers.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={rowMuted}>{s.name}</span>
                        <span
                          className="rounded-full px-2 py-0.5 font-medium"
                          style={
                            s.source === 'both'
                              ? {
                                  backgroundColor: EQUITY_BRAND.greenSoft,
                                  color: EQUITY_BRAND.green,
                                }
                              : s.source === 'route'
                                ? {
                                    backgroundColor: EQUITY_BRAND.purpleSoft,
                                    color: EQUITY_BRAND.purple,
                                  }
                                : {
                                    backgroundColor: EQUITY_BRAND.orangeSoft,
                                    color: EQUITY_BRAND.orange,
                                  }
                          }
                        >
                          {s.source === 'both'
                            ? 'Route + invoice'
                            : s.source === 'route'
                              ? 'Route day'
                              : 'From invoices'}
                        </span>
                        {s.source !== 'route' && (s.invoiceCountOnDay || 0) > 0 && (
                          <span className={muted}>
                            {s.invoiceCountOnDay}× on {slot.day}
                            {s.lastInvoiceDate ? ` · last ${s.lastInvoiceDate}` : ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardClass} p-5`}>
          <h2 className={`mb-4 flex items-center gap-2 text-lg font-semibold ${heading}`}>
            <Truck className="h-5 w-5" style={{ color: EQUITY_BRAND.orange }} />
            Supplier frequency outlook
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Route</th>
                  <th className="py-2 pr-3 text-right">Expected</th>
                  <th className="py-2 text-right">Invoices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.supplierFrequencyOutlook.map((s) => (
                  <tr key={s.id}>
                    <td className={`py-2 pr-3 font-medium ${heading}`}>{s.name}</td>
                    <td className={`py-2 pr-3 ${rowMuted}`}>
                      {s.routeDays.length > 0 ? s.routeDays.join(', ') : '—'}
                    </td>
                    <td className={`py-2 pr-3 text-right ${rowMuted}`}>
                      {s.expectedVisits > 0 ? s.expectedVisits : '—'}
                    </td>
                    <td className={`py-2 text-right ${rowMuted}`}>{s.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <TrendList
          title="Recent monthly cash sales"
          icon={<Building2 className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: EQUITY_BRAND.green }} />}
          rows={data.monthlySalesTrend}
          growth={data.salesGrowthPct}
        />
        <TrendList
          title="Recent monthly purchase spend"
          icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: EQUITY_BRAND.purple }} />}
          rows={data.monthlyPurchaseTrend}
          growth={data.purchaseGrowthPct}
        />
      </div>
    </div>
  );
}

function TrendList({
  title,
  icon,
  rows,
  growth,
}: {
  title: string;
  icon: React.ReactNode;
  rows: MdSystemAnalytics['monthlyCashSales'];
  growth: number | null;
}) {
  const GrowthIcon = growth !== null && growth < 0 ? TrendingDown : TrendingUp;
  return (
    <section className={`${cardClass} min-w-0 p-3 sm:p-5`}>
      <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`flex items-center gap-2 text-sm font-semibold sm:text-lg ${heading}`}>
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        <span className={`inline-flex shrink-0 items-center gap-1 text-xs sm:text-sm ${rowMuted}`}>
          <GrowthIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          MoM {formatPct(growth)}
        </span>
      </div>
      <ul className="space-y-2">
        {[...rows]
          .reverse()
          .slice(0, 6)
          .map((row) => (
            <li
              key={row.monthKey}
              className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-2 text-xs sm:px-3 sm:text-sm dark:bg-gray-700/50"
            >
              <span className={`min-w-0 truncate ${rowMuted}`}>
                {row.label}
                <span className={`ml-1 sm:ml-2 text-[10px] sm:text-xs ${muted}`}>
                  {row.count} records
                </span>
              </span>
              <span className={`shrink-0 font-medium ${heading}`}>
                {formatCurrency(row.amount)}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
}
