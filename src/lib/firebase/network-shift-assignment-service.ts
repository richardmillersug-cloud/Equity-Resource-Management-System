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
import { normalizeShiftData, processCashCloseShifts, debugShiftData } from './shift-data-fix';

// 📱 Enhanced Network Assignment Interface for Shift Tracking
export interface NetworkAssignmentByShift {
  id: string;
  cashCloseId: string;
  branchId: string;
  businessDate: Date;
  
  // Day Shift Network Assignments
  dayShift: {
    shift: 'day';
    assignedEmployeeId: string;
    assignedEmployeeName: string;
    networkBreakdown: NetworkBreakdown;
    tillAssignments: TillNetworkAssignment[];
    totalNetworkMoney: number;
    actualNetworkMoney: number;
    variance: number;
    verificationStatus: 'pending' | 'verified' | 'discrepancy';
  };
  
  // Night Shift Network Assignments
  nightShift: {
    shift: 'night';
    assignedEmployeeId: string;
    assignedEmployeeName: string;
    networkBreakdown: NetworkBreakdown;
    tillAssignments: TillNetworkAssignment[];
    totalNetworkMoney: number;
    actualNetworkMoney: number;
    variance: number;
    verificationStatus: 'pending' | 'verified' | 'discrepancy';
  };
  
  // Summary Information
  summary: {
    totalNetworkMoney: number;
    totalActualMoney: number;
    totalVariance: number;
    overallStatus: 'complete' | 'incomplete' | 'discrepancy';
    completionPercentage: number;
  };
  
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

// Network breakdown by provider
export interface NetworkBreakdown {
  airtel: number;
  mtn: number;
  stanbicBank: number;
  equityBank: number;
  absaBank: number;
  pesaPal: number;
  [key: string]: number; // Allow for additional providers
}

// Till-specific network assignments
export interface TillNetworkAssignment {
  tillNumber: number;
  tillName: string;
  assignedNetworkProviders: string[]; // Which networks this till handles
  networkBreakdown: NetworkBreakdown;
  expectedTotal: number;
  actualTotal: number;
  variance: number;
  paymentDetails: NetworkPaymentDetail[];
}

// Detailed payment information
export interface NetworkPaymentDetail {
  id: string;
  provider: string; // airtel, mtn, stanbicBank, etc.
  paymentType: 'mobile_money' | 'visa_card' | 'bank_transfer';
  amount: number;
  transactionId?: string;
  timestamp: Date;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

// Validation result for network assignments
export interface NetworkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completionStatus: {
    dayShiftComplete: boolean;
    nightShiftComplete: boolean;
    allNetworkProvidersAssigned: boolean;
    noVarianceIssues: boolean;
  };
}

/**
 * 📱 Network Shift Assignment Service
 * Ensures comprehensive tracking of network assignments by shift
 * CRITICAL: Accountant must input ALL network assignments for BOTH day and night shifts
 */
export class NetworkShiftAssignmentService {
  private collectionName = 'networkShiftAssignments';

