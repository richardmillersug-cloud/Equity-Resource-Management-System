import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import OptimizedCashCloseService from './optimized-cash-close-service';

export interface CashCloseSearchResult {
  id: string;
  businessDate: string;
  shift: 'day' | 'night';
  totalCash: number;
  totalNetworkMoney: number;
  totalRevenue: number;
  totalExpenses: number;
  createdAt: any;
  createdBy: string;
  source: string; // Which collection it came from
}

export interface AllocationBreakdown {
  totalCash: number;
  profitDeduction: number; // 12% profit
  afterProfitAmount: number;
  pmAllocation: number; // 70% of remaining
  m_expenseFund: number; // 30% of remaining
  withdrawalAmount: number; // Total to withdraw
  // New calculation method fields
  monthlyGrossProfit?: number; // Monthly gross profit percentage
  calculationMethod?: 'standard' | 'gross-profit'; // Which method to use
}

export interface AutomatedAllocationData {
  cashCloseId: string;
  businessDate: string;
  shift: 'day' | 'night';
  pmId: string;
  pmName: string;
  pmAllocation: number;
  m_expenseFund: number;
  profitRetained: number;
  totalWithdrawn: number;
  accountantId: string;
  accountantName: string;
  notes?: string;
}

export class AutomatedAllocationService {
  private static readonly PROFIT_PERCENTAGE = 0.12; // 12% profit
  private static readonly SPECIAL_FUNDS_PERCENTAGE = 0.30; // 30% of remaining
  private static readonly PM_ALLOCATION_PERCENTAGE = 0.70; // 70% of remaining
  private static readonly DEFAULT_MONTHLY_GROSS_PROFIT = 0.15; // 15% default monthly gross profit
  
