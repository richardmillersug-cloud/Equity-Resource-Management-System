import { db } from './config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

// Types
export interface CashClose {
  id: string;
  employeeId: string;
  branchId: string;
  shift: 'day' | 'night';
  closeCash: number;
  actualAmount: number;
  expectedAmount: number;
  cashPresent: number;
  airtel: number;
  mtn: number;
  stanbicBank: number;
  equityBank: number;
  absaBank: number;
  pesaPal: number;
  shortage: number;
  excess: number;
  profitMargin: number; // 12% profit calculation
  date: Date;
  time: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  receiverId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number; // Total amount paid so far
  remainingAmount: number; // Amount still owed
  dueDate: Date;
  status: 'pending' | 'approved' | 'paid' | 'partial' | 'rejected' | 'overdue';
  items: InvoiceItem[];
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  paidAt?: Date; // Date when fully paid
  lastPaymentDate?: Date; // Date of most recent payment
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  paymentCount: number; // Number of payments made
  fdn: string; // Fiscal Document Number (Unique)
  notes?: string;
  attachments?: string[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface PaymentMethod {
  type: 'cash' | 'cheque' | 'bank_deposit' | 'mobile_money' | 'momo' | 'airtel_pay';
  details: {
    chequeNumber?: string;
    chequeDate?: Date;
    bankAccount?: string;
    bankName?: string;
    mobileNumber?: string;
    referenceNumber?: string;
    transactionId?: string;
  };
  amount: number;
  balance?: number;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
}

export interface InstallmentPlan {
  id: string;
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: Installment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paidDate?: Date;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms?: string;
  creditLimit?: number;
  currentBalance?: number;
  totalPaid?: number;
  totalOutstanding?: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  rating: number; // 1-5 stars
  category: string;
  description?: string;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChequeTracker {
  id: string;
  chequeNumber: string;
  amount: number;
  balance: number;
  issueDate: Date;
  dueDate: Date;
  status: 'issued' | 'pending' | 'cleared' | 'bounced' | 'cancelled';
  bankName: string;
  payeeId: string;
  payeeName: string;
  invoiceId?: string;
  notes?: string;
  clearedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  paymentReference: string;
  amount: number; // Amount paid in this payment
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  paidBy: string; // User ID
  paidByName: string; // User's display name
  installmentNumber: number; // Which installment this is (1, 2, 3, etc.)
  notes?: string | null;
  createdAt: Date;
  
  // Enhanced tracking fields
  runningTotal: number; // Total paid up to this payment
  remainingAfterPayment: number; // Amount remaining after this payment
  paymentStatus: 'completed' | 'pending' | 'failed' | 'cancelled';
  approvedBy?: string | null; // Who approved this payment
  approvedAt?: Date | null;
  
  // Cheque clearing fields
  clearedAt?: Date | null;
  clearedBy?: string | null;
  
  // Bounce fields
  bouncedAt?: Date | null;
  bouncedBy?: string | null;
  bounceReason?: string | null;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAYTODAY';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submittedBy: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
}

// New interface for payment analytics
export interface PaymentSummary {
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  paymentCount: number;
  firstPaymentDate?: Date;
  lastPaymentDate?: Date;
  averagePaymentAmount: number;
  paymentMethods: string[]; // List of methods used
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  payments: InvoicePayment[];
}

// Payment analytics interface
export interface PaymentAnalytics {
  totalPayments: number;
  totalAmount: number;
  averagePaymentSize: number;
  paymentsByMethod: Record<string, number>;
  paymentsBySupplier: Record<string, number>;
  installmentDistribution: Record<number, number>; // installment number -> count
  monthlyPayments: Record<string, number>; // YYYY-MM -> amount
}

export class PurchasingManagerService {
  /**
   * Clean undefined values from an object to prevent Firestore errors
   */
  private static cleanUndefinedValues(obj: any): any {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  
  // ==================== CASH CLOSE TRACKING ====================
  
  /**
   * Get all cash closes with real-time updates
   */
  static subscribeToCashCloses(callback: (cashCloses: CashClose[]) => void): () => void {
    const q = query(
      collection(db, 'cashClose'),
      orderBy('date', 'desc'),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const cashCloses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : data.date,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
      }) as CashClose[];
      
      callback(cashCloses);
    });
  }

  /**
   * Calculate profit margin (12%) from cash closes
   */
  static calculateProfitMetrics(cashCloses: CashClose[]) {
    const totalRevenue = cashCloses.reduce((sum, close) => sum + close.closeCash, 0);
    const profitMargin = 0.12; // 12%
    const estimatedProfit = totalRevenue * profitMargin;
    
    return {
      totalRevenue,
      profitMargin,
      estimatedProfit,
      dayCash: cashCloses.filter(c => c.shift === 'day').reduce((sum, c) => sum + c.closeCash, 0),
      nightCash: cashCloses.filter(c => c.shift === 'night').reduce((sum, c) => sum + c.closeCash, 0),
      networkMoney: cashCloses.reduce((sum, c) => 
        sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0),
      totalShortage: cashCloses.reduce((sum, c) => sum + (c.shortage || 0), 0),
      totalExcess: cashCloses.reduce((sum, c) => sum + (c.excess || 0), 0)
    };
  }

  // ==================== INVOICE MANAGEMENT ====================
  
  /**
   * Subscribe to real-time invoice updates
   */
  static subscribeToInvoices(callback: (invoices: Invoice[]) => void): () => void {
    const q = query(
      collection(db, 'invoices'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : data.dueDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt,
          paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : data.paidAt,
          rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate() : data.rejectedAt
        };
      }) as Invoice[];
      
      callback(invoices);
    });
  }

  /**
   * Approve an invoice
   */
  static async approveInvoice(invoiceId: string, approvedBy: string, notes?: string): Promise<void> {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    
    await updateDoc(invoiceRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy,
      notes: notes || '',
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Reject an invoice
   */
  static async rejectInvoice(invoiceId: string, rejectedBy: string, reason: string): Promise<void> {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    
    await updateDoc(invoiceRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy,
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Create installment plan for an invoice
   */
  static async createInstallmentPlan(
    invoiceId: string, 
    installments: Omit<Installment, 'id'>[]
  ): Promise<string> {
    const invoice = await getDoc(doc(db, 'invoices', invoiceId));
    if (!invoice.exists()) throw new Error('Invoice not found');
    
    const invoiceData = invoice.data() as Invoice;
    
    const installmentPlan: Omit<InstallmentPlan, 'id'> = {
      invoiceId,
      totalAmount: invoiceData.amount,
      paidAmount: 0,
      remainingAmount: invoiceData.amount,
      installments: installments.map((inst, index) => ({
        ...inst,
        id: `${invoiceId}_${index + 1}`,
        installmentNumber: index + 1
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const planRef = await addDoc(collection(db, 'installmentPlans'), installmentPlan);
    
    // Update invoice with installment plan reference
    await updateDoc(doc(db, 'invoices', invoiceId), {
      installmentPlan: { id: planRef.id, ...installmentPlan },
      updatedAt: serverTimestamp()
    });
    
    return planRef.id;
  }

  // ==================== SUPPLIER MANAGEMENT ====================
  
  /**
   * Subscribe to supplier updates
   */
  static subscribeToSuppliers(callback: (suppliers: Supplier[]) => void): () => void {
    const q = query(
      collection(db, 'suppliers'),
      orderBy('name', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const suppliers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastPaymentDate: data.lastPaymentDate?.toDate ? data.lastPaymentDate.toDate() : data.lastPaymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
      }) as Supplier[];
      
      callback(suppliers);
    });
  }

  /**
   * Create a new supplier
   */
  static async createSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const collectionRef = collection(db, 'suppliers');
    
    const newSupplier = {
      ...supplierData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collectionRef, newSupplier);
    return docRef.id;
  }

  /**
   * Update supplier information
   */
  static async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<void> {
    const supplierRef = doc(db, 'suppliers', supplierId);
    
    await updateDoc(supplierRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Update supplier status
   */
  static async updateSupplierStatus(supplierId: string, status: string): Promise<void> {
    const supplierRef = doc(db, 'suppliers', supplierId);
    
    await updateDoc(supplierRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Delete supplier
   */
  static async deleteSupplier(supplierId: string): Promise<void> {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await deleteDoc(supplierRef);
  }

  /**
   * Update supplier payment information
   */
  static async updateSupplierPayment(
    supplierId: string, 
    paymentAmount: number, 
    paymentDate: Date
  ): Promise<void> {
    const supplierRef = doc(db, 'suppliers', supplierId);
    const supplier = await getDoc(supplierRef);
    
    if (!supplier.exists()) throw new Error('Supplier not found');
    
    const supplierData = supplier.data() as Supplier;
    
    await updateDoc(supplierRef, {
      totalPaid: (supplierData.totalPaid || 0) + paymentAmount,
      currentBalance: Math.max(0, (supplierData.currentBalance || 0) - paymentAmount),
      lastPaymentDate: Timestamp.fromDate(paymentDate),
      updatedAt: serverTimestamp()
    });
  }

  // ==================== CHEQUE TRACKING ====================
  
  /**
   * Subscribe to cheque tracker updates
   */
  static subscribeToChequeTracker(callback: (cheques: ChequeTracker[]) => void): () => void {
    const q = query(
      collection(db, 'chequeTracker'),
      orderBy('issueDate', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const cheques = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          issueDate: data.issueDate?.toDate ? data.issueDate.toDate() : data.issueDate,
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : data.dueDate,
          clearedDate: data.clearedDate?.toDate ? data.clearedDate.toDate() : data.clearedDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
      }) as ChequeTracker[];
      
      callback(cheques);
    });
  }

  /**
   * Update cheque status
   */
  static async updateChequeStatus(
    chequeId: string, 
    status: ChequeTracker['status'], 
    notes?: string
  ): Promise<void> {
    const chequeRef = doc(db, 'chequeTracker', chequeId);
    
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'cleared') {
      updateData.clearedDate = serverTimestamp();
    }
    
    if (notes) {
      updateData.notes = notes;
    }
    
    await updateDoc(chequeRef, updateData);
  }

  // ==================== DASHBOARD ANALYTICS ====================
  
  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(): Promise<any> {
    try {
      // Get recent data for calculations
      const [invoicesSnapshot, expensesSnapshot, cashClosesSnapshot, suppliersSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'invoices'), limit(100))),
        getDocs(query(collection(db, 'expenses'), where('status', '==', 'approved'), limit(100))),
        getDocs(query(collection(db, 'cashClose'), orderBy('date', 'desc'), limit(30))),
        getDocs(query(collection(db, 'suppliers'), where('status', '==', 'active')))
      ]);

      const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
      const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      const cashCloses = cashClosesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CashClose[];
      const suppliers = suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[];

      return {
        // Cash metrics
        ...this.calculateProfitMetrics(cashCloses),
        
        // Invoice metrics
        pendingInvoices: invoices.filter(i => i.status === 'pending').length,
        approvedInvoices: invoices.filter(i => i.status === 'approved').length,
        paidInvoices: invoices.filter(i => i.status === 'paid').length,
        totalInvoiceAmount: invoices.filter(i => i.status === 'approved').reduce((sum, i) => sum + i.amount, 0),
        
        // Expense metrics
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        pendingExpenses: expenses.filter(e => e.status === 'pending').length,
        
        // Supplier metrics
        activeSuppliers: suppliers.length,
        totalSupplierBalance: suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0)
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // ==================== PAYMENTS ====================
  
  /**
   * Subscribe to payments
   */

  /**
   * Subscribe to invoice payments (individual payment records)
   */
  static subscribeToInvoicePayments(callback: (payments: InvoicePayment[]) => void): () => void {
    const q = query(
      collection(db, 'invoicePayments'),
      orderBy('paymentDate', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          paymentMethod: {
            ...data.paymentMethod,
            details: {
              ...data.paymentMethod?.details,
              chequeDate: data.paymentMethod?.details?.chequeDate?.toDate ? 
                data.paymentMethod.details.chequeDate.toDate() : 
                data.paymentMethod?.details?.chequeDate
            }
          }
        };
      }) as InvoicePayment[];
      
      callback(payments);
    });
  }

  /**
   * Make a payment towards an invoice (supports partial payments)
   */
  static async makeInvoicePayment(
    invoiceId: string,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
    paidBy: string,
    paidByName: string,
    notes?: string
  ): Promise<string> {
    const batch = writeBatch(db);
    
    // Get current invoice data
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceSnap.data() as Invoice;
    
    // For cheques, don't update invoice amounts until cleared
    const isCheque = paymentMethod.type === 'cheque';
    const newPaidAmount = isCheque ? (invoice.paidAmount || 0) : (invoice.paidAmount || 0) + paymentAmount;
    const newRemainingAmount = invoice.amount - newPaidAmount;
    const newPaymentCount = (invoice.paymentCount || 0) + 1;
    
    // Generate payment reference
    let paymentReference: string;
    try {
      paymentReference = PurchasingManagerService.generatePaymentReference(invoice.invoiceNumber, newPaymentCount, paymentMethod.type);
    } catch (error) {
      console.error('Error generating payment reference:', error);
      // Fallback reference if generation fails
      paymentReference = `PAY-${Date.now()}-${invoiceId.slice(-4).toUpperCase()}-${newPaymentCount.toString().padStart(2, '0')}`;
    }
    
    // Set payment status based on payment method
    let paymentStatus: 'completed' | 'pending' | 'failed' | 'cancelled' = 'completed';
    if (isCheque) {
      paymentStatus = 'pending'; // Cheques start as pending
    }
    
    // Debug logging before creating payment record
    console.log('Creating payment record with data:', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      paymentReference,
      amount: paymentAmount,
      paidBy,
      installmentNumber: newPaymentCount,
      notes: notes || null,
      approvedBy: invoice.approvedBy || null,
      approvedAt: invoice.approvedAt || null,
      paymentStatus,
      isCheque
    });

    // Create payment record - ensure no undefined values for Firestore
    const paymentData: Omit<InvoicePayment, 'id'> = {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      paymentReference,
      amount: paymentAmount,
      paymentMethod,
      paymentDate: new Date(),
      paidBy,
      paidByName,
      installmentNumber: newPaymentCount,
      notes: notes || null, // Use null instead of undefined
      createdAt: new Date(),
      runningTotal: newPaidAmount,
      remainingAfterPayment: newRemainingAmount,
      paymentStatus,
      approvedBy: invoice.approvedBy || null, // Use null instead of undefined
      approvedAt: invoice.approvedAt || null  // Use null instead of undefined
    };
    
    const paymentRef = doc(collection(db, 'invoicePayments'));
    // Clean any undefined values before writing to Firestore
    const cleanedPaymentData = PurchasingManagerService.cleanUndefinedValues(paymentData);
    batch.set(paymentRef, cleanedPaymentData);
    
    // Update invoice only if not a cheque (cheques don't update amounts until cleared)
    if (!isCheque) {
      const invoiceUpdate: Partial<Invoice> = {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentCount: newPaymentCount,
        lastPaymentDate: new Date(),
        status: newRemainingAmount <= 0 ? 'paid' : 'partial'
      };
      
      // If fully paid, set paidAt date
      if (newRemainingAmount <= 0) {
        invoiceUpdate.paidAt = new Date();
      }
      
      // Clean any undefined values before updating invoice
      const cleanedInvoiceUpdate = PurchasingManagerService.cleanUndefinedValues(invoiceUpdate);
      batch.update(invoiceRef, cleanedInvoiceUpdate);
    } else {
      // For cheques, only update payment count
      const invoiceUpdate: Partial<Invoice> = {
        paymentCount: newPaymentCount
      };
      batch.update(invoiceRef, invoiceUpdate);
    }
    
    // If it's a cheque, also create/update cheque tracker record
    if (isCheque && paymentMethod.details.chequeNumber) {
      const chequeData: Omit<ChequeTracker, 'id'> = {
        chequeNumber: paymentMethod.details.chequeNumber,
        amount: paymentAmount,
        balance: paymentAmount,
        issueDate: new Date(),
        dueDate: paymentMethod.details.chequeDate || new Date(),
        status: 'issued',
        bankName: paymentMethod.details.bankName || 'Unknown Bank',
        payeeId: invoice.supplierId,
        payeeName: invoice.supplierName,
        invoiceId: invoiceId,
        notes: notes || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const chequeRef = doc(collection(db, 'chequeTracker'));
      batch.set(chequeRef, PurchasingManagerService.cleanUndefinedValues(chequeData));
    }
    
    await batch.commit();
    return paymentRef.id;
  }

  /**
   * Generate a unique payment reference
   */
  private static generatePaymentReference(invoiceNumber: string, installmentNumber: number, paymentMethod: string): string {
    if (!invoiceNumber || !paymentMethod) {
      throw new Error('Invoice number and payment method are required for payment reference generation');
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Method prefix
    const methodPrefix = {
      'cash': 'CSH',
      'cheque': 'CHQ',
      'bank_deposit': 'BNK',
      'mobile_money': 'MOB',
      'momo': 'MTN',
      'airtel_pay': 'ATL'
    }[paymentMethod] || 'PAY';
    
    // Invoice number (last 4 characters or full if shorter)
    const invoiceRef = invoiceNumber.slice(-4).toUpperCase();
    
    // Generate reference: METHOD-YYMMDDHHNN-INVOICE-INSTALLMENT
    return `${methodPrefix}-${year}${month}${day}${hours}${minutes}-${invoiceRef}-${installmentNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Get payment history for a specific invoice
   */
  static async getInvoicePaymentHistory(invoiceId: string): Promise<InvoicePayment[]> {
    // Use only the where clause to avoid index requirement
    const q = query(
      collection(db, 'invoicePayments'),
      where('invoiceId', '==', invoiceId)
    );
    
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt
      };
    }) as InvoicePayment[];
    
    // Sort in JavaScript instead of Firestore to avoid index requirement
    return payments.sort((a, b) => {
      const dateA = a.paymentDate instanceof Date ? a.paymentDate : new Date(a.paymentDate);
      const dateB = b.paymentDate instanceof Date ? b.paymentDate : new Date(b.paymentDate);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });
  }

  /**
   * Get payment summary for a specific invoice
   */
  static async getInvoicePaymentSummary(invoiceId: string): Promise<PaymentSummary | null> {
    try {
      // Get invoice details
      const invoiceDoc = await getDoc(doc(db, 'invoices', invoiceId));
      if (!invoiceDoc.exists()) return null;
      
      const invoice = invoiceDoc.data() as Invoice;
      
      // Get all payments for this invoice
      const payments = await this.getInvoicePaymentHistory(invoiceId);
      
      if (payments.length === 0) {
        return {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          supplierName: invoice.supplierName,
          totalAmount: invoice.amount,
          totalPaid: 0,
          remainingAmount: invoice.amount,
          paymentCount: 0,
          averagePaymentAmount: 0,
          paymentMethods: [],
          status: 'unpaid',
          payments: []
        };
      }

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = invoice.amount - totalPaid;
      const uniqueMethods = [...new Set(payments.map(p => p.paymentMethod.type))];
      
      let status: 'unpaid' | 'partial' | 'paid' | 'overpaid' = 'unpaid';
      if (totalPaid === 0) status = 'unpaid';
      else if (totalPaid < invoice.amount) status = 'partial';
      else if (totalPaid === invoice.amount) status = 'paid';
      else status = 'overpaid';

      return {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        supplierName: invoice.supplierName,
        totalAmount: invoice.amount,
        totalPaid,
        remainingAmount,
        paymentCount: payments.length,
        firstPaymentDate: payments[payments.length - 1]?.paymentDate,
        lastPaymentDate: payments[0]?.paymentDate,
        averagePaymentAmount: totalPaid / payments.length,
        paymentMethods: uniqueMethods,
        status,
        payments: payments.reverse() // Chronological order
      };
    } catch (error) {
      console.error('Error getting payment summary:', error);
      return null;
    }
  }

  /**
   * Get payment analytics across all payments
   */
  static async getPaymentAnalytics(
    startDate?: Date, 
    endDate?: Date, 
    supplierId?: string
  ): Promise<PaymentAnalytics> {
    try {
      let q = query(collection(db, 'invoicePayments'));
      
      // Add date filters if provided
      if (startDate) {
        q = query(q, where('paymentDate', '>=', startDate));
      }
      if (endDate) {
        q = query(q, where('paymentDate', '<=', endDate));
      }
      
      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate
        };
      }) as InvoicePayment[];

      // Filter by supplier if provided
      const filteredPayments = supplierId 
        ? payments.filter(p => p.supplierName.toLowerCase().includes(supplierId.toLowerCase()))
        : payments;

      const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
      const averagePaymentSize = filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0;

      // Group by payment method
      const paymentsByMethod: Record<string, number> = {};
      filteredPayments.forEach(p => {
        const method = p.paymentMethod.type;
        paymentsByMethod[method] = (paymentsByMethod[method] || 0) + p.amount;
      });

      // Group by supplier
      const paymentsBySupplier: Record<string, number> = {};
      filteredPayments.forEach(p => {
        paymentsBySupplier[p.supplierName] = (paymentsBySupplier[p.supplierName] || 0) + p.amount;
      });

      // Group by installment number
      const installmentDistribution: Record<number, number> = {};
      filteredPayments.forEach(p => {
        installmentDistribution[p.installmentNumber] = (installmentDistribution[p.installmentNumber] || 0) + 1;
      });

      // Group by month
      const monthlyPayments: Record<string, number> = {};
      filteredPayments.forEach(p => {
        const monthKey = `${p.paymentDate.getFullYear()}-${(p.paymentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyPayments[monthKey] = (monthlyPayments[monthKey] || 0) + p.amount;
      });

      return {
        totalPayments: filteredPayments.length,
        totalAmount,
        averagePaymentSize,
        paymentsByMethod,
        paymentsBySupplier,
        installmentDistribution,
        monthlyPayments
      };
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      return {
        totalPayments: 0,
        totalAmount: 0,
        averagePaymentSize: 0,
        paymentsByMethod: {},
        paymentsBySupplier: {},
        installmentDistribution: {},
        monthlyPayments: {}
      };
    }
  }

  /**
   * Get all payment summaries for multiple invoices
   */
  static async getAllPaymentSummaries(invoiceIds?: string[]): Promise<PaymentSummary[]> {
    try {
      let invoicesQuery = query(collection(db, 'invoices'));
      
      if (invoiceIds && invoiceIds.length > 0) {
        invoicesQuery = query(invoicesQuery, where('__name__', 'in', invoiceIds));
      }

      const invoicesSnapshot = await getDocs(invoicesQuery);
      const summaries: PaymentSummary[] = [];

      for (const invoiceDoc of invoicesSnapshot.docs) {
        const summary = await this.getInvoicePaymentSummary(invoiceDoc.id);
        if (summary) {
          summaries.push(summary);
        }
      }

      return summaries.sort((a, b) => 
        (b.lastPaymentDate?.getTime() || 0) - (a.lastPaymentDate?.getTime() || 0)
      );
    } catch (error) {
      console.error('Error getting all payment summaries:', error);
      return [];
    }
  }

  /**
   * Search payments by various criteria
   */
  static async searchPayments(criteria: {
    invoiceNumber?: string;
    supplierName?: string;
    paymentReference?: string;
    paymentMethod?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<InvoicePayment[]> {
    try {
      let q = query(collection(db, 'invoicePayments'));

      // Apply filters
      if (criteria.dateFrom) {
        q = query(q, where('paymentDate', '>=', criteria.dateFrom));
      }
      if (criteria.dateTo) {
        q = query(q, where('paymentDate', '<=', criteria.dateTo));
      }

      const snapshot = await getDocs(q);
      let payments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        };
      }) as InvoicePayment[];

      // Apply client-side filters
      if (criteria.invoiceNumber) {
        payments = payments.filter(p => 
          p.invoiceNumber.toLowerCase().includes(criteria.invoiceNumber!.toLowerCase())
        );
      }
      if (criteria.supplierName) {
        payments = payments.filter(p => 
          p.supplierName.toLowerCase().includes(criteria.supplierName!.toLowerCase())
        );
      }
      if (criteria.paymentReference) {
        payments = payments.filter(p => 
          p.paymentReference.toLowerCase().includes(criteria.paymentReference!.toLowerCase())
        );
      }
      if (criteria.paymentMethod) {
        payments = payments.filter(p => p.paymentMethod.type === criteria.paymentMethod);
      }
      if (criteria.minAmount) {
        payments = payments.filter(p => p.amount >= criteria.minAmount!);
      }
      if (criteria.maxAmount) {
        payments = payments.filter(p => p.amount <= criteria.maxAmount!);
      }

      return payments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
    } catch (error) {
      console.error('Error searching payments:', error);
      return [];
    }
  }

  // ==================== EXPENSES ====================
  
  /**
   * Subscribe to expenses
   */
  static subscribeToExpenses(callback: (expenses: Expense[]) => void): () => void {
    const q = query(
      collection(db, 'expenseRequests'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt,
          rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate() : data.rejectedAt
        };
      }) as Expense[];
      
      callback(expenses);
    });
  }

  /**
   * Clear a cheque payment - updates payment status and invoice amounts
   */
  static async clearChequePayment(paymentId: string, clearedBy: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Get payment record
    const paymentRef = doc(db, 'invoicePayments', paymentId);
    const paymentSnap = await getDoc(paymentRef);
    
    if (!paymentSnap.exists()) {
      throw new Error('Payment not found');
    }
    
    const payment = paymentSnap.data() as InvoicePayment;
    
    if (payment.paymentMethod.type !== 'cheque') {
      throw new Error('This payment is not a cheque');
    }
    
    if (payment.paymentStatus === 'completed') {
      throw new Error('Cheque is already cleared');
    }
    
    // Get invoice
    const invoiceRef = doc(db, 'invoices', payment.invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceSnap.data() as Invoice;
    
    // Update payment status
    const paymentUpdate = {
      paymentStatus: 'completed' as const,
      clearedAt: new Date(),
      clearedBy
    };
    batch.update(paymentRef, paymentUpdate);
    
    // Update invoice amounts now that cheque is cleared
    const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
    const newRemainingAmount = invoice.amount - newPaidAmount;
    
    const invoiceUpdate: Partial<Invoice> = {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      lastPaymentDate: new Date(),
      status: newRemainingAmount <= 0 ? 'paid' : 'partial'
    };
    
    // If fully paid, set paidAt date
    if (newRemainingAmount <= 0) {
      invoiceUpdate.paidAt = new Date();
    }
    
    batch.update(invoiceRef, invoiceUpdate);
    
    // Update cheque tracker if exists
    if (payment.paymentMethod.details.chequeNumber) {
      const chequeQuery = query(
        collection(db, 'chequeTracker'),
        where('chequeNumber', '==', payment.paymentMethod.details.chequeNumber),
        where('invoiceId', '==', payment.invoiceId)
      );
      
      const chequeSnap = await getDocs(chequeQuery);
      if (!chequeSnap.empty) {
        const chequeDoc = chequeSnap.docs[0];
        batch.update(chequeDoc.ref, {
          status: 'cleared',
          clearedDate: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    await batch.commit();
  }

  /**
   * Mark a cheque payment as bounced
   */
  static async bounceChequePayment(paymentId: string, bouncedBy: string, reason?: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Get payment record
    const paymentRef = doc(db, 'invoicePayments', paymentId);
    const paymentSnap = await getDoc(paymentRef);
    
    if (!paymentSnap.exists()) {
      throw new Error('Payment not found');
    }
    
    const payment = paymentSnap.data() as InvoicePayment;
    
    if (payment.paymentMethod.type !== 'cheque') {
      throw new Error('This payment is not a cheque');
    }
    
    if (payment.paymentStatus === 'failed') {
      throw new Error('Cheque is already marked as bounced');
    }
    
    // Get invoice to revert amounts if needed
    const invoiceRef = doc(db, 'invoices', payment.invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceSnap.data() as Invoice;
    
    // Check if this cheque was previously cleared (and thus counted in invoice amounts)
    const wasPreviouslyCleared = payment.paymentStatus === 'completed';
    
    // Update payment status to failed
    const paymentUpdate = {
      paymentStatus: 'failed' as const,
      bouncedAt: new Date(),
      bouncedBy,
      bounceReason: reason || 'Cheque bounced'
    };
    batch.update(paymentRef, paymentUpdate);
    
    // If the cheque was previously cleared, we need to revert the invoice amounts
    let invoiceUpdate: Partial<Invoice> = {};
    
    if (wasPreviouslyCleared) {
      // Revert the amounts - subtract the bounced cheque amount
      const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.amount);
      const newRemainingAmount = invoice.amount - newPaidAmount;
      
      invoiceUpdate = {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newRemainingAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'approved')
      };
      
      // Remove paidAt date if invoice is no longer fully paid
      if (newRemainingAmount > 0) {
        invoiceUpdate.paidAt = null as any;
      }
    } else {
      // For pending cheques, just ensure status is correct
      const currentPaidAmount = invoice.paidAmount || 0;
      const remainingAmount = invoice.amount - currentPaidAmount;
      
      invoiceUpdate = {
        status: currentPaidAmount === 0 ? 'approved' : (currentPaidAmount < invoice.amount ? 'partial' : 'paid'),
        remainingAmount: remainingAmount
      };
    }
    
    batch.update(invoiceRef, invoiceUpdate);
    
    // Update cheque tracker if exists
    if (payment.paymentMethod.details.chequeNumber) {
      const chequeQuery = query(
        collection(db, 'chequeTracker'),
        where('chequeNumber', '==', payment.paymentMethod.details.chequeNumber),
        where('invoiceId', '==', payment.invoiceId)
      );
      
      const chequeSnap = await getDocs(chequeQuery);
      if (!chequeSnap.empty) {
        const chequeDoc = chequeSnap.docs[0];
        batch.update(chequeDoc.ref, {
          status: 'bounced',
          notes: reason || 'Cheque bounced',
          updatedAt: new Date()
        });
      }
    }
    
    await batch.commit();
  }

  /**
   * Get pending cheques that need attention
   */
  static async getPendingCheques(): Promise<InvoicePayment[]> {
    const q = query(
      collection(db, 'invoicePayments'),
      where('paymentMethod.type', '==', 'cheque'),
      where('paymentStatus', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        paymentMethod: {
          ...data.paymentMethod,
          details: {
            ...data.paymentMethod?.details,
            chequeDate: data.paymentMethod?.details?.chequeDate?.toDate ? 
              data.paymentMethod.details.chequeDate.toDate() : 
              data.paymentMethod?.details?.chequeDate
          }
        }
      };
    }) as InvoicePayment[];
  }

  /**
   * Get overdue cheques (past due date but not cleared)
   */
  static async getOverdueCheques(): Promise<InvoicePayment[]> {
    const pendingCheques = await this.getPendingCheques();
    const today = new Date();
    
    return pendingCheques.filter(payment => {
      const chequeDate = payment.paymentMethod.details.chequeDate;
      if (!chequeDate) return false;
      
      const dueDate = chequeDate instanceof Date ? chequeDate : new Date(chequeDate);
      return dueDate < today;
    });
  }
}

// Export convenience functions
export const {
  subscribeToCashCloses,
  subscribeToInvoices,
  subscribeToSuppliers,
  subscribeToChequeTracker,

  subscribeToInvoicePayments,
  subscribeToExpenses,
  approveInvoice,
  rejectInvoice,
  makeInvoicePayment,
  getInvoicePaymentHistory,
  getInvoicePaymentSummary,
  getPaymentAnalytics,
  getAllPaymentSummaries,
  searchPayments,
  createInstallmentPlan,
  createSupplier,
  updateSupplier,
  updateSupplierPayment,
  updateSupplierStatus,
  deleteSupplier,
  updateChequeStatus,

  getDashboardMetrics,
  calculateProfitMetrics
} = PurchasingManagerService; 