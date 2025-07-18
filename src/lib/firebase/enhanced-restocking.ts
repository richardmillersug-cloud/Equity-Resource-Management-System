import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './config';

export interface RestockingItem {
  id: string;
  itemName: string;
  itemDescription?: string;
  category: string;
  supplierName?: string;
  expectedQuantity: number;
  receivedQuantity?: number;
  unit: string;
  expectedDate: Timestamp;
  receivedDate?: Timestamp;
  status: 'pending' | 'received' | 'partial' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  receiverId: string;
  approvedBy?: string;
  notes?: string;
  carriedFromDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RestockingStats {
  totalExpected: number;
  received: number;
  pending: number;
  partial: number;
  overdue: number;
  completionRate: number;
}

export class EnhancedRestockingService {
  private collectionName = 'restockingItems';

  async addRestockingItem(itemData: Omit<RestockingItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...itemData,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding restocking item:', error);
      throw error;
    }
  }

  async getRestockingItemsByDate(date: string): Promise<RestockingItem[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, this.collectionName),
        where('expectedDate', '>=', Timestamp.fromDate(startOfDay)),
        where('expectedDate', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('expectedDate', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const items: RestockingItem[] = [];

      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        } as RestockingItem);
      });

      // Update overdue status for items past their expected date
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      for (const item of items) {
        if (item.status === 'pending' && item.expectedDate.toDate() < today) {
          await this.updateItemStatus(item.id, 'overdue');
          item.status = 'overdue';
        }
      }

      return items;
    } catch (error) {
      console.error('Error getting restocking items by date:', error);
      throw error;
    }
  }

  async approveRestockingItem(itemId: string, approverId: string, receivedQuantity: number): Promise<void> {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        throw new Error('Restocking item not found');
      }

      const itemData = itemDoc.data() as RestockingItem;
      const expectedQuantity = itemData.expectedQuantity;
      
      let newStatus: RestockingItem['status'];
      if (receivedQuantity >= expectedQuantity) {
        newStatus = 'received';
      } else if (receivedQuantity > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'pending';
      }

      await updateDoc(itemRef, {
        receivedQuantity,
        receivedDate: Timestamp.now(),
        status: newStatus,
        approvedBy: approverId,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error approving restocking item:', error);
      throw error;
    }
  }

  async carryForwardItem(itemId: string, newDate: Date): Promise<void> {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      await updateDoc(itemRef, {
        expectedDate: Timestamp.fromDate(newDate),
        status: 'pending',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error carrying forward item:', error);
      throw error;
    }
  }

  async updateItemStatus(itemId: string, status: RestockingItem['status']): Promise<void> {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      await updateDoc(itemRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      throw error;
    }
  }

  async getRestockingStats(date: string): Promise<RestockingStats> {
    try {
      const items = await this.getRestockingItemsByDate(date);
      
      const stats = {
        totalExpected: items.length,
        received: items.filter(item => item.status === 'received').length,
        pending: items.filter(item => item.status === 'pending').length,
        partial: items.filter(item => item.status === 'partial').length,
        overdue: items.filter(item => item.status === 'overdue').length,
        completionRate: 0
      };

      // Calculate completion rate
      const completedItems = stats.received + stats.partial;
      stats.completionRate = stats.totalExpected > 0 
        ? Math.round((completedItems / stats.totalExpected) * 100) 
        : 0;

      return stats;
    } catch (error) {
      console.error('Error getting restocking stats:', error);
      throw error;
    }
  }

  // Delete restocking item
  async deleteRestockingItem(itemId: string): Promise<void> {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      await updateDoc(itemRef, {
        status: 'deleted' as any,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting restocking item:', error);
      throw error;
    }
  }

  // Update restocking item
  async updateRestockingItem(itemId: string, updates: Partial<RestockingItem>): Promise<void> {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating restocking item:', error);
      throw error;
    }
  }

  // Get restocking item by ID
  async getRestockingItemById(itemId: string): Promise<RestockingItem | null> {
    try {
      const itemRef = doc(db, this.collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        return null;
      }
      
      return {
        id: itemDoc.id,
        ...itemDoc.data()
      } as RestockingItem;
    } catch (error) {
      console.error('Error getting restocking item by ID:', error);
      throw error;
    }
  }
}

export const enhancedRestockingService = new EnhancedRestockingService(); 