/**
 * MD Analytics / Forecasting from real system data only.
 * Supplier frequency = routeDays; purchase volume = invoices; sales = cash closes.
 * No mock categories, market share, or retail placeholders.
 */

import { toJsDate, safeNumber, getInvoiceDate, getInvoiceAmount } from './invoice-outstanding';

export type RouteDay =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

const WEEKDAYS: RouteDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface SupplierRecord {
  id: string;
  supplierName?: string;
  isActive?: boolean;
  routeDays?: string[];
  phoneNumber?: string;
  emailAddress?: string;
}

export interface SupplierFrequencyRow {
  id: string;
  name: string;
  isActive: boolean;
  routeDays: string[];
  daysPerWeek: number;
  /** Expected delivery visits in the selected window (from routeDays) */
  expectedVisits: number;
  /** Actual invoices linked to this supplier in the window */
  invoiceCount: number;
  invoiceAmount: number;
  /** invoiceCount / expectedVisits when expected > 0 */
  fulfillmentPct: number | null;
}

export interface MonthlyAmount {
  monthKey: string;
  label: string;
  amount: number;
  count: number;
}

export interface MdSystemAnalytics {
  periodLabel: string;
  suppliersActive: number;
  suppliersWithRoute: number;
  suppliersTotal: number;
  invoiceCount: number;
  invoiceSpend: number;
  avgInvoiceAmount: number;
  cashCloseSales: number;
  cashCloseCount: number;
  expenseTotal: number;
  expenseCount: number;
  activeEmployees: number;
  branches: number;
  /** MoM invoice spend growth % when prior month exists */
  invoiceSpendGrowthPct: number | null;
  /** MoM cash-close sales growth % */
  salesGrowthPct: number | null;
  topSuppliersBySpend: SupplierFrequencyRow[];
  supplierFrequency: SupplierFrequencyRow[];
  routeDayCoverage: Array<{ day: string; supplierCount: number }>;
  monthlyInvoiceSpend: MonthlyAmount[];
  monthlyCashSales: MonthlyAmount[];
}

export interface MdSystemForecast {
  timeframeLabel: string;
  monthsAhead: number;
  confidence: 'high' | 'medium' | 'low';
  dataPointsUsed: number;
  currentMonthlySales: number;
  projectedSales: number;
  salesGrowthPct: number | null;
  currentMonthlyPurchaseSpend: number;
  projectedPurchaseSpend: number;
  purchaseGrowthPct: number | null;
  /** Suppliers expected next — from routeDays and/or invoice weekday patterns */
  upcomingRouteSchedule: Array<{
    day: string;
    dateKey: string;
    suppliers: Array<{
      id: string;
      name: string;
      /** How this day was determined */
      source: 'route' | 'invoice' | 'both';
      invoiceCountOnDay?: number;
      lastInvoiceDate?: string;
    }>;
  }>;
  supplierFrequencyOutlook: SupplierFrequencyRow[];
  monthlySalesTrend: MonthlyAmount[];
  monthlyPurchaseTrend: MonthlyAmount[];
  notes: string[];
}

