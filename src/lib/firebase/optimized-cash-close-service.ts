import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';

/**
 * Optimized Cash Close Service
 * Uses proper indexes for efficient querying
 */
export class OptimizedCashCloseService {
  private collectionName = 'cashCloses';

  /**
   * Find cash close by date and shift using proper indexes
   */
  async findByDateAndShift(businessDate: string, shift: 'day' | 'night') {
    console.log(`🔍 Finding cash close for ${businessDate} - ${shift} shift`);

    const startDate = new Date(businessDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(businessDate);
    endDate.setHours(23, 59, 59, 999);

    try {
      // Try multiple date field variations with proper indexes
      const dateFields = [
        { field: 'cashCloseDate', label: 'cashCloseDate' },
        { field: 'businessDate', label: 'businessDate (string)' },
        { field: 'date', label: 'date field' }
      ];

      for (const dateField of dateFields) {
        try {
          let q;

          if (dateField.field === 'businessDate') {
            // For string date field
            q = query(
              collection(db, this.collectionName),
              where('businessDate', '==', businessDate),
              where('shift', '==', shift),
              orderBy('businessDate', 'desc')
            );
          } else {
            // For Timestamp fields
            q = query(
              collection(db, this.collectionName),
              where(dateField.field, '>=', Timestamp.fromDate(startDate)),
              where(dateField.field, '<=', Timestamp.fromDate(endDate)),
              where('shift', '==', shift),
              orderBy(dateField.field, 'desc')
            );
          }

          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            console.log(`✅ Found ${snapshot.size} cash close(s) using ${dateField.label} index`);

            // Convert and return first match
            const doc = snapshot.docs[0];
            const data = doc.data();

            return {
              id: doc.id,
              ...data,
              // Convert timestamps to Date objects
              cashCloseDate: data.cashCloseDate?.toDate?.() || data.cashCloseDate,
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
            };
          }
        } catch (error) {
          console.log(`⚠️  ${dateField.label} query failed, trying next...`, error.message);
          continue;
        }
      }

      console.log(`❌ No cash close found for ${businessDate} - ${shift} shift`);
      return null;

    } catch (error) {
      console.error('❌ Error in findByDateAndShift:', error);
      throw error;
    }
  }

