import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';

// Funding source allocation tracking
export interface FundingAllocation {
  id: string;
  expenseId: string;
  paymentId: string;
  fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
  amount: number;
  allocationDate: Date;
  allocatedBy: string;
  allocatedByName: string;
  
  // Fund balances at time of allocation
  dailyFundBalance: number;
  grossProfitBalance: number;
  
  // Allocation details
  description: string;
  vendor?: string;
  category?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Fund balance tracking
export interface FundBalance {
  id: string;
  fundType: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
  currentBalance: number;
  totalAllocated: number;
  totalSpent: number;
  lastUpdated: Date;
  branchId: string;
  
  // Daily fund specific
  dailyCollection?: number; // 100,000 UGX daily
  
  // Gross profit specific
  profitPercentage?: number; // 12%
  sourceRevenue?: number; // Total revenue this came from
  
  createdAt: Date;
  updatedAt: Date;
}

// Funding source analytics
export interface FundingAnalytics {
  dailyFund: {
    totalAllocated: number;
    totalSpent: number;
    currentBalance: number;
    allocationCount: number;
    averageAllocation: number;
    topCategories: Array<{ category: string; amount: number; count: number }>;
  };
  grossProfit: {
    totalAllocated: number;
    totalSpent: number;
    currentBalance: number;
    allocationCount: number;
    averageAllocation: number;
    topCategories: Array<{ category: string; amount: number; count: number }>;
  };
  monthlyTrends: Array<{
    month: string;
    dailyFundUsage: number;
    grossProfitUsage: number;
    totalExpenses: number;
  }>;
}

export class FundingSourceService {
  private allocationsCollection = 'fundingAllocations';
  private balancesCollection = 'fundBalances';

  // ==================== FUND BALANCE MANAGEMENT ====================

