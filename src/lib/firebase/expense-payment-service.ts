// Expense Payment Service
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { fundingSourceService } from './funding-source-service';
import { walletLedgerService } from './wallet-ledger-service';

// Payment method interface with comprehensive field support
export interface PaymentMethod {
  type: 'cash' | 'cheque' | 'bank_deposit' | 'mobile_money' | 'momo' | 'airtel_pay';
  details: {
    // Common fields
    payerName?: string;
    
    // Cash payment fields
    receiptNumber?: string;
    cashLocation?: string;
    
    // Cheque payment fields
    chequeNumber?: string;
    chequeDate?: Date;
    
    // Bank transfer fields
    bankAccount?: string;
    bankName?: string;
    transactionId?: string;
    routingNumber?: string;
    swiftCode?: string;
    
    // Mobile money fields
    mobileNumber?: string;
    referenceNumber?: string;
  };
  amount: number;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
}

// Expense payment record interface
export interface ExpensePayment {
  id: string;
  expenseId: string;
  expenseDescription: string;
  vendor: string;
  paymentReference: string;
  amount: number; // Amount paid in this payment
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  paidBy: string; // User ID
  paidByName: string; // User's display name
  installmentNumber: number; // Which installment this is (1, 2, 3, etc.)
  notes?: string | null;
  status: 'pending' | 'approved' | 'processed' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Additional expense-specific fields
  expenseType: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAY_TO_DAY';
  department?: string;
  projectCode?: string;
  receiptNumber?: string;
  fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT'; // Required funding source for all payments
}

// Payment summary for an expense
export interface ExpensePaymentSummary {
  expenseId: string;
  expenseDescription: string;
  vendor: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
  installmentCount: number;
  paymentMethods: string[]; // List of methods used
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  payments: ExpensePayment[];
}

// Payment analytics interface
export interface ExpensePaymentAnalytics {
  totalPayments: number;
  totalAmount: number;
  averagePaymentSize: number;
  paymentsByMethod: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export class ExpensePaymentService {
  
  /**
   * Subscribe to expense payments (individual payment records)
   */
  static subscribeToExpensePayments(callback: (payments: ExpensePayment[]) => void): () => void {
    const q = query(
      collection(db, 'expensePayments'),
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
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt,
          paymentMethod: {
            ...data.paymentMethod,
            details: {
              ...data.paymentMethod.details,
              chequeDate: data.paymentMethod.details?.chequeDate?.toDate ? 
                         data.paymentMethod.details.chequeDate.toDate() : 
                         data.paymentMethod.details?.chequeDate
            }
          }
        };
      }) as ExpensePayment[];
      
