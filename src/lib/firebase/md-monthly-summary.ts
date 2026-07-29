import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './config';
import { firestoreServices } from './firestore-service';
import {
  getInvoiceDate,
  getInvoiceAmount,
  getPaymentAmount,
  getPaymentDate,
  getConfirmedPaymentDate,
  isValidPayment,
  isRecordedPayment,
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
  /** Payments in each month (payment date; includes pending cheques) — all makers */
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

/** Per-PM activity for the current calendar month + ledger-style available balance */
export interface ActivePmMonthActivity {
  uid: string;
  name: string;
  assignedThisMonth: number;
  usedThisMonth: number;
  /** Lifetime credits − debits for Muhammad Sebunya only (same formula as PM Account ledger) */
  availableBalance: number;
  allocationCount: number;
  paymentCount: number;
}

export interface PmFundsAudit {
  monthKey: string;
  label: string;
  /** PMs with accepted allocations or spending this month */
  activePms: ActivePmMonthActivity[];
  onlyActivePm: ActivePmMonthActivity | null;
  totalAssignedThisMonth: number;
  totalUsedThisMonth: number;
  /** Sum of available balances for active PMs (matches ledger when one PM) */
  totalAvailableBalance: number;
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
  /** Proof + corrected PM fund figures for Muhammad Sebunya’s wallet only */
  pmFundsAudit: PmFundsAudit;
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
  // Same field as PMAccountLedger credits
  return safeNumber(allocation.amount);
}

function getLedgerPaymentDebitAmount(payment: Record<string, unknown>): number {
  // Same field order as PMAccountLedger invoice/expense debits
  return safeNumber(payment.paymentAmount ?? payment.amount ?? payment.paidAmount);
}

/**
 * All-time wallet balance for one PM — same rules as PMAccountLedger:
 * credits = accepted allocations.amount + pmDeposits
 * debits  = invoice/expense payments that reduce the wallet
 *           (cheques only after clearance — isValidPayment)
 */
function computePmAccountLedgerBalance(
  uid: string,
  cashAllocations: Array<Record<string, unknown>>,
  invoicePayments: Array<Record<string, unknown>>,
  expensePayments: Array<Record<string, unknown>>,
  deposits: Array<Record<string, unknown>>
): number {
  let credits = 0;
  let debits = 0;

  for (const allocation of cashAllocations) {
    if (allocation.status !== 'accepted') continue;
    if (getAllocationPmId(allocation) !== uid) continue;
    credits += safeNumber(allocation.amount);
  }

  for (const deposit of deposits) {
    if (String(deposit.pmId || '') !== uid) continue;
    credits += safeNumber(deposit.amount);
  }

  for (const payment of invoicePayments) {
    if (getPaymentPmId(payment) !== uid) continue;
    if (!isValidPayment(payment)) continue;
    debits += getLedgerPaymentDebitAmount(payment);
  }

  for (const payment of expensePayments) {
    if (getPaymentPmId(payment) !== uid) continue;
    if (!isValidPayment(payment)) continue;
    debits += getLedgerPaymentDebitAmount(payment);
  }

  return credits - debits;
}

function getAllocationPmId(allocation: Record<string, unknown>): string {
  return String(
    allocation.allocatedTo || allocation.pmId || allocation.recipientId || ''
  );
}

function getPaymentPmId(payment: Record<string, unknown>): string {
  return String(payment.paidBy || payment.createdBy || '');
}

function hasPrivilegedNonPmTitle(emp: {
  roles?: Array<{ jobTitle?: string }>;
}): boolean {
  const roles = emp.roles || [];
  return roles.some((r) => {
    const title = (r.jobTitle || '').toLowerCase();
    return (
      title === 'admin' ||
      title === 'system admin' ||
      title === 'super admin' ||
      title === 'superadmin' ||
      title === 'managing director'
    );
  });
}

/** Operational PM wallet holders only — Admin / MD accounts are excluded (balance & used stay 0). */
function isPurchaseManagerEmployee(emp: {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: Array<{ jobTitle?: string }>;
  employmentStatus?: string;
}): boolean {
  if (hasPrivilegedNonPmTitle(emp)) return false;
  const roles = emp.roles || [];
  return roles.some((r) => {
    const title = (r.jobTitle || '').toLowerCase();
    return title === 'purchase manager' || title === 'purchasing manager';
  });
}

/**
 * PM Funds — Assigned vs Used is locked to Muhammad Sebunya’s wallet only.
 * Matches name (Muhammad/Mohammed + Sebunya) or email containing sebunya.
 */
function isPmFundsPrimaryAccount(emp: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): boolean {
  const first = (emp.firstName || '').trim().toLowerCase();
  const last = (emp.lastName || '').trim().toLowerCase();
  const full = `${first} ${last}`.trim();
  const email = (emp.email || '').trim().toLowerCase();

  const isSebunya = last === 'sebunya' || full.includes('sebunya') || email.includes('sebunya');
  if (!isSebunya) return false;

  const firstOk =
    !first ||
    first.includes('muhammad') ||
    first.includes('mohammed') ||
    first.includes('mohamed') ||
    first.includes('muhammed');

  return firstOk;
}

function employeeDisplayName(emp: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
  return name || emp.email || 'Purchase Manager';
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

  const [invoices, expenses, cashCloses, cashAllocations, paymentsSnapshot, expensePaySnap, depositSnap, employees] =
    await Promise.all([
      firestoreServices.invoice.getAll(),
      firestoreServices.expense.getAll(),
      firestoreServices.cashClose.getAll([], { orderBy: 'createdAt', orderDirection: 'desc', limit: 500 }),
      firestoreServices.cashAllocation.getAll(),
      getDocs(query(collection(db, 'invoicePayments'), orderBy('paymentDate', 'desc'))),
      getDocs(collection(db, 'expensePayments')),
      getDocs(collection(db, 'pmDeposits')),
      firestoreServices.employee.getAll(),
    ]);

  const payments = paymentsSnapshot.docs.map((docSnap) =>
    normalizePaymentDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
  );

  const expensePayments: Array<Record<string, unknown> & { id: string }> = expensePaySnap.docs.map(
    (docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Record<string, unknown>),
    })
  );

  const pmDeposits = depositSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Record<string, unknown>),
  }));

  /** PM Funds metrics use Muhammad Sebunya only (not every PM account). */
  const pmEmployees = (employees as Array<Record<string, unknown> & { id: string }>)
    .filter((emp) => isPurchaseManagerEmployee(emp))
    .filter((emp) =>
      isPmFundsPrimaryAccount(
        emp as { firstName?: string; lastName?: string; email?: string }
      )
    );
  const pmIds = new Set(pmEmployees.map((emp) => emp.id));
  const pmNameById = new Map(
    pmEmployees.map((emp) => [
      emp.id,
      employeeDisplayName(emp as { firstName?: string; lastName?: string; email?: string }),
    ])
  );

  /** Accepted allocations that went to a known Purchase Manager account */
  const pmAllocations = (cashAllocations as Array<Record<string, unknown>>).filter((allocation) => {
    if (allocation.status !== 'accepted') return false;
    const pmId = getAllocationPmId(allocation);
    return pmId && pmIds.has(pmId);
  });

  /** Invoice payments by Sebunya (confirmed only — month “Used” / charts) */
  const pmInvoicePayments = payments.filter((payment) => {
    const pmId = getPaymentPmId(payment);
    return pmId && pmIds.has(pmId) && isValidPayment(payment);
  });

  const pmExpensePayments: Array<Record<string, unknown> & { id: string }> =
    expensePayments.filter((payment) => {
      const pmId = getPaymentPmId(payment);
      return Boolean(pmId && pmIds.has(pmId));
    });

  const getExpensePaymentDate = (payment: Record<string, unknown>): Date | null =>
    toJsDate(payment.paymentDate) ?? toJsDate(payment.createdAt);

  const getExpensePaymentAmount = (payment: Record<string, unknown>): number =>
    getLedgerPaymentDebitAmount(payment);

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
    // Recorded payments this month (includes pending cheques by paymentDate).
    // Wallet / PM Used still use isValidPayment (cleared cheques only).
    let rangeEnd = bucket.end;
    if (bucket.monthKey === currentMonthKey) {
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    }
    const monthPayments = payments.filter((payment) => {
      if (!isRecordedPayment(payment)) return false;
      return isInRange(getPaymentDate(payment), bucket.start, rangeEnd);
    });
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
    const monthAllocations = pmAllocations.filter((allocation) =>
      isInRange(getAllocationDate(allocation), bucket.start, bucket.end)
    );
    return {
      ...emptyPoint(bucket),
      amount: monthAllocations.reduce(
        (sum, alloc) => sum + getAllocationAmount(alloc),
        0
      ),
      count: monthAllocations.length,
    };
  });

  const pmUsedPoints = buckets.map((bucket) => {
    let rangeEnd = bucket.end;
    if (bucket.monthKey === currentMonthKey) {
      rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    }
    const monthInvoicePays = pmInvoicePayments.filter((payment) =>
      isInRange(getConfirmedPaymentDate(payment), bucket.start, rangeEnd)
    );
    const monthExpensePays = pmExpensePayments.filter((payment) => {
      const status = String(
        payment.paymentStatus || payment.status || 'paid'
      ).toLowerCase();
      if (status === 'failed' || status === 'cancelled') return false;
      if (!isValidPayment(payment)) return false;
      return isInRange(getExpensePaymentDate(payment), bucket.start, rangeEnd);
    });
    const invoiceTotal = monthInvoicePays.reduce((sum, p) => sum + getPaymentAmount(p), 0);
    const expenseTotal = monthExpensePays.reduce(
      (sum, p) => sum + getExpensePaymentAmount(p),
      0
    );
    return {
      ...emptyPoint(bucket),
      amount: invoiceTotal + expenseTotal,
      count: monthInvoicePays.length + monthExpensePays.length,
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

  // --- Active PM proof for current month + ledger-style available balance ---
  const activityByPm = new Map<string, ActivePmMonthActivity>();

  const ensurePmActivity = (uid: string): ActivePmMonthActivity => {
    let row = activityByPm.get(uid);
    if (!row) {
      row = {
        uid,
        name: pmNameById.get(uid) || uid,
        assignedThisMonth: 0,
        usedThisMonth: 0,
        availableBalance: 0,
        allocationCount: 0,
        paymentCount: 0,
      };
      activityByPm.set(uid, row);
    }
    return row;
  };

  pmAllocations.forEach((allocation) => {
    const uid = getAllocationPmId(allocation);
    if (!uid || !pmIds.has(uid)) return;
    const amount = getAllocationAmount(allocation);
    const row = ensurePmActivity(uid);
    if (isInRange(getAllocationDate(allocation), lastBucket.start, lastBucket.end)) {
      row.assignedThisMonth += amount;
      row.allocationCount += 1;
    }
  });

  // Confirmed invoice + all expense payments this month → Used
  pmInvoicePayments.forEach((payment) => {
    const uid = getPaymentPmId(payment);
    if (!uid || !pmIds.has(uid)) return;
    const amount = getPaymentAmount(payment);
    const row = ensurePmActivity(uid);
    if (isInRange(getConfirmedPaymentDate(payment), lastBucket.start, lastBucket.end)) {
      row.usedThisMonth += amount;
      row.paymentCount += 1;
    }
  });

  pmExpensePayments.forEach((payment) => {
    const uid = getPaymentPmId(payment);
    if (!uid || !pmIds.has(uid)) return;
    const status = String(
      payment.paymentStatus || payment.status || 'paid'
    ).toLowerCase();
    if (status === 'failed' || status === 'cancelled') return;
    if (!isValidPayment(payment)) return;
    const amount = getExpensePaymentAmount(payment);
    const row = ensurePmActivity(uid);
    if (isInRange(getExpensePaymentDate(payment), lastBucket.start, lastBucket.end)) {
      row.usedThisMonth += amount;
      row.paymentCount += 1;
    }
  });

  // Available balance = exact PM Account ledger wallet (Sebunya only)
  for (const uid of pmIds) {
    const row = ensurePmActivity(uid);
    row.availableBalance = computePmAccountLedgerBalance(
      uid,
      cashAllocations as Array<Record<string, unknown>>,
      payments,
      expensePayments,
      pmDeposits
    );
  }

  // Sebunya-only funds view: show his wallet even when this month’s assigned/used are 0
  const activePms = Array.from(activityByPm.values())
    .filter((pm) => pmIds.has(pm.uid))
    .sort((a, b) => b.assignedThisMonth - a.assignedThisMonth || b.usedThisMonth - a.usedThisMonth);

  if (activePms.length === 0 && pmEmployees.length > 0) {
    for (const emp of pmEmployees) {
      activePms.push(ensurePmActivity(emp.id));
    }
  }

  const onlyActivePm = activePms[0] ?? null;

  const pmFundsAudit: PmFundsAudit = {
    monthKey: lastBucket.monthKey,
    label: lastBucket.label,
    activePms,
    onlyActivePm,
    totalAssignedThisMonth: activePms.reduce((s, p) => s + p.assignedThisMonth, 0),
    totalUsedThisMonth: activePms.reduce((s, p) => s + p.usedThisMonth, 0),
    totalAvailableBalance: onlyActivePm?.availableBalance ?? 0,
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
    pmFundsAudit,
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
  const assigned =
    summaries.pmFundsAudit?.totalAssignedThisMonth ??
    summaries.accountant.pmAssigned[last]?.amount ??
    0;
  const used =
    summaries.pmFundsAudit?.totalUsedThisMonth ??
    summaries.accountant.pmUsed[last]?.amount ??
    0;
  const availableBalance = summaries.pmFundsAudit?.totalAvailableBalance ?? assigned - used;
  return {
    cashClose: summaries.accountant.cashClose[last]?.amount ?? 0,
    expenses: summaries.accountant.expenses[last]?.amount ?? 0,
    pmAssigned: assigned,
    pmUsed: used,
    pmUtilization: assigned > 0 ? (used / assigned) * 100 : 0,
    pmAvailableBalance: availableBalance,
    onlyActivePm: summaries.pmFundsAudit?.onlyActivePm ?? null,
    activePmCount: summaries.pmFundsAudit?.activePms?.length ?? 0,
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
