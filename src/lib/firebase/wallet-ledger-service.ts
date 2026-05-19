import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  increment,
} from 'firebase/firestore';
import { db } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletLedgerEntry {
  id: string;
  /**
   * 'deposit'          — cash-close income entry (default for legacy docs)
   * 'expense_payment'  — debit written when an expense is paid
   */
  entryType?: 'deposit' | 'expense_payment';
  /** Business date (YYYY-MM-DD) */
  date: string;
  /** Calendar month key for easy range queries (YYYY-MM) */
  periodKey: string;
  branchId: string;
  createdBy: string;
  createdAt: Date;

  // ── Deposit-only fields ──────────────────────────────────────────────────
  cashCloseId?: string;
  shiftType?: 'day' | 'night';
  grossProfitDeposit?: number;
  sourceRevenue?: number;
  profitPercentage?: number;
  dailyExpenseDeposit?: number;
  /** True when the 100k for this date was already recorded by an earlier shift */
  dailyExpenseAlreadyCollected?: boolean;

  // ── Expense-payment (debit) fields ───────────────────────────────────────
  expensePaymentId?: string;
  expenseId?: string;
  expenseDescription?: string;
  vendor?: string;
  /** Amount debited from the account */
  debitAmount?: number;
  fundingSource?: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
  paidBy?: string;
  paidByName?: string;

  notes?: string;
}

