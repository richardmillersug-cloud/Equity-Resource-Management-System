/**
 * Shared outstanding-balance calculations for MD/PM dashboards and reporting.
 * Authoritative totals use invoice.paidAmount (matches PM reconciliation).
 * invoicePayments-based helpers remain for historical month-end trend charts.
 */

export function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const ts = value as { toDate?: () => Date };
  if (typeof ts.toDate === 'function') {
    const d = ts.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}

export function safeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function getInvoiceDate(invoice: Record<string, unknown>): Date | null {
  return toJsDate(invoice.date ?? invoice.createdAt);
}

export function getInvoiceAmount(invoice: Record<string, unknown>): number {
  return safeNumber(
    invoice.amount ?? invoice.amountInDigits ?? invoice.totalAmount ?? 0
  );
}

export function getPaymentAmount(payment: Record<string, unknown>): number {
  return safeNumber(
    payment.amount ?? payment.paidAmount ?? payment.paymentAmount ?? 0
  );
}

export function getPaymentDate(payment: Record<string, unknown>): Date | null {
  const primary = toJsDate(payment.paymentDate);
  if (primary) return primary;
  if (payment.paymentStatus === 'completed' || !payment.paymentStatus) {
    const processed = toJsDate(payment.processedAt);
    if (processed) return processed;
  }
  return toJsDate(payment.createdAt);
}

export function isChequePayment(payment: Record<string, unknown>): boolean {
  const method = payment.paymentMethod as { type?: string; status?: string } | undefined;
  return method?.type === 'cheque';
}

/** Cheque is a confirmed payment only after it is cleared. */
export function isClearedCheque(payment: Record<string, unknown>): boolean {
  if (!isChequePayment(payment)) return false;
  const status = payment.paymentStatus as string | undefined;
  if (status === 'failed' || status === 'cancelled' || status === 'pending') {
    return false;
  }
  const method = payment.paymentMethod as { status?: string } | undefined;
  return (
    status === 'completed' ||
    Boolean(payment.clearedAt) ||
    method?.status === 'cleared'
  );
}

/**
 * Confirmed payments only.
 * Cash / bank / mobile: completed or paid (legacy missing status = completed).
 * Cheques: not counted until marked cleared (paymentStatus completed / clearedAt).
 * Use for wallet / ledger debits and available balance.
 */
export function isValidPayment(payment: Record<string, unknown>): boolean {
  const status = payment.paymentStatus as string | undefined;

  if (status === 'failed' || status === 'cancelled') {
    return false;
  }

  if (isChequePayment(payment)) {
    return isClearedCheque(payment);
  }

  // Non-cheque: completed/paid, or legacy records without status
  const normalized = (status || 'completed').toLowerCase();
  return normalized === 'completed' || normalized === 'paid';
}

/**
 * Payments for Purchase & Payment Trends / monthly “Payments” totals.
 * Includes pending cheques (issued but not yet cleared). Excludes failed/cancelled/bounced.
 * Bucket by paymentDate (issue date), not clearance date.
 */
export function isRecordedPayment(payment: Record<string, unknown>): boolean {
  const status = (payment.paymentStatus as string | undefined)?.toLowerCase();
  if (status === 'failed' || status === 'cancelled') {
    return false;
  }

  if (isChequePayment(payment)) {
    const method = payment.paymentMethod as { status?: string } | undefined;
    const methodStatus = method?.status?.toLowerCase();
    if (methodStatus === 'bounced' || methodStatus === 'cancelled') {
      return false;
    }
    return true;
  }

  const normalized = (status || 'completed').toLowerCase();
  return (
    normalized === 'completed' ||
    normalized === 'paid' ||
    normalized === 'pending'
  );
}

/**
 * Date used when summing confirmed wallet debits in a period.
 * Cleared cheques use clearedAt when present.
 */
export function getConfirmedPaymentDate(payment: Record<string, unknown>): Date | null {
  if (isChequePayment(payment) && isClearedCheque(payment)) {
    return toJsDate(payment.clearedAt) ?? getPaymentDate(payment);
  }
  return getPaymentDate(payment);
}

export function normalizePaymentDoc(
  id: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    id,
    ...data,
    amount: getPaymentAmount(data),
    paymentDate: toJsDate(data.paymentDate) ?? data.paymentDate,
    createdAt: toJsDate(data.createdAt) ?? data.createdAt,
    processedAt: toJsDate(data.processedAt) ?? data.processedAt,
    clearedAt: toJsDate(data.clearedAt) ?? data.clearedAt,
  };
}