function monthLabel(d: Date): string {
  return `${d.toLocaleDateString('en-US', { month: 'short' })} '${d
    .getFullYear()
    .toString()
    .slice(-2)}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthBuckets(count: number, now = new Date()) {
  const buckets: Array<{ monthKey: string; label: string; start: Date; end: Date }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    buckets.push({ monthKey: monthKey(ref), label: monthLabel(ref), start, end });
  }
  return buckets;
}

function periodBounds(
  period: 'monthly' | 'quarterly' | 'yearly',
  now = new Date()
): { start: Date; end: Date; label: string; monthCount: number } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end, label: monthLabel(now), monthCount: 1 };
  }
  if (period === 'quarterly') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    return { start, end, label: 'Last 3 months', monthCount: 3 };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
  return { start, end, label: 'Last 12 months', monthCount: 12 };
}

function timeframeMonths(tf: '3months' | '6months' | '12months'): number {
  if (tf === '3months') return 3;
  if (tf === '12months') return 12;
  return 6;
}

function normalizeRouteDays(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => String(d || '').trim())
    .filter((d) => WEEKDAYS.some((w) => w.toLowerCase() === d.toLowerCase()))
    .map((d) => {
      const match = WEEKDAYS.find((w) => w.toLowerCase() === d.toLowerCase());
      return match || d;
    });
}

function expectedVisitsFromRoute(routeDays: string[], windowDays: number): number {
  if (routeDays.length === 0 || windowDays <= 0) return 0;
  return (routeDays.length / 7) * windowDays;
}

function getCashCloseDate(close: Record<string, unknown>): Date | null {
  return (
    toJsDate(close.closeCashTime) ??
    toJsDate(close.cashCloseDate) ??
    toJsDate(close.date) ??
    toJsDate(close.businessDate) ??
    toJsDate(close.createdAt)
  );
}

function getCashCloseSales(close: Record<string, unknown>): number {
  return safeNumber(
    close.totalSales ?? close.totalRevenue ?? close.closeCash ?? close.totalCashInTill ?? 0
  );
}

function growthPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function averageMoMGrowth(points: MonthlyAmount[]): number | null {
  const rates: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const g = growthPct(points[i].amount, points[i - 1].amount);
    if (g !== null) rates.push(g);
  }
  if (rates.length === 0) return null;
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}

function confidenceFromPoints(n: number): 'high' | 'medium' | 'low' {
  if (n >= 8) return 'high';
  if (n >= 3) return 'medium';
  return 'low';
}

function weekdayName(d: Date): RouteDay {
  return WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

interface InvoiceWeekdayPattern {
  id: string;
  name: string;
  /** Weekdays with enough invoice evidence */
  days: Set<string>;
  countByDay: Map<string, number>;
  lastInvoiceDate: Date | null;
  totalInvoices: number;
}

/**
 * Infer typical delivery weekdays from invoice dates (last `lookbackDays`).
 * A weekday counts when the supplier has ≥2 invoices on that day, or ≥1 invoice
 * and that day is at least 25% of their invoice history in the window.
 */
function inferInvoiceWeekdayPatterns(
  invoices: Array<Record<string, unknown> & { id?: string }>,
  suppliers: SupplierRecord[],
  now: Date,
  lookbackDays = 90
): Map<string, InvoiceWeekdayPattern> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - lookbackDays);

  const nameById = new Map(
    suppliers.map((s) => [s.id, s.supplierName || 'Unnamed supplier'])
  );

  type Acc = {
    id: string;
    name: string;
    countByDay: Map<string, number>;
    lastInvoiceDate: Date | null;
    total: number;
  };
  const byKey = new Map<string, Acc>();

  for (const inv of invoices) {
    const d = getInvoiceDate(inv);
    if (!d || d < start || d > now) continue;

    const sid = String(inv.supplierId || '');
    const sname = String(inv.supplierName || nameById.get(sid) || 'Unknown supplier');
    const key = sid || `name:${sname.toLowerCase()}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        id: sid || key,
        name: sid ? nameById.get(sid) || sname : sname,
        countByDay: new Map(),
        lastInvoiceDate: null,
        total: 0,
      };
      byKey.set(key, row);
    }
    const day = weekdayName(d);
    row.countByDay.set(day, (row.countByDay.get(day) || 0) + 1);
    row.total += 1;
    if (!row.lastInvoiceDate || d > row.lastInvoiceDate) row.lastInvoiceDate = d;
    if (row.name === 'Unknown supplier' && sname) row.name = sname;
  }

  const patterns = new Map<string, InvoiceWeekdayPattern>();
  for (const [key, row] of byKey) {
    const days = new Set<string>();
    for (const [day, count] of row.countByDay) {
      const share = row.total > 0 ? count / row.total : 0;
      if (count >= 2 || (count >= 1 && share >= 0.25)) {
        days.add(day);
      }
    }
    if (days.size === 0) continue;
    patterns.set(key, {
      id: row.id,
      name: row.name,
      days,
      countByDay: row.countByDay,
      lastInvoiceDate: row.lastInvoiceDate,
      totalInvoices: row.total,
    });
  }
  return patterns;
}

