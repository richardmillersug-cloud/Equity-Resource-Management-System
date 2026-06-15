import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';
import {
  toJsDate,
  getInvoiceDate,
  getInvoiceAmount,
  getPaymentDate,
  getPaymentAmount,
  isChequePayment,
} from './invoice-outstanding';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CashPayDayRow {
  date: string;
  totalCashClose: number;
  pmAllocation: number;
  grossProfit12: number;
  daily100k: number;
  chequesCleared: number;
  purchasesMade: number;
  paymentsMade: number;
}

export interface CashPayTotals {
  totalCashClose: number;
  pmAllocation: number;
  grossProfit12: number;
  daily100k: number;
  chequesCleared: number;
  purchasesMade: number;
  paymentsMade: number;
}

export type CashPayFilterMode = 'month' | 'year';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPeriodKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function matchesFilter(dateKey: string, mode: CashPayFilterMode, value: string): boolean {
  if (mode === 'month') return dateKey.startsWith(value);
  return dateKey.startsWith(`${value}-`);
}

function emptyRow(date: string): CashPayDayRow {
  return {
    date,
    totalCashClose: 0,
    pmAllocation: 0,
    grossProfit12: 0,
    daily100k: 0,
    chequesCleared: 0,
    purchasesMade: 0,
    paymentsMade: 0,
  };
}

function sumTotals(rows: CashPayDayRow[]): CashPayTotals {
  return rows.reduce(
    (acc, r) => ({
      totalCashClose: acc.totalCashClose + r.totalCashClose,
      pmAllocation: acc.pmAllocation + r.pmAllocation,
      grossProfit12: acc.grossProfit12 + r.grossProfit12,
      daily100k: acc.daily100k + r.daily100k,
      chequesCleared: acc.chequesCleared + r.chequesCleared,
      purchasesMade: acc.purchasesMade + r.purchasesMade,
      paymentsMade: acc.paymentsMade + r.paymentsMade,
    }),
    {
      totalCashClose: 0,
      pmAllocation: 0,
      grossProfit12: 0,
      daily100k: 0,
      chequesCleared: 0,
      purchasesMade: 0,
      paymentsMade: 0,
    }
  );
}

function getOrCreateRow(map: Map<string, CashPayDayRow>, dateKey: string): CashPayDayRow {
  if (!map.has(dateKey)) map.set(dateKey, emptyRow(dateKey));
  return map.get(dateKey)!;
}

function resolveShiftCashAmount(shift: Record<string, unknown>): number {
  const shiftTotalCash = Number(shift.shiftTotalCash) || 0;
  if (shiftTotalCash > 0) return shiftTotalCash;

  const tills = shift.tills;
  if (Array.isArray(tills) && tills.length > 0) {
    const tillSum = tills.reduce((sum, till) => {
      const t = till as Record<string, unknown>;
      return (
        sum +
        (Number(t.totalCashInTill) || Number(t.cashAmount) || Number(t.amount) || 0)
      );
    }, 0);
    if (tillSum > 0) return tillSum;
  }

  return Number(shift.shiftTotalRevenue) || 0;
}

/** Sum all shift closes (day + night) for one cash-close document. */
function resolveCashCloseAmount(raw: Record<string, unknown>): number {
  const shifts = raw.shifts;
  if (Array.isArray(shifts) && shifts.length > 0) {
    const shiftSum = shifts.reduce(
      (sum, shift) => sum + resolveShiftCashAmount(shift as Record<string, unknown>),
      0
    );
    if (shiftSum > 0) return shiftSum;
  }

  return (
    Number(raw.totalCashInTill) ||
    Number(raw.closeCash) ||
    Number(raw.totalActualCash) ||
    Number(raw.actualAmount) ||
    Number(raw.totalRevenue) ||
    0
  );
}