  /**
   * Initialize fund balances for a branch
   */
  async initializeFundBalances(branchId: string): Promise<void> {
    const batch = writeBatch(db);

    // Initialize Daily Expense Fund
    const dailyFundRef = doc(collection(db, this.balancesCollection));
    batch.set(dailyFundRef, {
      fundType: 'DAILY_EXPENSE_FUND',
      currentBalance: 100000, // 100,000 UGX daily collection
      totalAllocated: 0,
      totalSpent: 0,
      lastUpdated: Timestamp.now(),
      branchId,
      dailyCollection: 100000,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Initialize Wallet Gross Profit Fund  
    const grossProfitRef = doc(collection(db, this.balancesCollection));
    batch.set(grossProfitRef, {
      fundType: 'WALLET_GROSS_PROFIT',
      currentBalance: 0, // Updated from cash close
      totalAllocated: 0,
      totalSpent: 0,
      lastUpdated: Timestamp.now(),
      branchId,
      profitPercentage: 12,
      sourceRevenue: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    await batch.commit();
    console.log('✅ Initialized fund balances for branch:', branchId);
  }

  /**
   * Get current fund balances for a branch
   */
  async getFundBalances(branchId: string): Promise<{ dailyFund: FundBalance | null; grossProfit: FundBalance | null }> {
    try {
      const q = query(
        collection(db, this.balancesCollection),
        where('branchId', '==', branchId)
      );
      
      const snapshot = await getDocs(q);
      let dailyFund: FundBalance | null = null;
      let grossProfit: FundBalance | null = null;
      
      snapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as FundBalance;
        if (data.fundType === 'DAILY_EXPENSE_FUND') {
          dailyFund = data;
        } else if (data.fundType === 'WALLET_GROSS_PROFIT') {
          grossProfit = data;
        }
      });
      
      return { dailyFund, grossProfit };
    } catch (error) {
      console.error('Error getting fund balances:', error);
      return { dailyFund: null, grossProfit: null };
    }
  }

  /**
   * Update fund balance after allocation
   */
  async updateFundBalance(
    branchId: string,
    fundType: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT',
    allocationAmount: number,
    operation: 'allocate' | 'deallocate'
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.balancesCollection),
        where('branchId', '==', branchId),
        where('fundType', '==', fundType)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.error(`Fund balance not found for ${fundType} in branch ${branchId}`);
        return;
      }
      
      const fundDoc = snapshot.docs[0];
      const currentData = fundDoc.data() as FundBalance;
      
      const multiplier = operation === 'allocate' ? -1 : 1;
      const newBalance = currentData.currentBalance + (allocationAmount * multiplier);
      const newTotalAllocated = operation === 'allocate' 
        ? currentData.totalAllocated + allocationAmount
        : Math.max(0, currentData.totalAllocated - allocationAmount);
      
      await updateDoc(doc(db, this.balancesCollection, fundDoc.id), {
        currentBalance: Math.max(0, newBalance),
        totalAllocated: newTotalAllocated,
        lastUpdated: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log(`✅ Updated ${fundType} balance: ${operation} ${allocationAmount}`);
    } catch (error) {
      console.error('Error updating fund balance:', error);
      throw error;
    }
  }

  // ==================== ALLOCATION MANAGEMENT ====================

  /**
   * Record funding source assignment for payment tracking (no actual allocation)
   */
  async recordFundingSourceAssignment(
    expenseId: string,
    paymentId: string,
    fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT',
    amount: number,
    assignedBy: string,
    assignedByName: string,
    description: string,
    branchId: string,
    additionalDetails?: {
      vendor?: string;
      category?: string;
      priority?: 'urgent' | 'high' | 'medium' | 'low';
    }
  ): Promise<string> {
    // Create assignment record (not allocation - just tracking which source was selected)
    const assignmentRef = doc(collection(db, 'fundingAssignments'));
    const now = new Date();
    
    await addDoc(collection(db, 'fundingAssignments'), {
      expenseId,
      paymentId,
      fundingSource,
      amount,
      assignmentDate: Timestamp.fromDate(now),
      assignedBy,
      assignedByName,
      description,
      vendor: additionalDetails?.vendor || '',
      category: additionalDetails?.category || '',
      priority: additionalDetails?.priority || 'medium',
      branchId,
      status: 'assigned', // not 'allocated'
      notes: 'Funding source assigned at payment time - no pre-allocation',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    
    console.log(`✅ Recorded ${fundingSource} assignment for ${amount} UGX (expense ${expenseId})`);
    return assignmentRef.id;
  }

  /**
   * Allocate funds for an expense payment (old method - kept for backward compatibility)
   */
  async allocateFunds(
    expenseId: string,
    paymentId: string,
    fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT',
    amount: number,
    allocatedBy: string,
    allocatedByName: string,
    description: string,
    branchId: string,
    additionalDetails?: {
      vendor?: string;
      category?: string;
      priority?: 'urgent' | 'high' | 'medium' | 'low';
    }
  ): Promise<string> {
    // For backward compatibility, just record assignment instead of actual allocation
    return this.recordFundingSourceAssignment(
      expenseId,
      paymentId,
      fundingSource,
      amount,
      allocatedBy,
      allocatedByName,
      description,
      branchId,
      additionalDetails
    );
  }

  /**
   * Get allocation history for an expense
   */
  async getAllocationHistory(expenseId: string): Promise<FundingAllocation[]> {
    try {
      const q = query(
        collection(db, this.allocationsCollection),
        where('expenseId', '==', expenseId),
        orderBy('allocationDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          allocationDate: data.allocationDate?.toDate ? data.allocationDate.toDate() : data.allocationDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
      }) as FundingAllocation[];
    } catch (error) {
      console.error('Error getting allocation history:', error);
      return [];
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get funding analytics for a branch
   */
  async getFundingAnalytics(branchId: string, dateRange?: { start: Date; end: Date }): Promise<FundingAnalytics> {
    try {
      let q = query(
        collection(db, this.allocationsCollection),
        where('branchId', '==', branchId)
      );
      
      if (dateRange) {
        q = query(q, 
          where('allocationDate', '>=', Timestamp.fromDate(dateRange.start)),
          where('allocationDate', '<=', Timestamp.fromDate(dateRange.end))
        );
      }
      
      const snapshot = await getDocs(q);
      const allocations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          allocationDate: data.allocationDate?.toDate ? data.allocationDate.toDate() : data.allocationDate
        };
      }) as FundingAllocation[];
      
      // Separate by funding source
      const dailyFundAllocations = allocations.filter(a => a.fundingSource === 'DAILY_EXPENSE_FUND');
      const grossProfitAllocations = allocations.filter(a => a.fundingSource === 'WALLET_GROSS_PROFIT');
      
      // Calculate analytics for each fund
      const dailyFundAnalytics = this.calculateFundAnalytics(dailyFundAllocations);
      const grossProfitAnalytics = this.calculateFundAnalytics(grossProfitAllocations);
      
      // Calculate monthly trends
      const monthlyTrends = this.calculateMonthlyTrends(allocations);
      
      return {
        dailyFund: dailyFundAnalytics,
        grossProfit: grossProfitAnalytics,
        monthlyTrends
      };
    } catch (error) {
      console.error('Error getting funding analytics:', error);
      return {
        dailyFund: { totalAllocated: 0, totalSpent: 0, currentBalance: 0, allocationCount: 0, averageAllocation: 0, topCategories: [] },
        grossProfit: { totalAllocated: 0, totalSpent: 0, currentBalance: 0, allocationCount: 0, averageAllocation: 0, topCategories: [] },
        monthlyTrends: []
      };
    }
  }

  private calculateFundAnalytics(allocations: FundingAllocation[]) {
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    const allocationCount = allocations.length;
    const averageAllocation = allocationCount > 0 ? totalAllocated / allocationCount : 0;
    
    // Calculate top categories
    const categoryMap = new Map<string, { amount: number; count: number }>();
    allocations.forEach(a => {
      const category = a.category || 'Uncategorized';
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + a.amount,
        count: existing.count + 1
      });
    });
    
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    return {
      totalAllocated,
      totalSpent: totalAllocated, // For now, allocation = spending
      currentBalance: 0, // This should be fetched from fund balances
      allocationCount,
      averageAllocation,
      topCategories
    };
  }

