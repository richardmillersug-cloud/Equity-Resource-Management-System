import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// =====================================================
// INTERFACE DATABASE CONNECTOR
// =====================================================

export class InterfaceDatabaseConnector {

  // =====================================================
  // PURCHASING MANAGER INTERFACE CONNECTORS
  // =====================================================

  // Helper function to safely convert dates
  private static safeToDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (typeof dateValue === 'string') return new Date(dateValue);
    if (typeof dateValue === 'number') return new Date(dateValue);
    return new Date();
  }

  /**
   * Connect Cash Close Interface to Firestore
   * ✅ Updated to use same data source as accountant ('cashCloses' collection)
   */
  static subscribeToCashCloseData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    console.log('🔄 InterfaceDB: Subscribing to cashCloses collection (same as accountant)...');
    
    const collectionRef = collection(db, 'cashCloses'); // ✅ Changed from 'cashClose' to 'cashCloses'
    const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(50)); // ✅ Changed from 'date' to 'createdAt'

    return onSnapshot(q, 
      (snapshot) => {
        console.log(`📊 InterfaceDB: Received ${snapshot.docs.length} cash close records from cashCloses collection`);
        
        const data = snapshot.docs.map(doc => {
          const rawData = doc.data();
          
          // Map accountant's data structure to purchasing manager's expected format
          return {
            id: doc.id,
            employeeId: rawData.employeeId || rawData.createdBy || 'unknown',
            branchId: rawData.branchId || 'unknown',
            shift: rawData.shift || 'day',
            closeCash: rawData.totalRevenue || rawData.closeCash || 0,
            actualAmount: rawData.totalActualCash || rawData.actualAmount || 0,
            expectedAmount: rawData.totalExpectedCash || rawData.expectedAmount || 0,
            cashPresent: rawData.cashPresent || 0,
            airtel: rawData.airtel || 0,
            mtn: rawData.mtn || 0,
            stanbicBank: rawData.stanbicBank || 0,
            equityBank: rawData.equityBank || 0,
            absaBank: rawData.absaBank || 0,
            pesaPal: rawData.pesaPal || 0,
            shortage: rawData.totalShortage || rawData.shortage || 0,
            excess: rawData.totalExcess || rawData.excess || 0,
            profitMargin: rawData.profitMargin || 0,
            
            // Safe date conversions
            date: this.safeToDate(rawData.cashCloseDate || rawData.date || rawData.createdAt),
            time: rawData.time || this.safeToDate(rawData.cashCloseDate || rawData.createdAt).toLocaleTimeString(),
            createdAt: this.safeToDate(rawData.createdAt),
            updatedAt: this.safeToDate(rawData.updatedAt)
          };
        });
        
        console.log(`✅ InterfaceDB: Mapped ${data.length} cash closes for purchasing manager dashboard`);
        console.log('🔍 InterfaceDB: Sample record:', data.length > 0 ? {
          id: data[0].id,
          closeCash: data[0].closeCash,
          date: data[0].date,
          dataSource: 'cashCloses (accountant collection)'
        } : 'No records');
        
        callback(data);
      },
      (error) => {
        console.error('Cash Close subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Add new cash close entry
   * ✅ Updated to use same collection as accountant ('cashCloses')
   */
  static async addCashClose(data: Record<string, unknown>): Promise<string> {
    console.log('💰 InterfaceDB: Adding cash close to cashCloses collection (same as accountant)...');
    
    const collectionRef = collection(db, 'cashCloses'); // ✅ Changed from 'cashClose' to 'cashCloses'
    const docRef = await addDoc(collectionRef, {
      ...data,
      cashCloseDate: serverTimestamp(), // ✅ Use accountant's field name
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ InterfaceDB: Cash close added successfully with ID: ${docRef.id}`);
    return docRef.id;
  }

  /**
   * Clear all cash close data
   * ✅ Updated to use same collection as accountant ('cashCloses')
   */
  static async clearCashCloseData(): Promise<void> {
    console.log('🗑️ InterfaceDB: Clearing cash close data from cashCloses collection...');
    
    const collectionRef = collection(db, 'cashCloses'); // ✅ Changed from 'cashClose' to 'cashCloses'
    const snapshot = await getDocs(collectionRef);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared ${snapshot.size} cash close records from cashCloses collection`);
  }

  /**
   * Reinitialize cash close data
   */
  static async reinitializeCashCloseData(): Promise<void> {
    // Import the DatabaseInitialization class
    const { DatabaseInitialization } = await import('./database-initialization');
    
    // Clear existing data
    await this.clearCashCloseData();
    
    // Reinitialize with fresh data
    await DatabaseInitialization.initializeCashCloseCollection();
    
    console.log('✅ Cash close data reinitialized successfully');
  }

  /**
   * Connect Suppliers Interface to Firestore
   */
  static subscribeToSuppliersData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'suppliers');
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateOfRegistration: doc.data().dateOfRegistration?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Suppliers subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Add new supplier
   */
  static async addSupplier(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'suppliers');
    const docRef = await addDoc(collectionRef, {
      ...data,
      dateOfRegistration: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Update supplier
   */
  static async updateSupplier(id: string, data: unknown): Promise<void> {
    const docRef = doc(db, 'suppliers', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Connect Expenses Interface to Firestore
   */
  static subscribeToExpensesData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'expenses');
    const q = query(collectionRef, orderBy('date', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Expenses subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Approve expense
   */
  static async approveExpense(id: string, approvedBy: string): Promise<void> {
    const docRef = doc(db, 'expenses', id);
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }



  /**
   * Connect Purchase Orders Interface to Firestore
   */
  static subscribeToPurchaseOrdersData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'purchaseOrders');
    const q = query(collectionRef, orderBy('orderDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          orderDate: doc.data().orderDate?.toDate?.() || new Date(),
          expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate?.() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Purchase Orders subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create purchase order
   */
  static async createPurchaseOrder(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'purchaseOrders');
    const docRef = await addDoc(collectionRef, {
      ...data,
      orderDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Connect Payments Interface to Firestore
   */
  static subscribeToPaymentsData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'payments');
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          processedAt: doc.data().processedAt?.toDate?.() || null,
          cancelledAt: doc.data().cancelledAt?.toDate?.() || null,
          paymentDate: doc.data().paymentDate?.toDate?.() || doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Payments subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create new payment
   */
  static async createPayment(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'payments');
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Process payment
   */
  static async processPayment(id: string, processedBy: string): Promise<void> {
    const docRef = doc(db, 'payments', id);
    await updateDoc(docRef, {
      status: 'processing',
      processedBy,
      processedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Complete payment
   */
  static async completePayment(id: string, processedBy: string): Promise<void> {
    const docRef = doc(db, 'payments', id);
    await updateDoc(docRef, {
      status: 'completed',
      processedBy,
      processedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(id: string, cancelledBy: string, reason: string): Promise<void> {
    const docRef = doc(db, 'payments', id);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelledBy,
      cancelledAt: serverTimestamp(),
      cancellationReason: reason,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Clear all payments data
   */
  static async clearPaymentsData(): Promise<void> {
    const collectionRef = collection(db, 'payments');
    const snapshot = await getDocs(collectionRef);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared ${snapshot.size} payment records`);
  }

  /**
   * Reinitialize payments data
   */
  static async reinitializePaymentsData(): Promise<void> {
    const { DatabaseInitialization } = await import('./database-initialization');
    
    await this.clearPaymentsData();
    await DatabaseInitialization.initializePaymentsCollection();
    
    console.log('✅ Payments data reinitialized successfully');
  }

  /**
   * Connect Cheque Tracker Interface to Firestore
   */
  static subscribeToChequeTrackerData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'chequeTracker');
    const q = query(collectionRef, orderBy('issuedDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          issuedDate: doc.data().issuedDate?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || new Date(),
          clearedDate: doc.data().clearedDate?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Cheque Tracker subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Connect Installment Plans Interface to Firestore
   */
  static subscribeToInstallmentPlansData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'installmentPlans');
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          installments: doc.data().installments?.map((inst: unknown) => ({
            ...inst,
            dueDate: inst.dueDate?.toDate?.() || new Date(),
            paidDate: inst.paidDate?.toDate?.() || null
          })) || []
        }));
        callback(data);
      },
      (error) => {
        console.error('Installment Plans subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  // =====================================================
  // RECEIVER INTERFACE CONNECTORS
  // =====================================================

  /**
   * Connect Deliveries Interface to Firestore
   */
  static subscribeToDeliveriesData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'deliveries');
    const q = query(collectionRef, orderBy('scheduledDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledDate: doc.data().scheduledDate?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Deliveries subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create delivery
   */
  static async createDelivery(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'deliveries');
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Update delivery status
   */
  static async updateDeliveryStatus(id: string, status: string, notes?: string): Promise<void> {
    const docRef = doc(db, 'deliveries', id);
    await updateDoc(docRef, {
      status,
      notes,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Connect Return Notes Interface to Firestore
   */
  static subscribeToReturnNotesData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'returnNotes');
    const q = query(collectionRef, orderBy('returnDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          returnDate: doc.data().returnDate?.toDate?.() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Return Notes subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create return note
   */
  static async createReturnNote(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'returnNotes');
    const docRef = await addDoc(collectionRef, {
      ...data,
      returnDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Connect Damages Interface to Firestore
   */
  static subscribeToDamagesData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'damages');
    const q = query(collectionRef, orderBy('reportedDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          reportedDate: doc.data().reportedDate?.toDate?.() || new Date(),
          resolvedDate: doc.data().resolvedDate?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Damages subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create damage report
   */
  static async createDamageReport(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'damages');
    const docRef = await addDoc(collectionRef, {
      ...data,
      reportedDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Connect Restock Items Interface to Firestore
   */
  static subscribeToRestockItemsData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'restockItems');
    const q = query(collectionRef, orderBy('requestedDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedDate: doc.data().requestedDate?.toDate?.() || new Date(),
          expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate?.() || new Date(),
          approvedDate: doc.data().approvedDate?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Restock Items subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  // =====================================================
  // SHARED INTERFACE CONNECTORS
  // =====================================================

  /**
   * Connect Invoices Interface to Firestore
   */
  static subscribeToInvoicesData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'invoices');
    const q = query(collectionRef, orderBy('date', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Invoices subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create invoice
   */
  static async createInvoice(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'invoices');
    const docRef = await addDoc(collectionRef, {
      ...data,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Approve invoice
   */
  static async approveInvoice(id: string, approvedBy: string): Promise<void> {
    const docRef = doc(db, 'invoices', id);
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Connect Notifications Interface to Firestore
   */
  static subscribeToNotificationsData(
    userId: string,
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'notifications');
    const q = query(
      collectionRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Notifications subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(id: string): Promise<void> {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, {
      isRead: true,
      updatedAt: serverTimestamp()
    });
  }

  // =====================================================
  // ADDITIONAL PURCHASING MANAGER COLLECTIONS
  // =====================================================

  /**
   * Connect Expense Requests Interface to Firestore
   */
  static subscribeToExpenseRequestsData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'expenseRequests');
    const q = query(collectionRef, orderBy('requestDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestDate: doc.data().requestDate?.toDate?.() || new Date(),
          requiredBy: doc.data().requiredBy?.toDate?.() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate?.() || null,
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Expense Requests subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Approve expense request
   */
  static async approveExpenseRequest(id: string, approvedBy: string): Promise<void> {
    const docRef = doc(db, 'expenseRequests', id);
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Connect Fund Acknowledgments Interface to Firestore
   */
  static subscribeToFundAcknowledgmentsData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'fundAcknowledgments');
    const q = query(collectionRef, orderBy('acknowledgedAt', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          acknowledgedAt: doc.data().acknowledgedAt?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Fund Acknowledgments subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Acknowledge fund allocation
   */
  static async acknowledgeFund(id: string, acknowledgedBy: string, notes?: string): Promise<void> {
    const docRef = doc(db, 'fundAcknowledgments', id);
    await updateDoc(docRef, {
      status: 'acknowledged',
      acknowledgedBy,
      acknowledgedAt: serverTimestamp(),
      notes: notes || '',
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Connect Cash Allocations Interface to Firestore
   */
  static subscribeToCashAllocationsData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'cashAllocations');
    const q = query(collectionRef, orderBy('allocationDate', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          allocationDate: doc.data().allocationDate?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Cash Allocations subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Create cash allocation
   */
  static async createCashAllocation(data: Record<string, unknown>): Promise<string> {
    const collectionRef = collection(db, 'cashAllocations');
    const docRef = await addDoc(collectionRef, {
      ...data,
      allocationDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Connect Special Funds Tracker Interface to Firestore
   */
  static subscribeToSpecialFundsTrackerData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'specialFundsTracker');
    const q = query(collectionRef, orderBy('lastAllocation', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastAllocation: doc.data().lastAllocation?.toDate?.() || new Date(),
          nextReview: doc.data().nextReview?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Special Funds Tracker subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Connect Users Interface to Firestore
   */
  static subscribeToUsersData(
    callback: (data: Record<string, unknown>[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const collectionRef = collection(db, 'users');
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastLogin: doc.data().lastLogin?.toDate?.() || new Date(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        callback(data);
      },
      (error) => {
        console.error('Users subscription error:', error);
        errorCallback?.(error);
      }
    );
  }

  // =====================================================
  // ANALYTICS AND DASHBOARD CONNECTORS
  // =====================================================

  /**
   * Get comprehensive dashboard analytics
   */
  static async getDashboardAnalytics(): Promise<any> {
    try {
      const [
        invoicesSnapshot,
        suppliersSnapshot,
        deliveriesSnapshot,
        returnNotesSnapshot,
        damagesSnapshot,
        expensesSnapshot,
        paymentsSnapshot,
        expenseRequestsSnapshot,
        fundAcknowledgmentsSnapshot,
        cashAllocationsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'invoices')),
        getDocs(collection(db, 'suppliers')),
        getDocs(collection(db, 'deliveries')),
        getDocs(collection(db, 'returnNotes')),
        getDocs(collection(db, 'damages')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'expenseRequests')),
        getDocs(collection(db, 'fundAcknowledgments')),
        getDocs(collection(db, 'cashAllocations'))
      ]);

      return {
        invoices: {
          total: invoicesSnapshot.size,
          data: invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        suppliers: {
          total: suppliersSnapshot.size,
          data: suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        deliveries: {
          total: deliveriesSnapshot.size,
          data: deliveriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        returnNotes: {
          total: returnNotesSnapshot.size,
          data: returnNotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        damages: {
          total: damagesSnapshot.size,
          data: damagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        expenses: {
          total: expensesSnapshot.size,
          data: expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        payments: {
          total: paymentsSnapshot.size,
          data: paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        expenseRequests: {
          total: expenseRequestsSnapshot.size,
          data: expenseRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        fundAcknowledgments: {
          total: fundAcknowledgmentsSnapshot.size,
          data: fundAcknowledgmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        cashAllocations: {
          total: cashAllocationsSnapshot.size,
          data: cashAllocationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Test all database connections including new collections
   */
  static async testAllConnections(): Promise<any> {
    const collections = [
      'cashClose', 'suppliers', 'expenses', 'purchaseOrders', 'payments',
      'chequeTracker', 'installmentPlans', 'expenseRequests', 'fundAcknowledgments',
      'cashAllocations', 'specialFundsTracker', 'deliveries', 'returnNotes',
      'damages', 'restockItems', 'invoices', 'notifications', 'users'
    ];

    const results: unknown = {};

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(query(collection(db, collectionName), limit(1)));
        results[collectionName] = {
          success: true,
          count: snapshot.size,
          hasData: snapshot.size > 0
        };
      } catch (error) {
        results[collectionName] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: collections.length,
        successful: Object.values(results).filter((r: unknown) => r.success).length,
        failed: Object.values(results).filter((r: unknown) => !r.success).length
      }
    };
  }

  /**
   * Create sample data for testing interfaces
   */
  static async createSampleDataForTesting(): Promise<void> {
    console.log('🧪 Creating sample data for interface testing...');

    // Create additional sample data for testing
    const sampleCashClose = {
      employeeId: 'test_emp_001',
      branchId: 'test_branch',
      shift: 'day',
      closeCash: 1500000,
      actualAmount: 1485000,
      expectedAmount: 1500000,
      cashPresent: 800000,
      airtel: 300000,
      mtn: 250000,
      stanbicBank: 135000,
      equityBank: 0,
      absaBank: 0,
      pesaPal: 0,
      shortage: 15000,
      excess: 0,
      time: '17:30'
    };

    const sampleDelivery = {
      supplierId: 'test_supplier',
      supplierName: 'Test Food Supplier',
      receiverId: 'test_receiver',
      scheduledDate: Timestamp.fromDate(new Date()),
      scheduledTime: '09:00',
      status: 'pending',
      items: [
        { name: 'Test Item 1', quantity: 25, expected: 25 },
        { name: 'Test Item 2', quantity: 15, expected: 15 }
      ],
      contactPerson: 'Test Contact',
      phone: '+256700000000',
      notes: 'Test delivery for interface testing'
    };

    try {
      await this.addCashClose(sampleCashClose);
      await this.createDelivery(sampleDelivery);
      console.log('✅ Sample data created successfully');
    } catch (error) {
      console.error('❌ Failed to create sample data:', error);
      throw error;
    }
  }

  // =====================================================
  // BROWSER CONSOLE SHORTCUTS
  // =====================================================

  static setupConsoleShortcuts() {
    if (typeof window !== 'undefined') {
      (window as any).dbConnector = {
        // Purchasing Manager shortcuts
        cashClose: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToCashCloseData(callback),
          add: (data: Record<string, unknown>) => InterfaceDatabaseConnector.addCashClose(data),
          clear: () => InterfaceDatabaseConnector.clearCashCloseData(),
          reinitialize: () => InterfaceDatabaseConnector.reinitializeCashCloseData()
        },
        suppliers: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToSuppliersData(callback),
          add: (data: Record<string, unknown>) => InterfaceDatabaseConnector.addSupplier(data),
          update: (id: string, data: unknown) => InterfaceDatabaseConnector.updateSupplier(id, data)
        },
        expenses: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToExpensesData(callback),
          approve: (id: string) => InterfaceDatabaseConnector.approveExpense(id, 'console-user')
        },
        payments: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToPaymentsData(callback),
          create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createPayment(data),
          process: (id: string) => InterfaceDatabaseConnector.processPayment(id, 'console-user'),
          complete: (id: string) => InterfaceDatabaseConnector.completePayment(id, 'console-user'),
          cancel: (id: string, reason: string) => InterfaceDatabaseConnector.cancelPayment(id, 'console-user', reason),
          clear: () => InterfaceDatabaseConnector.clearPaymentsData(),
          reinitialize: () => InterfaceDatabaseConnector.reinitializePaymentsData()
        },
        expenseRequests: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToExpenseRequestsData(callback),
          approve: (id: string) => InterfaceDatabaseConnector.approveExpenseRequest(id, 'console-user')
        },
        fundAcknowledgments: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToFundAcknowledgmentsData(callback),
          acknowledge: (id: string, notes?: string) => InterfaceDatabaseConnector.acknowledgeFund(id, 'console-user', notes)
        },
        cashAllocations: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToCashAllocationsData(callback),
          create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createCashAllocation(data)
        },
        specialFundsTracker: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToSpecialFundsTrackerData(callback)
        },
        // Receiver shortcuts
        deliveries: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToDeliveriesData(callback),
          create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createDelivery(data),
          updateStatus: (id: string, status: string) => InterfaceDatabaseConnector.updateDeliveryStatus(id, status)
        },
        returnNotes: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToReturnNotesData(callback),
          create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createReturnNote(data)
        },
        damages: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToDamagesData(callback),
          create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createDamageReport(data)
        },
        restockItems: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToRestockItemsData(callback)
        },
        // Shared shortcuts
        invoices: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToInvoicesData(callback),
          create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createInvoice(data),
          approve: (id: string) => InterfaceDatabaseConnector.approveInvoice(id, 'console-user')
        },
        users: {
          subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToUsersData(callback)
        },
        // Utility shortcuts
        analytics: () => InterfaceDatabaseConnector.getDashboardAnalytics(),
        testConnections: () => InterfaceDatabaseConnector.testAllConnections(),
        createSampleData: () => InterfaceDatabaseConnector.createSampleDataForTesting(),
        // Fix data issues
        fixInstallmentPlans: async () => {
          const { DatabaseInitialization } = await import('./database-initialization');
          return DatabaseInitialization.fixInstallmentPlansData();
        },
        clearInstallmentPlans: async () => {
          const { DatabaseInitialization } = await import('./database-initialization');
          return DatabaseInitialization.clearInstallmentPlansCollection();
        }
      };

      console.log('🔗 Database connector shortcuts available at window.dbConnector');
      console.log('📊 Try: dbConnector.analytics() or dbConnector.testConnections()');
      console.log('💰 Cash Close: dbConnector.cashClose.clear() or dbConnector.cashClose.reinitialize()');
      console.log('💳 Payments: dbConnector.payments.clear() or dbConnector.payments.reinitialize()');
      console.log('🔧 Fix data: dbConnector.fixInstallmentPlans() or dbConnector.clearInstallmentPlans()');
    }
  }
}

// =====================================================
// BROWSER CONSOLE INTEGRATION
// =====================================================

if (typeof window !== 'undefined') {
  (window as any).interfaceDB = {
    testConnections: () => InterfaceDatabaseConnector.testAllConnections(),
    getAnalytics: () => InterfaceDatabaseConnector.getDashboardAnalytics(),
    createSampleData: () => InterfaceDatabaseConnector.createSampleDataForTesting(),
    
    // Purchasing Manager shortcuts
    suppliers: {
      subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToSuppliersData(callback),
      add: (data: Record<string, unknown>) => InterfaceDatabaseConnector.addSupplier(data),
      update: (id: string, data: unknown) => InterfaceDatabaseConnector.updateSupplier(id, data)
    },
    
    expenses: {
      subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToExpensesData(callback),
      approve: (id: string, approvedBy: string) => InterfaceDatabaseConnector.approveExpense(id, approvedBy)
    },

    // Receiver shortcuts
    deliveries: {
      subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToDeliveriesData(callback),
      create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createDelivery(data),
      updateStatus: (id: string, status: string, notes?: string) => InterfaceDatabaseConnector.updateDeliveryStatus(id, status, notes)
    },

    // Shared shortcuts
    invoices: {
      subscribe: (callback: unknown) => InterfaceDatabaseConnector.subscribeToInvoicesData(callback),
      create: (data: Record<string, unknown>) => InterfaceDatabaseConnector.createInvoice(data),
      approve: (id: string, approvedBy: string) => InterfaceDatabaseConnector.approveInvoice(id, approvedBy)
    }
  };
  
  console.log('🔌 Interface Database Connector loaded!');
  console.log('Available commands:');
  console.log('- interfaceDB.testConnections() - Test all database connections');
  console.log('- interfaceDB.getAnalytics() - Get dashboard analytics data');
  console.log('- interfaceDB.createSampleData() - Create sample data for testing');
  console.log('- interfaceDB.suppliers.subscribe(callback) - Subscribe to suppliers data');
  console.log('- interfaceDB.deliveries.subscribe(callback) - Subscribe to deliveries data');
  console.log('- interfaceDB.invoices.subscribe(callback) - Subscribe to invoices data');
}