import { offlineManager } from './offline-manager';
import { ReceiverQueries } from './role-based-queries';
import { Timestamp } from 'firebase/firestore';

// Offline-aware wrapper for ReceiverQueries
export class OfflineReceiverQueries {
  
  // Get today's expected suppliers with offline support
  static async getTodaysExpectedSuppliers() {
    if (offlineManager.isNetworkOnline()) {
      try {
        const suppliers = await ReceiverQueries.getTodaysExpectedSuppliers();
        
        // Cache the suppliers data
        suppliers.forEach((supplier, index) => {
          offlineManager.createDocument('cached_suppliers', {
            ...supplier,
            cacheType: 'todaysSuppliers',
            cacheIndex: index
          }, `today_supplier_${supplier.id}`);
        });
        
        return suppliers;
      } catch (error) {
        console.warn('⚠️ Online suppliers query failed, falling back to cache:', error);
      }
    }

    // Return cached data when offline
    const cachedSuppliers = await offlineManager.getDocuments('cached_suppliers', {
      where: [{ field: 'cacheType', operator: '==', value: 'todaysSuppliers' }],
      orderBy: [{ field: 'cacheIndex', direction: 'asc' }]
    });

    return cachedSuppliers.map(supplier => ({
      id: supplier.id.replace('today_supplier_', ''),
      name: supplier.name,
      expectedTime: supplier.expectedTime,
      status: supplier.status,
      priority: supplier.priority,
      items: supplier.items,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      deliveryItems: supplier.deliveryItems || [],
      _offline: !offlineManager.isNetworkOnline()
    }));
  }

  // Get today's restock items with offline support
  static async getTodaysRestockItems() {
    if (offlineManager.isNetworkOnline()) {
      try {
        const restockItems = await ReceiverQueries.getTodaysRestockItems();
        
        // Cache the restock items
        restockItems.forEach((item, index) => {
          offlineManager.createDocument('cached_restock', {
            ...item,
            cacheType: 'todaysRestock',
            cacheIndex: index
          }, `restock_${item.id}`);
        });
        
        return restockItems;
      } catch (error) {
        console.warn('⚠️ Online restock query failed, falling back to cache:', error);
      }
    }

    // Return cached data when offline
    const cachedRestock = await offlineManager.getDocuments('cached_restock', {
      where: [{ field: 'cacheType', operator: '==', value: 'todaysRestock' }],
      orderBy: [{ field: 'priority', direction: 'asc' }, { field: 'stockRatio', direction: 'asc' }]
    });

    return cachedRestock.map(item => ({
      ...item,
      id: item.id.replace('restock_', ''),
      _offline: !offlineManager.isNetworkOnline()
    }));
  }

  // Create delivery with offline support
  static async createDelivery(deliveryData: any): Promise<string> {
    const delivery = {
      ...deliveryData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: deliveryData.status || 'pending'
    };

    return await offlineManager.createDocument('deliveries', delivery);
  }

  // Update delivery with offline support
  static async updateDelivery(deliveryId: string, updateData: any): Promise<void> {
    await offlineManager.updateDocument('deliveries', deliveryId, updateData);
  }

  // Delete delivery with offline support
  static async deleteDelivery(deliveryId: string): Promise<void> {
    await offlineManager.deleteDocument('deliveries', deliveryId);
  }

  // Create inventory item with offline support
  static async createInventoryItem(itemData: any): Promise<string> {
    const item = {
      ...itemData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: itemData.status || 'active'
    };

    return await offlineManager.createDocument('inventory', item);
  }

  // Update inventory item with offline support
  static async updateInventoryItem(itemId: string, updateData: any): Promise<void> {
    await offlineManager.updateDocument('inventory', itemId, updateData);
  }

  // Update inventory stock with offline support
  static async updateInventoryStock(itemId: string, newStock: number, reason?: string): Promise<void> {
    const updateData = {
      currentStock: newStock,
      lastUpdated: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Reason tracking removed as property doesn't exist in interface

    await offlineManager.updateDocument('inventory', itemId, updateData);
  }

  // Create return note with offline support
  static async createReturnNote(returnData: any): Promise<string> {
    const returnNote = {
      ...returnData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: returnData.status || 'pending'
    };

    return await offlineManager.createDocument('returnNotes', returnNote);
  }

  // Update return note with offline support
  static async updateReturnNote(returnId: string, updateData: any): Promise<void> {
    await offlineManager.updateDocument('returnNotes', returnId, updateData);
  }

  // Get deliveries with offline support
  static async getDeliveries(options?: {
    status?: string;
    receiverId?: string;
    limit?: number;
  }): Promise<any[]> {
    const queryOptions: any = {
      orderBy: [{ field: 'scheduledDate', direction: 'desc' }]
    };

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }

    if (options?.status || options?.receiverId) {
      queryOptions.where = [];
      
      if (options.status) {
        queryOptions.where.push({ field: 'status', operator: '==', value: options.status });
      }
      
      if (options.receiverId) {
        queryOptions.where.push({ field: 'receiverId', operator: '==', value: options.receiverId });
      }
    }

    return await offlineManager.getDocuments('deliveries', queryOptions);
  }