function supplierScheduleKeys(suppliers: SupplierRecord[]): Map<string, SupplierRecord> {
  const map = new Map<string, SupplierRecord>();
  for (const s of suppliers) {
    map.set(s.id, s);
    const nameKey = `name:${(s.supplierName || '').toLowerCase()}`;
    if (s.supplierName) map.set(nameKey, s);
  }
  return map;
}

function buildSupplierFrequency(
  suppliers: SupplierRecord[],
  invoices: Array<Record<string, unknown> & { id?: string }>,
  start: Date,
  end: Date
): SupplierFrequencyRow[] {
  const windowDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );

  const spendBySupplier = new Map<string, { count: number; amount: number; name: string }>();

  for (const inv of invoices) {
    const d = getInvoiceDate(inv);
    if (!d || d < start || d > end) continue;
    const sid = String(inv.supplierId || '');
    const sname = String(inv.supplierName || 'Unknown supplier');
    const key = sid || `name:${sname.toLowerCase()}`;
    const row = spendBySupplier.get(key) || { count: 0, amount: 0, name: sname };
    row.count += 1;
    row.amount += getInvoiceAmount(inv);
    if (!row.name || row.name === 'Unknown supplier') row.name = sname;
    spendBySupplier.set(key, row);
  }

  const rows: SupplierFrequencyRow[] = suppliers.map((s) => {
    const routeDays = normalizeRouteDays(s.routeDays);
    const expectedVisits = Math.round(expectedVisitsFromRoute(routeDays, windowDays) * 10) / 10;
    const byId = spendBySupplier.get(s.id);
    const byName = spendBySupplier.get(`name:${(s.supplierName || '').toLowerCase()}`);
    const invoiceCount = (byId?.count || 0) + (!byId && byName ? byName.count : 0);
    const invoiceAmount = (byId?.amount || 0) + (!byId && byName ? byName.amount : 0);
    return {
      id: s.id,
      name: s.supplierName || 'Unnamed supplier',
      isActive: s.isActive !== false,
      routeDays,
      daysPerWeek: routeDays.length,
      expectedVisits,
      invoiceCount,
      invoiceAmount,
      fulfillmentPct:
        expectedVisits > 0 ? Math.round((invoiceCount / expectedVisits) * 1000) / 10 : null,
    };
  });

  // Include invoice-only suppliers that exist in invoices but not in suppliers collection
  for (const [key, val] of spendBySupplier) {
    if (key.startsWith('name:')) continue;
    if (rows.some((r) => r.id === key)) continue;
    rows.push({
      id: key,
      name: val.name,
      isActive: true,
      routeDays: [],
      daysPerWeek: 0,
      expectedVisits: 0,
      invoiceCount: val.count,
      invoiceAmount: val.amount,
      fulfillmentPct: null,
    });
  }

  return rows.sort((a, b) => b.invoiceAmount - a.invoiceAmount || a.name.localeCompare(b.name));
}

