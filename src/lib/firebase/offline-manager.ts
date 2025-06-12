import { 
  enableNetwork, 
  disableNetwork, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  Timestamp,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { db } from './config';

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId?: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface CachedData {
  collection: string;
  docId: string;
  data: any;
  timestamp: number;
  lastModified: number;
}

class OfflineManager {
  private isOnline: boolean = true;
  private offlineActions: OfflineAction[] = [];
  private cachedData: Map<string, CachedData> = new Map();
  private syncInProgress: boolean = false;
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.initializeOfflineMode();
      this.setupNetworkListeners();
      this.loadOfflineData();
    }
  }

  private async initializeOfflineMode() {
    try {
      await enableIndexedDbPersistence(db, {
        synchronizeTabs: true
      });
      console.log('✅ Offline persistence enabled');
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open, offline persistence disabled');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Browser does not support offline persistence');
      } else {
        console.error('❌ Error enabling offline persistence:', error);
      }
    }
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 Network: Back online');
      this.isOnline = true;
      this.enableFirebaseNetwork();
      this.syncOfflineActions();
      this.notifyOnlineCallbacks();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Network: Gone offline');
      this.isOnline = false;
      this.disableFirebaseNetwork();
      this.notifyOfflineCallbacks();
    });

    if (!this.isOnline) {
      this.disableFirebaseNetwork();
    }
  }

  private async enableFirebaseNetwork() {
    try {
      await enableNetwork(db);
      console.log('✅ Firebase network enabled');
    } catch (error) {
      console.error('❌ Error enabling Firebase network:', error);
    }
  }

  private async disableFirebaseNetwork() {
    try {
      await disableNetwork(db);
      console.log('📴 Firebase network disabled');
    } catch (error) {
      console.error('❌ Error disabling Firebase network:', error);
    }
  }

  private loadOfflineData() {
    if (typeof window === 'undefined') return;

    try {
      const storedActions = localStorage.getItem('offlineActions');
      if (storedActions) {
        this.offlineActions = JSON.parse(storedActions);
      }

      const storedCache = localStorage.getItem('cachedData');
      if (storedCache) {
        const cacheArray = JSON.parse(storedCache);
        this.cachedData = new Map(cacheArray);
      }
    } catch (error) {
      console.error('❌ Error loading offline data:', error);
    }
  }

  private saveOfflineData() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('offlineActions', JSON.stringify(this.offlineActions));
      localStorage.setItem('cachedData', JSON.stringify(Array.from(this.cachedData.entries())));
    } catch (error) {
      console.error('❌ Error saving offline data:', error);
    }
  }

  private addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) {
    const offlineAction: OfflineAction = {
      ...action,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    this.offlineActions.push(offlineAction);
    this.saveOfflineData();
    
    console.log(`📝 Queued offline action: ${action.type} on ${action.collection}`);
    
    if (this.isOnline) {
      this.syncOfflineActions();
    }
  }

  private cacheData(collectionName: string, docId: string, data: any) {
    const cacheKey = `${collectionName}/${docId}`;
    const cachedItem: CachedData = {
      collection: collectionName,
      docId,
      data,
      timestamp: Date.now(),
      lastModified: data.updatedAt?.toMillis?.() || Date.now()
    };

    this.cachedData.set(cacheKey, cachedItem);
    this.saveOfflineData();
  }

  private getCachedData(collectionName: string, docId?: string): any[] {
    if (docId) {
      const cacheKey = `${collectionName}/${docId}`;
      const cached = this.cachedData.get(cacheKey);
      return cached ? [{ id: docId, ...cached.data }] : [];
    }

    const results: any[] = [];
    this.cachedData.forEach((cached, key) => {
      if (cached.collection === collectionName) {
        results.push({ id: cached.docId, ...cached.data });
      }
    });

    return results.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  }

  private async syncOfflineActions() {
    if (this.syncInProgress || !this.isOnline || this.offlineActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Syncing ${this.offlineActions.length} offline actions...`);

    const actionsToSync = this.offlineActions.filter(action => action.status === 'pending');
    
    for (const action of actionsToSync) {
      try {
        action.status = 'syncing';
        await this.executeAction(action);
        action.status = 'completed';
        console.log(`✅ Synced: ${action.type} on ${action.collection}`);
      } catch (error) {
        console.error(`❌ Failed to sync action ${action.id}:`, error);
        action.status = 'failed';
        action.retryCount++;
        
        if (action.retryCount >= 3) {
          console.warn(`🗑️ Removing failed action after 3 retries: ${action.id}`);
        }
      }
    }

    this.offlineActions = this.offlineActions.filter(
      action => action.status !== 'completed' && action.retryCount < 3
    );

    this.saveOfflineData();
    this.syncInProgress = false;
    
    console.log(`✅ Sync completed. ${this.offlineActions.length} actions remaining.`);
  }

  private async executeAction(action: OfflineAction) {
    const collectionRef = collection(db, action.collection);

    switch (action.type) {
      case 'create':
        if (action.docId) {
          await setDoc(doc(collectionRef, action.docId), {
            ...action.data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        } else {
          await addDoc(collectionRef, {
            ...action.data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        break;

      case 'update':
        if (!action.docId) throw new Error('Document ID required for update');
        await updateDoc(doc(collectionRef, action.docId), {
          ...action.data,
          updatedAt: Timestamp.now()
        });
        break;

      case 'delete':
        if (!action.docId) throw new Error('Document ID required for delete');
        await deleteDoc(doc(collectionRef, action.docId));
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  public getPendingActionsCount(): number {
    return this.offlineActions.filter(action => action.status === 'pending').length;
  }

  public getSyncStatus(): { syncing: boolean; pending: number; failed: number } {
    return {
      syncing: this.syncInProgress,
      pending: this.offlineActions.filter(action => action.status === 'pending').length,
      failed: this.offlineActions.filter(action => action.status === 'failed').length
    };
  }

  public async createDocument(collectionName: string, data: any, docId?: string): Promise<string> {
    const finalDocId = docId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.isOnline) {
      try {
        const collectionRef = collection(db, collectionName);
        const docData = {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        if (docId) {
          await setDoc(doc(collectionRef, docId), docData);
        } else {
          const docRef = await addDoc(collectionRef, docData);
          return docRef.id;
        }

        this.cacheData(collectionName, finalDocId, docData);
        return finalDocId;
      } catch (error) {
        console.warn('⚠️ Online create failed, queuing for offline sync:', error);
      }
    }

    this.addOfflineAction({
      type: 'create',
      collection: collectionName,
      docId: finalDocId,
      data
    });

    const optimisticData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      _offline: true
    };
    this.cacheData(collectionName, finalDocId, optimisticData);

    return finalDocId;
  }

  public async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    if (this.isOnline) {
      try {
        const docRef = doc(db, collectionName, docId);
        const updateData = {
          ...data,
          updatedAt: Timestamp.now()
        };
        
        await updateDoc(docRef, updateData);
        
        const cached = this.getCachedData(collectionName, docId)[0];
        if (cached) {
          this.cacheData(collectionName, docId, { ...cached, ...updateData });
        }
        return;
      } catch (error) {
        console.warn('⚠️ Online update failed, queuing for offline sync:', error);
      }
    }

    this.addOfflineAction({
      type: 'update',
      collection: collectionName,
      docId,
      data
    });

    const cached = this.getCachedData(collectionName, docId)[0];
    if (cached) {
      const optimisticData = {
        ...cached,
        ...data,
        updatedAt: Timestamp.now(),
        _offline: true
      };
      this.cacheData(collectionName, docId, optimisticData);
    }
  }

  public async deleteDocument(collectionName: string, docId: string): Promise<void> {
    if (this.isOnline) {
      try {
        await deleteDoc(doc(db, collectionName, docId));
        
        const cacheKey = `${collectionName}/${docId}`;
        this.cachedData.delete(cacheKey);
        this.saveOfflineData();
        return;
      } catch (error) {
        console.warn('⚠️ Online delete failed, queuing for offline sync:', error);
      }
    }

    this.addOfflineAction({
      type: 'delete',
      collection: collectionName,
      docId
    });

    const cached = this.getCachedData(collectionName, docId)[0];
    if (cached) {
      this.cacheData(collectionName, docId, { ...cached, _deleted: true, _offline: true });
    }
  }

  public async getDocuments(
    collectionName: string, 
    queryOptions?: {
      where?: { field: string; operator: any; value: any }[];
      orderBy?: { field: string; direction: 'asc' | 'desc' }[];
      limit?: number;
    }
  ): Promise<any[]> {
    if (this.isOnline) {
      try {
        let q = query(collection(db, collectionName));

        if (queryOptions?.where) {
          queryOptions.where.forEach(({ field, operator, value }) => {
            q = query(q, where(field, operator, value));
          });
        }

        if (queryOptions?.orderBy) {
          queryOptions.orderBy.forEach(({ field, direction }) => {
            q = query(q, orderBy(field, direction));
          });
        }

        if (queryOptions?.limit) {
          q = query(q, limit(queryOptions.limit));
        }

        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        results.forEach(item => {
          this.cacheData(collectionName, item.id, item);
        });

        return results;
      } catch (error) {
        console.warn('⚠️ Online query failed, returning cached data:', error);
      }
    }

    let cachedResults = this.getCachedData(collectionName);
    cachedResults = cachedResults.filter(item => !item._deleted);

    if (queryOptions?.where) {
      queryOptions.where.forEach(({ field, operator, value }) => {
        cachedResults = cachedResults.filter(item => {
          const fieldValue = item[field];
          switch (operator) {
            case '==': return fieldValue === value;
            case '!=': return fieldValue !== value;
            case '>': return fieldValue > value;
            case '>=': return fieldValue >= value;
            case '<': return fieldValue < value;
            case '<=': return fieldValue <= value;
            case 'in': return Array.isArray(value) && value.includes(fieldValue);
            default: return true;
          }
        });
      });
    }

    if (queryOptions?.orderBy) {
      queryOptions.orderBy.forEach(({ field, direction }) => {
        cachedResults.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return direction === 'desc' ? -comparison : comparison;
        });
      });
    }

    if (queryOptions?.limit) {
      cachedResults = cachedResults.slice(0, queryOptions.limit);
    }

    return cachedResults;
  }

  public onOnline(callback: () => void): () => void {
    this.onlineCallbacks.push(callback);
    return () => {
      const index = this.onlineCallbacks.indexOf(callback);
      if (index > -1) {
        this.onlineCallbacks.splice(index, 1);
      }
    };
  }

  public onOffline(callback: () => void): () => void {
    this.offlineCallbacks.push(callback);
    return () => {
      const index = this.offlineCallbacks.indexOf(callback);
      if (index > -1) {
        this.offlineCallbacks.splice(index, 1);
      }
    };
  }

  private notifyOnlineCallbacks() {
    this.onlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in online callback:', error);
      }
    });
  }

  private notifyOfflineCallbacks() {
    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in offline callback:', error);
      }
    });
  }

  public async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncOfflineActions();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  public clearOfflineData(): void {
    this.offlineActions = [];
    this.cachedData.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offlineActions');
      localStorage.removeItem('cachedData');
    }
    console.log('🗑️ Cleared all offline data');
  }
}

export const offlineManager = new OfflineManager(); 