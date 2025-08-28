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

// Enhanced Interfaces for New Structure
export interface TillNetworkPayment {
  id: string;
  paymentMethod: 'mobile' | 'visa_machine';
  serviceProvider: string; // 'airtel', 'mtn', 'stanbic', etc.
  amount: number;
  transactionId?: string;
  timestamp?: Timestamp;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  notes?: string;
}

export interface TillExpense {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  remainingBalance: number;
  expenseDate: Date;
  expenseTime: Date;
  category: string;
  expenseType: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAY_TO_DAY';
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID' | 'OVERDUE';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  vendor: string;
  receiptNumber: string;
  notes: string;
  employeeId: string;
  employeeName: string;
  dueDate: Date;
  tags: string[];
  department: string;
  projectCode?: string;
  tillNumber: 1 | 2;
  shiftType: 'day' | 'night';
  approvalRequired: boolean;
  fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT'; // Funding source for all expenses
  receipts?: string[];
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface TillData {
  tillNumber: 1 | 2;
  
  // Core Cash Fields
  totalCashInTill: number;
  cashAmount: number;
  cashAtHand: number;
  
  // Network Money Fields
  expectedNetworkMoney: number;
  actualNetworkMoney: number;
  
  // Operational Fields
  tillUsed: number;
  expenses: number;
  expenseDetails: TillExpense[];
  
  // Network Payments Detail
  networkPayments: TillNetworkPayment[];
  
  // Calculated Fields (stored for convenience)
  totalNetworkPayments: number;
  expectedCashAtHand: number;
  cashShortage: number;
  cashExcess: number;
  networkShortage: number;
  networkExcess: number;
  
  // Till Metadata
  tillOpenedBy?: string;
  tillClosedBy?: string;
  tillOpenTime?: Timestamp;
  tillCloseTime?: Timestamp;
  tillNotes?: string;
}

export interface ShiftData {
  shift: 'day' | 'night';
  tills: TillData[];
  
  // Shift-level totals
  shiftTotalRevenue: number;
  shiftTotalCash: number;
  shiftTotalNetwork: number;
  shiftStartTime?: Timestamp;
  shiftEndTime?: Timestamp;
  shiftSupervisor?: string;
}

export interface ComprehensiveCashClose {
  // Document Metadata
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  branchId: string;
  cashCloseDate: Timestamp;
  
  // Global Settings
  profitPercentage: number;
  taxRate: number;
  notes: string;
  
  // Shift Data
  shifts: ShiftData[];
  
  // Calculated Totals
  totalRevenue: number;
  totalCashInTill: number;
  totalNetworkPayments: number;
  totalExpectedCash: number;
  totalActualCash: number;
  totalTillUsed: number;
  totalExpenses: number;
  
  // Variances
  totalShortage: number;
  totalExcess: number;
  totalNetworkShortage: number;
  totalNetworkExcess: number;
  
  // Financial Calculations
  taxAmount: number;
  afterTaxAmount: number;
  profitAmount: number;
  remainingAmount: number;
  specialFunds: number;
  purchasingManager: number;
  
  // Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
}

export class ComprehensiveCashCloseService {
  private collectionName = 'comprehensiveCashClose';

  // Calculate financial amounts using profitPercentage directly on total cash in till
  calculateFinancialAmounts(totalCashInTill: number, profitPercentage: number, taxRate: number = 0.18): {
    taxAmount: number;
    afterTaxAmount: number;
    profitAmount: number;
    remainingAmount: number;
    specialFunds: number;
    purchasingManager: number;
  } {
    const taxAmount = totalCashInTill * taxRate;
    const afterTaxAmount = totalCashInTill - taxAmount;
    const profitAmount = totalCashInTill * (profitPercentage / 100); // Profit as direct percentage of total cash in till
    const remainingAmount = totalCashInTill - profitAmount; // For Distribution = Total Cash in Till - Profit
    const specialFunds = remainingAmount * 0.3;
    const purchasingManager = remainingAmount * 0.7;

    return {
      taxAmount: Math.round(taxAmount * 100) / 100,
      afterTaxAmount: Math.round(afterTaxAmount * 100) / 100,
      profitAmount: Math.round(profitAmount * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
      specialFunds: Math.round(specialFunds * 100) / 100,
      purchasingManager: Math.round(purchasingManager * 100) / 100,
    };
  }

  // Create new comprehensive cash close
  async create(data: Omit<ComprehensiveCashClose, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  // Get by ID
  async getById(id: string): Promise<ComprehensiveCashClose | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ComprehensiveCashClose;
    }
    return null;
  }