export function buildMdSystemAnalytics(input: {
  suppliers: SupplierRecord[];
  invoices: Array<Record<string, unknown> & { id?: string }>;
  cashCloses: Array<Record<string, unknown>>;
  expenses: Array<Record<string, unknown>>;
  employees: Array<Record<string, unknown>>;
  branches: Array<Record<string, unknown>>;
  period?: 'monthly' | 'quarterly' | 'yearly';
  now?: Date;
}): MdSystemAnalytics {
  const now = input.now || new Date();
  const period = input.period || 'quarterly';
  const { start, end, label, monthCount } = periodBounds(period, now);
  const buckets = buildMonthBuckets(Math.max(monthCount, 6), now);

  const supplierFrequency = buildSupplierFrequency(
    input.suppliers,
    input.invoices,
    start,
    end
  );

  const periodInvoices = input.invoices.filter((inv) => {
    const d = getInvoiceDate(inv);
    return d && d >= start && d <= end;
  });
  const invoiceSpend = periodInvoices.reduce((s, inv) => s + getInvoiceAmount(inv), 0);

  const periodCloses = input.cashCloses.filter((c) => {
    const d = getCashCloseDate(c);
    return d && d >= start && d <= end;
  });
  const cashCloseSales = periodCloses.reduce((s, c) => s + getCashCloseSales(c), 0);

  const periodExpenses = input.expenses.filter((e) => {
    const d = toJsDate(e.expenseDate ?? e.date ?? e.createdAt);
    return d && d >= start && d <= end;
  });
  const expenseTotal = periodExpenses.reduce((s, e) => s + safeNumber(e.amount), 0);

  const monthlyInvoiceSpend = buckets.map((b) => {
    const list = input.invoices.filter((inv) => {
      const d = getInvoiceDate(inv);
      return d && d >= b.start && d <= b.end;
    });
    return {
      monthKey: b.monthKey,
      label: b.label,
      amount: list.reduce((s, inv) => s + getInvoiceAmount(inv), 0),
      count: list.length,
    };
  });

  const monthlyCashSales = buckets.map((b) => {
    const list = input.cashCloses.filter((c) => {
      const d = getCashCloseDate(c);
      return d && d >= b.start && d <= b.end;
    });
    return {
      monthKey: b.monthKey,
      label: b.label,
      amount: list.reduce((s, c) => s + getCashCloseSales(c), 0),
      count: list.length,
    };
  });

  const lastInv = monthlyInvoiceSpend[monthlyInvoiceSpend.length - 1];
  const prevInv = monthlyInvoiceSpend[monthlyInvoiceSpend.length - 2];
  const lastSales = monthlyCashSales[monthlyCashSales.length - 1];
  const prevSales = monthlyCashSales[monthlyCashSales.length - 2];

  const routeDayCoverage = WEEKDAYS.map((day) => ({
    day,
    supplierCount: input.suppliers.filter((s) =>
      normalizeRouteDays(s.routeDays).some((d) => d === day)
    ).length,
  }));

  return {
    periodLabel: label,
    suppliersActive: input.suppliers.filter((s) => s.isActive !== false).length,
    suppliersWithRoute: input.suppliers.filter((s) => normalizeRouteDays(s.routeDays).length > 0)
      .length,
    suppliersTotal: input.suppliers.length,
    invoiceCount: periodInvoices.length,
    invoiceSpend,
    avgInvoiceAmount: periodInvoices.length > 0 ? invoiceSpend / periodInvoices.length : 0,
    cashCloseSales,
    cashCloseCount: periodCloses.length,
    expenseTotal,
    expenseCount: periodExpenses.length,
    activeEmployees: input.employees.filter(
      (e) => String(e.employmentStatus || '') === 'Active'
    ).length,
    branches: input.branches.length,
    invoiceSpendGrowthPct:
      lastInv && prevInv ? growthPct(lastInv.amount, prevInv.amount) : null,
    salesGrowthPct: lastSales && prevSales ? growthPct(lastSales.amount, prevSales.amount) : null,
    topSuppliersBySpend: supplierFrequency.filter((s) => s.invoiceAmount > 0).slice(0, 10),
    supplierFrequency,
    routeDayCoverage,
    monthlyInvoiceSpend,
    monthlyCashSales,
  };
}