  // Get inventory items with offline support
  static async getInventoryItems(options?: {
    branchId?: string;
    status?: string;
    lowStock?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const queryOptions: any = {
      orderBy: [{ field: 'itemName', direction: 'asc' }]
    };

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }

    if (options?.branchId || options?.status) {
      queryOptions.where = [];
      
      if (options.branchId) {
        queryOptions.where.push({ field: 'branchId', operator: '==', value: options.branchId });
      }
      
      if (options.status) {
        queryOptions.where.push({ field: 'status', operator: '==', value: options.status });
      }
    }

    let items = await offlineManager.getDocuments('inventory', queryOptions);

    // Filter for low stock items if requested
    if (options?.lowStock) {
      items = items.filter(item => item.currentStock <= item.restockThreshold);
    }

    return items;
  }

  // Get return notes with offline support
  static async getReturnNotes(options?: {
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    const queryOptions: any = {
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    };

    if (options?.limit) {
      queryOptions.limit = options.limit;
    }

    if (options?.status) {
      queryOptions.where = [{ field: 'status', operator: '==', value: options.status }];
    }

    return await offlineManager.getDocuments('returnNotes', queryOptions);
  }
}

// Offline-aware analytics queries
export class OfflineAnalyticsQueries {
  
  // Get analytics data with offline support
  static async getAnalyticsData(timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    if (offlineManager.isNetworkOnline()) {
      try {
        // Check if ReceiverQueries has getAnalyticsData method
        if (typeof ReceiverQueries.getAnalyticsData === 'function') {
          const analyticsData = await ReceiverQueries.getAnalyticsData(timePeriod);
          
          // Cache analytics data
          await offlineManager.createDocument('cached_analytics', {
            ...analyticsData,
            timePeriod,
            cachedAt: Timestamp.now()
          }, `analytics_${timePeriod}`);
          
          return analyticsData;
        } else {
          console.warn('⚠️ getAnalyticsData method not available in ReceiverQueries');
        }
      } catch (error) {
        console.warn('⚠️ Online analytics query failed, falling back to cache:', error);
      }
    }

    // Return cached analytics data
    const cachedAnalytics = await offlineManager.getDocuments('cached_analytics', {
      where: [{ field: 'timePeriod', operator: '==', value: timePeriod }],
      limit: 1
    });

    if (cachedAnalytics.length > 0) {
      const data = cachedAnalytics[0];
      return {
        ...data,
        _offline: true,
        _cachedAt: data.cachedAt
      };
    }

    // Return default analytics structure if no cache
    return {
      invoices: { total: 0, pending: 0, approved: 0, paid: 0, totalAmount: 0, averageAmount: 0, monthlyTrend: [], topSuppliers: [], paymentTrends: [] },
      suppliers: { total: 0, active: 0, newThisMonth: 0, topPerforming: [], geographic: [] },
      returnNotes: { total: 0, pending: 0, completed: 0, totalValue: 0, reasonBreakdown: [], monthlyTrend: [] },
      damages: { total: 0, resolved: 0, pending: 0, totalCost: 0, categoryBreakdown: [], trends: [] },
      deliveries: { total: 0, onTime: 0, late: 0, upcoming: 0, performanceScore: 0, timeDistribution: [] },
      predictions: { nextMonthInvoices: 0, expectedReturns: 0, riskLevel: 'low' as const, recommendations: [] },
      notifications: { urgent: 0, warnings: 0, info: 0, alerts: [] },
      _offline: true,
      _noCache: true
    };
  }
}

// Utility functions for offline operations
export class OfflineUtils {
  
  // Get network status
  static isOnline(): boolean {
    return offlineManager.isNetworkOnline();
  }

  // Get sync status
  static getSyncStatus() {
    return offlineManager.getSyncStatus();
  }

  // Force sync when online
  static async forceSync(): Promise<void> {
    return await offlineManager.forceSync();
  }

  // Subscribe to online/offline events
  static onOnline(callback: () => void): () => void {
    return offlineManager.onOnline(callback);
  }

  static onOffline(callback: () => void): () => void {
    return offlineManager.onOffline(callback);
  }

  // Clear offline data (use with caution)
  static clearOfflineData(): void {
    offlineManager.clearOfflineData();
  }

  // Get pending actions count
  static getPendingActionsCount(): number {
    return offlineManager.getPendingActionsCount();
  }
} 