  // Get by branch and date range
  async getByBranchAndDateRange(
    branchId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ComprehensiveCashClose[]> {
    const q = query(
      collection(db, this.collectionName),
      where('branchId', '==', branchId),
      where('cashCloseDate', '>=', Timestamp.fromDate(startDate)),
      where('cashCloseDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('cashCloseDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ComprehensiveCashClose[];
  }

  // Subscribe to real-time updates
  subscribeToUpdates(
    branchId: string,
    callback: (cashCloses: ComprehensiveCashClose[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('branchId', '==', branchId),
      orderBy('cashCloseDate', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const cashCloses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ComprehensiveCashClose[];
      
      callback(cashCloses);
    });
  }

  // Update status
  async updateStatus(
    id: string, 
    status: ComprehensiveCashClose['status'], 
    userId: string,
    rejectionReason?: string
  ): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = serverTimestamp();
    } else if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await updateDoc(docRef, updateData);
  }

  // Migrate from old cash close
  async migrateFromOldCashClose(oldCashClose: any): Promise<string> {
    // Migration logic to convert old structure to new
    const newCashClose: Omit<ComprehensiveCashClose, 'id' | 'createdAt' | 'updatedAt'> = {
      createdBy: oldCashClose.employeeId || 'migrated-user',
      branchId: oldCashClose.branchId || 'default-branch',
      cashCloseDate: oldCashClose.date || oldCashClose.cashCloseDate || Timestamp.now(),
      profitPercentage: oldCashClose.profitMargin || 12,
      taxRate: 18,
      notes: `Migrated from old cash close: ${oldCashClose.id}`,
      
      shifts: [{
        shift: oldCashClose.shift || 'day',
        tills: [{
          tillNumber: 1,
          totalCashInTill: oldCashClose.actualAmount || 0,
          cashAmount: oldCashClose.cashPresent || 0,
          cashAtHand: oldCashClose.cashPresent || 0,
          expectedNetworkMoney: (oldCashClose.airtel || 0) + (oldCashClose.mtn || 0) + 
                               (oldCashClose.stanbicBank || 0) + (oldCashClose.equityBank || 0) + 
                               (oldCashClose.absaBank || 0) + (oldCashClose.pesaPal || 0),
          actualNetworkMoney: (oldCashClose.airtel || 0) + (oldCashClose.mtn || 0) + 
                             (oldCashClose.stanbicBank || 0) + (oldCashClose.equityBank || 0) + 
                             (oldCashClose.absaBank || 0) + (oldCashClose.pesaPal || 0),
          tillUsed: 0,
          expenses: 0,
          networkPayments: [],
          totalNetworkPayments: (oldCashClose.airtel || 0) + (oldCashClose.mtn || 0) + 
                               (oldCashClose.stanbicBank || 0) + (oldCashClose.equityBank || 0) + 
                               (oldCashClose.absaBank || 0) + (oldCashClose.pesaPal || 0),
          expectedCashAtHand: oldCashClose.expectedAmount || 0,
          cashShortage: oldCashClose.shortage || 0,
          cashExcess: oldCashClose.excess || 0,
          networkShortage: 0,
          networkExcess: 0
        }],
        shiftTotalRevenue: oldCashClose.actualAmount || 0,
        shiftTotalCash: oldCashClose.cashPresent || 0,
        shiftTotalNetwork: (oldCashClose.airtel || 0) + (oldCashClose.mtn || 0) + 
                          (oldCashClose.stanbicBank || 0) + (oldCashClose.equityBank || 0) + 
                          (oldCashClose.absaBank || 0) + (oldCashClose.pesaPal || 0)
      }],
      
      // Calculate totals
      totalRevenue: oldCashClose.actualAmount || 0,
      totalCashInTill: oldCashClose.actualAmount || 0,
      totalNetworkPayments: (oldCashClose.airtel || 0) + (oldCashClose.mtn || 0) + 
                           (oldCashClose.stanbicBank || 0) + (oldCashClose.equityBank || 0) + 
                           (oldCashClose.absaBank || 0) + (oldCashClose.pesaPal || 0),
      totalExpectedCash: oldCashClose.expectedAmount || 0,
      totalActualCash: oldCashClose.cashPresent || 0,
      totalTillUsed: 0,
      totalExpenses: 0,
      totalShortage: oldCashClose.shortage || 0,
      totalExcess: oldCashClose.excess || 0,
      totalNetworkShortage: 0,
      totalNetworkExcess: 0,
      
      // Use new financial calculation method with totalCashInTill
      ...this.calculateFinancialAmounts(oldCashClose.actualAmount || 0, oldCashClose.profitPercentage || 12),
      
      status: 'approved' // Mark migrated data as approved
    };

    return this.create(newCashClose);
  }

  // Batch migrate multiple records
  async batchMigrate(oldCashCloses: any[]): Promise<void> {
    const batch = writeBatch(db);
    
    for (const oldRecord of oldCashCloses) {
      const newDocRef = doc(collection(db, this.collectionName));
      // Create migration data and add to batch
      // ... migration logic here
    }
    
    await batch.commit();
  }
}

// Export singleton instance
export const comprehensiveCashCloseService = new ComprehensiveCashCloseService();