export function buildMdSystemForecast(input: {
  suppliers: SupplierRecord[];
  invoices: Array<Record<string, unknown> & { id?: string }>;
  cashCloses: Array<Record<string, unknown>>;
  timeframe?: '3months' | '6months' | '12months';
  now?: Date;
}): MdSystemForecast {
  const now = input.now || new Date();
  const monthsAhead = timeframeMonths(input.timeframe || '6months');
  const lookback = buildMonthBuckets(12, now);

  const monthlySalesTrend = lookback.map((b) => {
    const list = input.cashCloses.filter((c) => {
      const d = getCashCloseDate(c);
      return d && d >= b.start && d <= b.end;
    });
    return {
      monthKey: b.monthKey,
      label: b.label,
      amount: list.reduce((s, c) => s + getCashCloseSales(c), 0),
      count: list.length,
    };
  });

  const monthlyPurchaseTrend = lookback.map((b) => {
    const list = input.invoices.filter((inv) => {
      const d = getInvoiceDate(inv);
      return d && d >= b.start && d <= b.end;
    });
    return {
      monthKey: b.monthKey,
      label: b.label,
      amount: list.reduce((s, inv) => s + getInvoiceAmount(inv), 0),
      count: list.length,
    };
  });

  const salesGrowthPct = averageMoMGrowth(monthlySalesTrend.filter((p) => p.amount > 0 || p.count > 0));
  const purchaseGrowthPct = averageMoMGrowth(
    monthlyPurchaseTrend.filter((p) => p.amount > 0 || p.count > 0)
  );

  const recentSales = monthlySalesTrend.slice(-3).filter((p) => p.count > 0);
  const currentMonthlySales =
    recentSales.length > 0
      ? recentSales.reduce((s, p) => s + p.amount, 0) / recentSales.length
      : monthlySalesTrend[monthlySalesTrend.length - 1]?.amount || 0;

  const recentPurchases = monthlyPurchaseTrend.slice(-3).filter((p) => p.count > 0);
  const currentMonthlyPurchaseSpend =
    recentPurchases.length > 0
      ? recentPurchases.reduce((s, p) => s + p.amount, 0) / recentPurchases.length
      : monthlyPurchaseTrend[monthlyPurchaseTrend.length - 1]?.amount || 0;

  const salesRate = (salesGrowthPct ?? 0) / 100;
  const purchaseRate = (purchaseGrowthPct ?? 0) / 100;

  let projectedSales = 0;
  let projectedPurchaseSpend = 0;
  for (let m = 1; m <= monthsAhead; m++) {
    projectedSales += currentMonthlySales * Math.pow(1 + salesRate, m);
    projectedPurchaseSpend += currentMonthlyPurchaseSpend * Math.pow(1 + purchaseRate, m);
  }

  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const weeks = Math.min(monthsAhead * 4, 12);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + weeks * 7);
  windowEnd.setHours(23, 59, 59, 999);

  const supplierFrequencyOutlook = buildSupplierFrequency(
    input.suppliers,
    input.invoices,
    new Date(now.getFullYear(), now.getMonth() - 2, 1),
    now
  ).filter((s) => s.routeDays.length > 0 || s.invoiceCount > 0);

  const invoicePatterns = inferInvoiceWeekdayPatterns(input.invoices, input.suppliers, now, 90);
  const supplierByKey = supplierScheduleKeys(input.suppliers);

  /** Build union of route + invoice-inferred days per supplier key */
  type ScheduleSupplier = {
    id: string;
    name: string;
    routeDays: Set<string>;
    invoiceDays: Set<string>;
    invoiceCountByDay: Map<string, number>;
    lastInvoiceDate: Date | null;
  };
  const scheduleByKey = new Map<string, ScheduleSupplier>();

  const ensureSchedule = (key: string, id: string, name: string): ScheduleSupplier => {
    let row = scheduleByKey.get(key);
    if (!row) {
      row = {
        id,
        name,
        routeDays: new Set(),
        invoiceDays: new Set(),
        invoiceCountByDay: new Map(),
        lastInvoiceDate: null,
      };
      scheduleByKey.set(key, row);
    }
    return row;
  };

  for (const s of input.suppliers) {
    if (s.isActive === false) continue;
    const row = ensureSchedule(s.id, s.id, s.supplierName || 'Unnamed supplier');
    for (const day of normalizeRouteDays(s.routeDays)) row.routeDays.add(day);
  }

  for (const [key, pattern] of invoicePatterns) {
    const linked = supplierByKey.get(key);
    if (linked?.isActive === false) continue;
    const id = linked?.id || pattern.id;
    const name = linked?.supplierName || pattern.name;
    const row = ensureSchedule(key.startsWith('name:') && linked ? linked.id : key, id, name);
    // Prefer canonical supplier id entry when we have a linked supplier
    if (linked) {
      const canon = ensureSchedule(linked.id, linked.id, linked.supplierName || pattern.name);
      for (const day of pattern.days) {
        canon.invoiceDays.add(day);
        canon.invoiceCountByDay.set(
          day,
          (canon.invoiceCountByDay.get(day) || 0) + (pattern.countByDay.get(day) || 0)
        );
      }
      if (
        pattern.lastInvoiceDate &&
        (!canon.lastInvoiceDate || pattern.lastInvoiceDate > canon.lastInvoiceDate)
      ) {
        canon.lastInvoiceDate = pattern.lastInvoiceDate;
      }
    } else {
      for (const day of pattern.days) {
        row.invoiceDays.add(day);
        row.invoiceCountByDay.set(day, pattern.countByDay.get(day) || 0);
      }
      row.lastInvoiceDate = pattern.lastInvoiceDate;
    }
  }

  const upcomingRouteSchedule: MdSystemForecast['upcomingRouteSchedule'] = [];
  for (let i = 0; i < Math.min(weeks * 7, 28); i++) {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    const day = weekdayName(d);

    const onDay: MdSystemForecast['upcomingRouteSchedule'][0]['suppliers'] = [];
    const seen = new Set<string>();

    for (const row of scheduleByKey.values()) {
      if (seen.has(row.id)) continue;
      const fromRoute = row.routeDays.has(day);
      const fromInvoice = row.invoiceDays.has(day);
      if (!fromRoute && !fromInvoice) continue;
      seen.add(row.id);
      onDay.push({
        id: row.id,
        name: row.name,
        source: fromRoute && fromInvoice ? 'both' : fromRoute ? 'route' : 'invoice',
        invoiceCountOnDay: row.invoiceCountByDay.get(day) || 0,
        lastInvoiceDate: row.lastInvoiceDate
          ? row.lastInvoiceDate.toISOString().slice(0, 10)
          : undefined,
      });
    }

    onDay.sort((a, b) => a.name.localeCompare(b.name));
    if (onDay.length === 0) continue;
    upcomingRouteSchedule.push({
      day,
      dateKey: d.toISOString().slice(0, 10),
      suppliers: onDay,
    });
  }

  const salesMonthsUsed = monthlySalesTrend.filter((p) => p.count > 0).length;
  const purchaseMonthsUsed = monthlyPurchaseTrend.filter((p) => p.count > 0).length;
  const dataPointsUsed = Math.max(salesMonthsUsed, purchaseMonthsUsed);

  const notes: string[] = [];
  if (input.suppliers.filter((s) => normalizeRouteDays(s.routeDays).length > 0).length === 0) {
    notes.push(
      'No suppliers have route days set — upcoming schedule uses invoice weekday patterns where available.'
    );
  }
  if (invoicePatterns.size === 0) {
    notes.push('No recent invoices found to infer delivery weekdays (last 90 days).');
  }
  if (salesMonthsUsed < 2) {
    notes.push('Need at least two months of cash closes for a reliable sales growth rate.');
  }
  if (purchaseMonthsUsed < 2) {
    notes.push('Need at least two months of invoices for a reliable purchase spend growth rate.');
  }
  if (dataPointsUsed === 0) {
    notes.push('No cash close or invoice history found — projections are zero until data exists.');
  }

  return {
    timeframeLabel: `Next ${monthsAhead} months`,
    monthsAhead,
    confidence: confidenceFromPoints(dataPointsUsed),
    dataPointsUsed,
    currentMonthlySales,
    projectedSales,
    salesGrowthPct,
    currentMonthlyPurchaseSpend,
    projectedPurchaseSpend,
    purchaseGrowthPct,
    upcomingRouteSchedule: upcomingRouteSchedule.slice(0, 21),
    supplierFrequencyOutlook: supplierFrequencyOutlook.slice(0, 15),
    monthlySalesTrend,
    monthlyPurchaseTrend,
    notes,
  };
}
