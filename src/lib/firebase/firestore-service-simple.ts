import { collection, getDocs, query, orderBy, limit, where, and } from 'firebase/firestore';
import { db } from './config';

// Simple service without complex queries to avoid index issues
export class SimpleCashCloseService {
  
  // Get all cash closes without filtering - no index needed
  async getAllCashClosesSimple(): Promise<any[]> {
    try {
      console.log('🔍 Fetching all cash closes (simple query)...');
      
      const collectionRef = collection(db, 'cashCloses');
      const snapshot = await getDocs(collectionRef);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps - create new Date objects to prevent mutation
        createdAt: doc.data().createdAt?.toDate?.() ? 
          new Date(doc.data().createdAt.toDate().getTime()) : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() ? 
          new Date(doc.data().updatedAt.toDate().getTime()) : doc.data().updatedAt,
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() ? 
          new Date(doc.data().cashCloseDate.toDate().getTime()) : doc.data().cashCloseDate,
      }));
      
      console.log(`✅ Found ${documents.length} cash close documents`);
      console.log('🔍 Sample document timestamps:', documents.length > 0 ? {
        id: documents[0].id,
        createdAt: documents[0].createdAt,
        cashCloseDate: documents[0].cashCloseDate
      } : 'No documents');
      return documents;
      
    } catch (error) {
      console.error('❌ Error fetching cash closes:', error);
      throw error;
    }
  }

  // Get recent cash closes with simple ordering
  async getRecentCashCloses(limitCount: number = 10): Promise<any[]> {
    try {
      console.log(`🔍 Fetching recent ${limitCount} cash closes...`);
      
      const collectionRef = collection(db, 'cashCloses');
      const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps - create new Date objects to prevent mutation
        createdAt: doc.data().createdAt?.toDate?.() ? 
          new Date(doc.data().createdAt.toDate().getTime()) : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() ? 
          new Date(doc.data().updatedAt.toDate().getTime()) : doc.data().updatedAt,
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() ? 
          new Date(doc.data().cashCloseDate.toDate().getTime()) : doc.data().cashCloseDate,
      }));
      
      console.log(`✅ Found ${documents.length} recent cash closes`);
      return documents;
      
    } catch (error) {
      console.error('❌ Error fetching recent cash closes:', error);
      throw error;
    }
  }

  // Optimized method to get cash closes for PM allocation
  async getCashClosesForAllocation(status?: string, shift?: 'day' | 'night', daysBack: number = 7): Promise<any[]> {
    try {
      console.log(`🔍 Fetching cash closes for allocation (status: ${status}, shift: ${shift}, days: ${daysBack})...`);

      // Build query with filters
      const collectionRef = collection(db, 'cashCloses');
      let q = query(collectionRef, orderBy('createdAt', 'desc'));

      // Add status filter if provided
      if (status) {
        q = query(q, where('status', '==', status));
      }

      // Add shift filter if provided
      if (shift) {
        q = query(q, where('shift', '==', shift));
      }

      // Limit results
      q = query(q, limit(50));

      const snapshot = await getDocs(q);

      // Filter by date range in memory (since we can't combine timestamp inequality with other filters)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const documents = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps - create new Date objects to prevent mutation
          createdAt: doc.data().createdAt?.toDate?.() ?
            new Date(doc.data().createdAt.toDate().getTime()) : doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.() ?
            new Date(doc.data().updatedAt.toDate().getTime()) : doc.data().updatedAt,
          cashCloseDate: doc.data().cashCloseDate?.toDate?.() ?
            new Date(doc.data().cashCloseDate.toDate().getTime()) : doc.data().cashCloseDate,
        }))
        .filter(doc => {
          // Filter by date in memory
          const docDate = doc.createdAt || doc.cashCloseDate;
          if (!docDate) return true; // Include if no date

          const dateToCompare = docDate instanceof Date ? docDate : new Date(docDate);
          return dateToCompare >= cutoffDate;
        })
        .slice(0, 20); // Limit to 20 most recent

      console.log(`✅ Found ${documents.length} cash closes for allocation`);
      return documents;

    } catch (error) {
      console.error('❌ Error fetching cash closes for allocation:', error);
      console.log('Falling back to simple fetch...');

      // Fallback to simple fetch if query fails
      return await this.getAllCashClosesSimple();
    }
  }

  // Calculate PM allocation from cash close data
  calculatePMAllocation(cashClose: any, shiftType: 'day' | 'night') {
    try {
      let totalCash = 0;

      // Try to get shift-specific data first
      if (cashClose.shifts && Array.isArray(cashClose.shifts)) {
        const shift = cashClose.shifts.find((s: any) => s.shift === shiftType);
        if (shift) {
          // Calculate from shift tills
          if (shift.tills && Array.isArray(shift.tills)) {
            totalCash = shift.tills.reduce((sum: number, till: any) => sum + (till.totalCashInTill || till.cashAmount || 0), 0);
          } else if (shift.shiftTotalCash) {
            totalCash = shift.shiftTotalCash;
          }
        }
      }

      // Fallback to main totals if shift data not available
      if (totalCash === 0) {
        totalCash = cashClose.totalCashInTill || cashClose.closeCash || cashClose.totalRevenue || 0;
      }

      // Apply 12% profit deduction (standard business rule)
      const profitDeduction = Math.round(totalCash * 0.12);
      const pmAllocation = totalCash - profitDeduction;

      // Calculate special funds (30%) and PM allocation (70%)
      const specialFunds = Math.round(pmAllocation * 0.3);
      const finalPmAllocation = pmAllocation - specialFunds;

      return {
        totalCash,
        profitDeduction,
        pmAllocation: Math.max(0, finalPmAllocation),
        specialFunds,
        shiftType,
        businessDate: cashClose.businessDate || cashClose.date
      };

    } catch (error) {
      console.error('❌ Error calculating PM allocation:', error);
      return null;
    }
  }
}


