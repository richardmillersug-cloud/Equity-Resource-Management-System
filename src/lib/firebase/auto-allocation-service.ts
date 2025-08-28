import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query,
  where,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { authService } from './auth';

// Allocation Rules Configuration
export interface AllocationRule {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  
  // Rule Configuration
  savingsPercentage: number; // Configurable profit percentage
  specialFundsPercentage?: number; // Optional percentage-based
  specialFundsFixedAmount?: number; // Optional fixed amount
  purchasingManagerFormula: 'remainder' | 'percentage' | 'fixed';
  purchasingManagerPercentage?: number; // If formula is 'percentage'
  purchasingManagerFixedAmount?: number; // If formula is 'fixed'
  
  // Conditions
  minCashCloseAmount?: number;
  maxCashCloseAmount?: number;
  applicableShifts?: ('day' | 'night')[];
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Allocation Result
export interface AllocationResult {
  id: string;
  cashCloseId: string;
  shiftType: 'day' | 'night';
  shiftIndex: number;
  ruleId: string;
  ruleName: string;
  
  // Input Data
  totalCashInTill: number;
  specialFundsInput: number;
  
  // Calculated Amounts
  savingsAmount: number;
  specialFundsAmount: number;
  purchasingManagerAmount: number;
  totalAllocated: number;
  
  // Physical Collection Tracking
  physicalCollection?: {
    actualAmountCollected: number;
    collectedBy: string;
    collectedAt: Timestamp;
    varianceAmount: number; // actualAmountCollected - totalAllocated
    varianceReason?: string;
    collectionNotes?: string;
  };
  
  // Distribution Status
  distributionStatus: {
    savings: 'pending' | 'distributed' | 'banked';
    specialFunds: 'pending' | 'distributed' | 'transferred';
    purchasingManager: 'pending' | 'allocated' | 'transferred';
  };
  
  // Distribution Details
  distributionDetails?: {
    savings?: {
      method: 'bank_deposit' | 'safe_storage';
      reference?: string;
      distributedAt?: Timestamp;
      distributedBy?: string;
    };
    specialFunds?: {
      method: 'bank_transfer' | 'cash_envelope' | 'account_transfer';
      reference?: string;
      distributedAt?: Timestamp;
      distributedBy?: string;
    };
    purchasingManager?: {
      method: 'cash_handover' | 'bank_transfer' | 'mobile_money';
      reference?: string;
      distributedAt?: Timestamp;
      distributedBy?: string;
      receivedBy?: string;
      receiptNumber?: string;
    };
  };
  
  // Status
  status: 'auto_calculated' | 'approved' | 'collected' | 'distributed' | 'overridden' | 'rejected';
  autoApproved: boolean;
  
  // Override Information
  overriddenBy?: string;
  overrideReason?: string;
  originalAmounts?: {
    savings: number;
    specialFunds: number;
    purchasingManager: number;
  };
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

export class AutoAllocationService {
  private rulesCollection = 'allocationRules';
  private resultsCollection = 'allocationResults';

  // ==================== RULE MANAGEMENT ====================

  async createDefaultRules(): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const defaultRule: Omit<AllocationRule, 'id'> = {
      name: 'Standard Daily Allocation',
      description: 'Default rule: configurable profit percentage, user-defined special funds, remainder to purchasing manager',
      isDefault: true,
      isActive: true,
      savingsPercentage: 12,
      specialFundsPercentage: undefined, // User input
      specialFundsFixedAmount: undefined,
      purchasingManagerFormula: 'remainder',
      createdBy: currentUser.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, this.rulesCollection), defaultRule);
    console.log('✅ Created default allocation rule:', docRef.id);
  }

