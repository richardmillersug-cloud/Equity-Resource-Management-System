import { db } from './config';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

export interface RealtimeSyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncErrors: string[];
}

export class RealtimeSync {
  private static instance: RealtimeSync;
  private listeners: Map<string, () => void> = new Map();
  private status: RealtimeSyncStatus = {
    isConnected: false,
    lastSync: null,
    pendingChanges: 0,
    syncErrors: []
  };
  private statusCallbacks: ((status: RealtimeSyncStatus) => void)[] = [];

  static getInstance(): RealtimeSync {
    if (!RealtimeSync.instance) {
      RealtimeSync.instance = new RealtimeSync();
    }
    return RealtimeSync.instance;
  }

  /**
   * Subscribe to real-time updates for a collection
   */
  subscribeToCollection(
    collectionName: string, 
    callback: (data: Record<string, unknown>[]) => void,
    queryConstraints?: Record<string, unknown>[]
  ): () => void {
    try {
      let q = collection(db, collectionName);
      
      if (queryConstraints && queryConstraints.length > 0) {
        q = query(q, ...queryConstraints) as any;
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          this.updateStatus({
            isConnected: true,
            lastSync: new Date(),
            syncErrors: []
          });
          
          callback(data);
        },
        (error) => {
          console.error(`Real-time sync error for ${collectionName}:`, error);
          this.updateStatus({
            isConnected: false,
            syncErrors: [...this.status.syncErrors, error.message]
          });
        }
      );

      this.listeners.set(collectionName, unsubscribe);
      return unsubscribe;
    } catch (error: unknown) {
      console.error('Failed to subscribe to collection:', error);
      this.updateStatus({
        isConnected: false,
        syncErrors: [...this.status.syncErrors, error.message]
      });
      return () => {};
    }
  }

  /**
   * Subscribe to real-time updates for a specific document
   */
  subscribeToDocument(
    collectionName: string,
    documentId: string,
    callback: (data: Record<string, unknown>) => void
  ): () => void {
    try {
      const docRef = doc(db, collectionName, documentId);
      
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = {
              id: snapshot.id,
              ...snapshot.data()
            };
            
            this.updateStatus({
              isConnected: true,
              lastSync: new Date(),
              syncErrors: []
            });
            
            callback(data);
          }
        },
        (error) => {
          console.error(`Real-time sync error for document ${documentId}:`, error);
          this.updateStatus({
            isConnected: false,
            syncErrors: [...this.status.syncErrors, error.message]
          });
        }
      );

      this.listeners.set(`${collectionName}/${documentId}`, unsubscribe);
      return unsubscribe;
    } catch (error: unknown) {
      console.error('Failed to subscribe to document:', error);
      this.updateStatus({
        isConnected: false,
        syncErrors: [...this.status.syncErrors, error.message]
      });
      return () => {};
    }
  }

  /**
   * Update sync status and notify callbacks
   */
  private updateStatus(updates: Partial<RealtimeSyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.statusCallbacks.forEach(callback => callback(this.status));
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: RealtimeSyncStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current sync status
   */
  getStatus(): RealtimeSyncStatus {
    return { ...this.status };
  }

  /**
   * Cleanup all listeners
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.statusCallbacks = [];
  }

  /**
   * Test connection to Firebase
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to read from a test collection
      const testQuery = query(
        collection(db, 'users'), 
        limit(1)
      );
      
      return new Promise((resolve) => {
        const unsubscribe = onSnapshot(
          testQuery,
          () => {
            this.updateStatus({ isConnected: true, lastSync: new Date() });
            unsubscribe();
            resolve(true);
          },
          (error) => {
            console.error('Connection test failed:', error);
            this.updateStatus({ 
              isConnected: false, 
              syncErrors: [error.message] 
            });
            unsubscribe();
            resolve(false);
          }
        );
      });
    } catch (error: unknown) {
      console.error('Connection test error:', error);
      this.updateStatus({ 
        isConnected: false, 
        syncErrors: [error.message] 
      });
      return false;
    }
  }
}

// Export singleton instance
export const realtimeSync = RealtimeSync.getInstance();

// Export convenience functions
export const subscribeToCollection = (
  collectionName: string, 
  callback: (data: Record<string, unknown>[]) => void,
  queryConstraints?: Record<string, unknown>[]
) => realtimeSync.subscribeToCollection(collectionName, callback, queryConstraints);

export const subscribeToDocument = (
  collectionName: string,
  documentId: string,
  callback: (data: Record<string, unknown>) => void
) => realtimeSync.subscribeToDocument(collectionName, documentId, callback);

export const onSyncStatusChange = (callback: (status: RealtimeSyncStatus) => void) => 
  realtimeSync.onStatusChange(callback);

export const getSyncStatus = () => realtimeSync.getStatus();
export const testConnection = () => realtimeSync.testConnection(); 