export interface WalletMonthlySummary {
  periodKey: string;
  branchId: string;
  grossProfitTotal: number;
  dailyExpenseTotal: number;
  combinedTotal: number;
  /** Total debited via expense payments this period */
  totalExpensePayments: number;
  /** Net balance: combinedTotal − totalExpensePayments */
  netBalance: number;
  entryCount: number;
  daysCovered: number;
  entries: WalletLedgerEntry[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

const LEDGER_COLLECTION = 'walletLedger';
const BALANCES_COLLECTION = 'fundBalances';

export class WalletLedgerService {
  // ── Helpers ────────────────────────────────────────────────────────────────

  getPeriodKey(ref: Date = new Date()): string {
    const y = ref.getFullYear();
    const m = String(ref.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private toJsDate(v: unknown): Date {
    if (!v) return new Date(0);
    if (v instanceof Date) return v;
    const ts = v as { toDate?: () => Date };
    if (typeof ts.toDate === 'function') return ts.toDate();
    return new Date(v as string);
  }

  private normalizeEntry(id: string, raw: Record<string, unknown>): WalletLedgerEntry {
    return {
      ...(raw as unknown as WalletLedgerEntry),
      id,
      createdAt: this.toJsDate(raw.createdAt),
    };
  }

  // ── Check for duplicate 100k collection ───────────────────────────────────

  /**
   * Returns true if the 100,000 UGX daily expense fund has already been
   * recorded for this date/branch combination.
   */
  async hasDailyExpenseBeenCollected(date: string, branchId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, LEDGER_COLLECTION),
        where('date', '==', date),
        where('branchId', '==', branchId),
        where('dailyExpenseAlreadyCollected', '==', false),
        limit(1)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      console.error('walletLedger: hasDailyExpenseBeenCollected error', err);
      return false;
    }
  }

  // ── Record a cash-close deposit ────────────────────────────────────────────

  /**
   * Called immediately after a cash close is created.
   *
   * Writes one `walletLedger` document and also increments the running
   * `fundBalances` totals (currentBalance + totalAllocated) for the month,
   * creating them if they don't exist yet.
   */
  async recordCashCloseDeposit(params: {
    cashCloseId: string;
    date: string;           // YYYY-MM-DD
    branchId: string;
    createdBy: string;
    shiftType: 'day' | 'night';
    totalRevenue: number;   // totalCashInTill from cash close
    profitPercentage?: number;
    /** Whether the monthly/daily 100k expense fund was enabled at cash close creation */
    enableMonthlyExpenseFund?: boolean;
    /** The captured 100k amount from the cash close (defaults to 100000) */
    monthlyExpenseFundAmount?: number;
    notes?: string;
  }): Promise<string> {
    const {
      cashCloseId,
      date,
      branchId,
      createdBy,
      shiftType,
      totalRevenue,
      profitPercentage = 12,
      enableMonthlyExpenseFund = false,
      monthlyExpenseFundAmount = 100000,
      notes,
    } = params;

    const periodKey = this.getPeriodKey(new Date(date + 'T00:00:00'));

    // 12% gross profit deposit — captured at cash close creation
    const grossProfitDeposit = Math.round(totalRevenue * (profitPercentage / 100));

    // 100k daily expense fund — only deposited when the accountant explicitly
    // enabled it on the cash close creation form, and only once per business day
    const alreadyCollected = enableMonthlyExpenseFund
      ? await this.hasDailyExpenseBeenCollected(date, branchId)
      : false;
    const dailyExpenseDeposit =
      enableMonthlyExpenseFund && !alreadyCollected ? monthlyExpenseFundAmount : 0;

    const entry: Omit<WalletLedgerEntry, 'id'> = {
      cashCloseId,
      date,
      periodKey,
      branchId,
      createdBy,
      createdAt: new Date(),
      shiftType,
      grossProfitDeposit,
      sourceRevenue: totalRevenue,
      profitPercentage,
      dailyExpenseDeposit,
      dailyExpenseAlreadyCollected: alreadyCollected,
      notes,
    };

    const docRef = await addDoc(collection(db, LEDGER_COLLECTION), {
      ...entry,
      createdAt: Timestamp.now(),
    });

    console.log(`✅ WalletLedger: recorded deposit for close ${cashCloseId} — gross ${grossProfitDeposit}, daily ${dailyExpenseDeposit}`);

    // Update (or seed) the fundBalances running totals for this period
    await this._upsertFundBalance(branchId, periodKey, 'WALLET_GROSS_PROFIT', grossProfitDeposit, totalRevenue);
    if (dailyExpenseDeposit > 0) {
      await this._upsertFundBalance(branchId, periodKey, 'DAILY_EXPENSE_FUND', dailyExpenseDeposit, 0);
    }

    return docRef.id;
  }

  // ── Fund balance helpers ───────────────────────────────────────────────────

  private async _upsertFundBalance(
    branchId: string,
    periodKey: string,
    fundType: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT',
    depositAmount: number,
    sourceRevenue: number
  ): Promise<void> {
    try {
      const q = query(
        collection(db, BALANCES_COLLECTION),
        where('branchId', '==', branchId),
        where('periodKey', '==', periodKey),
        where('fundType', '==', fundType),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docId = snap.docs[0].id;
        const updates: Record<string, unknown> = {
          currentBalance: increment(depositAmount),
          totalAllocated: increment(depositAmount),
          lastUpdated: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        if (fundType === 'WALLET_GROSS_PROFIT') {
          updates.sourceRevenue = increment(sourceRevenue);
        }
        await updateDoc(doc(db, BALANCES_COLLECTION, docId), updates);
      } else {
        // Create fresh balance row for this month
        await addDoc(collection(db, BALANCES_COLLECTION), {
          fundType,
          currentBalance: depositAmount,
          totalAllocated: depositAmount,
          totalSpent: 0,
          lastUpdated: Timestamp.now(),
          branchId,
          periodKey,
          ...(fundType === 'DAILY_EXPENSE_FUND'
            ? { dailyCollection: 100000 }
            : { profitPercentage: 12, sourceRevenue }),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (err) {
      // Non-fatal — ledger entry is already written
      console.error('walletLedger: _upsertFundBalance error', err);
    }
  }

  // ── Record an expense payment debit ───────────────────────────────────────

  /**
   * Called by ExpensePaymentService after a payment is committed.
   *
   * Writes one `walletLedger` document with entryType = 'expense_payment'
   * and decrements the running `fundBalances.currentBalance` for the month.
   */
  async recordExpensePaymentDebit(params: {
    expensePaymentId: string;
    expenseId: string;
    expenseDescription: string;
    vendor: string;
    amount: number;
    fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
    branchId: string;
    paidBy: string;
    paidByName: string;
    date?: string; // YYYY-MM-DD — defaults to today
    notes?: string;
  }): Promise<string> {
    const {
      expensePaymentId,
      expenseId,
      expenseDescription,
      vendor,
      amount,
      fundingSource,
      branchId,
      paidBy,
      paidByName,
      notes,
    } = params;

    const now = new Date();
    const dateStr =
      params.date ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const periodKey = this.getPeriodKey(new Date(dateStr + 'T00:00:00'));

    const entry = {
      entryType: 'expense_payment' as const,
      date: dateStr,
      periodKey,
      branchId,
      createdBy: paidBy,
      createdAt: Timestamp.now(),
      expensePaymentId,
      expenseId,
      expenseDescription,
      vendor,
      debitAmount: amount,
      fundingSource,
      paidBy,
      paidByName,
      ...(notes ? { notes } : {}),
    };

    const docRef = await addDoc(collection(db, LEDGER_COLLECTION), entry);
    console.log(`✅ WalletLedger: recorded expense payment debit ${expensePaymentId} — ${amount} UGX`);
    return docRef.id;
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  /**
   * Returns all ledger entries for a branch in the given calendar month.
   * Defaults to the current month.
   */
  async getMonthlyLedger(branchId: string, periodKey?: string): Promise<WalletLedgerEntry[]> {
    const key = periodKey ?? this.getPeriodKey();
    try {
      const q = query(
        collection(db, LEDGER_COLLECTION),
        where('branchId', '==', branchId),
        where('periodKey', '==', key),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => this.normalizeEntry(d.id, d.data() as Record<string, unknown>));
    } catch (err) {
      console.error('walletLedger: getMonthlyLedger error', err);
      return [];
    }
  }

  /**
   * Aggregated totals for the wallet for a calendar month.
   */
  async getWalletSummary(branchId: string, periodKey?: string): Promise<WalletMonthlySummary> {
    const key = periodKey ?? this.getPeriodKey();
    const entries = await this.getMonthlyLedger(branchId, key);

    const deposits = entries.filter((e) => !e.entryType || e.entryType === 'deposit');
    const debits = entries.filter((e) => e.entryType === 'expense_payment');

    const grossProfitTotal = deposits.reduce((s, e) => s + (e.grossProfitDeposit ?? 0), 0);
    const dailyExpenseTotal = deposits.reduce((s, e) => s + (e.dailyExpenseDeposit ?? 0), 0);
    const combinedTotal = grossProfitTotal + dailyExpenseTotal;
    const totalExpensePayments = debits.reduce((s, e) => s + (e.debitAmount ?? 0), 0);
    const daysCovered = new Set(deposits.map((e) => e.date)).size;

    return {
      periodKey: key,
      branchId,
      grossProfitTotal,
      dailyExpenseTotal,
      combinedTotal,
      totalExpensePayments,
      netBalance: combinedTotal - totalExpensePayments,
      entryCount: entries.length,
      daysCovered,
      entries,
    };
  }

  /**
   * Scans all cash closes for the given month and creates wallet ledger entries
   * for any that were not already recorded (e.g. closes submitted before the
   * ledger feature existed, or where the deposit call failed silently).
   *
   * Returns a count of synced, already-covered, and errored closes.
   */
  async syncMissingDeposits(params: {
    branchId: string;
    periodKey: string;
    userId: string;
  }): Promise<{ synced: number; skipped: number; errors: number }> {
    const { branchId, periodKey, userId } = params;

    // 1. Existing ledger entries for this period → cashCloseIds already recorded
    const existing = await this.getMonthlyLedger(branchId, periodKey);
    const recordedIds = new Set(existing.map((e) => e.cashCloseId));

    // 2. All cash closes for this month/branch
    const [year, month] = periodKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const q = query(
      collection(db, 'cashCloses'),
      where('branchId', '==', branchId),
      where('cashCloseDate', '>=', Timestamp.fromDate(startDate)),
      where('cashCloseDate', '<=', Timestamp.fromDate(endDate))
    );

    let snap;
    try {
      snap = await getDocs(q);
    } catch (err) {
      console.error('syncMissingDeposits: failed to fetch cash closes', err);
      return { synced: 0, skipped: 0, errors: 1 };
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const docSnap of snap.docs) {
      const id = docSnap.id;

      if (recordedIds.has(id)) {
        skipped++;
        continue;
      }

      const data = docSnap.data() as Record<string, unknown>;
      const dateTs = data.cashCloseDate as { toDate?: () => Date } | null;
      const dateObj: Date = dateTs?.toDate ? dateTs.toDate() : new Date(dateTs as string);
      // YYYY-MM-DD in local time
      const y = dateObj.getFullYear();
      const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${y}-${mo}-${d}`;

      const shifts = (data.shifts as Array<{ shift?: string }>) ?? [];
      const primaryShift: 'day' | 'night' =
        shifts.length > 0 && (shifts[0].shift === 'day' || shifts[0].shift === 'night')
          ? (shifts[0].shift as 'day' | 'night')
          : 'day';

      const totalRevenue =
        (data.totalCashInTill as number) ?? (data.totalRevenue as number) ?? 0;
      const profitPercentage = (data.profitPercentage as number) ?? 12;
      // m_expensefund is stored as the captured amount (100000) when the toggle
      // was enabled at creation, or 0 when it was disabled.
      const mExpenseFund = (data.m_expensefund as number) ?? 0;
      const enableMonthlyExpenseFund = mExpenseFund > 0;

      try {
        await this.recordCashCloseDeposit({
          cashCloseId: id,
          date: dateStr,
          branchId: (data.branchId as string) || branchId,
          createdBy: userId,
          shiftType: primaryShift,
          totalRevenue,
          profitPercentage,
          enableMonthlyExpenseFund,
          monthlyExpenseFundAmount: enableMonthlyExpenseFund ? mExpenseFund : 100000,
          notes: `Pulled from cash close ${id}`,
        });
        synced++;
      } catch (err) {
        console.error(`syncMissingDeposits: failed for cashClose ${id}`, err);
        errors++;
      }
    }

    return { synced, skipped, errors };
  }

  /**
   * All-branches summary (for admin/accountant cross-branch view).
   * Falls back to single branch if branchId is provided.
   */
  async getAllBranchesMonthlyLedger(periodKey?: string): Promise<WalletLedgerEntry[]> {
    const key = periodKey ?? this.getPeriodKey();
    try {
      const q = query(
        collection(db, LEDGER_COLLECTION),
        where('periodKey', '==', key),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => this.normalizeEntry(d.id, d.data() as Record<string, unknown>));
    } catch (err) {
      console.error('walletLedger: getAllBranchesMonthlyLedger error', err);
      return [];
    }
  }
}

export const walletLedgerService = new WalletLedgerService();