      callback(payments);
    });
  }

  /**
   * Make a payment towards an expense (supports partial payments)
   */
  static async makeExpensePayment(
    expenseId: string,
    paymentAmount: number,
    paymentMethod: PaymentMethod,
    paidBy: string,
    paidByName: string,
    fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT',
    notes?: string
  ): Promise<string> {
    const batch = writeBatch(db);

    // Get expense details
    const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
    if (!expenseDoc.exists()) {
      throw new Error('Expense not found');
    }

    const expense = expenseDoc.data();
    
    // Get existing payments to calculate installment number
    const existingPayments = await this.getExpensePaymentHistory(expenseId);
    const installmentNumber = existingPayments.length + 1;
    
    // Generate payment reference
    const paymentReference = `EXP-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Calculate new payment status
    const currentPaidAmount = expense.paidAmount || 0;
    const newPaidAmount = currentPaidAmount + paymentAmount;
    const totalAmount = expense.amount;
    
    let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
    if (newPaidAmount >= totalAmount) {
      paymentStatus = newPaidAmount > totalAmount ? 'OVERPAID' : 'FULLY_PAID';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    } else {
      paymentStatus = 'UNPAID';
    }

    const now = new Date();
    
    // Update expense with new payment information
    const expenseRef = doc(db, 'expenses', expenseId);
    batch.update(expenseRef, {
      paidAmount: newPaidAmount,
      remainingBalance: Math.max(0, totalAmount - newPaidAmount),
      paymentStatus,
      updatedAt: Timestamp.fromDate(now)
    });

    // Clean payment method details to remove undefined values
    const cleanDetails: any = {};
    Object.entries(paymentMethod.details).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'chequeDate' && value instanceof Date) {
          // Keep Date objects as they are, they'll be converted to Timestamp later
          cleanDetails[key] = value;
        } else {
          cleanDetails[key] = value;
        }
      }
    });

    // Create payment record - ensure no undefined values for Firestore
    const basePaymentData = {
      expenseId,
      expenseDescription: expense.name || expense.description || 'No description',
      vendor: expense.vendor || 'Unknown vendor',
      paymentReference,
      amount: paymentAmount,
      paymentMethod: {
        ...paymentMethod,
        details: cleanDetails
      },
      paymentDate: now,
      paidBy,
      paidByName,
      installmentNumber,
      notes: notes || null,
      status: 'processed' as const, // Default to processed for expense payments
      createdAt: now,
      updatedAt: now,
      
      // Required expense-specific fields
      expenseType: expense.expenseType || 'GENERAL',
      fundingSource, // Track which fund this payment came from
    };

    // Add optional fields only if they have values (avoid undefined)
    const optionalFields: any = {};
    if (expense.department) optionalFields.department = expense.department;
    if (expense.projectCode) optionalFields.projectCode = expense.projectCode;
    if (expense.receiptNumber) optionalFields.receiptNumber = expense.receiptNumber;

    const paymentData: Omit<ExpensePayment, 'id'> = {
      ...basePaymentData,
      ...optionalFields
    };

    // Add payment record
    const paymentRef = doc(collection(db, 'expensePayments'));
    batch.set(paymentRef, {
      ...paymentData,
      paymentDate: Timestamp.fromDate(paymentData.paymentDate),
      createdAt: Timestamp.fromDate(paymentData.createdAt),
      updatedAt: Timestamp.fromDate(paymentData.updatedAt),
      paymentMethod: {
        ...paymentData.paymentMethod,
        details: {
          ...paymentData.paymentMethod.details,
          // Convert cheque date to Timestamp if it exists
          ...(paymentData.paymentMethod.details.chequeDate && {
            chequeDate: Timestamp.fromDate(paymentData.paymentMethod.details.chequeDate)
          })
        }
      }
    });

    // Commit the batch
    await batch.commit();
    
    // Deduct from fund balance and record the assignment
    const branchId = expense.branchId || 'kyengera';
    try {
      await fundingSourceService.updateFundBalance(branchId, fundingSource, paymentAmount, 'allocate');
      console.log(`✅ Deducted ${paymentAmount} UGX from ${fundingSource}`);
    } catch (balanceError) {
      console.warn('⚠️ Could not update fund balance:', balanceError);
    }

    try {
      await fundingSourceService.recordFundingSourceAssignment(
        expenseId,
        paymentRef.id,
        fundingSource,
        paymentAmount,
        paidBy,
        paidByName,
        expense.name || expense.description || 'Expense payment',
        branchId,
        {
          vendor: expense.vendor,
          category: expense.category,
          priority: expense.priority as 'urgent' | 'high' | 'medium' | 'low' | undefined
        }
      );
      console.log(`✅ Payment recorded with ${fundingSource} assignment: ${paymentAmount} UGX`);
    } catch (recordingError) {
      console.warn('⚠️ Could not record funding source assignment:', recordingError);
    }

    // Record debit in walletLedger so the account page shows the payment out
    try {
      await walletLedgerService.recordExpensePaymentDebit({
        expensePaymentId: paymentRef.id,
        expenseId,
        expenseDescription: expense.name || expense.description || 'Expense payment',
        vendor: expense.vendor || 'Unknown vendor',
        amount: paymentAmount,
        fundingSource,
        branchId,
        paidBy,
        paidByName,
        notes: notes || undefined,
      });
    } catch (ledgerError) {
      console.warn('⚠️ Could not record wallet ledger debit:', ledgerError);
    }

    console.log(`✅ Expense payment processed: ${paymentReference} for ${paymentAmount} from ${fundingSource}`);
    return paymentRef.id;
  }

  /**
   * Get payment history for a specific expense
   */
  static async getExpensePaymentHistory(expenseId: string): Promise<ExpensePayment[]> {
    const q = query(
      collection(db, 'expensePayments'),
      where('expenseId', '==', expenseId)
    );

    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt
      };
    }) as ExpensePayment[];
    
    // Sort in JavaScript instead of Firestore to avoid index requirement
    return payments.sort((a, b) => {
      const dateA = a.paymentDate instanceof Date ? a.paymentDate : new Date(a.paymentDate);
      const dateB = b.paymentDate instanceof Date ? b.paymentDate : new Date(b.paymentDate);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get payment summary for a specific expense
   */
  static async getExpensePaymentSummary(expenseId: string): Promise<ExpensePaymentSummary | null> {
    try {
      // Get expense details
      const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
      if (!expenseDoc.exists()) return null;
      
      const expense = expenseDoc.data();
      
      // Get all payments for this expense
      const payments = await this.getExpensePaymentHistory(expenseId);
      
      if (payments.length === 0) {
        return {
          expenseId,
          expenseDescription: expense.name || expense.description || 'No description',
          vendor: expense.vendor || 'Unknown vendor',
          totalAmount: expense.amount || 0,
          paidAmount: 0,
          remainingBalance: expense.amount || 0,
          paymentStatus: 'UNPAID',
          installmentCount: 0,
          paymentMethods: [],
          status: 'unpaid',
          payments: []
        };
      }
      
      const totalAmount = expense.amount || 0;
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingBalance = Math.max(0, totalAmount - paidAmount);
      
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID';
      let status: 'unpaid' | 'partial' | 'paid' | 'overpaid';
      
      if (paidAmount >= totalAmount) {
        paymentStatus = paidAmount > totalAmount ? 'OVERPAID' : 'FULLY_PAID';
        status = paidAmount > totalAmount ? 'overpaid' : 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIALLY_PAID';
        status = 'partial';
      } else {
        paymentStatus = 'UNPAID';
        status = 'unpaid';
      }
      
      const paymentMethods = [...new Set(payments.map(p => p.paymentMethod.type))];
      
      return {
        expenseId,
        expenseDescription: expense.name || expense.description || 'No description',
        vendor: expense.vendor || 'Unknown vendor',
        totalAmount,
        paidAmount,
        remainingBalance,
        paymentStatus,
        installmentCount: payments.length,
        paymentMethods,
        status,
        payments
      };
    } catch (error) {
      console.error('Error getting expense payment summary:', error);
      return null;
    }
  }

  /**
   * Get payment analytics for expenses
   */
  static async getExpensePaymentAnalytics(dateRange?: { start: Date; end: Date }): Promise<ExpensePaymentAnalytics> {
    let q = query(collection(db, 'expensePayments'));
    
    if (dateRange) {
      q = query(q, 
        where('paymentDate', '>=', Timestamp.fromDate(dateRange.start)),
        where('paymentDate', '<=', Timestamp.fromDate(dateRange.end))
      );
    }
    
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate
      };
    }) as ExpensePayment[];
    
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const averagePaymentSize = totalPayments > 0 ? totalAmount / totalPayments : 0;
    
    // Payment methods breakdown
    const paymentsByMethod = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod.type;
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Payment status breakdown  
    const paymentsByStatus = payments.reduce((acc, payment) => {
      const status = payment.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Monthly trends (last 12 months)
    const monthlyTrends: Array<{ month: string; count: number; amount: number; }> = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.getFullYear() === date.getFullYear() &&
               paymentDate.getMonth() === date.getMonth();
      });
      
      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthPayments.length,
        amount: monthPayments.reduce((sum, payment) => sum + payment.amount, 0)
      });
    }
    
    return {
      totalPayments,
      totalAmount,
      averagePaymentSize,
      paymentsByMethod,
      paymentsByStatus,
      monthlyTrends
    };
  }

  /**
   * Search expense payments with criteria
   */
  static async searchExpensePayments(criteria: {
    dateFrom?: Date;
    dateTo?: Date;
    vendor?: string;
    expenseDescription?: string;
    paymentMethod?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<ExpensePayment[]> {
    try {
      let q = query(collection(db, 'expensePayments'));

      // Apply filters
      if (criteria.dateFrom) {
        q = query(q, where('paymentDate', '>=', Timestamp.fromDate(criteria.dateFrom)));
      }
      if (criteria.dateTo) {
        q = query(q, where('paymentDate', '<=', Timestamp.fromDate(criteria.dateTo)));
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
      }) as ExpensePayment[];

      // Apply client-side filters
      if (criteria.expenseDescription) {
        payments = payments.filter(p => 
          p.expenseDescription.toLowerCase().includes(criteria.expenseDescription!.toLowerCase())
        );
      }
      if (criteria.vendor) {
        payments = payments.filter(p => 
          p.vendor.toLowerCase().includes(criteria.vendor!.toLowerCase())
        );
      }
      if (criteria.paymentMethod) {
        payments = payments.filter(p => p.paymentMethod.type === criteria.paymentMethod);
      }
      if (criteria.minAmount !== undefined) {
        payments = payments.filter(p => p.amount >= criteria.minAmount!);
      }
      if (criteria.maxAmount !== undefined) {
        payments = payments.filter(p => p.amount <= criteria.maxAmount!);
      }

      return payments.sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
    } catch (error) {
      console.error('Error searching expense payments:', error);
      return [];
    }
  }

  /**
   * Get all payment summaries for expenses
   */
  static async getAllExpensePaymentSummaries(): Promise<ExpensePaymentSummary[]> {
    try {
      // Get all expenses that have payments or need payments
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      const summaries: ExpensePaymentSummary[] = [];

      for (const expenseDoc of expensesSnapshot.docs) {
        const summary = await this.getExpensePaymentSummary(expenseDoc.id);
        if (summary) {
          summaries.push(summary);
        }
      }

      return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
    } catch (error) {
      console.error('Error getting all expense payment summaries:', error);
      return [];
    }
  }
}