  /**
   * Get cash closes for a date range with shift filtering
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    shift?: 'day' | 'night',
    limitCount: number = 50
  ) {
    console.log(`📅 Getting cash closes from ${startDate} to ${endDate}`);

    try {
      let q;

      if (shift) {
        // Use cashCloseDate + shift index
        q = query(
          collection(db, this.collectionName),
          where('cashCloseDate', '>=', Timestamp.fromDate(new Date(startDate))),
          where('cashCloseDate', '<=', Timestamp.fromDate(new Date(endDate))),
          where('shift', '==', shift),
          orderBy('cashCloseDate', 'desc'),
          limit(limitCount)
        );
      } else {
        // Use cashCloseDate + branchId index (assuming we have branch context)
        q = query(
          collection(db, this.collectionName),
          where('cashCloseDate', '>=', Timestamp.fromDate(new Date(startDate))),
          where('cashCloseDate', '<=', Timestamp.fromDate(new Date(endDate))),
          orderBy('cashCloseDate', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      console.log(`✅ Found ${snapshot.size} cash closes in date range`);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() || doc.data().cashCloseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }));

    } catch (error) {
      console.error('❌ Error in getByDateRange:', error);
      throw error;
    }
  }

  /**
   * Get recent cash closes by branch
   */
  async getRecentByBranch(branchId: string, limitCount: number = 10) {
    console.log(`🏢 Getting recent cash closes for branch: ${branchId}`);

    try {
      const q = query(
        collection(db, this.collectionName),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      console.log(`✅ Found ${snapshot.size} recent cash closes for branch`);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() || doc.data().cashCloseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }));

    } catch (error) {
      console.error('❌ Error in getRecentByBranch:', error);
      throw error;
    }
  }

  /**
   * Get cash closes by status
   */
  async getByStatus(status: string, limitCount: number = 20) {
    console.log(`📊 Getting cash closes with status: ${status}`);

    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', status),
        orderBy('cashCloseDate', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      console.log(`✅ Found ${snapshot.size} cash closes with status: ${status}`);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() || doc.data().cashCloseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }));

    } catch (error) {
      console.error('❌ Error in getByStatus:', error);
      throw error;
    }
  }

  /**
   * Get cash closes by creator
   */
  async getByCreator(creatorId: string, limitCount: number = 20) {
    console.log(`👤 Getting cash closes created by: ${creatorId}`);

    try {
      const q = query(
        collection(db, this.collectionName),
        where('createdBy', '==', creatorId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      console.log(`✅ Found ${snapshot.size} cash closes created by user`);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() || doc.data().cashCloseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }));

    } catch (error) {
      console.error('❌ Error in getByCreator:', error);
      throw error;
    }
  }

  /**
   * Get cash closes by shift (all dates)
   */
  async getByShift(shift: 'day' | 'night', limitCount: number = 20) {
    console.log(`🌅 Getting cash closes for ${shift} shift`);

    try {
      const q = query(
        collection(db, this.collectionName),
        where('shift', '==', shift),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      console.log(`✅ Found ${snapshot.size} cash closes for ${shift} shift`);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() || doc.data().cashCloseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }));

    } catch (error) {
      console.error('❌ Error in getByShift:', error);
      throw error;
    }
  }

  /**
   * Get paginated results with cursor-based pagination
   */
  async getPaginated(
    lastDoc?: DocumentSnapshot,
    pageSize: number = 10,
    filters?: {
      branchId?: string;
      status?: string;
      shift?: 'day' | 'night';
      startDate?: string;
      endDate?: string;
    }
  ) {
    console.log('📄 Getting paginated cash closes');

    try {
      let q = query(collection(db, this.collectionName), orderBy('cashCloseDate', 'desc'));

      // Apply filters
      if (filters?.branchId) {
        q = query(q, where('branchId', '==', filters.branchId));
      }
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters?.shift) {
        q = query(q, where('shift', '==', filters.shift));
      }
      if (filters?.startDate) {
        q = query(q, where('cashCloseDate', '>=', Timestamp.fromDate(new Date(filters.startDate))));
      }
      if (filters?.endDate) {
        q = query(q, where('cashCloseDate', '<=', Timestamp.fromDate(new Date(filters.endDate))));
      }

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc), limit(pageSize));
      } else {
        q = query(q, limit(pageSize));
      }

      const snapshot = await getDocs(q);

      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        cashCloseDate: doc.data().cashCloseDate?.toDate?.() || doc.data().cashCloseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
      }));

      console.log(`✅ Retrieved ${results.length} cash closes (page size: ${pageSize})`);

      return {
        data: results,
        hasMore: snapshot.size === pageSize,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
      };

    } catch (error) {
      console.error('❌ Error in getPaginated:', error);
      throw error;
    }
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics(branchId?: string) {
    console.log('📊 Calculating cash close statistics');

    try {
      let baseQuery = collection(db, this.collectionName);

      if (branchId) {
        baseQuery = query(baseQuery, where('branchId', '==', branchId));
      }

      const snapshot = await getDocs(baseQuery);

      const stats = {
        total: snapshot.size,
        byStatus: {} as Record<string, number>,
        byShift: {} as Record<string, number>,
        totalRevenue: 0,
        totalCash: 0,
        totalExpenses: 0,
        recentCount: 0
      };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      snapshot.docs.forEach(doc => {
        const data = doc.data();

        // Count by status
        const status = data.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Count by shift
        const shift = data.shift || 'unknown';
        stats.byShift[shift] = (stats.byShift[shift] || 0) + 1;

        // Sum financials
        stats.totalRevenue += data.totalRevenue || 0;
        stats.totalCash += data.totalCashInTill || 0;
        stats.totalExpenses += data.totalExpenses || 0;

        // Count recent
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        if (createdAt && createdAt >= sevenDaysAgo) {
          stats.recentCount++;
        }
      });

      console.log('✅ Statistics calculated successfully');
      return stats;

    } catch (error) {
      console.error('❌ Error calculating statistics:', error);
      throw error;
    }
  }
}

export default OptimizedCashCloseService;








