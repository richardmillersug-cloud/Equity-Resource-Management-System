import {
  computeAverageMoMGrowth,
  computeQuarterForecast,
  extrapolateQuarterTotal,
  formatCompactUgx,
  formatGrowthPct,
  formatWorkforceHires,
} from '../lib/firebase/md-quarter-forecast';
import type { MdMonthlySummaries } from '../lib/firebase/md-monthly-summary';

function buildSummaries(
  cashClose: Array<{ monthKey: string; amount: number }>,
  purchases: Array<{ monthKey: string; amount: number }> = cashClose.map((p) => ({
    ...p,
    amount: p.amount * 0.4,
  }))
): MdMonthlySummaries {
  const toPoints = (rows: Array<{ monthKey: string; amount: number }>) =>
    rows.map((row) => ({
      monthKey: row.monthKey,
      label: row.monthKey,
      amount: row.amount,
      count: 1,
    }));

  return {
    pm: {
      purchases: toPoints(purchases),
      payments: toPoints(purchases),
      loans: toPoints(purchases),
      monthLoans: toPoints(purchases),
    },
    accountant: {
      cashClose: toPoints(cashClose),
      expenses: toPoints(cashClose.map((p) => ({ ...p, amount: p.amount * 0.2 }))),
      pmAssigned: toPoints(purchases),
      pmUsed: toPoints(purchases),
    },
    outstandingBreakdown: {
      total: {
        fullyUnpaid: { count: 0, amount: 0 },
        partiallyPaid: { count: 0, amount: 0 },
      },
      thisMonth: {
        fullyUnpaid: { count: 0, amount: 0 },
        partiallyPaid: { count: 0, amount: 0 },
      },
      pendingCheques: { amount: 0, count: 0 },
    },
    reconciliation: {
      totalInvoices: 0,
      sumAllInvoices: 0,
      sumCompletelyPaid: 0,
      sumPartialPayments: 0,
      totalOutstanding: 0,
      countCompletelyPaid: 0,
      countPartial: 0,
      countFullyUnpaid: 0,
      sumFullyUnpaidRemaining: 0,
      sumPartialRemaining: 0,
      sumsMatch: true,
    },
  };
}

describe('md-quarter-forecast', () => {
  const now = new Date(2026, 5, 15); // June 15, 2026 — Q2

  it('computes average MoM growth from recent months', () => {
    const growth = computeAverageMoMGrowth([
      { monthKey: '2026-01', label: 'Jan', amount: 100, count: 1 },
      { monthKey: '2026-02', label: 'Feb', amount: 110, count: 1 },
      { monthKey: '2026-03', label: 'Mar', amount: 121, count: 1 },
    ]);

    expect(growth).toBeCloseTo(10, 1);
  });

  it('extrapolates the current month within the quarter', () => {
    const total = extrapolateQuarterTotal(
      [
        { monthKey: '2026-04', label: 'Apr', amount: 30_000_000, count: 1 },
        { monthKey: '2026-05', label: 'May', amount: 33_000_000, count: 1 },
        { monthKey: '2026-06', label: 'Jun', amount: 15_000_000, count: 1 },
      ],
      now
    );

    expect(total).toBeGreaterThan(90_000_000);
    expect(total).toBeLessThan(95_000_000);
  });

  it('derives workforce hires from revenue growth and headcount', () => {
    const summaries = buildSummaries([
      { monthKey: '2026-01', amount: 20_000_000 },
      { monthKey: '2026-02', amount: 22_000_000 },
      { monthKey: '2026-03', amount: 24_000_000 },
      { monthKey: '2026-04', amount: 26_000_000 },
      { monthKey: '2026-05', amount: 28_000_000 },
      { monthKey: '2026-06', amount: 14_000_000 },
    ]);

    const forecast = computeQuarterForecast(summaries, 100, now);

    expect(forecast.revenueGrowthPct).toBeGreaterThan(0);
    expect(forecast.workforceNewHires).toBeGreaterThan(0);
    expect(forecast.inventoryInvestment).toBeGreaterThan(0);
    expect(forecast.nextQuarterLabel).toBe('Q3 2026');
    expect(forecast.currentQuarterLabel).toBe('Q2 2026');
  });

  it('formats executive card values', () => {
    expect(formatGrowthPct(15.8)).toBe('+15.8%');
    expect(formatWorkforceHires(12)).toBe('+12 hires');
    expect(formatCompactUgx(52_000_000)).toBe('UGX 52M');
  });
});