  /**
   * Search for cash close data by date and shift across multiple collections
   * Enhanced version with multiple query strategies and date format handling
   */
  static async searchCashCloseByDateAndShift(
    businessDate: string, 
    shift: 'day' | 'night'
  ): Promise<CashCloseSearchResult | null> {
    console.log(`🔍 Searching for cash close: ${businessDate} - ${shift} shift`);
    
    const startDate = new Date(businessDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(businessDate);
    endDate.setHours(23, 59, 59, 999);
    
    // FIRST: Try OptimizedCashCloseService with proper indexes
    try {
      console.log('🚀 Using OptimizedCashCloseService with indexes...');
      const optimizedService = new OptimizedCashCloseService();
      const result = await optimizedService.findByDateAndShift(businessDate, shift);
      if (result) {
        console.log('✅ Found cash close using optimized service');
        return result;
      }
    } catch (error) {
      console.warn('⚠️ Optimized service failed, falling back to simple approach...', error);
    }

    // FALLBACK: Try the same approach as SimpleCashCloseService (no query, fetch all and filter)
    try {
      console.log('📊 Falling back to SimpleCashCloseService approach (fetch all from cashCloses)...');
      const allDocsSnapshot = await getDocs(collection(db, 'cashCloses'));
      
      for (const doc of allDocsSnapshot.docs) {
        const data = doc.data();
        
        // Check date match - handle various date formats
        let dateMatch = false;
        
        // Try cashCloseDate field (as used in SimpleCashCloseService)
        if (data.cashCloseDate) {
          let docDate: Date | null = null;
          
          if (data.cashCloseDate?.toDate && typeof data.cashCloseDate.toDate === 'function') {
            // Firestore Timestamp
            docDate = data.cashCloseDate.toDate();
          } else if (typeof data.cashCloseDate === 'string') {
            docDate = new Date(data.cashCloseDate);
          } else if (data.cashCloseDate instanceof Date) {
            docDate = data.cashCloseDate;
          }
          
          if (docDate) {
            const docDateString = docDate.toISOString().split('T')[0];
            dateMatch = docDateString === businessDate;
          }
        }
        
        // Also check date field
        if (!dateMatch && data.date) {
          let docDate: Date | null = null;
          
          if (data.date?.toDate && typeof data.date.toDate === 'function') {
            docDate = data.date.toDate();
          } else if (typeof data.date === 'string') {
            docDate = new Date(data.date);
          } else if (data.date instanceof Date) {
            docDate = data.date;
          }
          
          if (docDate) {
            const docDateString = docDate.toISOString().split('T')[0];
            dateMatch = docDateString === businessDate;
          }
        }
        
        // Also check businessDate field
        if (!dateMatch && data.businessDate) {
          if (typeof data.businessDate === 'string') {
            dateMatch = data.businessDate.includes(businessDate);
          }
        }
        
        if (!dateMatch) continue;
        
        // Check shift match
        if (data.shifts && Array.isArray(data.shifts)) {
          const shiftData = data.shifts.find((s: any) => s.shift === shift);
          if (shiftData) {
            const totalCash = this.calculateTotalCash(shiftData);
            const totalNetwork = this.calculateTotalNetwork(shiftData);
            
            console.log(`✅ Found cash close in cashCloses collection (SimpleCashCloseService approach)`);
            return {
              id: doc.id,
              businessDate: businessDate,
              shift: shift,
              totalCash: totalCash,
              totalNetworkMoney: totalNetwork,
              totalRevenue: totalCash + totalNetwork,
              totalExpenses: shiftData.totalExpenses || 0,
              createdAt: data.createdAt,
              createdBy: data.createdBy || data.employeeId || '',
              source: 'cashCloses (SimpleCashCloseService)'
            };
          }
        } else if (!data.shift || data.shift === shift) {
          // Single shift or no shift specified
          const totalCash = this.calculateTotalCashFromDoc(data);
          const totalNetwork = this.calculateTotalNetworkFromDoc(data);
          
          if (totalCash > 0 || totalNetwork > 0) {
            console.log(`✅ Found cash close in cashCloses collection (SimpleCashCloseService approach)`);
            return {
              id: doc.id,
              businessDate: businessDate,
              shift: shift,
              totalCash: totalCash,
              totalNetworkMoney: totalNetwork,
              totalRevenue: totalCash + totalNetwork,
              totalExpenses: data.totalExpenses || data.expenses || 0,
              createdAt: data.createdAt,
              createdBy: data.createdBy || data.employeeId || '',
              source: 'cashCloses (SimpleCashCloseService)'
            };
          }
        }
      }
    } catch (error) {
      console.warn('SimpleCashCloseService approach failed:', error);
    }
    
    // Collections to search with multiple date field options
    const collectionsToSearch = [
      { 
        name: 'cashCloses', 
        dateFields: ['businessDate', 'date', 'createdAt'],
        useTimestamp: false 
      },
      { 
        name: 'cashClose', 
        dateFields: ['date', 'businessDate', 'cashCloseDate', 'createdAt'],
        useTimestamp: true 
      },
      { 
        name: 'comprehensiveCashClose', 
        dateFields: ['cashCloseDate', 'businessDate', 'date', 'createdAt'],
        useTimestamp: true 
      }
    ];
    
    for (const collectionInfo of collectionsToSearch) {
      // Try each date field until we find results
      for (const dateField of collectionInfo.dateFields) {
        try {
          let snapshot;
          
          // Try multiple query strategies
          const queryStrategies = [];
          
          if (collectionInfo.useTimestamp) {
            // Strategy 1: Query with Timestamp
            queryStrategies.push(
              query(
                collection(db, collectionInfo.name),
                where(dateField, '>=', Timestamp.fromDate(startDate)),
                where(dateField, '<=', Timestamp.fromDate(endDate)),
                orderBy(dateField, 'desc')
              )
            );
          } else {
            // Strategy 2: Query with ISO string date
            queryStrategies.push(
              query(
                collection(db, collectionInfo.name),
                where(dateField, '>=', startDate.toISOString()),
                where(dateField, '<=', endDate.toISOString()),
                orderBy(dateField, 'desc')
              )
            );
            
            // Strategy 3: Query with date string (YYYY-MM-DD)
            queryStrategies.push(
              query(
                collection(db, collectionInfo.name),
                where(dateField, '==', businessDate),
                orderBy('createdAt', 'desc')
              )
            );
          }
          
          // Try each query strategy
          for (const q of queryStrategies) {
            try {
              snapshot = await getDocs(q);
              if (!snapshot.empty) break;
            } catch (queryError) {
              console.debug(`Query strategy failed: ${queryError}`);
              continue;
            }
          }
          
          if (!snapshot || snapshot.empty) continue;
          
          // Process results
          for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Check if this document has the shift we're looking for
            if (data.shifts && Array.isArray(data.shifts)) {
              // Handle documents with multiple shifts
              const shiftData = data.shifts.find((s: any) => s.shift === shift);
              if (shiftData) {
                const totalCash = this.calculateTotalCash(shiftData);
                const totalNetwork = this.calculateTotalNetwork(shiftData);
                
                console.log(`✅ Found cash close in ${collectionInfo.name}.${dateField}`);
                return {
                  id: doc.id,
                  businessDate: businessDate,
                  shift: shift,
                  totalCash: totalCash,
                  totalNetworkMoney: totalNetwork,
                  totalRevenue: totalCash + totalNetwork,
                  totalExpenses: shiftData.totalExpenses || 0,
                  createdAt: data.createdAt,
                  createdBy: data.createdBy || data.employeeId || '',
                  source: `${collectionInfo.name}.${dateField}`
                };
              }
            } else if (data.shift === shift || !data.shift) {
              // Single shift document or shift not specified
              const totalCash = this.calculateTotalCashFromDoc(data);
              const totalNetwork = this.calculateTotalNetworkFromDoc(data);
              
              // Only return if we have valid cash data
              if (totalCash > 0 || totalNetwork > 0) {
                console.log(`✅ Found cash close in ${collectionInfo.name}.${dateField}`);
                return {
                  id: doc.id,
                  businessDate: businessDate,
                  shift: shift,
                  totalCash: totalCash,
                  totalNetworkMoney: totalNetwork,
                  totalRevenue: totalCash + totalNetwork,
                  totalExpenses: data.totalExpenses || data.expenses || 0,
                  createdAt: data.createdAt,
                  createdBy: data.createdBy || data.employeeId || '',
                  source: `${collectionInfo.name}.${dateField}`
                };
              }
            }
          }
        } catch (error) {
          console.debug(`Failed to search ${collectionInfo.name}.${dateField}:`, error);
          continue;
        }
      }
    }
    
    console.log(`❌ No cash close found for ${businessDate} - ${shift} shift`);
    return null;
  }
  
