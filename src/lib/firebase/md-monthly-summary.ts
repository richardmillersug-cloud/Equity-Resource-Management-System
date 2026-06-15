import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './config';
import { firestoreServices } from './firestore-service';
import {
  getInvoiceDate,
  getInvoiceAmount,
  getPaymentAmount,
  getPaymentDate,
  isValidPayment,
  normalizePaymentDoc,
  safeNumber,
  sumOutstanding,
  sumOutstandingFromPaidAmount,
  reconcileOutstandingFromPaidAmount,
  reconciliationToBreakdown,
  toJsDate,
  getPendingChequeTotals,
  type OutstandingBreakdown,
  type OutstandingReconciliation,
} from './invoice-outstanding';

export interface MonthlyDataPoint {
  monthKey: string;
  label: string;
  amount: number;
  count: number;
}

export interface PmMonthlySummary {
  purchases: MonthlyDataPoint[];
  /** Completed payments made during each month (by payment date) */
  payments: MonthlyDataPoint[];
  /** Cumulative unpaid balance at month-end: all invoices dated on/before month-end minus completed payments per invoice */
  loans: MonthlyDataPoint[];
  /** Unpaid balance on invoices dated in that month, as of month-end (or today for current month) */
  monthLoans: MonthlyDataPoint[];
}

export interface AccountantMonthlySummary {
  cashClose: MonthlyDataPoint[];
  expenses: MonthlyDataPoint[];
  pmAssigned: MonthlyDataPoint[];
  pmUsed: MonthlyDataPoint[];
}

export interface MdMonthlySummaries {
  pm: PmMonthlySummary;
  accountant: AccountantMonthlySummary;
  /** Current snapshot: how total outstanding splits between fully unpaid vs partially paid */
  outstandingBreakdown: {
    total: OutstandingBreakdown;
    thisMonth: OutstandingBreakdown;
    pendingCheques: { amount: number; count: number };
  };
  /** Full reconciliation using invoice.paidAmount (matches PM verified totals) */
  reconciliation: OutstandingReconciliation;
}

type TimeframeKey = '1month' | '3months' | '6months' | '12months';

const TIMEFRAME_MONTHS: Record<TimeframeKey, number> = {
  '1month': 1,
  '3months': 3,
  '6months': 6,
  '12months': 12,
};

function monthLabel(date: Date): string {
  return `${date.toLocaleDateString('en-US', { month: 'short' })} '${date.getFullYear().toString().slice(-2)}`;
}

function buildMonthBuckets(monthCount: number): Array<{ monthKey: string; label: string; start: Date; end: Date }> {
  const buckets = [];
  const now = new Date();

  for (let i = monthCount - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;

    buckets.push({ monthKey, label: monthLabel(ref), start, end });
  }

  return buckets;
}

function emptyPoint(bucket: { monthKey: string; label: string }): MonthlyDataPoint {
  return { monthKey: bucket.monthKey, label: bucket.label, amount: 0, count: 0 };
}

function getAllocationDate(allocation: Record<string, unknown>): Date | null {
  if (allocation.status === 'accepted') {
    const accepted = toJsDate(allocation.acceptedAt ?? allocation.actionDate);
    if (accepted) return accepted;
  }
  return (
    toJsDate(allocation.allocationDate) ??
    toJsDate(allocation.createdAt) ??
    toJsDate(allocation.businessDate)
  );
}

function getAllocationAmount(allocation: Record<string, unknown>): number {
  return safeNumber(
    allocation.amount ??
      allocation.purchasingManagerAmount ??
      allocation.purchasingManager ??
      0
  );
}

function getCashCloseDate(close: Record<string, unknown>): Date | null {
  return (
    toJsDate(close.closeCashTime) ??
    toJsDate(close.cashCloseDate) ??
    toJsDate(close.date) ??
    toJsDate(close.createdAt)
  );
}

function getCashCloseAmount(close: Record<string, unknown>): number {
  return safeNumber(
    close.totalSales ??
      close.totalRevenue ??
      close.closeCash ??
      close.totalCashInTill ??
      0
  );
}