  async getActiveRule(): Promise<AllocationRule | null> {
    try {
      // For now, we'll use the default rule logic
      // In the future, this can be enhanced to select rules based on conditions
      return {
        id: 'default',
        name: 'Standard Daily Allocation',
        description: 'Automatic allocation with user-defined special funds',
        isDefault: true,
        isActive: true,
        savingsPercentage: 12,
        purchasingManagerFormula: 'remainder',
        createdBy: 'system',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
    } catch (error) {
      console.error('Error getting active allocation rule:', error);
      return null;
    }
  }

  // ==================== ALLOCATION CALCULATION ====================

  async calculateShiftAllocation(
    cashCloseId: string,
    shiftType: 'day' | 'night',
    shiftIndex: number,
    shiftTotalCashInTill: number,
    shiftSpecialFundsAmount: number
  ): Promise<AllocationResult> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const rule = await this.getActiveRule();
    if (!rule) throw new Error('No active allocation rule found');

    // Apply the new formula: Purchasing Manager = Total Cash in Till - (Profit Percentage + Special Funds)
    const savingsAmount = shiftTotalCashInTill * (rule.savingsPercentage / 100);
    const purchasingManagerAmount = Math.max(0, shiftTotalCashInTill - (savingsAmount + shiftSpecialFundsAmount));
    const totalAllocated = savingsAmount + shiftSpecialFundsAmount + purchasingManagerAmount;

    const result: Omit<AllocationResult, 'id'> = {
      cashCloseId,
      shiftType,
      shiftIndex,
      ruleId: rule.id,
      ruleName: rule.name,
      
      totalCashInTill: shiftTotalCashInTill,
      specialFundsInput: shiftSpecialFundsAmount,
      
      savingsAmount,
      specialFundsAmount: shiftSpecialFundsAmount,
      purchasingManagerAmount,
      totalAllocated,
      
      // Initialize distribution status as pending
      distributionStatus: {
        savings: 'pending',
        specialFunds: 'pending',
        purchasingManager: 'pending'
      },
      
      status: 'auto_calculated',
      autoApproved: totalAllocated <= shiftTotalCashInTill, // Auto-approve if within limits
      
      createdBy: currentUser.uid,
      createdAt: Timestamp.now()
    };

    // Save the allocation result
    const docRef = await addDoc(collection(db, this.resultsCollection), result);
    
    console.log(`✅ Auto-calculated ${shiftType} shift allocation:`, {
      id: docRef.id,
      shiftIndex,
      savingsAmount,
      specialFundsAmount: shiftSpecialFundsAmount,
      purchasingManagerAmount,
      totalAllocated
    });

    return {
      id: docRef.id,
      ...result
    };
  }

  // Legacy method for backward compatibility
  async calculateAutoAllocation(
    cashCloseId: string,
    totalCashInTill: number,
    specialFundsAmount: number
  ): Promise<AllocationResult> {
    return this.calculateShiftAllocation(
      cashCloseId,
      'day', // Default to day shift
      0,
      totalCashInTill,
      specialFundsAmount
    );
  }

  // ==================== APPROVAL WORKFLOW ====================

  async approveAllocation(allocationId: string, approvedBy: string): Promise<void> {
    const docRef = doc(db, this.resultsCollection, allocationId);
    await updateDoc(docRef, {
      status: 'approved',
      approvedBy,
      approvedAt: Timestamp.now()
    });
    console.log('✅ Approved allocation:', allocationId);
  }

  async overrideAllocation(
    allocationId: string,
    newAmounts: {
      savings: number;
      specialFunds: number;
      purchasingManager: number;
    },
    overrideReason: string,
    overriddenBy: string
  ): Promise<void> {
    const docRef = doc(db, this.resultsCollection, allocationId);
    const currentDoc = await getDoc(docRef);
    
    if (!currentDoc.exists()) {
      throw new Error('Allocation not found');
    }

    const currentData = currentDoc.data() as AllocationResult;

    await updateDoc(docRef, {
      status: 'overridden',
      overriddenBy,
      overrideReason,
      originalAmounts: {
        savings: currentData.savingsAmount,
        specialFunds: currentData.specialFundsAmount,
        purchasingManager: currentData.purchasingManagerAmount
      },
      savingsAmount: newAmounts.savings,
      specialFundsAmount: newAmounts.specialFunds,
      purchasingManagerAmount: newAmounts.purchasingManager,
      totalAllocated: newAmounts.savings + newAmounts.specialFunds + newAmounts.purchasingManager,
      updatedAt: Timestamp.now()
    });

    console.log('✅ Overridden allocation:', allocationId, 'Reason:', overrideReason);
  }

  // ==================== PHYSICAL COLLECTION ====================

