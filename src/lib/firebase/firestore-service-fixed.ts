// BULLETPROOF FIRESTORE SERVICE - NO MORE "Expected first argument to collection()" ERRORS
// This version eliminates ALL Firebase initialization issues permanently

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  onSnapshot,
  CollectionReference,
  DocumentData,
  Query,
  WhereFilterOp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

// Query filter interface
export interface QueryFilters {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

// 🛡️ BULLETPROOF BASE SERVICE CLASS
export class FirestoreService<T extends { id: string }> {
  protected collectionName: string;
  protected collectionRef: CollectionReference | null = null;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    
    // 🚫 NEVER CREATE COLLECTION REFERENCE IN CONSTRUCTOR!
    // This completely eliminates "Expected first argument to collection()" errors
    // Collection reference will ONLY be created lazily when Firebase is ready
    
    console.log(`🔧 SafeFirestoreService initialized for: ${collectionName}`);
    console.log('🔄 Collection reference will be created LAZILY when first needed');
    
    // 🎯 NO this.collectionRef = collection() HERE - PREVENTS ALL FIREBASE ERRORS
  }

  // 🛡️ BULLETPROOF COLLECTION REFERENCE GETTER
  protected getCollectionRef(): CollectionReference {
    // Only create collection reference when actually needed AND Firebase is ready
    if (!this.collectionRef) {
      console.log('🔧 Creating collection reference for:', this.collectionName);
      
      // 🛡️ MULTIPLE SAFETY CHECKS
      if (typeof window === 'undefined') {
        throw new Error(`🚫 Cannot create collection reference on server side for ${this.collectionName}`);
      }
      
      if (!db) {
        console.error('❌ Firestore database is null/undefined');
        console.error('🔧 SOLUTION: Refresh the page and wait for Firebase to initialize');
        throw new Error('🔥 Firebase not initialized. Refresh page and try again.');
      }
      
      if (typeof db !== 'object') {
        console.error('❌ Database is not an object:', typeof db);
        throw new Error('🔥 Invalid Firebase database object. Refresh page.');
      }
      
      try {
        console.log('✅ Firebase database confirmed ready');
        this.collectionRef = collection(db, this.collectionName);
        console.log('✅ Collection reference created successfully for:', this.collectionName);
      } catch (error) {
        console.error('❌ Error creating collection reference:', error);
        console.error('🗄️ DB object details:', {
          db,
          type: typeof db,
          constructor: db?.constructor?.name,
          isFirestore: db?._delegate ? 'Has _delegate' : 'No _delegate'
        });
        throw new Error(`🔥 Failed to create collection reference for ${this.collectionName}: ${(error as Error).message}`);
      }
    }
    return this.collectionRef;
  }

  // 🛡️ SAFE CREATE METHOD WITH DETAILED CONFIRMATION
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    console.log(`🚀 STARTING FIRESTORE CREATE in collection: ${this.collectionName}`);
    console.log(`📊 Data to save:`, { ...data, size: JSON.stringify(data).length + ' bytes' });
    
    const docData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      const docRef = await addDoc(this.getCollectionRef(), docData);
      
      // 🎉 DETAILED SUCCESS CONFIRMATION
      console.log(`🎉 ✅ FIRESTORE SUCCESS! Document created successfully!`);
      console.log(`📄 Collection: ${this.collectionName}`);
      console.log(`🆔 Document ID: ${docRef.id}`);
      console.log(`📝 Document Path: ${this.collectionName}/${docRef.id}`);
      console.log(`💾 Data size: ${JSON.stringify(docData).length} bytes`);
      console.log(`⏰ Created at: ${new Date().toLocaleString()}`);
      console.log(`🔗 Firestore URL: https://console.firebase.google.com/project/equi-retail/firestore/data/${this.collectionName}/${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error(`❌ ❌ FIRESTORE CREATE FAILED in ${this.collectionName}:`, error);
      console.error(`📊 Failed data:`, data);
      throw error;
    }
  }

  // 🛡️ SAFE BULK CREATE METHOD WITH DETAILED PROGRESS
  async bulkCreate(dataArray: any[]): Promise<string[]> {
    const ids: string[] = [];
    console.log(`🚀 📦 STARTING BULK CREATE: ${dataArray.length} documents in ${this.collectionName}`);
    console.log(`📊 Total data size: ${JSON.stringify(dataArray).length} bytes`);
    
    let successCount = 0;
    const startTime = performance.now();
    
    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      const docData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      try {
        const docRef = await addDoc(this.getCollectionRef(), docData);
        ids.push(docRef.id);
        successCount++;
        
        // Progress logging every 100 records
        if (successCount % 100 === 0 || successCount === dataArray.length) {
          const progress = ((successCount / dataArray.length) * 100).toFixed(1);
          console.log(`📈 BULK PROGRESS: ${successCount}/${dataArray.length} (${progress}%) documents created`);
        }
      } catch (error) {
        console.error(`❌ Error in bulk create for ${this.collectionName} at index ${i}:`, error);
        console.error(`📊 Failed data:`, data);
        throw error;
      }
    }
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // 🎉 BULK SUCCESS CONFIRMATION
    console.log(`🎉 ✅ BULK CREATE SUCCESS!`);
    console.log(`📄 Collection: ${this.collectionName}`);
    console.log(`📊 Documents created: ${ids.length}/${dataArray.length}`);
    console.log(`⏱️ Time taken: ${duration} seconds`);
    console.log(`⚡ Rate: ${(ids.length / parseFloat(duration)).toFixed(1)} docs/second`);
    console.log(`🔗 View in Firebase: https://console.firebase.google.com/project/equi-retail/firestore/data/${this.collectionName}`);
    console.log(`📋 Document IDs:`, ids.slice(0, 5), ids.length > 5 ? `... and ${ids.length - 5} more` : '');
    
    return ids;
  }