  /**
   * Calculate allocation breakdown based on total cash
   * @param totalCash - Total cash amount from tills
   * @param method - Calculation method: 'standard' or 'gross-profit'
   * @param monthlyGrossProfit - Monthly gross profit percentage (for gross-profit method)
   */
  static calculateAllocationBreakdown(
    totalCash: number, 
    method: 'standard' | 'gross-profit' = 'standard',
    monthlyGrossProfit: number = this.DEFAULT_MONTHLY_GROSS_PROFIT
  ): AllocationBreakdown {
    
    if (method === 'gross-profit') {
      // New calculation method: PM Amount = (Total Till Cash × Monthly Gross Profit) - Total Till Cash
      const grossAmount = Math.round(totalCash * monthlyGrossProfit);
      const pmAllocation = grossAmount; // The gross profit amount goes to PM
      const profitDeduction = 0; // No separate profit deduction in this method
      const m_expenseFund = 0; // No m_expense fund in this method
      const withdrawalAmount = pmAllocation; // Only withdraw what goes to PM
      
      return {
        totalCash,
        profitDeduction,
        afterProfitAmount: pmAllocation,
        pmAllocation,
        m_expenseFund,
        withdrawalAmount,
        monthlyGrossProfit,
        calculationMethod: 'gross-profit'
      };
    }
    
    // Standard calculation method (12% profit, 30/70 split)
    const profitDeduction = Math.round(totalCash * this.PROFIT_PERCENTAGE);
    const afterProfitAmount = totalCash - profitDeduction;
    const m_expenseFund = Math.round(afterProfitAmount * this.SPECIAL_FUNDS_PERCENTAGE);
    const pmAllocation = Math.round(afterProfitAmount * this.PM_ALLOCATION_PERCENTAGE);

    return {
      totalCash,
      profitDeduction,
      afterProfitAmount,
      pmAllocation,
      m_expenseFund,
      withdrawalAmount: afterProfitAmount,
      calculationMethod: 'standard'
    };
  }
  