function getExpenseDate(expense: Record<string, unknown>): Date | null {
  return toJsDate(expense.expenseDate ?? expense.date ?? expense.createdAt);
}

function isInRange(date: Date | null, start: Date, end: Date): boolean {
  return !!date && date >= start && date <= end;
}

export async function loadMdMonthlySummaries(
  timeframe: TimeframeKey = '12months'
): Promise<MdMonthlySummaries> {
  const monthCount = TIMEFRAME_MONTHS[timeframe] ?? 12;
  const buckets = buildMonthBuckets(monthCount);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [invoices, expenses, cashCloses, cashAllocations, paymentsSnapshot] = await Promise.all([
    firestoreServices.invoice.getAll(),
    firestoreServices.expense.getAll(),
    firestoreServices.cashClose.getAll([], { orderBy: 'createdAt', orderDirection: 'desc', limit: 500 }),
    firestoreServices.cashAllocation.getAll(),
    getDocs(query(collection(db, 'invoicePayments'), orderBy('paymentDate', 'desc'))),
  ]);

  const payments = paymentsSnapshot.docs.map((doc) =>
    normalizePaymentDoc(doc.id, doc.data() as Record<string, unknown>)
  );

  const invoiceList = invoices as Array<{ id: string } & Record<string, unknown>>;

  const purchases = buckets.map((bucket) => {
    const monthInvoices = invoices.filter((invoice: Record<string, unknown>) =>
      isInRange(getInvoiceDate(invoice), bucket.start, bucket.end)
    );
    return {
      ...emptyPoint(bucket),
      amount: monthInvoices.reduce(
        (sum: number, inv: Record<string, unknown>) => sum + getInvoiceAmount(inv),
        0
      ),
      count: monthInvoices.length,
    };
  });

  const paymentPoints = buckets.map((bucket) => {
    const monthPayments = payments.filter(
      (payment) =>
        isInRange(getPaymentDate(payment), bucket.start, bucket.end) && isValidPayment(payment)
    );
    return {
      ...emptyPoint(bucket),
      amount: monthPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0),
      count: monthPayments.length,
    };
  });

  const loanPoints = buckets.map((bucket) => {
    const isCurrentMonth = bucket.monthKey === currentMonthKey;
    if (isCurrentMonth) {
      const result = sumOutstandingFromPaidAmount(invoiceList);
      return { ...emptyPoint(bucket), amount: result.amount, count: result.count };
    }
    const asOf = bucket.end;
    const result = sumOutstanding(
      invoiceList,
      payments,
      asOf,
      (invoiceDate) => invoiceDate <= asOf
    );
    return { ...emptyPoint(bucket), amount: result.amount, count: result.count };
  });

  const monthLoanPoints = buckets.map((bucket) => {
    const isCurrentMonth = bucket.monthKey === currentMonthKey;
    if (isCurrentMonth) {
      const result = sumOutstandingFromPaidAmount(
        invoiceList,
        (invoiceDate) => isInRange(invoiceDate, bucket.start, bucket.end)
      );
      return { ...emptyPoint(bucket), amount: result.amount, count: result.count };
    }
    const asOf = bucket.end;
    const result = sumOutstanding(
      invoiceList,
      payments,
      asOf,
      (invoiceDate) => isInRange(invoiceDate, bucket.start, bucket.end)
    );
    return { ...emptyPoint(bucket), amount: result.amount, count: result.count };
  });

  const cashClosePoints = buckets.map((bucket) => {
    const monthCloses = cashCloses.filter((close: Record<string, unknown>) =>
      isInRange(getCashCloseDate(close), bucket.start, bucket.end)
    );
    return {
      ...emptyPoint(bucket),
      amount: monthCloses.reduce(
        (sum: number, close: Record<string, unknown>) => sum + getCashCloseAmount(close),
        0
      ),
      count: monthCloses.length,
    };
  });

  const expensePoints = buckets.map((bucket) => {
    const monthExpenses = expenses.filter((expense: Record<string, unknown>) =>
      isInRange(getExpenseDate(expense), bucket.start, bucket.end)
    );
    return {
      ...emptyPoint(bucket),
      amount: monthExpenses.reduce(
        (sum: number, exp: Record<string, unknown>) => sum + safeNumber(exp.amount),
        0
      ),
      count: monthExpenses.length,
    };
  });

  const pmAssignedPoints = buckets.map((bucket) => {
    const monthAllocations = cashAllocations.filter((allocation: Record<string, unknown>) => {
      if (allocation.status !== 'accepted') return false;
      return isInRange(getAllocationDate(allocation), bucket.start, bucket.end);
    });
    return {
      ...emptyPoint(bucket),
      amount: monthAllocations.reduce(
        (sum: number, alloc: Record<string, unknown>) => sum + getAllocationAmount(alloc),
        0
      ),
      count: monthAllocations.length,
    };
  });

  const pmUsedPoints = buckets.map((bucket) => {
    const monthPayments = payments.filter(
      (payment) =>
        isInRange(getPaymentDate(payment), bucket.start, bucket.end) && isValidPayment(payment)
    );
    return {
      ...emptyPoint(bucket),
      amount: monthPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0),
      count: monthPayments.length,
    };
  });

  const lastBucket = buckets[buckets.length - 1];
  const reconciliation = reconcileOutstandingFromPaidAmount(invoiceList);
  const outstandingBreakdown = {
    total: reconciliationToBreakdown(reconciliation),
    thisMonth: sumOutstandingFromPaidAmount(
      invoiceList,
      (invoiceDate) => isInRange(invoiceDate, lastBucket.start, lastBucket.end)
    ),
    pendingCheques: getPendingChequeTotals(payments),
  };

  return {
    pm: {
      purchases,
      payments: paymentPoints,
      loans: loanPoints,
      monthLoans: monthLoanPoints,
    },
    accountant: {
      cashClose: cashClosePoints,
      expenses: expensePoints,
      pmAssigned: pmAssignedPoints,
      pmUsed: pmUsedPoints,
    },
    outstandingBreakdown,
    reconciliation,
  };
}