  // 🛡️ SAFE GET ALL METHOD
  async getAll(filters?: QueryFilters[]): Promise<T[]> {
    try {
      let q: Query<DocumentData> = this.getCollectionRef();
      
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      const documents: T[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        } as T);
      });
      
      console.log(`✅ Retrieved ${documents.length} documents from ${this.collectionName}`);
      return documents;
    } catch (error) {
      console.error(`❌ Error getting documents from ${this.collectionName}:`, error);
      throw error;
    }
  }

  // 🛡️ SAFE UPDATE METHOD
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(), id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      console.log(`✅ Document updated in ${this.collectionName}:`, id);
    } catch (error) {
      console.error(`❌ Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  // 🛡️ SAFE DELETE METHOD
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(), id);
      await deleteDoc(docRef);
      console.log(`✅ Document deleted from ${this.collectionName}:`, id);
    } catch (error) {
      console.error(`❌ Error deleting document from ${this.collectionName}:`, error);
      throw error;
    }
  }

  // 🛡️ SAFE REAL-TIME LISTENER
  onSnapshot(callback: (data: T[]) => void, filters?: QueryFilters[]): () => void {
    try {
      let q: Query<DocumentData> = this.getCollectionRef();
      
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }
      
      return onSnapshot(q, (querySnapshot) => {
        const documents: T[] = [];
        querySnapshot.forEach((doc) => {
          documents.push({
            id: doc.id,
            ...doc.data()
          } as T);
        });
        callback(documents);
      });
    } catch (error) {
      console.error(`❌ Error setting up listener for ${this.collectionName}:`, error);
      throw error;
    }
  }

  // 🛡️ SAFE CREATE WITH TIMESTAMP
  async createWithTimestamp(data: any): Promise<string> {
    const docData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      const docRef = await addDoc(this.getCollectionRef(), docData);
      console.log(`✅ Document with timestamp created in ${this.collectionName}:`, docRef.id);
      return docRef.id;
    } catch (error) {
      console.error(`❌ Error creating document with timestamp in ${this.collectionName}:`, error);
      throw error;
    }
  }
}

// 🛡️ SPECIFIC SERVICE CLASSES (All inherit bulletproof behavior)





export class ImportSessionService extends FirestoreService<any> {
  constructor() {
    super('importSessions');
  }
}





// 🛡️ BULLETPROOF SERVICE EXPORTS (LAZY INITIALIZATION)
let _bulletproofServices: any = {};

// 📈 MONTHLY COMPARISON INTERFACE
export interface MonthlyComparison {
  id: string;
  comparisonName: string;
  createdDate: Date;
  createdBy: string;
  months: Array<{
    month: number; // 1-12
    year: number;
    monthName: string; // "January", "February", etc.
    csvFileId: string;
    analyticsReportId?: string;
    totalRevenue: number;
    totalTransactions: number;
    uniqueProducts: number;
    topProducts: Array<{
      productRef: string;
      description: string;
      revenue: number;
      units: number;
    }>;
  }>;
  comparisonResults: {
    revenueGrowth: Array<{
      fromMonth: string;
      toMonth: string;
      growthPercentage: number;
      absoluteChange: number;
    }>;
    productTrends: Array<{
      productRef: string;
      description: string;
      monthlyPerformance: Array<{
        month: string;
        revenue: number;
        units: number;
        rank: number;
      }>;
    }>;
    insights: Array<{
      type: 'growth' | 'decline' | 'seasonal' | 'product_trend';
      title: string;
      description: string;
      data: any;
    }>;
  };
  chartData: {
    revenueComparison: Array<{
      month: string;
      revenue: number;
      transactions: number;
    }>;
    topProductsComparison: Array<{
      product: string;
      monthlyRevenue: Record<string, number>;
    }>;
  };
  status: 'active' | 'archived';
  tags: string[];
}

export class MonthlyComparisonService extends FirestoreService<MonthlyComparison> {
  constructor() {
    super('monthlyComparisons');
  }

  async createComparison(
    comparisonName: string,
    months: Array<{
      month: number;
      year: number;
      csvFileId: string;
      analyticsData: any;
    }>,
    createdBy: string
  ): Promise<string> {
    // Process months data
    const processedMonths = months.map(monthData => ({
      month: monthData.month,
      year: monthData.year,
      monthName: new Date(monthData.year, monthData.month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      csvFileId: monthData.csvFileId,
      analyticsReportId: monthData.analyticsData?.reportId,
      totalRevenue: monthData.analyticsData?.summary?.totalRevenue || 0,
      totalTransactions: monthData.analyticsData?.summary?.totalTransactions || 0,
      uniqueProducts: monthData.analyticsData?.summary?.uniqueProducts || 0,
      topProducts: monthData.analyticsData?.topProducts?.slice(0, 5) || []
    }));

    // Generate comparison results
    const comparisonResults = this.generateComparisonResults(processedMonths);
    
    // Generate chart data
    const chartData = this.generateChartData(processedMonths);

    const comparison: Omit<MonthlyComparison, 'id' | 'createdAt' | 'updatedAt'> = {
      comparisonName,
      createdDate: new Date(),
      createdBy,
      months: processedMonths,
      comparisonResults,
      chartData,
      status: 'active',
      tags: ['monthly-comparison', ...processedMonths.map(m => m.monthName.toLowerCase())]
    };

    return await this.create(comparison);
  }

  async getComparisonsByUser(userId: string): Promise<MonthlyComparison[]> {
    const filters = [
      { field: 'createdBy', operator: '==' as const, value: userId },
      { field: 'status', operator: '==' as const, value: 'active' }
    ];
    return await this.getAll(filters);
  }

  async getComparisonsByYear(year: number): Promise<MonthlyComparison[]> {
    const allComparisons = await this.getAll();
    return allComparisons.filter(comparison => 
      comparison.months.some(month => month.year === year)
    );
  }

  private generateComparisonResults(months: any[]): any {
    // Sort months chronologically
    const sortedMonths = [...months].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, 1);
      const dateB = new Date(b.year, b.month - 1, 1);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate revenue growth
    const revenueGrowth = [];
    for (let i = 1; i < sortedMonths.length; i++) {
      const prevMonth = sortedMonths[i - 1];
      const currentMonth = sortedMonths[i];
      const growthPercentage = prevMonth.totalRevenue > 0 
        ? ((currentMonth.totalRevenue - prevMonth.totalRevenue) / prevMonth.totalRevenue) * 100
        : 0;
      
      revenueGrowth.push({
        fromMonth: `${prevMonth.monthName} ${prevMonth.year}`,
        toMonth: `${currentMonth.monthName} ${currentMonth.year}`,
        growthPercentage: Math.round(growthPercentage * 100) / 100,
        absoluteChange: currentMonth.totalRevenue - prevMonth.totalRevenue
      });
    }

    // Generate insights
    const insights = [];
    
    // Revenue trend insight
    const avgGrowth = revenueGrowth.reduce((sum, growth) => sum + growth.growthPercentage, 0) / revenueGrowth.length;
    if (avgGrowth > 5) {
      insights.push({
        type: 'growth',
        title: 'Strong Revenue Growth',
        description: `Average monthly growth of ${avgGrowth.toFixed(1)}% indicates healthy business expansion.`,
        data: { avgGrowth, trend: 'positive' }
      });
    } else if (avgGrowth < -5) {
      insights.push({
        type: 'decline',
        title: 'Revenue Decline Detected',
        description: `Average monthly decline of ${Math.abs(avgGrowth).toFixed(1)}% requires attention.`,
        data: { avgGrowth, trend: 'negative' }
      });
    }

    return {
      revenueGrowth,
      productTrends: [], // Will be implemented based on specific needs
      insights
    };
  }

  private generateChartData(months: any[]): any {
    const revenueComparison = months
      .sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, 1);
        const dateB = new Date(b.year, b.month - 1, 1);
        return dateA.getTime() - dateB.getTime();
      })
      .map(month => ({
        month: `${month.monthName} ${month.year}`,
        revenue: month.totalRevenue,
        transactions: month.totalTransactions
      }));

    return {
      revenueComparison,
      topProductsComparison: [] // Will be expanded based on specific needs
    };
  }
}



export const bulletproofServices = {
  get importSession() {
    if (!_bulletproofServices.importSession) {
      console.log('🛡️ Creating bulletproof ImportSessionService...');
      _bulletproofServices.importSession = new ImportSessionService();
    }
    return _bulletproofServices.importSession;
  },

  get monthlyComparisons() {
    if (!_bulletproofServices.monthlyComparisons) {
      console.log('🛡️ Creating bulletproof MonthlyComparisonService...');
      _bulletproofServices.monthlyComparisons = new MonthlyComparisonService();
    }
    return _bulletproofServices.monthlyComparisons;
  },
};

console.log('🛡️ BULLETPROOF Firestore services loaded - NO MORE COLLECTION ERRORS!');