  /**
   * Calculate PM allocation using gross profit method
   * Formula: PM Amount = (Total Till Cash × Monthly Gross Profit %)
   */
  static calculateGrossProfitAllocation(
    totalTillCash: number,
    monthlyGrossProfitPercentage: number = 0.15 // Default 15%
  ): {
    totalTillCash: number;
    monthlyGrossProfit: number;
    pmAllocation: number;
    description: string;
  } {
    const pmAllocation = Math.round(totalTillCash * monthlyGrossProfitPercentage);
    
    return {
      totalTillCash,
      monthlyGrossProfit: monthlyGrossProfitPercentage,
      pmAllocation,
      description: `PM receives ${(monthlyGrossProfitPercentage * 100).toFixed(1)}% of total till cash as gross profit allocation`
    };
  }
  
  /**
   * Process automated allocation with all necessary records
   */
  static async processAutomatedAllocation(data: AutomatedAllocationData): Promise<{
    success: boolean;
    message: string;
    allocationId?: string;
    withdrawalId?: string;
  }> {
    const batch = writeBatch(db);
    
    try {
      // 1. Create PM allocation record
      const pmAllocationRef = doc(collection(db, 'allocation_PM'));
      batch.set(pmAllocationRef, {
        pmId: data.pmId,
        pmName: data.pmName,
        amount: data.pmAllocation,
        description: `Automated allocation from ${data.shift} shift - Date: ${data.businessDate}`,
        shiftType: data.shift,
        businessDate: data.businessDate,
        status: 'sent',
        accountantId: data.accountantId,
        accountantName: data.accountantName,
        cashCloseId: data.cashCloseId,
        notes: data.notes,
        automatedAllocation: true,
        calculationMethod: data.notes?.includes('Gross Profit Method') ? 'gross-profit' : 'standard',
        createdAt: serverTimestamp()
      });
      
      // 2. Create m_expense fund record (only if amount > 0)
      if (data.m_expenseFund > 0) {
        const m_expenseFundRef = doc(collection(db, 'm_expense_funds'));
        batch.set(m_expenseFundRef, {
          amount: data.m_expenseFund,
          description: `Special funds from ${data.shift} shift - Date: ${data.businessDate}`,
          shiftType: data.shift,
          businessDate: data.businessDate,
          status: 'allocated',
          accountantId: data.accountantId,
          accountantName: data.accountantName,
          cashCloseId: data.cashCloseId,
          fundType: 'special',
          automatedAllocation: true,
          createdAt: serverTimestamp()
        });
      }
      
      // 3. Create withdrawal record
      const withdrawalRef = doc(collection(db, 'withdrawals'));
      batch.set(withdrawalRef, {
        amount: data.totalWithdrawn,
        type: 'automated_allocation',
        description: `Automated withdrawal for allocations - ${data.shift} shift`,
        businessDate: data.businessDate,
        shiftType: data.shift,
        cashCloseId: data.cashCloseId,
        pmAllocation: data.pmAllocation,
        m_expenseFund: data.m_expenseFund,
        profitRetained: data.profitRetained,
        accountantId: data.accountantId,
        accountantName: data.accountantName,
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      // 4. Create allocation summary record
      const allocationSummaryRef = doc(collection(db, 'allocation_summaries'));
      batch.set(allocationSummaryRef, {
        cashCloseId: data.cashCloseId,
        businessDate: data.businessDate,
        shift: data.shift,
        totalAllocated: data.pmAllocation + data.m_expenseFund,
        pmAllocation: data.pmAllocation,
        m_expenseFund: data.m_expenseFund,
        profitRetained: data.profitRetained,
        totalWithdrawn: data.totalWithdrawn,
        pmId: data.pmId,
        pmName: data.pmName,
        accountantId: data.accountantId,
        accountantName: data.accountantName,
        processedAt: serverTimestamp(),
        automated: true
      });
      
      // Commit all changes
      await batch.commit();
      
      return {
        success: true,
        message: 'Automated allocation processed successfully',
        allocationId: pmAllocationRef.id,
        withdrawalId: withdrawalRef.id
      };
      
    } catch (error: any) {
      console.error('Error processing automated allocation:', error);
      return {
        success: false,
        message: error.message || 'Failed to process automated allocation'
      };
    }
  }
  
  /**
   * Get allocation history for a specific date range
   */
  static async getAllocationHistory(
    startDate: string,
    endDate?: string
  ): Promise<any[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, 'allocation_summaries'),
      where('businessDate', '>=', start.toISOString()),
      where('businessDate', '<=', end.toISOString()),
      orderBy('businessDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  /**
   * Get cash close data for a specific date (both shifts)
   */
  static async getCashClosesByDate(
    businessDate: string
  ): Promise<CashCloseSearchResult[]> {
    const results: CashCloseSearchResult[] = [];
    
    // Search for both shifts
    const shifts: ('day' | 'night')[] = ['day', 'night'];
    
    for (const shift of shifts) {
      const result = await this.searchCashCloseByDateAndShift(businessDate, shift);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Get recent cash closes for quick selection
   */
  static async getRecentCashCloses(days: number = 7): Promise<CashCloseSearchResult[]> {
    const results: CashCloseSearchResult[] = [];
    const today = new Date();
    
    // Go back 'days' number of days
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      const dailyResults = await this.getCashClosesByDate(dateString);
      results.push(...dailyResults);
    }
    
    return results;
  }
  
  /**
   * Check if allocation already exists for a cash close
   */
  static async checkExistingAllocation(
    cashCloseId: string,
    shift: string
  ): Promise<boolean> {
    const q = query(
      collection(db, 'allocation_PM'),
      where('cashCloseId', '==', cashCloseId),
      where('shiftType', '==', shift),
      where('automatedAllocation', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }
  
  // Helper methods for calculating totals
  private static calculateTotalCash(shiftData: any): number {
    if (!shiftData.tills || !Array.isArray(shiftData.tills)) return 0;
    
    return shiftData.tills.reduce((sum: number, till: any) => {
      return sum + (till.totalCashInTill || till.cashAmount || till.cashAtHand || 0);
    }, 0);
  }
  
  private static calculateTotalNetwork(shiftData: any): number {
    if (!shiftData.tills || !Array.isArray(shiftData.tills)) return 0;
    
    return shiftData.tills.reduce((sum: number, till: any) => {
      return sum + (till.totalNetworkPayments || till.actualNetworkMoney || 0);
    }, 0);
  }
  
  private static calculateTotalCashFromDoc(data: any): number {
    return data.totalCashInTill || 
           data.closeCash || 
           data.totalRevenue || 
           data.cashAmount ||
           data.actualAmount ||
           0;
  }
  
  private static calculateTotalNetworkFromDoc(data: any): number {
    return data.totalNetworkMoney || 
           data.totalNetworkPayments ||
           (data.airtel || 0) + 
           (data.mtn || 0) + 
           (data.stanbicBank || 0) + 
           (data.equityBank || 0) + 
           (data.absaBank || 0) + 
           (data.pesaPal || 0);
  }
  
  /**
   * Validate allocation amounts
   */
  static validateAllocation(breakdown: AllocationBreakdown): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (breakdown.totalCash <= 0) {
      errors.push('Total cash must be greater than 0');
    }
    
    if (breakdown.profitDeduction < 0) {
      errors.push('Profit deduction cannot be negative');
    }
    
    if (breakdown.pmAllocation < 0) {
      errors.push('PM allocation cannot be negative');
    }
    
    if (breakdown.m_expenseFund < 0) {
      errors.push('M expense fund cannot be negative');
    }
    
    // Verify calculations
    const expectedProfit = Math.round(breakdown.totalCash * this.PROFIT_PERCENTAGE);
    if (Math.abs(breakdown.profitDeduction - expectedProfit) > 1) {
      errors.push('Profit calculation error');
    }
    
    const expectedAfterProfit = breakdown.totalCash - breakdown.profitDeduction;
    if (Math.abs(breakdown.afterProfitAmount - expectedAfterProfit) > 1) {
      errors.push('After profit amount calculation error');
    }
    
    const totalAllocated = breakdown.pmAllocation + breakdown.m_expenseFund;
    if (Math.abs(totalAllocated - breakdown.afterProfitAmount) > 1) {
      errors.push('Allocation split calculation error');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default AutomatedAllocationService;