export function getPmCurrentMonthTotals(summaries: MdMonthlySummaries) {
  const last = summaries.pm.purchases.length - 1;
  return {
    purchases: summaries.pm.purchases[last]?.amount ?? 0,
    payments: summaries.pm.payments[last]?.amount ?? 0,
    /** Cumulative outstanding (invoice.paidAmount, matches PM reconciliation) */
    loans: summaries.pm.loans[last]?.amount ?? 0,
    /** Same-month invoice outstanding — matches PM monthly view for the current month */
    monthLoans: summaries.pm.monthLoans[last]?.amount ?? 0,
  };
}

export function getAccountantCurrentMonthTotals(summaries: MdMonthlySummaries) {
  const last = summaries.accountant.cashClose.length - 1;
  const assigned = summaries.accountant.pmAssigned[last]?.amount ?? 0;
  const used = summaries.accountant.pmUsed[last]?.amount ?? 0;
  return {
    cashClose: summaries.accountant.cashClose[last]?.amount ?? 0,
    expenses: summaries.accountant.expenses[last]?.amount ?? 0,
    pmAssigned: assigned,
    pmUsed: used,
    pmUtilization: assigned > 0 ? (used / assigned) * 100 : 0,
  };
}

/** Sum cash close revenue and expenses across the selected timeframe */
export function getAccountantPeriodTotals(summaries: MdMonthlySummaries) {
  const revenue = summaries.accountant.cashClose.reduce((sum, p) => sum + p.amount, 0);
  const expenses = summaries.accountant.expenses.reduce((sum, p) => sum + p.amount, 0);
  const netProfit = revenue - expenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const closes = summaries.accountant.cashClose;
  let revenueGrowth = 0;
  let hasGrowth = false;
  if (closes.length >= 2) {
    const last = closes[closes.length - 1].amount;
    const prev = closes[closes.length - 2].amount;
    if (prev > 0) {
      revenueGrowth = ((last - prev) / prev) * 100;
      hasGrowth = true;
    }
  }

  return { revenue, expenses, netProfit, profitMargin, revenueGrowth, hasGrowth };
}
