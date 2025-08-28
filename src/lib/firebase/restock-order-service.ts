import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit,
  startAfter,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import { FirestoreService } from './firestore-service';

export interface RestockItem {
  id: string;
  itemName: string;
  expectedQuantity: number;
  receivedQuantity?: number;
  unitPrice: number;
  totalExpectedValue: number;
  totalReceivedValue?: number;
  supplier: string;
  category?: string;
  description?: string;
  expiryDate?: Date;
  batchNumber?: string;
  status: 'pending' | 'partial' | 'complete' | 'overdelivered';
  discrepancyReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestockOrder {
  id: string;
  orderNumber: string;
  title: string;
  description?: string;
  createdBy: string; // Purchasing Manager ID
  assignedTo?: string; // Receiver ID
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  items: RestockItem[];
  totalExpectedValue: number;
  totalReceivedValue?: number;
  status: 'draft' | 'submitted' | 'in_transit' | 'delivered' | 'verified' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  supplier: string;
  notes?: string;
  receiverNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  deliveredAt?: Date;
  verifiedAt?: Date;
  completedAt?: Date;
}

export interface RestockOrderStats {
  totalOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  deliveredOrders: number;
  completedOrders: number;
  totalExpectedValue: number;
  totalReceivedValue: number;
  discrepancyRate: number;
  averageDeliveryTime: number;
}

export const RESTOCK_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'in_transit', label: 'In Transit', color: 'yellow' },
  { value: 'delivered', label: 'Delivered', color: 'orange' },
  { value: 'verified', label: 'Verified', color: 'green' },
  { value: 'complete', label: 'Complete', color: 'green' }
];

export const RESTOCK_ITEM_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'partial', label: 'Partial', color: 'yellow' },
  { value: 'complete', label: 'Complete', color: 'green' },
  { value: 'overdelivered', label: 'Over Delivered', color: 'blue' }
];

export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
];

export class RestockOrderService extends FirestoreService<RestockOrder> {
  constructor() {
    super('restockOrders');
  }