/** Outstanding on a single invoice as of a point in time. */
export function getInvoiceOutstandingAt(
  invoice: { id: string } & Record<string, unknown>,
  payments: Record<string, unknown>[],
  asOf: Date
): number {
  const invoiceAmount = getInvoiceAmount(invoice);
  const paidUpTo = payments
    .filter((payment) => {
      const paymentDate = getPaymentDate(payment);
      return (
        payment.invoiceId === invoice.id &&
        isValidPayment(payment) &&
        paymentDate &&
        paymentDate <= asOf
      );
    })
    .reduce((sum, p) => sum + getPaymentAmount(p), 0);
  return Math.max(0, invoiceAmount - paidUpTo);
}

export interface OutstandingBreakdown {
  amount: number;
  count: number;
  fullyUnpaid: { amount: number; count: number };
  partiallyPaid: { amount: number; count: number };
}

export function sumOutstanding(
  invoices: Array<{ id: string } & Record<string, unknown>>,
  payments: Record<string, unknown>[],
  asOf: Date,
  filter: (invoiceDate: Date) => boolean
): OutstandingBreakdown {
  let amount = 0;
  let count = 0;
  let fullyUnpaidAmount = 0;
  let fullyUnpaidCount = 0;
  let partiallyPaidAmount = 0;
  let partiallyPaidCount = 0;

  invoices.forEach((invoice) => {
    const invoiceDate = getInvoiceDate(invoice);
    if (!invoiceDate || !filter(invoiceDate)) return;

    const invoiceAmount = getInvoiceAmount(invoice);
    const remaining = getInvoiceOutstandingAt(invoice, payments, asOf);
    if (remaining <= 0) return;

    count++;
    amount += remaining;

    const completedPaid = invoiceAmount - remaining;
    if (completedPaid > 0 && completedPaid < invoiceAmount) {
      partiallyPaidCount++;
      partiallyPaidAmount += remaining;
    } else {
      fullyUnpaidCount++;
      fullyUnpaidAmount += remaining;
    }
  });

  return {
    amount,
    count,
    fullyUnpaid: { amount: fullyUnpaidAmount, count: fullyUnpaidCount },
    partiallyPaid: { amount: partiallyPaidAmount, count: partiallyPaidCount },
  };
}

export function getPendingChequeTotals(payments: Record<string, unknown>[]): {
  amount: number;
  count: number;
} {
  const pending = payments.filter(
    (payment) => isChequePayment(payment) && payment.paymentStatus === 'pending'
  );
  return {
    amount: pending.reduce((sum, p) => sum + getPaymentAmount(p), 0),
    count: pending.length,
  };
}

/** Cumulative unpaid balance across all invoices dated on/before asOf. */
export function getTotalOutstanding(
  invoices: Array<{ id: string } & Record<string, unknown>>,
  payments: Record<string, unknown>[],
  asOf: Date = new Date()
): number {
  return sumOutstanding(invoices, payments, asOf, (invoiceDate) => invoiceDate <= asOf).amount;
}

export interface OutstandingReconciliation {
  totalInvoices: number;
  sumAllInvoices: number;
  sumCompletelyPaid: number;
  sumPartialPayments: number;
  totalOutstanding: number;
  countCompletelyPaid: number;
  countPartial: number;
  countFullyUnpaid: number;
  sumFullyUnpaidRemaining: number;
  sumPartialRemaining: number;
  sumsMatch: boolean;
}

function classifyInvoiceByPaidAmount(amount: number, paid: number): 'paid' | 'partial' | 'unpaid' {
  const remaining = Math.max(0, amount - paid);
  if (amount > 0 && paid >= amount) return 'paid';
  if (paid > 0 && paid < amount) return 'partial';
  if (remaining > 0) return 'unpaid';
  return 'paid';
}

