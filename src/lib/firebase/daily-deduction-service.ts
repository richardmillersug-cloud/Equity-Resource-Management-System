'use client';

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from './config';
import { authService } from './auth';

export interface DailyDeduction {
  id: string;
  date: string; // YYYY-MM-DD format
  deductionType: 'DAILY_EXPENSE_FUND' | 'GROSS_PROFIT'; // DAILY_EXPENSE_FUND is the 100k daily deduction
  amount: number;
  cashCloseId: string;
  allocationId: string;
  shiftType: 'day' | 'night';
  appliedBy: string;
  appliedAt: Timestamp;
  branchId: string;
  notes?: string;
}

export interface DailyDeductionSummary {
  date: string;
  dailyExpenseFund: { // This is the 100k daily deduction (same as daily deduction)
    applied: boolean;
    amount: number;
    cashCloseId?: string;
    appliedBy?: string;
    appliedAt?: Timestamp;
    shiftType?: 'day' | 'night';
  };
  grossProfit: { // This is the 12% profit deduction
    totalAmount: number;
    allocations: Array<{
      amount: number;
      cashCloseId: string;
      shiftType: 'day' | 'night';
      appliedAt: Timestamp;
    }>;
  };
}

export class DailyDeductionService {
  private collection = 'dailyDeductions';

  /**
   * Check if daily expense fund (100k daily deduction) has already been applied today
   */
  async hasDailyExpenseBeenDeducted(date: string, branchId?: string): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      const userBranchId = branchId || currentUser?.employee?.branchId;
      
      if (!userBranchId) {
        console.warn('No branch ID available for daily expense check');
        return false;
      }

