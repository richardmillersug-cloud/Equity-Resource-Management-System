import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './config';

// Simple special funds service without complex queries to avoid index issues
export class SimpleSpecialFundsService {
  
  // Get all special funds without complex filtering - no index needed
  async getAllSpecialFundsSimple(): Promise<any[]> {
    try {
      console.log('🔍 Fetching all special funds (simple query)...');
      
      const collectionRef = collection(db, 'specialFundsTracker');
      const snapshot = await getDocs(collectionRef);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps
        lastUpdated: doc.data().lastUpdated?.toDate?.() || doc.data().lastUpdated,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      }));
      
      console.log(`✅ Found ${documents.length} special funds documents`);
      return documents;
      
    } catch (error) {
      console.error('❌ Error fetching special funds:', error);
      throw error;
    }
  }

  // Get recent special funds with simple ordering
  async getRecentSpecialFunds(limitCount: number = 10): Promise<any[]> {
    try {
      console.log(`🔍 Fetching recent ${limitCount} special funds...`);
      
      const collectionRef = collection(db, 'specialFundsTracker');
      const q = query(collectionRef, orderBy('lastUpdated', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate?.() || doc.data().lastUpdated,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      }));
      
      console.log(`✅ Found ${documents.length} recent special funds`);
      return documents;
      
    } catch (error) {
      console.error('❌ Error fetching recent special funds:', error);
      throw error;
    }
  }

  // Get special funds summary without complex aggregations
  async getSpecialFundsSummary(): Promise<{
    totalRecords: number;
    totalAllocated: number;
    totalAcknowledged: number;
    totalBalance: number;
    savingsTotal: number;
  }> {
    try {
      console.log('🔍 Calculating special funds summary...');
      
      const specialFunds = await this.getAllSpecialFundsSimple();
      
      const summary = {
        totalRecords: specialFunds.length,
        totalAllocated: specialFunds.reduce((sum, fund) => sum + (fund.specialFundsAllocated || 0), 0),
        totalAcknowledged: specialFunds.reduce((sum, fund) => sum + (fund.specialFundsAcknowledged || 0), 0),
        totalBalance: specialFunds.reduce((sum, fund) => sum + (fund.specialFundsBalance || 0), 0),
        savingsTotal: specialFunds.reduce((sum, fund) => sum + (fund.savingsAllocated || 0), 0)
      };
      
      console.log('✅ Special funds summary calculated:', summary);
      return summary;
      
    } catch (error) {
      console.error('❌ Error calculating special funds summary:', error);
      throw error;
    }
  }
}












