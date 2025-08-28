import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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
}





