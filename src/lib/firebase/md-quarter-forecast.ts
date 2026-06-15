import type { MdMonthlySummaries, MonthlyDataPoint } from './md-monthly-summary';

export interface QuarterForecast {
  revenueGrowthPct: number;
  projectedNextQuarterRevenue: number;
  currentQuarterRevenue: number;
  workforceNewHires: number;
  activeEmployeeCount: number;
  inventoryInvestment: number;
  confidence: 'high' | 'medium' | 'low';
  dataMonthsUsed: number;
  nextQuarterLabel: string;
  currentQuarterLabel: string;
}

const EFFICIENCY_GAIN_PCT = 6;

function quarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

function getQuarterMonthKeys(year: number, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map((offset) => {
    const month = startMonth + offset;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

function sumQuarterAmount(
  points: MonthlyDataPoint[],
  year: number,
  quarter: number
): number {
  const keys = new Set(getQuarterMonthKeys(year, quarter));
  return points
    .filter((p) => keys.has(p.monthKey))
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Extrapolate partial current month to full month when projecting quarter totals. */
export function extrapolateQuarterTotal(
  points: MonthlyDataPoint[],
  now = new Date()
): number {
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const monthKeys = getQuarterMonthKeys(year, quarter);

  let total = 0;
  for (const monthKey of monthKeys) {
    const point = points.find((p) => p.monthKey === monthKey);
    if (!point) continue;

    const [y, m] = monthKey.split('-').map(Number);
    const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;

    if (isCurrentMonth && point.amount > 0) {
      const daysInMonth = new Date(y, m, 0).getDate();
      const daysElapsed = Math.max(1, now.getDate());
      total += (point.amount / daysElapsed) * daysInMonth;
    } else {
      total += point.amount;
    }
  }

  return total;
}

/** Average of the most recent month-over-month growth rates (positive denominators only). */
export function computeAverageMoMGrowth(
  points: MonthlyDataPoint[],
  now = new Date()
): number | null {
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const normalized = points.map((point) => {
    if (point.monthKey !== currentMonthKey || point.amount <= 0) return point;

    const [y, m] = point.monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysElapsed = Math.max(1, now.getDate());
    return {
      ...point,
      amount: (point.amount / daysElapsed) * daysInMonth,
    };
  });

  const sorted = [...normalized].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const rates: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].amount;
    const curr = sorted[i].amount;
    if (prev > 0 && curr >= 0) {
      rates.push(((curr - prev) / prev) * 100);
    }
  }

  if (rates.length === 0) return null;

  const recent = rates.slice(-3);
  return recent.reduce((sum, rate) => sum + rate, 0) / recent.length;
}

function computeQuarterOverQuarterGrowth(
  points: MonthlyDataPoint[],
  now = new Date()
): number | null {
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;

  const prevQuarter = quarter === 1 ? 4 : quarter - 1;
  const prevYear = quarter === 1 ? year - 1 : year;
  const beforeQuarter = prevQuarter === 1 ? 4 : prevQuarter - 1;
  const beforeYear = prevQuarter === 1 ? prevYear - 1 : prevYear;

  const prevTotal = sumQuarterAmount(points, prevYear, prevQuarter);
  const beforeTotal = sumQuarterAmount(points, beforeYear, beforeQuarter);

  if (prevTotal <= 0 || beforeTotal <= 0) return null;
  return ((prevTotal - beforeTotal) / beforeTotal) * 100;
}

function resolveRevenueGrowthPct(
  cashClose: MonthlyDataPoint[],
  now = new Date()
): { growthPct: number; method: 'mom' | 'qoq' | 'none' } {
  const avgMoM = computeAverageMoMGrowth(cashClose, now);
  if (avgMoM !== null) {
    // Compound three months of average MoM into an approximate quarter growth rate.
    const compounded = (Math.pow(1 + avgMoM / 100, 3) - 1) * 100;
    return { growthPct: compounded, method: 'mom' };
  }

  const qoq = computeQuarterOverQuarterGrowth(cashClose, now);
  if (qoq !== null) {
    return { growthPct: qoq, method: 'qoq' };
  }

  return { growthPct: 0, method: 'none' };
}

function clampGrowth(value: number): number {
  return Math.max(-25, Math.min(50, value));
}

function countMonthsWithData(points: MonthlyDataPoint[]): number {
  return points.filter((p) => p.amount > 0).length;
}

function resolveConfidence(
  cashClose: MonthlyDataPoint[],
  method: 'mom' | 'qoq' | 'none',
  now = new Date()
): QuarterForecast['confidence'] {
  const monthsWithData = countMonthsWithData(cashClose);
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const quarterMonths = getQuarterMonthKeys(year, quarter);
  const quarterDataPoints = quarterMonths.filter((key) =>
    cashClose.some((p) => p.monthKey === key && p.amount > 0)
  ).length;

  if (method !== 'none' && monthsWithData >= 6 && quarterDataPoints >= 2) return 'high';
  if (method !== 'none' && monthsWithData >= 3) return 'medium';
  return 'low';
}

export function computeQuarterForecast(
  summaries: MdMonthlySummaries,
  activeEmployeeCount: number,
  now = new Date()
): QuarterForecast {
  const cashClose = summaries.accountant.cashClose;
  const purchases = summaries.pm.purchases;

  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const nextQuarter = quarter === 4 ? 1 : quarter + 1;
  const nextYear = quarter === 4 ? year + 1 : year;

  const currentQuarterRevenue = extrapolateQuarterTotal(cashClose, now);
  const { growthPct: rawGrowth, method } = resolveRevenueGrowthPct(cashClose, now);
  const revenueGrowthPct = Math.round(clampGrowth(rawGrowth) * 10) / 10;

  const projectedNextQuarterRevenue =
    currentQuarterRevenue > 0
      ? currentQuarterRevenue * (1 + revenueGrowthPct / 100)
      : 0;

  const netStaffingPct = Math.max(0, revenueGrowthPct - EFFICIENCY_GAIN_PCT);
  const workforceNewHires =
    activeEmployeeCount > 0
      ? Math.ceil((activeEmployeeCount * netStaffingPct) / 100)
      : revenueGrowthPct > EFFICIENCY_GAIN_PCT
        ? Math.ceil(netStaffingPct / 10)
        : 0;

  const currentQuarterPurchases = extrapolateQuarterTotal(purchases, now);
  const inventoryInvestment =
    currentQuarterPurchases > 0
      ? currentQuarterPurchases * (1 + revenueGrowthPct / 100)
      : projectedNextQuarterRevenue * 0.35;

  return {
    revenueGrowthPct,
    projectedNextQuarterRevenue,
    currentQuarterRevenue,
    workforceNewHires,
    activeEmployeeCount,
    inventoryInvestment,
    confidence: resolveConfidence(cashClose, method, now),
    dataMonthsUsed: countMonthsWithData(cashClose),
    nextQuarterLabel: quarterLabel(nextYear, nextQuarter),
    currentQuarterLabel: quarterLabel(year, quarter),
  };
}

export function formatGrowthPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatWorkforceHires(count: number): string {
  if (count <= 0) return 'No change';
  return `+${count} hire${count === 1 ? '' : 's'}`;
}

/** Compact UGX label for executive cards (e.g. UGX 52M). */
export function formatCompactUgx(amount: number): string {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  if (safe >= 1_000_000_000) return `UGX ${(safe / 1_000_000_000).toFixed(1)}B`;
  if (safe >= 1_000_000) return `UGX ${Math.round(safe / 1_000_000)}M`;
  if (safe >= 1_000) return `UGX ${Math.round(safe / 1_000)}K`;
  return `UGX ${Math.round(safe)}`;
}
