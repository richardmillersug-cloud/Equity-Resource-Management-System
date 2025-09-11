import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';

// Unified interface that combines all cash close data types
export interface UnifiedCashClose {
  id: string;
  employeeId: string;
  branchId: string;
  shift: 'day' | 'night';
  closeCash: number;
  actualAmount: number;
  expectedAmount: number;
  cashPresent: number;
  airtel: number;
  mtn: number;
  stanbicBank: number;
  equityBank: number;
  absaBank: number;
  pesaPal: number;
  shortage: number;
  excess: number;
  date: Date;
  time: string;
  createdAt: Date;
  updatedAt: Date;
  dataSource: 'cashClose' | 'cashCloses' | 'comprehensiveCashClose';
  totalNetworkMoney: number;
  profitMargin?: number;
}

/**
 * Helper function to safely convert dates
 */
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (typeof dateValue === 'string') return new Date(dateValue);
  if (typeof dateValue === 'number') return new Date(dateValue);
  return new Date();
};

/**
 * Unified Cash Close Service
 * Aggregates data from all cash close collections and provides a single interface
 */
export class UnifiedCashCloseService {
  
  /**
   * Get all cash closes from all sources with unified interface
   */
  static async getAllCashCloses(): Promise<UnifiedCashClose[]> {
    const allCashCloses: UnifiedCashClose[] = [];
    
    // 1. Try cashCloses collection (accountant primary source - firestore-service-simple)
    try {
      console.log('📊 Loading from cashCloses collection (Primary - Accountant)...');
      const cashClosesRef = collection(db, 'cashCloses');
      const q1 = query(cashClosesRef, orderBy('createdAt', 'desc'), limit(100));
      const snapshot1 = await getDocs(q1);
      
      snapshot1.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if this record already exists from previous collection
        const existingRecord = allCashCloses.find(record => 
          record.date.getTime() === safeToDate(data.cashCloseDate || data.createdAt).getTime() &&
          record.branchId === data.branchId &&
          Math.abs(record.closeCash - (data.totalRevenue || 0)) < 1000 // Allow small variance
        );
        
        if (!existingRecord) {
          allCashCloses.push({
            id: doc.id,
            employeeId: data.employeeId || data.createdBy || 'unknown',
            branchId: data.branchId || 'unknown',
            shift: data.shift || 'day',
            closeCash: data.totalRevenue || data.cashCloseTotal || data.closeCash || 0,
            actualAmount: data.totalActualCash || data.actualAmount || 0,
            expectedAmount: data.totalExpectedCash || data.expectedAmount || 0,
            cashPresent: data.cashPresent || 0,
            airtel: data.airtel || 0,
            mtn: data.mtn || 0,
            stanbicBank: data.stanbicBank || 0,
            equityBank: data.equityBank || 0,
            absaBank: data.absaBank || 0,
            pesaPal: data.pesaPal || 0,
            shortage: data.totalShortage || data.shortage || 0,
            excess: data.totalExcess || data.excess || 0,
            date: safeToDate(data.cashCloseDate || data.date || data.createdAt),
            time: data.time || new Date().toLocaleTimeString(),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            dataSource: 'cashCloses',
            totalNetworkMoney: data.totalNetworkMoney || (data.airtel || 0) + (data.mtn || 0) + (data.stanbicBank || 0) + (data.equityBank || 0) + (data.absaBank || 0) + (data.pesaPal || 0),
            profitMargin: data.profitMargin
          });
        }
      });
      