function getCashCloseBusinessDateKey(raw: Record<string, unknown>): string | null {
  const businessDate = raw.businessDate;
  if (typeof businessDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) return businessDate;
    const parsed = toJsDate(businessDate);
    if (parsed) return toDateKey(parsed);
  } else if (businessDate) {
    const parsed = toJsDate(businessDate);
    if (parsed) return toDateKey(parsed);
  }

  const dateObj =
    toJsDate(raw.cashCloseDate) ?? toJsDate(raw.date) ?? toJsDate(raw.createdAt);
  if (!dateObj) return null;
  return toDateKey(dateObj);
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

export async function fetchCashPayData(branchId?: string) {
  const [cashClosesSnap, allocationsSnap, paymentsSnap, invoicesSnap, ledgerSnap] =
    await Promise.all([
      getDocs(collection(db, 'cashCloses')),
      getDocs(collection(db, 'cashAllocations')),
      getDocs(collection(db, 'invoicePayments')),
      getDocs(collection(db, 'invoices')),
      getDocs(collection(db, 'walletLedger')),
    ]);

  const cashCloses = cashClosesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const allocations = allocationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const invoices = invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ledgerEntries = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const branchFilter = (item: Record<string, unknown>) =>
    !branchId || branchId === 'default-branch' || item.branchId === branchId;

  return {
    cashCloses: cashCloses.filter(branchFilter),
    allocations: allocations.filter(branchFilter),
    payments,
    invoices,
    ledgerEntries: ledgerEntries.filter(branchFilter),
  };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

export function buildCashPayRows(
  data: Awaited<ReturnType<typeof fetchCashPayData>>,
  mode: CashPayFilterMode,
  filterValue: string
): { rows: CashPayDayRow[]; totals: CashPayTotals } {
  const map = new Map<string, CashPayDayRow>();

  // Cash closes — sum all closes (day + night) per business day
  for (const close of data.cashCloses) {
    const raw = close as Record<string, unknown>;
    const dateKey = getCashCloseBusinessDateKey(raw);
    if (!dateKey || !matchesFilter(dateKey, mode, filterValue)) continue;

    const row = getOrCreateRow(map, dateKey);
    row.totalCashClose += resolveCashCloseAmount(raw);
  }

  // PM allocations — accepted/completed allocations per business day
  for (const alloc of data.allocations) {
    const raw = alloc as Record<string, unknown>;
    const status = String(raw.status || '');
    if (status !== 'accepted' && status !== 'completed' && status !== 'acknowledged') continue;

    const dateObj =
      (typeof raw.businessDate === 'string'
        ? toJsDate(`${raw.businessDate}T00:00:00`)
        : null) ??
      toJsDate(raw.allocationDate) ??
      toJsDate(raw.acceptedAt) ??
      toJsDate(raw.createdAt);
    if (!dateObj) continue;

    const dateKey =
      typeof raw.businessDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.businessDate)
        ? raw.businessDate
        : toDateKey(dateObj);
    if (!matchesFilter(dateKey, mode, filterValue)) continue;

    const row = getOrCreateRow(map, dateKey);
    row.pmAllocation += Number(raw.amount) || Number(raw.purchasingManager) || 0;
    row.grossProfit12 += Number(raw.profitDeduction) || Number(raw.savings) || 0;
    row.daily100k += Number(raw.monthlyExpenseFund) || 0;
  }

  // Wallet ledger + cash close fallbacks for 12% and 100k
  const closeByDate = new Map<string, { profit: number; expenseFund: number }>();
  for (const close of data.cashCloses) {
    const raw = close as Record<string, unknown>;
    const dateKey = getCashCloseBusinessDateKey(raw);
    if (!dateKey || !matchesFilter(dateKey, mode, filterValue)) continue;

    const amount = resolveCashCloseAmount(raw);
    const profit =
      Number(raw.profitAmount) ||
      Math.round(amount * ((Number(raw.profitPercentage) || 12) / 100));
    const expenseFund = Number(raw.m_expensefund) || Number(raw.m_expenseFund) || 0;

    const existing = closeByDate.get(dateKey) ?? { profit: 0, expenseFund: 0 };
    closeByDate.set(dateKey, {
      profit: existing.profit + profit,
      expenseFund: existing.expenseFund + expenseFund,
    });
  }

  for (const entry of data.ledgerEntries) {
    const raw = entry as Record<string, unknown>;
    if (raw.entryType === 'expense_payment') continue;

    const dateKey = String(raw.date || '');
    if (!dateKey || !matchesFilter(dateKey, mode, filterValue)) continue;

    const row = getOrCreateRow(map, dateKey);
    const gross = Number(raw.grossProfitDeposit) || 0;
    const daily = Number(raw.dailyExpenseDeposit) || 0;

    if (row.grossProfit12 === 0 && gross > 0) row.grossProfit12 += gross;
    if (row.daily100k === 0 && daily > 0) row.daily100k += daily;
    if (row.totalCashClose === 0 && Number(raw.sourceRevenue) > 0) {
      row.totalCashClose += Number(raw.sourceRevenue);
    }
  }

  // Apply cash close fallbacks where allocation/ledger data is absent
  for (const [dateKey, closeData] of closeByDate) {
    const row = getOrCreateRow(map, dateKey);
    if (row.grossProfit12 === 0 && closeData.profit > 0) {
      row.grossProfit12 = closeData.profit;
    }
    if (row.daily100k === 0 && closeData.expenseFund > 0) {
      row.daily100k = closeData.expenseFund;
    }
  }

  // Cheques cleared — by clearedAt date (fallback: payment date when status is cleared)
  for (const payment of data.payments) {
    const raw = payment as Record<string, unknown>;
    if (!isChequePayment(raw)) continue;

    const method = raw.paymentMethod as { status?: string } | undefined;
    const isCleared =
      method?.status === 'cleared' ||
      raw.paymentStatus === 'completed' ||
      Boolean(raw.clearedAt);

    if (!isCleared) continue;

    const clearedDate = toJsDate(raw.clearedAt) ?? getPaymentDate(raw);
    if (!clearedDate) continue;

    const dateKey = toDateKey(clearedDate);
    if (!matchesFilter(dateKey, mode, filterValue)) continue;

    const row = getOrCreateRow(map, dateKey);
    row.chequesCleared += getPaymentAmount(raw);
  }

  // Purchases — invoices received/created that day
  for (const invoice of data.invoices) {
    const raw = invoice as Record<string, unknown>;
    const dateObj = getInvoiceDate(raw);
    if (!dateObj) continue;

    const dateKey = toDateKey(dateObj);
    if (!matchesFilter(dateKey, mode, filterValue)) continue;

    const row = getOrCreateRow(map, dateKey);
    row.purchasesMade += getInvoiceAmount(raw);
  }

  // Payments made — completed invoice payments by payment date
  for (const payment of data.payments) {
    const raw = payment as Record<string, unknown>;
    const status = String(raw.paymentStatus || 'completed');
    if (status === 'failed' || status === 'cancelled') continue;

    const dateObj = getPaymentDate(raw);
    if (!dateObj) continue;

    const dateKey = toDateKey(dateObj);
    if (!matchesFilter(dateKey, mode, filterValue)) continue;

    const row = getOrCreateRow(map, dateKey);
    row.paymentsMade += getPaymentAmount(raw);
  }

  const rows = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { rows, totals: sumTotals(rows) };
}

export function getMonthOptions(count = 24): { key: string; label: string }[] {
  const now = new Date();
  const options: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      key: getPeriodKey(d),
      label: d.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
}

export function getYearOptions(count = 5): { key: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const options: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const y = currentYear - i;
    options.push({ key: String(y), label: String(y) });
  }
  return options;
}

export function getCurrentPeriodKey(): string {
  return getPeriodKey(new Date());
}

export function getCurrentYear(): string {
  return String(new Date().getFullYear());
}