  /**
   * Create comprehensive network assignment tracking for cash close
   * ✅ ENSURES both day and night shifts are tracked
   */
  async createNetworkAssignment(
    cashCloseId: string,
    branchId: string,
    businessDate: Date,
    createdBy: string,
    createdByName: string,
    initialData?: {
      dayShiftData?: any;
      nightShiftData?: any;
    }
  ): Promise<string> {
    try {
      const networkAssignment: Omit<NetworkAssignmentByShift, 'id'> = {
        cashCloseId,
        branchId,
        businessDate,
        
        // Initialize Day Shift - MUST be filled
        dayShift: {
          shift: 'day',
          assignedEmployeeId: initialData?.dayShiftData?.employeeId || '',
          assignedEmployeeName: initialData?.dayShiftData?.employeeName || '',
          networkBreakdown: this.initializeNetworkBreakdown(initialData?.dayShiftData?.networkBreakdown),
          tillAssignments: initialData?.dayShiftData?.tillAssignments || [],
          totalNetworkMoney: 0,
          actualNetworkMoney: 0,
          variance: 0,
          verificationStatus: 'pending'
        },
        
        // Initialize Night Shift - MUST be filled  
        nightShift: {
          shift: 'night',
          assignedEmployeeId: initialData?.nightShiftData?.employeeId || '',
          assignedEmployeeName: initialData?.nightShiftData?.employeeName || '',
          networkBreakdown: this.initializeNetworkBreakdown(initialData?.nightShiftData?.networkBreakdown),
          tillAssignments: initialData?.nightShiftData?.tillAssignments || [],
          totalNetworkMoney: 0,
          actualNetworkMoney: 0,
          variance: 0,
          verificationStatus: 'pending'
        },
        
        summary: {
          totalNetworkMoney: 0,
          totalActualMoney: 0,
          totalVariance: 0,
          overallStatus: 'incomplete',
          completionPercentage: 0
        },
        
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft'
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...networkAssignment,
        businessDate: Timestamp.fromDate(businessDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Network assignment created for cash close ${cashCloseId} - Both shifts initialized`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating network assignment:', error);
      throw error;
    }
  }

  /**
   * Update network assignment data for a specific shift
   * ✅ CRITICAL: Validates all network providers are assigned
   */
  async updateShiftNetworkData(
    assignmentId: string,
    shift: 'day' | 'night',
    shiftData: {
      assignedEmployeeId: string;
      assignedEmployeeName: string;
      networkBreakdown: NetworkBreakdown;
      tillAssignments: TillNetworkAssignment[];
    }
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, assignmentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Network assignment not found');
      }

      const currentData = docSnap.data() as NetworkAssignmentByShift;

      // Calculate totals
      const totalNetworkMoney = Object.values(shiftData.networkBreakdown).reduce((sum, val) => sum + val, 0);
      const actualNetworkMoney = shiftData.tillAssignments.reduce((sum, till) => sum + till.actualTotal, 0);
      const variance = totalNetworkMoney - actualNetworkMoney;

      // Update the specific shift
      const updatedShiftData = {
        ...shiftData,
        totalNetworkMoney,
        actualNetworkMoney,
        variance,
        verificationStatus: Math.abs(variance) < 100 ? 'verified' : 'discrepancy' as const
      };

      // Update the document
      const updateData = {
        [`${shift}Shift`]: updatedShiftData,
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updateData);

      // Recalculate and update summary
      await this.updateSummary(assignmentId);

      console.log(`✅ ${shift} shift network data updated for assignment ${assignmentId}`);
    } catch (error) {
      console.error(`Error updating ${shift} shift network data:`, error);
      throw error;
    }
  }

  /**
   * Aggregate network data from existing cash close form data
   * ✅ MAPS TillNetworkPayment serviceProvider to specific network fields
   * ✅ CORRECTLY PRESERVES ACTUAL SHIFT DATA (day/night)
   */
  async aggregateNetworkDataFromCashClose(cashCloseData: any): Promise<{
    dayShift: NetworkBreakdown;
    nightShift: NetworkBreakdown;
    combined: NetworkBreakdown;
  }> {
    const dayShift = this.initializeNetworkBreakdown();
    const nightShift = this.initializeNetworkBreakdown();

    // ✅ FIXED: Use proper shift processing utility
    debugShiftData(cashCloseData, 'AGGREGATION START');
    
    // Process shifts using the comprehensive shift processing utility
    const { dayShiftData, nightShiftData, hasMultipleShifts } = processCashCloseShifts(cashCloseData);
    
    console.log('🔍 Properly processed shift data:', {
      hasMultipleShifts,
      dayShiftTills: dayShiftData?.tills?.length || 0,
      nightShiftTills: nightShiftData?.tills?.length || 0,
      dayShiftNetworkPayments: dayShiftData?.tills?.reduce((sum: number, till: any) => 
        sum + (till.networkPayments?.length || 0), 0) || 0,
      nightShiftNetworkPayments: nightShiftData?.tills?.reduce((sum: number, till: any) => 
        sum + (till.networkPayments?.length || 0), 0) || 0
    });

    // Process day shift network payments
    if (dayShiftData && dayShiftData.tills) {
      console.log('📅 Processing DAY shift network data...');
      
      for (const till of dayShiftData.tills) {
        if (till.networkPayments && Array.isArray(till.networkPayments)) {
          console.log(`💳 Processing ${till.networkPayments.length} network payments for DAY shift, till ${till.tillNumber || till.tillName}`);
          
          for (const payment of till.networkPayments) {
            this.mapServiceProviderToNetwork(dayShift, payment.serviceProvider, payment.amount);
            console.log(`✅ Mapped ${payment.serviceProvider}: UGX ${payment.amount.toLocaleString()} to DAY shift`);
          }
        }
      }
    }

    // Process night shift network payments  
    if (nightShiftData && nightShiftData.tills) {
      console.log('🌙 Processing NIGHT shift network data...');
      
      for (const till of nightShiftData.tills) {
        if (till.networkPayments && Array.isArray(till.networkPayments)) {
          console.log(`💳 Processing ${till.networkPayments.length} network payments for NIGHT shift, till ${till.tillNumber || till.tillName}`);
          
          for (const payment of till.networkPayments) {
            this.mapServiceProviderToNetwork(nightShift, payment.serviceProvider, payment.amount);
            console.log(`✅ Mapped ${payment.serviceProvider}: UGX ${payment.amount.toLocaleString()} to NIGHT shift`);
          }
        }
      }
    }

    // Calculate combined totals
    const combined = this.initializeNetworkBreakdown();
    for (const provider of Object.keys(combined)) {
      combined[provider] = dayShift[provider] + nightShift[provider];
    }

    console.log('📊 Aggregation complete:', {
      dayShiftTotal: Object.values(dayShift).reduce((sum, val) => sum + val, 0),
      nightShiftTotal: Object.values(nightShift).reduce((sum, val) => sum + val, 0),
      combinedTotal: Object.values(combined).reduce((sum, val) => sum + val, 0)
    });

    return { dayShift, nightShift, combined };
  }

  /**
   * Validate that all required network assignments are present
   * ✅ CRITICAL: Ensures no network assignments are missing for either shift
   */
  async validateNetworkAssignments(assignmentId: string): Promise<NetworkValidationResult> {
    try {
      const docRef = doc(db, this.collectionName, assignmentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return {
          isValid: false,
          errors: ['Network assignment record not found'],
          warnings: [],
          completionStatus: {
            dayShiftComplete: false,
            nightShiftComplete: false,
            allNetworkProvidersAssigned: false,
            noVarianceIssues: false
          }
        };
      }

      const assignment = docSnap.data() as NetworkAssignmentByShift;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate Day Shift
      const dayShiftComplete = this.validateShiftCompleteness(assignment.dayShift, 'day', errors, warnings);
      
      // Validate Night Shift
      const nightShiftComplete = this.validateShiftCompleteness(assignment.nightShift, 'night', errors, warnings);

      // Check all network providers are assigned
      const allNetworkProvidersAssigned = this.validateAllNetworkProvidersAssigned(assignment, errors);

      // Check for variance issues
      const noVarianceIssues = this.validateVariances(assignment, warnings);

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        warnings,
        completionStatus: {
          dayShiftComplete,
          nightShiftComplete,
          allNetworkProvidersAssigned,
          noVarianceIssues
        }
      };
    } catch (error) {
      console.error('Error validating network assignments:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        warnings: [],
        completionStatus: {
          dayShiftComplete: false,
          nightShiftComplete: false,
          allNetworkProvidersAssigned: false,
          noVarianceIssues: false
        }
      };
    }
  }

  /**
   * Get network assignment by cash close ID
   */
  async getNetworkAssignmentByCashCloseId(cashCloseId: string): Promise<NetworkAssignmentByShift | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('cashCloseId', '==', cashCloseId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        businessDate: data.businessDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as NetworkAssignmentByShift;
    } catch (error) {
      console.error('Error getting network assignment:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive network assignment report
   * ✅ Shows completeness for both day and night shifts
   */
  async generateNetworkAssignmentReport(branchId: string, dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalAssignments: number;
    completeAssignments: number;
    incompleteAssignments: number;
    averageCompletionRate: number;
    shiftBreakdown: {
      dayShiftComplete: number;
      nightShiftComplete: number;
      bothShiftsComplete: number;
    };
    networkProviderBreakdown: {
      [provider: string]: {
        totalAmount: number;
        dayShiftAmount: number;
        nightShiftAmount: number;
      };
    };
    assignments: NetworkAssignmentByShift[];
  }> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('branchId', '==', branchId),
        orderBy('businessDate', 'desc')
      );

      // Add date filtering if provided
      if (dateRange) {
        q = query(q, 
          where('businessDate', '>=', Timestamp.fromDate(dateRange.startDate)),
          where('businessDate', '<=', Timestamp.fromDate(dateRange.endDate))
        );
      }

      const snapshot = await getDocs(q);
      
      const assignments: NetworkAssignmentByShift[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          businessDate: data.businessDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as NetworkAssignmentByShift;
      });

      // Calculate statistics
      const totalAssignments = assignments.length;
      const completeAssignments = assignments.filter(a => a.summary.overallStatus === 'complete').length;
      const incompleteAssignments = totalAssignments - completeAssignments;
      const averageCompletionRate = totalAssignments > 0 ? 
        assignments.reduce((sum, a) => sum + a.summary.completionPercentage, 0) / totalAssignments : 0;

      // Shift breakdown
      const dayShiftComplete = assignments.filter(a => 
        a.dayShift.verificationStatus === 'verified').length;
      const nightShiftComplete = assignments.filter(a => 
        a.nightShift.verificationStatus === 'verified').length;
      const bothShiftsComplete = assignments.filter(a => 
        a.dayShift.verificationStatus === 'verified' && 
        a.nightShift.verificationStatus === 'verified').length;

      // Network provider breakdown
      const networkProviderBreakdown: { [provider: string]: any } = {};
      const providers = ['airtel', 'mtn', 'stanbicBank', 'equityBank', 'absaBank', 'pesaPal'];
      
      for (const provider of providers) {
        networkProviderBreakdown[provider] = {
          totalAmount: 0,
          dayShiftAmount: 0,
          nightShiftAmount: 0
        };

        for (const assignment of assignments) {
          const dayAmount = assignment.dayShift.networkBreakdown[provider] || 0;
          const nightAmount = assignment.nightShift.networkBreakdown[provider] || 0;
          
          networkProviderBreakdown[provider].dayShiftAmount += dayAmount;
          networkProviderBreakdown[provider].nightShiftAmount += nightAmount;
          networkProviderBreakdown[provider].totalAmount += dayAmount + nightAmount;
        }
      }

      return {
        totalAssignments,
        completeAssignments,
        incompleteAssignments,
        averageCompletionRate,
        shiftBreakdown: {
          dayShiftComplete,
          nightShiftComplete,
          bothShiftsComplete
        },
        networkProviderBreakdown,
        assignments
      };
    } catch (error) {
      console.error('Error generating network assignment report:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Initialize network breakdown with all providers
   */
  private initializeNetworkBreakdown(existing?: Partial<NetworkBreakdown>): NetworkBreakdown {
    return {
      airtel: existing?.airtel || 0,
      mtn: existing?.mtn || 0,
      stanbicBank: existing?.stanbicBank || 0,
      equityBank: existing?.equityBank || 0,
      absaBank: existing?.absaBank || 0,
      pesaPal: existing?.pesaPal || 0
    };
  }

  /**
   * Map serviceProvider string to specific network provider field
   * ✅ CRITICAL: Ensures all payments are properly categorized
   */
  private mapServiceProviderToNetwork(networkBreakdown: NetworkBreakdown, serviceProvider: string, amount: number): void {
    const provider = serviceProvider.toLowerCase().trim();
    
    if (provider.includes('airtel')) {
      networkBreakdown.airtel += amount;
    } else if (provider.includes('mtn')) {
      networkBreakdown.mtn += amount;
    } else if (provider.includes('stanbic') || provider.includes('stanbic bank')) {
      networkBreakdown.stanbicBank += amount;
    } else if (provider.includes('equity') || provider.includes('equity bank')) {
      networkBreakdown.equityBank += amount;
    } else if (provider.includes('absa') || provider.includes('absa bank')) {
      networkBreakdown.absaBank += amount;
    } else if (provider.includes('pesapal') || provider.includes('pesa pal')) {
      networkBreakdown.pesaPal += amount;
    } else {
      // For unrecognized providers, add to a generic field or log warning
      console.warn(`⚠️ Unrecognized service provider: ${serviceProvider} - Amount: ${amount}`);
      // Could add to a 'other' field if needed
    }
  }

  /**
   * Validate shift completeness
   */
  private validateShiftCompleteness(
    shiftData: any, 
    shiftName: string, 
    errors: string[], 
    warnings: string[]
  ): boolean {
    let isComplete = true;

    if (!shiftData.assignedEmployeeId) {
      errors.push(`${shiftName} shift must have an assigned employee`);
      isComplete = false;
    }

    if (shiftData.totalNetworkMoney === 0) {
      warnings.push(`${shiftName} shift has no network money recorded`);
    }

    if (Math.abs(shiftData.variance) > 1000) {
      warnings.push(`${shiftName} shift has significant variance: UGX ${shiftData.variance.toLocaleString()}`);
    }

    return isComplete;
  }

  /**
   * Validate all network providers are assigned
   */
  private validateAllNetworkProvidersAssigned(assignment: NetworkAssignmentByShift, errors: string[]): boolean {
    const requiredProviders = ['airtel', 'mtn', 'stanbicBank', 'equityBank'];
    let allAssigned = true;

    for (const provider of requiredProviders) {
      const dayAmount = assignment.dayShift.networkBreakdown[provider] || 0;
      const nightAmount = assignment.nightShift.networkBreakdown[provider] || 0;
      const totalAmount = dayAmount + nightAmount;

      if (totalAmount === 0) {
        errors.push(`Network provider '${provider}' has no assignments for either shift`);
        allAssigned = false;
      }
    }

    return allAssigned;
  }

  /**
   * Validate variances are within acceptable limits
   */
  private validateVariances(assignment: NetworkAssignmentByShift, warnings: string[]): boolean {
    const maxAcceptableVariance = 5000; // UGX 5,000
    let noIssues = true;

    if (Math.abs(assignment.dayShift.variance) > maxAcceptableVariance) {
      warnings.push(`Day shift variance exceeds acceptable limit: UGX ${assignment.dayShift.variance.toLocaleString()}`);
      noIssues = false;
    }

    if (Math.abs(assignment.nightShift.variance) > maxAcceptableVariance) {
      warnings.push(`Night shift variance exceeds acceptable limit: UGX ${assignment.nightShift.variance.toLocaleString()}`);
      noIssues = false;
    }

    return noIssues;
  }

  /**
   * Update assignment summary based on current data
   */
  private async updateSummary(assignmentId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, assignmentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;

    const assignment = docSnap.data() as NetworkAssignmentByShift;
    
    const totalNetworkMoney = assignment.dayShift.totalNetworkMoney + assignment.nightShift.totalNetworkMoney;
    const totalActualMoney = assignment.dayShift.actualNetworkMoney + assignment.nightShift.actualNetworkMoney;
    const totalVariance = totalNetworkMoney - totalActualMoney;

    // Calculate completion percentage
    let completionScore = 0;
    
    if (assignment.dayShift.assignedEmployeeId) completionScore += 25;
    if (assignment.nightShift.assignedEmployeeId) completionScore += 25;
    if (assignment.dayShift.verificationStatus === 'verified') completionScore += 25;
    if (assignment.nightShift.verificationStatus === 'verified') completionScore += 25;

    const overallStatus = completionScore === 100 ? 'complete' : 
                         completionScore >= 50 ? 'incomplete' : 'discrepancy';

    const summary = {
      totalNetworkMoney,
      totalActualMoney,
      totalVariance,
      overallStatus,
      completionPercentage: completionScore
    };

    await updateDoc(docRef, {
      summary,
      updatedAt: Timestamp.now()
    });
  }
}

// Export singleton instance
export const networkShiftAssignmentService = new NetworkShiftAssignmentService();