  private calculateMonthlyTrends(allocations: FundingAllocation[]) {
    const monthlyMap = new Map<string, { dailyFundUsage: number; grossProfitUsage: number; totalExpenses: number }>();
    
    allocations.forEach(allocation => {
      const date = new Date(allocation.allocationDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthlyMap.get(monthKey) || { dailyFundUsage: 0, grossProfitUsage: 0, totalExpenses: 0 };
      
      if (allocation.fundingSource === 'DAILY_EXPENSE_FUND') {
        existing.dailyFundUsage += allocation.amount;
      } else {
        existing.grossProfitUsage += allocation.amount;
      }
      existing.totalExpenses += allocation.amount;
      
      monthlyMap.set(monthKey, existing);
    });
    
    // Get last 12 months
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const data = monthlyMap.get(monthKey) || { dailyFundUsage: 0, grossProfitUsage: 0, totalExpenses: 0 };
      result.push({
        month: monthName,
        ...data
      });
    }
    
    return result;
  }

  /**
   * Subscribe to real-time funding allocation updates
   */
  subscribeToAllocations(
    branchId: string,
    callback: (allocations: FundingAllocation[]) => void
  ): () => void {
    const q = query(
      collection(db, this.allocationsCollection),
      where('branchId', '==', branchId),
      orderBy('allocationDate', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const allocations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          allocationDate: data.allocationDate?.toDate ? data.allocationDate.toDate() : data.allocationDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
      }) as FundingAllocation[];
      
      callback(allocations);
    });
  }
}

export const fundingSourceService = new FundingSourceService();