/** Full reconciliation panel — sum of all invoices minus paid portions (PM-verified method). */
export function reconcileOutstandingFromPaidAmount(
  invoices: Array<{ id: string } & Record<string, unknown>>
): OutstandingReconciliation {
  let sumAllInvoices = 0;
  let sumCompletelyPaid = 0;
  let sumPartialPayments = 0;
  let countCompletelyPaid = 0;
  let countPartial = 0;
  let countFullyUnpaid = 0;
  let sumFullyUnpaidRemaining = 0;
  let sumPartialRemaining = 0;

  invoices.forEach((invoice) => {
    const amount = getInvoiceAmount(invoice);
    const paid = safeNumber(invoice.paidAmount);
    const remaining = Math.max(0, amount - paid);
    const category = classifyInvoiceByPaidAmount(amount, paid);

    sumAllInvoices += amount;

    if (category === 'paid' && amount > 0) {
      sumCompletelyPaid += amount;
      countCompletelyPaid++;
    } else if (category === 'partial') {
      sumPartialPayments += paid;
      sumPartialRemaining += remaining;
      countPartial++;
    } else if (category === 'unpaid') {
      sumFullyUnpaidRemaining += remaining;
      countFullyUnpaid++;
    }
  });

  const totalOutstanding = sumAllInvoices - sumCompletelyPaid - sumPartialPayments;
  const remainingSum = sumFullyUnpaidRemaining + sumPartialRemaining;

  return {
    totalInvoices: invoices.length,
    sumAllInvoices,
    sumCompletelyPaid,
    sumPartialPayments,
    totalOutstanding,
    countCompletelyPaid,
    countPartial,
    countFullyUnpaid,
    sumFullyUnpaidRemaining,
    sumPartialRemaining,
    sumsMatch: Math.abs(totalOutstanding - remainingSum) < 1,
  };
}

/** Remaining balances from invoice.paidAmount, optionally filtered by invoice date. */
export function sumOutstandingFromPaidAmount(
  invoices: Array<{ id: string } & Record<string, unknown>>,
  filter?: (invoiceDate: Date) => boolean
): OutstandingBreakdown {
  let amount = 0;
  let count = 0;
  let fullyUnpaidAmount = 0;
  let fullyUnpaidCount = 0;
  let partiallyPaidAmount = 0;
  let partiallyPaidCount = 0;

  invoices.forEach((invoice) => {
    const invoiceDate = getInvoiceDate(invoice);
    if (filter && (!invoiceDate || !filter(invoiceDate))) return;

    const invoiceAmount = getInvoiceAmount(invoice);
    const paid = safeNumber(invoice.paidAmount);
    const remaining = Math.max(0, invoiceAmount - paid);
    if (remaining <= 0) return;

    count++;
    amount += remaining;

    if (paid > 0 && paid < invoiceAmount) {
      partiallyPaidCount++;
      partiallyPaidAmount += remaining;
    } else {
      fullyUnpaidCount++;
      fullyUnpaidAmount += remaining;
    }
  });

  return {
    amount,
    count,
    fullyUnpaid: { amount: fullyUnpaidAmount, count: fullyUnpaidCount },
    partiallyPaid: { amount: partiallyPaidAmount, count: partiallyPaidCount },
  };
}

export function reconciliationToBreakdown(
  reconciliation: OutstandingReconciliation
): OutstandingBreakdown {
  return {
    amount: reconciliation.totalOutstanding,
    count: reconciliation.countFullyUnpaid + reconciliation.countPartial,
    fullyUnpaid: {
      amount: reconciliation.sumFullyUnpaidRemaining,
      count: reconciliation.countFullyUnpaid,
    },
    partiallyPaid: {
      amount: reconciliation.sumPartialRemaining,
      count: reconciliation.countPartial,
    },
  };
}

/** Total outstanding from invoice.paidAmount (matches PM supplier-totals / reconciliation). */
export function getTotalOutstandingFromPaidAmount(
  invoices: Array<{ id: string } & Record<string, unknown>>
): number {
  return reconcileOutstandingFromPaidAmount(invoices).totalOutstanding;
}

/** Unpaid balance on invoices dated within [monthStart, monthEnd] via invoice.paidAmount. */
export function getMonthOutstandingFromPaidAmount(
  invoices: Array<{ id: string } & Record<string, unknown>>,
  monthStart: Date,
  monthEnd: Date
): number {
  return sumOutstandingFromPaidAmount(
    invoices,
    (invoiceDate) => invoiceDate >= monthStart && invoiceDate <= monthEnd
  ).amount;
}

/** Unpaid balance on invoices dated within [monthStart, monthEnd], as of asOf. */
export function getMonthOutstanding(
  invoices: Array<{ id: string } & Record<string, unknown>>,
  payments: Record<string, unknown>[],
  monthStart: Date,
  monthEnd: Date,
  asOf: Date
): number {
  return sumOutstanding(
    invoices,
    payments,
    asOf,
    (invoiceDate) => invoiceDate >= monthStart && invoiceDate <= monthEnd
  ).amount;
}
