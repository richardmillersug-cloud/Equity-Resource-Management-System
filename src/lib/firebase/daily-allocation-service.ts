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
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from './config';

export interface DailyAllocation {
  id: string;
  amount: number;
  allocationDate: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  allocatedBy: string;
  allocatedByName: string;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  description: string;
  purpose: string;
  branchId: string;
  expiresAt: Date;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ NEW: Balance tracking fields
  totalAllocated: number;      // Original allocated amount
  usedAmount: number;          // Amount used for confirmed payments
  availableBalance: number;    // Remaining balance (totalAllocated - usedAmount)
  reservedAmount?: number;     // Amount reserved for pending payments
  
  // ✅ NEW: Usage tracking
  totalTransactions: number;   // Number of transactions using this allocation
  lastUsedAt?: Date;          // Last time this allocation was used for payment
  lastTransactionId?: string; // Last transaction/payment ID that used this allocation
}

export class DailyAllocationService {
  private collectionName = 'dailyAllocations';

  /**
   * Create a new daily allocation
   */
  async createAllocation(
    allocationData: Omit<DailyAllocation, 'id' | 'createdAt' | 'updatedAt' | 'totalAllocated' | 'usedAmount' | 'availableBalance' | 'totalTransactions'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...allocationData,
        allocationDate: Timestamp.fromDate(allocationData.allocationDate),
        expiresAt: Timestamp.fromDate(allocationData.expiresAt),
        acceptedAt: allocationData.acceptedAt ? Timestamp.fromDate(allocationData.acceptedAt) : null,
        rejectedAt: allocationData.rejectedAt ? Timestamp.fromDate(allocationData.rejectedAt) : null,
        lastUsedAt: allocationData.lastUsedAt ? Timestamp.fromDate(allocationData.lastUsedAt) : null,
        
        // ✅ NEW: Initialize balance tracking fields
        totalAllocated: allocationData.amount,
        usedAmount: 0,
        availableBalance: allocationData.amount,
        reservedAmount: allocationData.reservedAmount || 0,
        totalTransactions: 0,
        lastTransactionId: allocationData.lastTransactionId || null,
        
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Daily allocation created with ID: ${docRef.id} - Amount: UGX ${allocationData.amount.toLocaleString()}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating daily allocation:', error);
      throw error;
    }
  }

  /**
   * Get all allocations for a branch
   */
  async getAllocationsForBranch(branchId: string): Promise<DailyAllocation[]> {
    try {
      // First, get all allocations without ordering to avoid index requirement
      const q = query(
        collection(db, this.collectionName),
        where('branchId', '==', branchId)
      );

      const snapshot = await getDocs(q);
      const allocations: DailyAllocation[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        allocations.push({
          id: doc.id,
          ...data,
          allocationDate: data.allocationDate?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate() || undefined,
          rejectedAt: data.rejectedAt?.toDate() || undefined,
          lastUsedAt: data.lastUsedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          
          // ✅ NEW: Ensure balance tracking fields are properly mapped
          totalAllocated: data.totalAllocated || data.amount || 0,
          usedAmount: data.usedAmount || 0,
          availableBalance: data.availableBalance || data.totalAllocated || data.amount || 0,
          reservedAmount: data.reservedAmount || 0,
          totalTransactions: data.totalTransactions || 0,
          lastTransactionId: data.lastTransactionId || undefined
        } as DailyAllocation);
      });

      // Sort in memory instead of in the query
      return allocations.sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
    } catch (error) {
      console.error('Error getting allocations for branch:', error);
      throw error;
    }
  }

  /**
   * Get pending allocations for a user
   */
  async getPendingAllocations(branchId: string): Promise<DailyAllocation[]> {
    try {
      // Get all allocations for the branch first, then filter and sort in memory
      const q = query(
        collection(db, this.collectionName),
        where('branchId', '==', branchId)
      );

      const snapshot = await getDocs(q);
      const allocations: DailyAllocation[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        allocations.push({
          id: doc.id,
          ...data,
          allocationDate: data.allocationDate?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate() || undefined,
          rejectedAt: data.rejectedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as DailyAllocation);
      });

      // Filter for pending status and sort in memory
      return allocations
        .filter(allocation => allocation.status === 'pending')
        .sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
    } catch (error) {
      console.error('Error getting pending allocations:', error);
      throw error;
    }
  }

  /**
   * Accept an allocation
   */
  async acceptAllocation(
    allocationId: string,
    acceptedBy: string,
    acceptedByName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, allocationId);
      
      await updateDoc(docRef, {
        status: 'accepted',
        acceptedBy,
        acceptedByName,
        acceptedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Allocation ${allocationId} accepted by ${acceptedByName}`);
    } catch (error) {
      console.error('Error accepting allocation:', error);
      throw error;
    }
  }

  /**
   * Reject an allocation
   */
  async rejectAllocation(
    allocationId: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, allocationId);
      
      await updateDoc(docRef, {
        status: 'rejected',
        rejectionReason,
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Allocation ${allocationId} rejected`);
    } catch (error) {
      console.error('Error rejecting allocation:', error);
      throw error;
    }
  }

  /**
   * Get allocation by ID
   */
  async getAllocationById(allocationId: string): Promise<DailyAllocation | null> {
    try {
      const docRef = doc(db, this.collectionName, allocationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          allocationDate: data.allocationDate?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate() || undefined,
          rejectedAt: data.rejectedAt?.toDate() || undefined,
          lastUsedAt: data.lastUsedAt?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          
          // ✅ NEW: Ensure balance tracking fields are properly mapped
          totalAllocated: data.totalAllocated || data.amount || 0,
          usedAmount: data.usedAmount || 0,
          availableBalance: data.availableBalance || data.totalAllocated || data.amount || 0,
          reservedAmount: data.reservedAmount || 0,
          totalTransactions: data.totalTransactions || 0,
          lastTransactionId: data.lastTransactionId || undefined
        } as DailyAllocation;
      }

      return null;
    } catch (error) {
      console.error('Error getting allocation by ID:', error);
      throw error;
    }
  }

  /**
   * Get allocation statistics
   */
  async getAllocationStats(branchId: string): Promise<{
    totalPending: number;
    totalAccepted: number;
    totalRejected: number;
    totalAmount: number;
    pendingAmount: number;
    expiredCount: number;
  }> {
    try {
      const allocations = await this.getAllocationsForBranch(branchId);
      const now = new Date();

      const stats = {
        totalPending: allocations.filter(a => a.status === 'pending').length,
        totalAccepted: allocations.filter(a => a.status === 'accepted').length,
        totalRejected: allocations.filter(a => a.status === 'rejected').length,
        totalAmount: allocations.reduce((sum, a) => sum + a.amount, 0),
        pendingAmount: allocations.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0),
        expiredCount: allocations.filter(a => a.status === 'pending' && a.expiresAt < now).length
      };

      return stats;
    } catch (error) {
      console.error('Error getting allocation stats:', error);
      throw error;
    }
  }

  /**
   * Mark expired allocations
   */
  async markExpiredAllocations(branchId: string): Promise<number> {
    try {
      const pendingAllocations = await this.getPendingAllocations(branchId);
      const now = new Date();
      const expiredAllocations = pendingAllocations.filter(a => a.expiresAt < now);

      if (expiredAllocations.length === 0) {
        return 0;
      }

      const batch = writeBatch(db);
      
      expiredAllocations.forEach(allocation => {
        const docRef = doc(db, this.collectionName, allocation.id);
        batch.update(docRef, {
          status: 'expired',
          rejectionReason: 'Allocation expired - not accepted within time limit',
          rejectedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      await batch.commit();
      console.log(`✅ Marked ${expiredAllocations.length} allocations as expired`);
      
      return expiredAllocations.length;
    } catch (error) {
      console.error('Error marking expired allocations:', error);
      throw error;
    }
  }

  // ================= PAYMENT INTEGRATION METHODS =================

  /**
   * ✅ NEW: Deduct payment amount from allocation balance
   * Called when PM confirms a payment using allocated funds
   */
  async deductPaymentFromAllocation(
    allocationId: string,
    paymentAmount: number,
    paymentId: string,
    invoiceId: string,
    description: string
  ): Promise<{ success: boolean; newBalance: number; message: string }> {
    try {
      const allocation = await this.getAllocationById(allocationId);
      
      if (!allocation) {
        return { success: false, newBalance: 0, message: 'Allocation not found' };
      }

      if (allocation.status !== 'accepted') {
        return { success: false, newBalance: allocation.availableBalance, message: 'Allocation must be accepted before use' };
      }

      if (allocation.availableBalance < paymentAmount) {
        return { 
          success: false, 
          newBalance: allocation.availableBalance, 
          message: `Insufficient balance. Available: UGX ${allocation.availableBalance.toLocaleString()}, Required: UGX ${paymentAmount.toLocaleString()}` 
        };
      }

      // Calculate new balances
      const newUsedAmount = allocation.usedAmount + paymentAmount;
      const newAvailableBalance = allocation.totalAllocated - newUsedAmount;
      const newTransactionCount = allocation.totalTransactions + 1;

      // Update allocation
      const docRef = doc(db, this.collectionName, allocationId);
      await updateDoc(docRef, {
        usedAmount: newUsedAmount,
        availableBalance: newAvailableBalance,
        totalTransactions: newTransactionCount,
        lastUsedAt: Timestamp.now(),
        lastTransactionId: paymentId,
        updatedAt: Timestamp.now(),
        // Mark as completed if fully used
        status: newAvailableBalance <= 0 ? 'completed' : 'accepted'
      });

      // Record payment transaction
      await this.recordPaymentTransaction(allocationId, {
        paymentId,
        invoiceId,
        amount: paymentAmount,
        description,
        timestamp: new Date(),
        balanceAfter: newAvailableBalance
      });

      console.log(`✅ Payment deducted: UGX ${paymentAmount.toLocaleString()} from allocation ${allocationId}`);
      console.log(`💰 New balance: UGX ${newAvailableBalance.toLocaleString()}`);

      return {
        success: true,
        newBalance: newAvailableBalance,
        message: `Payment successful. Remaining balance: UGX ${newAvailableBalance.toLocaleString()}`
      };

    } catch (error) {
      console.error('Error deducting payment from allocation:', error);
      return { success: false, newBalance: 0, message: `Error processing payment: ${error}` };
    }
  }

  /**
   * ✅ NEW: Get available balance for a branch/PM
   */
  async getAvailableBalance(branchId: string): Promise<{
    totalAvailable: number;
    activeAllocations: DailyAllocation[];
    summary: {
      totalAllocated: number;
      totalUsed: number;
      totalReserved: number;
    }
  }> {
    try {
      const allocations = await this.getAllocationsForBranch(branchId);
      
      // Only include accepted allocations that haven't expired
      const now = new Date();
      const activeAllocations = allocations.filter(a => 
        a.status === 'accepted' && 
        a.expiresAt > now && 
        a.availableBalance > 0
      );

      const totalAvailable = activeAllocations.reduce((sum, a) => sum + a.availableBalance, 0);
      const totalAllocated = activeAllocations.reduce((sum, a) => sum + a.totalAllocated, 0);
      const totalUsed = activeAllocations.reduce((sum, a) => sum + a.usedAmount, 0);
      const totalReserved = activeAllocations.reduce((sum, a) => sum + (a.reservedAmount || 0), 0);

      return {
        totalAvailable,
        activeAllocations,
        summary: {
          totalAllocated,
          totalUsed,
          totalReserved
        }
      };
    } catch (error) {
      console.error('Error getting available balance:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Record payment transaction against allocation
   */
  private async recordPaymentTransaction(
    allocationId: string,
    transaction: {
      paymentId: string;
      invoiceId: string;
      amount: number;
      description: string;
      timestamp: Date;
      balanceAfter: number;
    }
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'allocationTransactions'), {
        allocationId,
        paymentId: transaction.paymentId,
        invoiceId: transaction.invoiceId,
        amount: transaction.amount,
        description: transaction.description,
        timestamp: Timestamp.fromDate(transaction.timestamp),
        balanceAfter: transaction.balanceAfter,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error recording payment transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Get allocation usage history
   */
  async getAllocationUsageHistory(allocationId: string): Promise<{
    paymentId: string;
    invoiceId: string;
    amount: number;
    description: string;
    timestamp: Date;
    balanceAfter: number;
  }[]> {
    try {
      const q = query(
        collection(db, 'allocationTransactions'),
        where('allocationId', '==', allocationId)
      );

      const snapshot = await getDocs(q);
      const transactions: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        transactions.push({
          paymentId: data.paymentId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          description: data.description,
          timestamp: data.timestamp?.toDate() || new Date(),
          balanceAfter: data.balanceAfter
        });
      });

      // Sort by timestamp (newest first)
      return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error getting allocation usage history:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Check if allocation has sufficient balance for payment
   */
  async checkAllocationBalance(
    allocationId: string,
    requiredAmount: number
  ): Promise<{
    hasBalance: boolean;
    availableBalance: number;
    shortfall: number;
    message: string;
  }> {
    try {
      const allocation = await this.getAllocationById(allocationId);
      
      if (!allocation) {
        return {
          hasBalance: false,
          availableBalance: 0,
          shortfall: requiredAmount,
          message: 'Allocation not found'
        };
      }

      const availableBalance = allocation.availableBalance;
      const hasBalance = availableBalance >= requiredAmount;
      const shortfall = hasBalance ? 0 : requiredAmount - availableBalance;

      return {
        hasBalance,
        availableBalance,
        shortfall,
        message: hasBalance 
          ? `Sufficient balance available: UGX ${availableBalance.toLocaleString()}`
          : `Insufficient balance. Available: UGX ${availableBalance.toLocaleString()}, Shortfall: UGX ${shortfall.toLocaleString()}`
      };
    } catch (error) {
      console.error('Error checking allocation balance:', error);
      return {
        hasBalance: false,
        availableBalance: 0,
        shortfall: requiredAmount,
        message: `Error checking balance: ${error}`
      };
    }
  }
}

// Export singleton instance
export const dailyAllocationService = new DailyAllocationService();