      console.log(`✅ Loaded ${snapshot1.docs.length} records from cashCloses (Primary)`);
    } catch (error) {
      console.warn('Failed to load from cashCloses collection (Primary):', error);
    }

    // 2. Try cashClose collection (purchasing-manager-service - fallback)
    try {
      console.log('📊 Loading from cashClose collection (Fallback)...');
      const cashCloseRef = collection(db, 'cashClose');
      const q2 = query(cashCloseRef, orderBy('date', 'desc'), limit(100));
      const snapshot2 = await getDocs(q2);
      
      snapshot2.docs.forEach(doc => {
        const data = doc.data();
        
        const networkTotal = (data.airtel || 0) + (data.mtn || 0) + (data.stanbicBank || 0) + 
                           (data.equityBank || 0) + (data.absaBank || 0) + (data.pesaPal || 0);
        
        // Check if this record already exists from previous collection
        const existingRecord = allCashCloses.find(record => 
          record.date.getTime() === safeToDate(data.date || data.createdAt).getTime() &&
          record.branchId === data.branchId &&
          Math.abs(record.closeCash - (data.closeCash || 0)) < 1000 // Allow small variance
        );
        
        if (!existingRecord) {
          allCashCloses.push({
            id: doc.id,
            employeeId: data.employeeId || 'unknown',
            branchId: data.branchId || 'unknown',
            shift: data.shift || 'day',
            closeCash: data.closeCash || 0,
            actualAmount: data.actualAmount || 0,
            expectedAmount: data.expectedAmount || 0,
            cashPresent: data.cashPresent || 0,
            airtel: data.airtel || 0,
            mtn: data.mtn || 0,
            stanbicBank: data.stanbicBank || 0,
            equityBank: data.equityBank || 0,
            absaBank: data.absaBank || 0,
            pesaPal: data.pesaPal || 0,
            shortage: data.shortage || 0,
            excess: data.excess || 0,
            date: safeToDate(data.date),
            time: data.time || new Date().toLocaleTimeString(),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            dataSource: 'cashClose',
            totalNetworkMoney: networkTotal,
            profitMargin: data.profitMargin
          });
        }
      });
      
      console.log(`✅ Loaded ${snapshot2.docs.length} records from cashClose (Fallback)`);
    } catch (error) {
      console.warn('Failed to load from cashClose collection (Fallback):', error);
    }

    // 3. Try comprehensiveCashClose collection
    try {
      console.log('📊 Loading from comprehensiveCashClose collection...');
      const comprehensiveRef = collection(db, 'comprehensiveCashClose');
      const q3 = query(comprehensiveRef, orderBy('createdAt', 'desc'), limit(100));
      const snapshot3 = await getDocs(q3);
      
      snapshot3.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if this record already exists from previous collections
        const existingRecord = allCashCloses.find(record => 
          record.date.getTime() === safeToDate(data.cashCloseDate).getTime() &&
          record.branchId === data.branchId &&
          Math.abs(record.closeCash - (data.totalRevenue || 0)) < 1000
        );
        
        if (!existingRecord) {
          allCashCloses.push({
            id: doc.id,
            employeeId: data.createdBy || 'unknown',
            branchId: data.branchId || 'unknown',
            shift: data.shift || 'day', // ✅ FIXED: Use actual shift data if available, fallback to day
            closeCash: data.totalRevenue || 0,
            actualAmount: data.totalActualCash || 0,
            expectedAmount: data.totalExpectedCash || 0,
            cashPresent: data.totalActualCash || 0,
            airtel: 0, // Would need to extract from network payments array
            mtn: 0,
            stanbicBank: 0,
            equityBank: 0,
            absaBank: 0,
            pesaPal: 0,
            shortage: data.totalShortage || 0,
            excess: data.totalExcess || 0,
            date: safeToDate(data.cashCloseDate),
            time: safeToDate(data.cashCloseDate).toLocaleTimeString(),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            dataSource: 'comprehensiveCashClose',
            totalNetworkMoney: data.totalNetworkPayments || 0,
            profitMargin: data.profitPercentage
          });
        }
      });
      
      console.log(`✅ Loaded ${snapshot3.docs.length} records from comprehensiveCashClose`);
    } catch (error) {
      console.warn('Failed to load from comprehensiveCashClose collection:', error);
    }

    // Sort by date (newest first) and remove duplicates
    const sortedCloses = allCashCloses
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 100); // Limit to 100 most recent

    console.log(`🎯 Total unified cash closes: ${sortedCloses.length}`);
    return sortedCloses;
  }

  /**
   * Subscribe to real-time updates from all cash close collections
   */
  static subscribeToAllCashCloses(callback: (cashCloses: UnifiedCashClose[]) => void): () => void {
    const unsubscribeFunctions: (() => void)[] = [];
    let allData: { [key: string]: UnifiedCashClose[] } = {
      cashCloses: [],
      cashClose: [],
      comprehensiveCashClose: []
    };

    const updateCallback = () => {
      const combined = Object.values(allData).flat();
      const deduped = UnifiedCashCloseService.removeDuplicates(combined);
      const sorted = deduped.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 100);
      callback(sorted);
    };

    // Subscribe to cashCloses collection (Primary - Accountant)
    try {
      const q1 = query(collection(db, 'cashCloses'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe1 = onSnapshot(q1, (snapshot) => {
        allData.cashCloses = snapshot.docs.map(doc => {
          const data = doc.data();
          const networkTotal = (data.airtel || 0) + (data.mtn || 0) + (data.stanbicBank || 0) + 
                             (data.equityBank || 0) + (data.absaBank || 0) + (data.pesaPal || 0);
          
          return {
            id: doc.id,
            employeeId: data.employeeId || data.createdBy || 'unknown',
            branchId: data.branchId || 'unknown',
            shift: data.shift || 'day',
            closeCash: data.totalRevenue || data.cashCloseTotal || data.closeCash || 0,
            actualAmount: data.totalActualCash || data.actualAmount || 0,
            expectedAmount: data.totalExpectedCash || data.expectedAmount || 0,
            cashPresent: data.cashPresent || 0,
            airtel: data.airtel || 0,
            mtn: data.mtn || 0,
            stanbicBank: data.stanbicBank || 0,
            equityBank: data.equityBank || 0,
            absaBank: data.absaBank || 0,
            pesaPal: data.pesaPal || 0,
            shortage: data.totalShortage || data.shortage || 0,
            excess: data.totalExcess || data.excess || 0,
            date: data.cashCloseDate?.toDate ? data.cashCloseDate.toDate() : 
                  data.date?.toDate ? data.date.toDate() : 
                  data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            time: data.time || new Date().toLocaleTimeString(),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            dataSource: 'cashCloses' as const,
            totalNetworkMoney: data.totalNetworkMoney || networkTotal,
            profitMargin: data.profitMargin
          };
        });
        updateCallback();
      });
      unsubscribeFunctions.push(unsubscribe1);
    } catch (error) {
      console.warn('Failed to subscribe to cashCloses (Primary):', error);
    }

    // Subscribe to cashClose collection (Fallback)
    try {
      const q2 = query(collection(db, 'cashClose'), orderBy('date', 'desc'), limit(50));
      const unsubscribe2 = onSnapshot(q2, (snapshot) => {
        allData.cashClose = snapshot.docs.map(doc => {
          const data = doc.data();
          const networkTotal = (data.airtel || 0) + (data.mtn || 0) + (data.stanbicBank || 0) + 
                             (data.equityBank || 0) + (data.absaBank || 0) + (data.pesaPal || 0);
          
          return {
            id: doc.id,
            employeeId: data.employeeId || 'unknown',
            branchId: data.branchId || 'unknown',
            shift: data.shift || 'day',
            closeCash: data.closeCash || 0,
            actualAmount: data.actualAmount || 0,
            expectedAmount: data.expectedAmount || 0,
            cashPresent: data.cashPresent || 0,
            airtel: data.airtel || 0,
            mtn: data.mtn || 0,
            stanbicBank: data.stanbicBank || 0,
            equityBank: data.equityBank || 0,
            absaBank: data.absaBank || 0,
            pesaPal: data.pesaPal || 0,
            shortage: data.shortage || 0,
            excess: data.excess || 0,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            time: data.time || new Date().toLocaleTimeString(),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            dataSource: 'cashClose' as const,
            totalNetworkMoney: networkTotal,
            profitMargin: data.profitMargin
          };
        });
        updateCallback();
      });
      unsubscribeFunctions.push(unsubscribe2);
    } catch (error) {
      console.warn('Failed to subscribe to cashClose (Fallback):', error);
    }

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Remove duplicate cash close records based on date, branch, and amount
   */
  private static removeDuplicates(cashCloses: UnifiedCashClose[]): UnifiedCashClose[] {
    const seen = new Set<string>();
    return cashCloses.filter(cashClose => {
      const key = `${cashClose.branchId}-${cashClose.date.toDateString()}-${cashClose.closeCash}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get cash closes for a specific branch
   */
  static async getCashClosesForBranch(branchId: string): Promise<UnifiedCashClose[]> {
    const allCashCloses = await this.getAllCashCloses();
    return allCashCloses.filter(cashClose => cashClose.branchId === branchId);
  }

  /**
   * Get cash close statistics across all collections
   */
  static async getCashCloseStats(): Promise<{
    totalRecords: number;
    sourceBreakdown: { [key: string]: number };
    totalRevenue: number;
    totalShortage: number;
    totalExcess: number;
    averageDaily: number;
  }> {
    const allCashCloses = await this.getAllCashCloses();
    
    const sourceBreakdown = allCashCloses.reduce((acc, cashClose) => {
      acc[cashClose.dataSource] = (acc[cashClose.dataSource] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const totalRevenue = allCashCloses.reduce((sum, cashClose) => sum + cashClose.closeCash, 0);
    const totalShortage = allCashCloses.reduce((sum, cashClose) => sum + cashClose.shortage, 0);
    const totalExcess = allCashCloses.reduce((sum, cashClose) => sum + cashClose.excess, 0);
    
    return {
      totalRecords: allCashCloses.length,
      sourceBreakdown,
      totalRevenue,
      totalShortage,
      totalExcess,
      averageDaily: allCashCloses.length > 0 ? totalRevenue / allCashCloses.length : 0
    };
  }
}

// Export singleton instance
export const unifiedCashCloseService = new UnifiedCashCloseService();