  // Generate restock order number
  private async generateOrderNumber(): Promise<string> {
    try {
      const counterRef = doc(db, 'counters', 'restockOrders');
      const counterDoc = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterDoc.exists()) {
        nextNumber = (counterDoc.data().count || 0) + 1;
      }
      
      await setDoc(counterRef, { count: nextNumber }, { merge: true });
      
      return `RST${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating order number:', error);
      const timestamp = Date.now().toString();
      return `RST${timestamp.slice(-4)}`;
    }
  }

  // Create new restock order
  async createRestockOrder(orderData: Omit<RestockOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const orderNumber = await this.generateOrderNumber();
      
      const restockOrder: Omit<RestockOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        ...orderData,
        orderNumber: orderNumber,
        totalExpectedValue: this.calculateTotalExpectedValue(orderData.items),
        status: orderData.status || 'draft'
      };

      const result = await this.create(restockOrder);
      console.log('Restock order created successfully:', orderNumber);
      
      return result;
    } catch (error) {
      console.error('Error creating restock order:', error);
      throw error;
    }
  }

  // Update restock order
  async updateRestockOrder(orderId: string, updates: Partial<RestockOrder>): Promise<void> {
    try {
      if (updates.items) {
        updates.totalExpectedValue = this.calculateTotalExpectedValue(updates.items);
        if (updates.items.some(item => item.receivedQuantity !== undefined)) {
          updates.totalReceivedValue = this.calculateTotalReceivedValue(updates.items);
        }
      }
      
      await this.update(orderId, updates);
    } catch (error) {
      console.error('Error updating restock order:', error);
      throw error;
    }
  }

  // Calculate total expected value
  private calculateTotalExpectedValue(items: RestockItem[]): number {
    return items.reduce((total, item) => total + (item.totalExpectedValue || (item.expectedQuantity * item.unitPrice)), 0);
  }

  // Calculate total received value
  private calculateTotalReceivedValue(items: RestockItem[]): number {
    return items.reduce((total, item) => {
      const receivedQty = item.receivedQuantity || 0;
      return total + (item.totalReceivedValue || (receivedQty * item.unitPrice));
    }, 0);
  }

  // Submit order for delivery
  async submitOrder(orderId: string): Promise<void> {
    await this.update(orderId, {
      status: 'submitted',
      submittedAt: new Date()
    });
  }

  // Mark order as in transit
  async markInTransit(orderId: string): Promise<void> {
    await this.update(orderId, {
      status: 'in_transit'
    });
  }

  // Mark order as delivered (by supplier/logistics)
  async markDelivered(orderId: string, deliveryDate?: Date): Promise<void> {
    await this.update(orderId, {
      status: 'delivered',
      actualDeliveryDate: deliveryDate || new Date(),
      deliveredAt: new Date()
    });
  }

  // Verify received items (by receiver)
  async verifyDelivery(orderId: string, receivedItems: RestockItem[], receiverNotes?: string): Promise<void> {
    try {
      // Update item statuses based on received quantities
      const updatedItems = receivedItems.map(item => {
        let status: RestockItem['status'] = 'pending';
        
        if (item.receivedQuantity === undefined || item.receivedQuantity === 0) {
          status = 'pending';
        } else if (item.receivedQuantity < item.expectedQuantity) {
          status = 'partial';
        } else if (item.receivedQuantity === item.expectedQuantity) {
          status = 'complete';
        } else {
          status = 'overdelivered';
        }
        
        return {
          ...item,
          status,
          totalReceivedValue: (item.receivedQuantity || 0) * item.unitPrice,
          updatedAt: new Date()
        };
      });

      await this.update(orderId, {
        items: updatedItems,
        status: 'verified',
        receiverNotes,
        verifiedAt: new Date(),
        totalReceivedValue: this.calculateTotalReceivedValue(updatedItems)
      });
    } catch (error) {
      console.error('Error verifying delivery:', error);
      throw error;
    }
  }

  // Complete order
  async completeOrder(orderId: string): Promise<void> {
    await this.update(orderId, {
      status: 'complete',
      completedAt: new Date()
    });
  }

  // Get orders by status
  async getOrdersByStatus(status: string): Promise<RestockOrder[]> {
    return await this.getAll([
      { field: 'status', operator: '==', value: status }
    ], { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  // Get orders for purchasing manager
  async getOrdersForPurchasing(createdBy?: string): Promise<RestockOrder[]> {
    const filters = createdBy ? [{ field: 'createdBy', operator: '==', value: createdBy }] : [];
    return await this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  // Get orders for receiver
  async getOrdersForReceiver(assignedTo?: string): Promise<RestockOrder[]> {
    const filters = [];
    if (assignedTo) {
      filters.push({ field: 'assignedTo', operator: '==', value: assignedTo });
    }
    filters.push({ field: 'status', operator: 'in', value: ['submitted', 'in_transit', 'delivered'] });
    
    return await this.getAll(filters, { orderBy: 'expectedDeliveryDate', orderDirection: 'asc' });
  }

  // Get overdue orders
  async getOverdueOrders(): Promise<RestockOrder[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return await this.getAll([
      { field: 'expectedDeliveryDate', operator: '<', value: today },
      { field: 'status', operator: 'in', value: ['submitted', 'in_transit'] }
    ], { orderBy: 'expectedDeliveryDate', orderDirection: 'asc' });
  }

  // Get orders with discrepancies
  async getOrdersWithDiscrepancies(): Promise<RestockOrder[]> {
    const allOrders = await this.getAll([
      { field: 'status', operator: 'in', value: ['verified', 'complete'] }
    ]);
    
    return allOrders.filter(order => {
      return order.items.some(item => 
        item.receivedQuantity !== undefined && 
        item.receivedQuantity !== item.expectedQuantity
      );
    });
  }

  // Get restock order statistics
  async getRestockOrderStats(): Promise<RestockOrderStats> {
    try {
      const allOrders = await this.getAll();
      
      const totalExpectedValue = allOrders.reduce((sum, order) => sum + (order.totalExpectedValue || 0), 0);
      const totalReceivedValue = allOrders.reduce((sum, order) => sum + (order.totalReceivedValue || 0), 0);
      
      const ordersWithDiscrepancies = allOrders.filter(order => 
        order.items.some(item => 
          item.receivedQuantity !== undefined && 
          item.receivedQuantity !== item.expectedQuantity
        )
      );
      
      const completedOrders = allOrders.filter(order => 
        order.status === 'complete' && order.submittedAt && order.completedAt
      );
      
      const averageDeliveryTime = completedOrders.length > 0 
        ? completedOrders.reduce((sum, order) => {
            const deliveryTime = order.completedAt!.getTime() - order.submittedAt!.getTime();
            return sum + deliveryTime;
          }, 0) / completedOrders.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        totalOrders: allOrders.length,
        pendingOrders: allOrders.filter(order => ['draft', 'submitted'].includes(order.status)).length,
        inTransitOrders: allOrders.filter(order => order.status === 'in_transit').length,
        deliveredOrders: allOrders.filter(order => order.status === 'delivered').length,
        completedOrders: allOrders.filter(order => order.status === 'complete').length,
        totalExpectedValue,
        totalReceivedValue,
        discrepancyRate: allOrders.length > 0 ? (ordersWithDiscrepancies.length / allOrders.length) * 100 : 0,
        averageDeliveryTime
      };
    } catch (error) {
      console.error('Error getting restock order stats:', error);
      throw error;
    }
  }

  // Add item to existing order
  async addItemToOrder(orderId: string, item: Omit<RestockItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const order = await this.getById(orderId);
      if (!order) throw new Error('Order not found');

      const newItem: RestockItem = {
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalExpectedValue: item.expectedQuantity * item.unitPrice,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedItems = [...order.items, newItem];
      await this.updateRestockOrder(orderId, { items: updatedItems });
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  }

  // Remove item from order
  async removeItemFromOrder(orderId: string, itemId: string): Promise<void> {
    try {
      const order = await this.getById(orderId);
      if (!order) throw new Error('Order not found');

      const updatedItems = order.items.filter(item => item.id !== itemId);
      await this.updateRestockOrder(orderId, { items: updatedItems });
    } catch (error) {
      console.error('Error removing item from order:', error);
      throw error;
    }
  }

  // Update item in order
  async updateItemInOrder(orderId: string, itemId: string, updates: Partial<RestockItem>): Promise<void> {
    try {
      const order = await this.getById(orderId);
      if (!order) throw new Error('Order not found');

      const updatedItems = order.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates, updatedAt: new Date() };
          if (updates.expectedQuantity || updates.unitPrice) {
            updatedItem.totalExpectedValue = (updates.expectedQuantity || item.expectedQuantity) * (updates.unitPrice || item.unitPrice);
          }
          if (updates.receivedQuantity !== undefined) {
            updatedItem.totalReceivedValue = updates.receivedQuantity * (updates.unitPrice || item.unitPrice);
          }
          return updatedItem;
        }
        return item;
      });

      await this.updateRestockOrder(orderId, { items: updatedItems });
    } catch (error) {
      console.error('Error updating item in order:', error);
      throw error;
    }
  }
}