      const q = query(
        collection(db, this.collection),
        where('date', '==', date),
        where('deductionType', '==', 'DAILY_EXPENSE_FUND'),
        where('branchId', '==', userBranchId),
        limit(1)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking daily expense deduction:', error);
      return false;
    }
  }

  /**
   * Record a daily expense fund deduction (100k daily deduction)
   */
  async recordDailyExpenseDeduction(
    date: string,
    cashCloseId: string,
    allocationId: string,
    shiftType: 'day' | 'night',
    notes?: string
  ): Promise<string> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      const branchId = currentUser.employee?.branchId;
      if (!branchId) throw new Error('User branch not found');

      // Double-check if already applied
      const alreadyDeducted = await this.hasDailyExpenseBeenDeducted(date, branchId);
      if (alreadyDeducted) {
        throw new Error('Daily expense fund (100k daily deduction) has already been applied today');
      }

      const deduction: Omit<DailyDeduction, 'id'> = {
        date,
        deductionType: 'DAILY_EXPENSE_FUND',
        amount: 100000,
        cashCloseId,
        allocationId,
        shiftType,
        appliedBy: currentUser.uid,
        appliedAt: Timestamp.now(),
        branchId,
        notes
      };

      const docRef = await addDoc(collection(db, this.collection), deduction);
      console.log('✅ Daily expense fund (100k daily deduction) recorded:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error recording daily expense deduction:', error);
      throw error;
    }
  }

  /**
   * Record a gross profit deduction (12%)
   */
  async recordGrossProfitDeduction(
    date: string,
    amount: number,
    cashCloseId: string,
    allocationId: string,
    shiftType: 'day' | 'night',
    notes?: string
  ): Promise<string> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');

      const branchId = currentUser.employee?.branchId;
      if (!branchId) throw new Error('User branch not found');

      const deduction: Omit<DailyDeduction, 'id'> = {
        date,
        deductionType: 'GROSS_PROFIT',
        amount,
        cashCloseId,
        allocationId,
        shiftType,
        appliedBy: currentUser.uid,
        appliedAt: Timestamp.now(),
        branchId,
        notes
      };

      const docRef = await addDoc(collection(db, this.collection), deduction);
      console.log('✅ Gross profit deduction recorded:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error recording gross profit deduction:', error);
      throw error;
    }
  }

  /**
   * Get daily deduction summary for a specific date
   */
  async getDailyDeductionSummary(date: string, branchId?: string): Promise<DailyDeductionSummary> {
    try {
      const currentUser = authService.getCurrentUser();
      const userBranchId = branchId || currentUser?.employee?.branchId;
      
      if (!userBranchId) {
        throw new Error('Branch ID required for deduction summary');
      }

      const q = query(
        collection(db, this.collection),
        where('date', '==', date),
        where('branchId', '==', userBranchId),
        orderBy('appliedAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const deductions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyDeduction[];

      // Find daily expense fund deduction
      const dailyExpense = deductions.find(d => d.deductionType === 'DAILY_EXPENSE_FUND');
      
      // Collect all gross profit deductions
      const grossProfitDeductions = deductions.filter(d => d.deductionType === 'GROSS_PROFIT');

      const summary: DailyDeductionSummary = {
        date,
        dailyExpenseFund: {
          applied: !!dailyExpense,
          amount: dailyExpense?.amount || 0,
          cashCloseId: dailyExpense?.cashCloseId,
          appliedBy: dailyExpense?.appliedBy,
          appliedAt: dailyExpense?.appliedAt,
          shiftType: dailyExpense?.shiftType
        },
        grossProfit: {
          totalAmount: grossProfitDeductions.reduce((sum, d) => sum + d.amount, 0),
          allocations: grossProfitDeductions.map(d => ({
            amount: d.amount,
            cashCloseId: d.cashCloseId,
            shiftType: d.shiftType,
            appliedAt: d.appliedAt
          }))
        }
      };

      return summary;
    } catch (error) {
      console.error('Error getting daily deduction summary:', error);
      throw error;
    }
  }

  /**
   * Get deduction history for a date range
   */
  async getDeductionHistory(
    fromDate: string,
    toDate: string,
    branchId?: string
  ): Promise<DailyDeductionSummary[]> {
    try {
      const currentUser = authService.getCurrentUser();
      const userBranchId = branchId || currentUser?.employee?.branchId;
      
      if (!userBranchId) {
        throw new Error('Branch ID required for deduction history');
      }

      const q = query(
        collection(db, this.collection),
        where('branchId', '==', userBranchId),
        where('date', '>=', fromDate),
        where('date', '<=', toDate),
        orderBy('date', 'desc'),
        orderBy('appliedAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const allDeductions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyDeduction[];

      // Group by date
      const groupedByDate: { [date: string]: DailyDeduction[] } = {};
      allDeductions.forEach(deduction => {
        if (!groupedByDate[deduction.date]) {
          groupedByDate[deduction.date] = [];
        }
        groupedByDate[deduction.date].push(deduction);
      });

      // Create summaries for each date
      const summaries: DailyDeductionSummary[] = [];
      Object.keys(groupedByDate).forEach(date => {
        const deductions = groupedByDate[date];
        const dailyExpense = deductions.find(d => d.deductionType === 'DAILY_EXPENSE_FUND');
        const grossProfitDeductions = deductions.filter(d => d.deductionType === 'GROSS_PROFIT');

        summaries.push({
          date,
          dailyExpenseFund: {
            applied: !!dailyExpense,
            amount: dailyExpense?.amount || 0,
            cashCloseId: dailyExpense?.cashCloseId,
            appliedBy: dailyExpense?.appliedBy,
            appliedAt: dailyExpense?.appliedAt,
            shiftType: dailyExpense?.shiftType
          },
          grossProfit: {
            totalAmount: grossProfitDeductions.reduce((sum, d) => sum + d.amount, 0),
            allocations: grossProfitDeductions.map(d => ({
              amount: d.amount,
              cashCloseId: d.cashCloseId,
              shiftType: d.shiftType,
              appliedAt: d.appliedAt
            }))
          }
        });
      });

      // Sort by date descending (most recent first)
      summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return summaries;
    } catch (error) {
      console.error('Error getting deduction history:', error);
      throw error;
    }
  }

  /**
   * Get validation message for daily expense deduction
   */
  async getDailyExpenseValidationMessage(date: string, branchId?: string): Promise<string | null> {
    const alreadyDeducted = await this.hasDailyExpenseBeenDeducted(date, branchId);
    
    if (alreadyDeducted) {
      return `Daily expense fund (UGX 100,000 daily deduction) has already been applied for ${date}. Please wait until tomorrow to apply another deduction.`;
    }

    return null;
  }
}

export const dailyDeductionService = new DailyDeductionService();
