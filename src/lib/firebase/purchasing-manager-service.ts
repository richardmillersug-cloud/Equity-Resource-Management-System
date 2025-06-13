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
  dueDate: Date;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'overdue';
  items: InvoiceItem[];
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  paidAt?: Date;
  paidBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  installmentPlan?: InstallmentPlan;
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

export interface ExpenseApproval {
  id: string;
  employeeId: string;
  employeeName: string;
  expenseId: string;
  name: string;
  amount: number;
  type: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAYTODAY';
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Date;
  approvalDate?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  note?: string;
  receipts?: string[];
  paidAmount: number;
  remainingAmount: number;
}

export interface Payment {
  id: string;
  reference: string;
  supplierName: string;
  amount: number;
  method: string;
  type: 'outgoing' | 'incoming';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
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

export class PurchasingManagerService {
  
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
   * Process payment for an invoice
   */
  static async payInvoice(
    invoiceId: string, 
    paymentMethod: PaymentMethod, 
    paidBy: string,
    isPartialPayment: boolean = false
  ): Promise<void> {
    const batch = writeBatch(db);
    const invoiceRef = doc(db, 'invoices', invoiceId);
    
    // Update invoice
    const invoiceUpdate: any = {
      paymentMethod,
      paidBy,
      updatedAt: serverTimestamp()
    };
    
    if (!isPartialPayment) {
      invoiceUpdate.status = 'paid';
      invoiceUpdate.paidAt = serverTimestamp();
    }
    
    batch.update(invoiceRef, invoiceUpdate);
    
    // If cheque payment, create cheque tracker
    if (paymentMethod.type === 'cheque') {
      const chequeData: Omit<ChequeTracker, 'id'> = {
        chequeNumber: paymentMethod.details.chequeNumber!,
        amount: paymentMethod.amount,
        balance: paymentMethod.balance || 0,
        issueDate: new Date(),
        dueDate: paymentMethod.details.chequeDate || new Date(),
        status: 'issued',
        bankName: paymentMethod.details.bankName || '',
        payeeId: '', // Get from invoice
        payeeName: '', // Get from supplier
        invoiceId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const chequeRef = doc(collection(db, 'chequeTracker'));
      batch.set(chequeRef, chequeData);
    }
    
    await batch.commit();
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

  // ==================== EXPENSE APPROVALS ====================
  
  /**
   * Subscribe to expense approvals
   */
  static subscribeToExpenseApprovals(callback: (expenses: ExpenseApproval[]) => void): () => void {
    const q = query(
      collection(db, 'expenses'),
      where('status', '==', 'pending'),
      orderBy('requestDate', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          requestDate: data.requestDate?.toDate ? data.requestDate.toDate() : data.requestDate,
          approvalDate: data.approvalDate?.toDate ? data.approvalDate.toDate() : data.approvalDate
        };
      }) as ExpenseApproval[];
      
      callback(expenses);
    });
  }

  /**
   * Approve expense
   */
  static async approveExpense(expenseId: string, approvedBy: string): Promise<void> {
    const expenseRef = doc(db, 'expenses', expenseId);
    
    await updateDoc(expenseRef, {
      status: 'approved',
      approvalDate: serverTimestamp(),
      approvedBy,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Reject expense
   */
  static async rejectExpense(expenseId: string, rejectedBy: string, reason: string): Promise<void> {
    const expenseRef = doc(db, 'expenses', expenseId);
    
    await updateDoc(expenseRef, {
      status: 'rejected',
      approvalDate: serverTimestamp(),
      approvedBy: rejectedBy,
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    });
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
      const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseApproval[];
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
        totalSupplierBalance: suppliers.reduce((sum, s) => sum + s.currentBalance, 0)
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
  static subscribeToPayments(callback: (payments: Payment[]) => void): () => void {
    const q = query(
      collection(db, 'payments'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          processedAt: data.processedAt?.toDate ? data.processedAt.toDate() : data.processedAt,
          cancelledAt: data.cancelledAt?.toDate ? data.cancelledAt.toDate() : data.cancelledAt
        };
      }) as Payment[];
      
      callback(payments);
    });
  }

  /**
   * Process payment
   */
  static async processPayment(paymentId: string, processedBy: string): Promise<void> {
    const paymentRef = doc(db, 'payments', paymentId);
    
    await updateDoc(paymentRef, {
      status: 'processing',
      processedAt: serverTimestamp(),
      processedBy,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(paymentId: string, cancelledBy: string, reason: string): Promise<void> {
    const paymentRef = doc(db, 'payments', paymentId);
    
    await updateDoc(paymentRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy,
      cancellationReason: reason,
      updatedAt: serverTimestamp()
    });
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

  // ==================== SUPPLIER MANAGEMENT ====================
  
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
}

// Export convenience functions
export const {
  subscribeToCashCloses,
  subscribeToInvoices,
  subscribeToSuppliers,
  subscribeToChequeTracker,
  subscribeToExpenseApprovals,
  subscribeToPayments,
  subscribeToExpenses,
  approveInvoice,
  rejectInvoice,
  payInvoice,
  createInstallmentPlan,
  updateSupplierPayment,
  updateSupplierStatus,
  deleteSupplier,
  updateChequeStatus,
  approveExpense,
  rejectExpense,
  processPayment,
  cancelPayment,
  getDashboardMetrics,
  calculateProfitMetrics
} = PurchasingManagerService; 