  async recordPhysicalCollection(
    allocationId: string,
    actualAmountCollected: number,
    collectedBy: string,
    collectionNotes?: string,
    varianceReason?: string
  ): Promise<void> {
    const docRef = doc(db, this.resultsCollection, allocationId);
    const currentDoc = await getDoc(docRef);
    
    if (!currentDoc.exists()) {
      throw new Error('Allocation not found');
    }

    const currentData = currentDoc.data() as AllocationResult;
    const varianceAmount = actualAmountCollected - currentData.totalAllocated;

    const physicalCollection = {
      actualAmountCollected,
      collectedBy,
      collectedAt: Timestamp.now(),
      varianceAmount,
      varianceReason: varianceReason || '',
      collectionNotes: collectionNotes || ''
    };

    await updateDoc(docRef, {
      physicalCollection,
      status: 'collected',
      updatedAt: Timestamp.now()
    });

    console.log('✅ Recorded physical collection:', {
      allocationId,
      actualAmountCollected,
      varianceAmount,
      collectedBy
    });
  }

  // ==================== DISTRIBUTION MANAGEMENT ====================

  async updateDistributionStatus(
    allocationId: string,
    category: 'savings' | 'specialFunds' | 'purchasingManager',
    status: string,
    distributionDetails?: {
      method: string;
      reference?: string;
      distributedBy?: string;
      receivedBy?: string;
      receiptNumber?: string;
    }
  ): Promise<void> {
    const docRef = doc(db, this.resultsCollection, allocationId);
    const currentDoc = await getDoc(docRef);
    
    if (!currentDoc.exists()) {
      throw new Error('Allocation not found');
    }

    const currentData = currentDoc.data() as AllocationResult;
    
    // Update distribution status
    const updatedDistributionStatus = {
      ...currentData.distributionStatus,
      [category]: status
    };

    const updateData: any = {
      distributionStatus: updatedDistributionStatus,
      updatedAt: Timestamp.now()
    };

    // Add distribution details if provided
    if (distributionDetails) {
      const updatedDistributionDetails = {
        ...currentData.distributionDetails,
        [category]: {
          ...distributionDetails,
          distributedAt: Timestamp.now()
        }
      };
      updateData.distributionDetails = updatedDistributionDetails;
    }

    // Check if all categories are distributed
    const allDistributed = Object.values(updatedDistributionStatus).every(s => 
      s === 'distributed' || s === 'banked' || s === 'transferred' || s === 'allocated'
    );

    if (allDistributed) {
      updateData.status = 'distributed';
    }

    await updateDoc(docRef, updateData);

    console.log('✅ Updated distribution status:', {
      allocationId,
      category,
      status,
      allDistributed
    });
  }

  async markPurchasingManagerAsAllocated(
    allocationId: string,
    method: 'cash_handover' | 'bank_transfer' | 'mobile_money',
    distributedBy: string,
    receivedBy: string,
    reference?: string,
    receiptNumber?: string
  ): Promise<void> {
    await this.updateDistributionStatus(
      allocationId,
      'purchasingManager',
      'allocated',
      {
        method,
        reference,
        distributedBy,
        receivedBy,
        receiptNumber
      }
    );

    console.log('✅ Purchasing manager allocation completed:', {
      allocationId,
      method,
      distributedBy,
      receivedBy
    });
  }

  // ==================== QUERY METHODS ====================

  async getAllocationByCashCloseId(cashCloseId: string): Promise<AllocationResult | null> {
    try {
      const q = query(
        collection(db, this.resultsCollection),
        where('cashCloseId', '==', cashCloseId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No allocation found for cash close ID:', cashCloseId);
        return null;
      }
      
      // Get the first (for backward compatibility)
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as AllocationResult;
      
    } catch (error) {
      console.error('Error getting allocation by cash close ID:', error);
      return null;
    }
  }

  async getAllAllocationsByCashCloseId(cashCloseId: string): Promise<AllocationResult[]> {
    try {
      const q = query(
        collection(db, this.resultsCollection),
        where('cashCloseId', '==', cashCloseId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No allocations found for cash close ID:', cashCloseId);
        return [];
      }
      
      const allocations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AllocationResult));
      
      // Sort by shift index for consistent display
      return allocations.sort((a, b) => (a.shiftIndex || 0) - (b.shiftIndex || 0));
      
    } catch (error) {
      console.error('Error getting all allocations by cash close ID:', error);
      return [];
    }
  }

  async getAllocationById(allocationId: string): Promise<AllocationResult | null> {
    try {
      const docRef = doc(db, this.resultsCollection, allocationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as AllocationResult;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting allocation by ID:', error);
      return null;
    }
  }
}

export const autoAllocationService = new AutoAllocationService();
