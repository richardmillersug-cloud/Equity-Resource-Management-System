import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { authService } from './auth';

// =====================================================
// ENHANCED RECEIVER CRUD OPERATIONS
// =====================================================

export class ReceiverCRUDOperations {
  
  // ==================== DELIVERIES ====================
  
  /**
   * CREATE: Add new delivery record
   */
  static async createDelivery(deliveryData: {
    supplierId: string;
    supplierName: string;
    scheduledDate: Date;
    scheduledTime: string;
    status: 'pending' | 'in-progress' | 'completed' | 'delayed';
    items: any[];
    contactPerson?: string;
    phone?: string;
    notes?: string;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const deliveryDoc = {
      ...deliveryData,
      receiverId: currentUser.uid,
      scheduledDate: Timestamp.fromDate(deliveryData.scheduledDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser.uid
    };

    return await addDoc(collection(db, 'deliveries'), deliveryDoc);
  }

  /**
   * READ: Get all deliveries for current receiver
   */
  static async getDeliveries(filters?: {
    status?: string;
    dateRange?: { start: Date; end: Date };
    supplierId?: string;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'deliveries'),
      where('receiverId', '==', currentUser.uid),
      orderBy('scheduledDate', 'desc')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.supplierId) {
      q = query(q, where('supplierId', '==', filters.supplierId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE: Update delivery status and details
   */
  static async updateDelivery(deliveryId: string, updates: {
    status?: 'pending' | 'in-progress' | 'completed' | 'delayed';
    actualArrivalTime?: string;
    receivedItems?: any[];
    notes?: string;
    discrepancies?: string;
  }) {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    
    await updateDoc(deliveryRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    });
  }

  /**
   * DELETE: Remove delivery record (admin only, but receiver can cancel)
   */
  static async cancelDelivery(deliveryId: string, reason: string) {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    
    await updateDoc(deliveryRef, {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: serverTimestamp(),
      cancelledBy: authService.getCurrentUser()?.uid
    });
  }

  // ==================== INVOICES ====================

  /**
   * CREATE: Create new invoice
   */
  static async createInvoice(invoiceData: {
    supplierName: string;
    supplierId: string;
    invoiceNumber: string;
    amount: number;
    description: string;
    fdn: string;
    quantity: number;
    dueDate: Date;
    items?: any[];
    paymentPlan?: any[];
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const invoiceDoc = {
      ...invoiceData,
      receiverId: currentUser.uid,
      date: serverTimestamp(),
      dueDate: Timestamp.fromDate(invoiceData.dueDate),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser.uid
    };

    return await addDoc(collection(db, 'invoices'), invoiceDoc);
  }

  /**
   * READ: Get invoices for receiver
   */
  static async getInvoices(filters?: {
    status?: string;
    supplierId?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'invoices'),
      where('receiverId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE: Update invoice details
   */
  static async updateInvoice(invoiceId: string, updates: {
    amount?: number;
    description?: string;
    quantity?: number;
    status?: string;
    notes?: string;
    paymentPlan?: any[];
  }) {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    
    await updateDoc(invoiceRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    });
  }

  // ==================== RETURN NOTES ====================

  /**
   * CREATE: Create return note
   */
  static async createReturnNote(returnData: {
    supplierId: string;
    supplierName: string;
    items: any[];
    reason: string;
    totalValue: number;
    description?: string;
    evidence?: string[];
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const returnDoc = {
      ...returnData,
      receiverId: currentUser.uid,
      status: 'pending',
      returnDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      processedBy: currentUser.uid
    };

    return await addDoc(collection(db, 'returnNotes'), returnDoc);
  }

  /**
   * READ: Get return notes
   */
  static async getReturnNotes(filters?: {
    status?: string;
    supplierId?: string;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'returnNotes'),
      where('receiverId', '==', currentUser.uid),
      orderBy('returnDate', 'desc')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE: Update return note
   */
  static async updateReturnNote(returnId: string, updates: {
    status?: 'pending' | 'approved' | 'completed' | 'rejected';
    approvalNotes?: string;
    resolution?: string;
  }) {
    const returnRef = doc(db, 'returnNotes', returnId);
    
    await updateDoc(returnRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    });
  }

  // ==================== PURCHASE ORDERS ====================

  /**
   * UPDATE: Update purchase order status (receivers can mark as received)
   */
  static async updatePurchaseOrderStatus(orderId: string, updates: {
    status?: 'pending' | 'approved' | 'received' | 'completed';
    receivedDate?: Date;
    receivedItems?: any[];
    discrepancies?: string;
    notes?: string;
  }) {
    const orderRef = doc(db, 'purchaseOrders', orderId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    };

    if (updates.receivedDate) {
      updateData.receivedDate = Timestamp.fromDate(updates.receivedDate);
    }

    await updateDoc(orderRef, updateData);
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to delivery updates
   */
  static subscribeToDeliveries(callback: (deliveries: any[]) => void) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'deliveries'),
      where('receiverId', '==', currentUser.uid),
      orderBy('scheduledDate', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(deliveries);
    });
  }

  /**
   * Subscribe to invoice updates
   */
  static subscribeToInvoices(callback: (invoices: any[]) => void) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'invoices'),
      where('receiverId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(invoices);
    });
  }
}

// =====================================================
// ENHANCED PURCHASING MANAGER CRUD OPERATIONS
// =====================================================

export class PurchasingManagerCRUDOperations {

  // ==================== SUPPLIERS ====================

  /**
   * CREATE: Add new supplier
   */
  static async createSupplier(supplierData: {
    supplierName: string;
    tinNumber: string;
    address: string;
    emailAddress: string;
    phoneNumber: string;
    bankName?: string;
    accountNumber?: string;
    bankNumber?: string;
    contactPerson?: string;
    paymentTerms?: string;
    creditLimit?: number;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const supplierDoc = {
      ...supplierData,
      managingEmployeeId: currentUser.uid,
      status: 'active',
      currentBalance: 0,
      totalOrders: 0,
      totalAmount: 0,
      dateOfRegistration: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser.uid
    };

    return await addDoc(collection(db, 'suppliers'), supplierDoc);
  }

  /**
   * READ: Get managed suppliers
   */
  static async getSuppliers(filters?: {
    status?: string;
    search?: string;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'suppliers'),
      where('managingEmployeeId', '==', currentUser.uid),
      orderBy('supplierName')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE: Update supplier information
   */
  static async updateSupplier(supplierId: string, updates: {
    supplierName?: string;
    address?: string;
    emailAddress?: string;
    phoneNumber?: string;
    contactPerson?: string;
    paymentTerms?: string;
    creditLimit?: number;
    status?: string;
    notes?: string;
  }) {
    const supplierRef = doc(db, 'suppliers', supplierId);
    
    await updateDoc(supplierRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    });
  }

  /**
   * DELETE: Delete supplier (mark as inactive)
   */
  static async deleteSupplier(supplierId: string) {
    const supplierRef = doc(db, 'suppliers', supplierId);
    
    await updateDoc(supplierRef, {
      status: 'inactive',
      deactivatedAt: serverTimestamp(),
      deactivatedBy: authService.getCurrentUser()?.uid
    });
  }

  // ==================== INVOICES ====================

  /**
   * READ: Get all invoices for purchasing manager
   */
  static async getInvoices(filters?: {
    status?: string;
    supplierId?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    let q = query(
      collection(db, 'invoices'),
      orderBy('createdAt', 'desc')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.supplierId) {
      q = query(q, where('supplierId', '==', filters.supplierId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE: Approve/reject invoices
   */
  static async updateInvoiceStatus(invoiceId: string, status: 'approved' | 'rejected', notes?: string) {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    };

    if (status === 'approved') {
      updates.approvedAt = serverTimestamp();
      updates.approvedBy = authService.getCurrentUser()?.uid;
    } else if (status === 'rejected') {
      updates.rejectedAt = serverTimestamp();
      updates.rejectedBy = authService.getCurrentUser()?.uid;
      updates.rejectionReason = notes;
    }

    if (notes) {
      updates.processingNotes = notes;
    }

    await updateDoc(invoiceRef, updates);
  }

  // ==================== PURCHASE ORDERS ====================

  /**
   * CREATE: Create purchase order
   */
  static async createPurchaseOrder(orderData: {
    supplierId: string;
    supplierName: string;
    items: any[];
    totalAmount: number;
    expectedDeliveryDate: Date;
    notes?: string;
    priority?: 'low' | 'medium' | 'high';
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const orderDoc = {
      ...orderData,
      purchasingManagerId: currentUser.uid,
      status: 'pending',
      orderNumber: `PO-${Date.now()}`,
      orderDate: serverTimestamp(),
      expectedDeliveryDate: Timestamp.fromDate(orderData.expectedDeliveryDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser.uid
    };

    return await addDoc(collection(db, 'purchaseOrders'), orderDoc);
  }

  /**
   * READ: Get purchase orders
   */
  static async getPurchaseOrders(filters?: {
    status?: string;
    supplierId?: string;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    let q = query(
      collection(db, 'purchaseOrders'),
      where('purchasingManagerId', '==', currentUser.uid),
      orderBy('orderDate', 'desc')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * UPDATE: Update purchase order
   */
  static async updatePurchaseOrder(orderId: string, updates: {
    status?: string;
    items?: any[];
    totalAmount?: number;
    notes?: string;
    receivedDate?: Date;
  }) {
    const orderRef = doc(db, 'purchaseOrders', orderId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: authService.getCurrentUser()?.uid
    };

    if (updates.receivedDate) {
      updateData.receivedDate = Timestamp.fromDate(updates.receivedDate);
    }

    await updateDoc(orderRef, updateData);
  }

  // ==================== PAYMENTS ====================

  /**
   * CREATE: Process payment
   */
  static async createPayment(paymentData: {
    invoiceId: string;
    supplierId: string;
    amount: number;
    paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money';
    referenceNumber?: string;
    notes?: string;
  }) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const batch = writeBatch(db);

    // Create payment record
    const paymentRef = doc(collection(db, 'payments'));
    batch.set(paymentRef, {
      ...paymentData,
      processedBy: currentUser.uid,
      status: 'completed',
      paymentDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update invoice status
    const invoiceRef = doc(db, 'invoices', paymentData.invoiceId);
    batch.update(invoiceRef, {
      status: 'paid',
      paidAt: serverTimestamp(),
      paidBy: currentUser.uid,
      paidAmount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.referenceNumber,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    return paymentRef.id;
  }

  /**
   * READ: Get payments
   */
  static async getPayments(filters?: {
    status?: string;
    paymentMethod?: string;
    dateRange?: { start: Date; end: Date };
  }) {
    let q = query(
      collection(db, 'payments'),
      orderBy('paymentDate', 'desc')
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.paymentMethod) {
      q = query(q, where('paymentMethod', '==', filters.paymentMethod));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // ==================== EXPENSES ====================

  /**
   * UPDATE: Approve/reject expense
   */
  static async updateExpenseStatus(expenseId: string, status: 'approved' | 'rejected', notes?: string) {
    const expenseRef = doc(db, 'expenses', expenseId);
    
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
      processedBy: authService.getCurrentUser()?.uid
    };

    if (status === 'approved') {
      updates.approvedAt = serverTimestamp();
      updates.approvedBy = authService.getCurrentUser()?.uid;
    } else if (status === 'rejected') {
      updates.rejectedAt = serverTimestamp();
      updates.rejectedBy = authService.getCurrentUser()?.uid;
      updates.rejectionReason = notes;
    }

    if (notes) {
      updates.processingNotes = notes;
    }

    await updateDoc(expenseRef, updates);
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to supplier updates
   */
  static subscribeToSuppliers(callback: (suppliers: any[]) => void) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'suppliers'),
      where('managingEmployeeId', '==', currentUser.uid),
      orderBy('supplierName')
    );

    return onSnapshot(q, (snapshot) => {
      const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(suppliers);
    });
  }

  /**
   * Subscribe to invoice updates
   */
  static subscribeToInvoices(callback: (invoices: any[]) => void) {
    const q = query(
      collection(db, 'invoices'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(invoices);
    });
  }

  /**
   * Subscribe to purchase order updates
   */
  static subscribeToPurchaseOrders(callback: (orders: any[]) => void) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'purchaseOrders'),
      where('purchasingManagerId', '==', currentUser.uid),
      orderBy('orderDate', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(orders);
    });
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export class CRUDUtils {
  
  /**
   * Validate user permissions for CRUD operations
   */
  static async validatePermissions(operation: 'create' | 'read' | 'update' | 'delete', resource: string) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    // Add role-based validation logic here
    const userRole = currentUser.employee?.roles?.[0]?.jobTitle;
    
    // Define permission matrix
    const permissions = {
      'Receiver': {
        deliveries: ['create', 'read', 'update'],
        invoices: ['create', 'read', 'update'],
        returnNotes: ['create', 'read', 'update'],
        purchaseOrders: ['read', 'update']
      },
      'Purchasing Manager': {
        suppliers: ['create', 'read', 'update', 'delete'],
        invoices: ['read', 'update'],
        purchaseOrders: ['create', 'read', 'update'],
        payments: ['create', 'read'],
        expenses: ['read', 'update']
      }
    };

    const userPermissions = permissions[userRole as keyof typeof permissions];
    if (!userPermissions || !userPermissions[resource as keyof typeof userPermissions]?.includes(operation)) {
      throw new Error(`Insufficient permissions for ${operation} on ${resource}`);
    }

    return true;
  }

  /**
   * Log CRUD operations for audit trail
   */
  static async logOperation(operation: string, resource: string, resourceId: string, details?: any) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const logDoc = {
      operation,
      resource,
      resourceId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      timestamp: serverTimestamp(),
      details: details || {},
      userAgent: navigator.userAgent
    };

    try {
      await addDoc(collection(db, 'auditLogs'), logDoc);
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  /**
   * Batch operation wrapper with error handling
   */
  static async batchOperation(operations: (() => Promise<any>)[]) {
    const results = [];
    const errors = [];

    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        errors.push(error);
      }
    }

    return { results, errors };
  }
}

// Export all services
export {
  ReceiverCRUDOperations as ReceiverCRUD,
  PurchasingManagerCRUDOperations as PurchasingManagerCRUD,
  CRUDUtils
};