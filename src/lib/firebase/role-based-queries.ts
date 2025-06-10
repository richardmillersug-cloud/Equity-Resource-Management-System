// =====================================================
// FIRESTORE ROLE-BASED QUERIES
// Retail / Supply Chain Management System
// =====================================================

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import { authService } from './auth';
import { 
  CashAllocation, 
  FundAcknowledgment, 
  Supplier, 
  RestockItems, 
  Expense, 
  Invoice, 
  ReturnNote, 
  Damage, 
  Employee, 
  Attendance, 
  LeaveRequest, 
  CashClose, 
  AuditLog,
  Branch
} from './models';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface DiscrepancyRecord {
  type: string;
  recordId: string;
  amount: number;
  description: string;
  date: Timestamp;
  responsiblePerson: string;
}

interface RestockItemWithPriority extends RestockItems {
  id: string;
  priority: string;
}

interface LeaveRequestWithCalculations extends LeaveRequest {
  id: string;
  totalDays: number;
  priority: string;
}

interface BranchWithId extends Branch {
  id: string;
}

interface SupplierWithId extends Supplier {
  id: string;
}

interface EmployeeWithId extends Employee {
  id: string;
}

interface InvoiceWithId extends Invoice {
  id: string;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export const getCurrentUserId = (): string | null => {
  const user = authService.getCurrentUser();
  return user?.uid || null;
};

export const getCurrentUserRole = (): string | null => {
  const user = authService.getCurrentUser();
  return user?.employee?.roles?.[0]?.jobTitle || null;
};

export const hasPermission = (action: string): boolean => {
  const role = getCurrentUserRole();
  if (!role) return false;

  const permissions: Record<string, string[]> = {
    'Admin': ['*'], // All permissions
    'Manager': ['VIEW_ALL_BRANCHES', 'VIEW_PERFORMANCE', 'MANAGE_EMPLOYEES'],
    'Accountant': ['CREATE_CASH_ALLOCATION', 'MANAGE_EXPENSES', 'VIEW_FINANCIAL_DATA'],
    'Purchase Manager': ['ACKNOWLEDGE_FUNDS', 'MANAGE_SUPPLIERS', 'MANAGE_RESTOCK'],
    'HR': ['MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_LEAVE'],
    'Stock Manager': ['MANAGE_INVENTORY', 'VIEW_DAMAGE_REPORTS'],
    'Receiver': ['MANAGE_DELIVERIES', 'PROCESS_RETURNS'],
    'Auditor': ['VIEW_AUDIT_TRAIL', 'VIEW_ALL_DATA']
  };

  const userPermissions = permissions[role] || [];
  return userPermissions.includes('*') || userPermissions.includes(action);
};

// =====================================================
// 1. PURCHASE MANAGER QUERIES
// =====================================================

export class PurchaseManagerQueries {
  // Fund Acknowledgments (Rule 2.1 - can only acknowledge their funds)
  static async getFundAcknowledgments() {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('ACKNOWLEDGE_FUNDS')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'fundAcknowledgments'),
      where('purchasingManagerId', '==', userId),
      where('fundType', '==', 'purchasing'),
      orderBy('acknowledgedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Suppliers they manage (Rule 5.2)
  static async getManagedSuppliers(): Promise<SupplierWithId[]> {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('MANAGE_SUPPLIERS')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'suppliers'),
      where('employeeId', '==', userId),
      orderBy('supplierName')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierWithId));
  }

  // Restock Items Management (Rule 7.1, 7.2)
  static async getRestockItems(): Promise<RestockItemWithPriority[]> {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('MANAGE_RESTOCK')) {
      throw new Error('Unauthorized access');
    }

    // First get suppliers managed by this user
    const suppliers = await this.getManagedSuppliers();
    const supplierIds = suppliers.map(s => s.id);

    if (supplierIds.length === 0) return [];

    const q = query(
      collection(db, 'restockItems'),
      where('supplierId', 'in', supplierIds),
      orderBy('currentStock')
    );

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RestockItemWithPriority));

    // Add priority calculation
    return items.map(item => ({
      ...item,
      priority: this.calculateStockPriority(item.currentStock, item.restockThreshold)
    }));
  }

  private static calculateStockPriority(currentStock: number, threshold: number): string {
    if (currentStock <= threshold) return 'URGENT';
    if (currentStock <= threshold * 1.5) return 'MEDIUM';
    return 'LOW';
  }

  // Real-time subscription for fund acknowledgments
  static subscribeFundAcknowledgments(callback: (data: any[]) => void) {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('ACKNOWLEDGE_FUNDS')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'fundAcknowledgments'),
      where('purchasingManagerId', '==', userId),
      where('fundType', '==', 'purchasing'),
      orderBy('acknowledgedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  }
}

// =====================================================
// 2. ACCOUNTANT QUERIES
// =====================================================

export class AccountantQueries {
  // Cash Allocations (Rule 1.1 - only accountants can create)
  static async getCashAllocations() {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('CREATE_CASH_ALLOCATION')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'cashAllocations'),
      where('accountantId', '==', userId),
      orderBy('allocationDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const allocations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Add validation calculations
    return allocations.map(allocation => ({
      ...allocation,
      allocationStatus: this.validateAllocationBalance(allocation),
      savingsValidation: this.validateSavingsPercentage(allocation)
    }));
  }

  // Special Funds Tracker (Rule 2.2)
  static async getSpecialFundsTracker() {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('VIEW_FINANCIAL_DATA')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'specialFundsTracker'),
      where('accountantId', '==', userId),
      orderBy('lastUpdated', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        specialFundsBalance: data.specialFundsAllocated - data.specialFundsAcknowledged,
        savingsBalance: data.savingsAllocated - data.savingsAcknowledged
      };
    });
  }

  // Expense Management (Rule 4.1, 4.2, 4.3)
  static async getExpenseManagement() {
    if (!hasPermission('MANAGE_EXPENSES')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'expenses'),
      where('amount', '>', 0), // Rule 4.3: Amount must be > 0
      orderBy('expenseDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        remainingBalance: data.amount - data.paidAmount,
        paymentStatus: this.calculatePaymentStatus(data.amount, data.paidAmount)
      };
    });
  }

  private static validateAllocationBalance(allocation: any): string {
    const total = allocation.savings + allocation.specialFunds + allocation.purchasingManager;
    return total === allocation.cashCloseTotal ? 'BALANCED' : 'UNBALANCED';
  }

  private static validateSavingsPercentage(allocation: any): string {
    const expectedSavings = allocation.cashCloseTotal * 0.12;
    return allocation.savings === expectedSavings ? 'CORRECT' : 'INCORRECT';
  }

  private static calculatePaymentStatus(amount: number, paidAmount: number): string {
    if (paidAmount === 0) return 'UNPAID';
    if (paidAmount < amount) return 'PARTIALLY_PAID';
    if (paidAmount === amount) return 'FULLY_PAID';
    return 'OVERPAID';
  }

  // Real-time subscription for cash allocations
  static subscribeCashAllocations(callback: (data: any[]) => void) {
    const userId = getCurrentUserId();
    if (!userId || !hasPermission('CREATE_CASH_ALLOCATION')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'cashAllocations'),
      where('accountantId', '==', userId),
      orderBy('allocationDate', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const allocations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const enrichedData = allocations.map(allocation => ({
        ...allocation,
        allocationStatus: this.validateAllocationBalance(allocation),
        savingsValidation: this.validateSavingsPercentage(allocation)
      }));
      callback(enrichedData);
    });
  }
}

// =====================================================
// 3. RECEIVER QUERIES
// =====================================================

export class ReceiverQueries {
  // Incoming Invoices and Deliveries
  static async getIncomingDeliveries() {
    if (!hasPermission('MANAGE_DELIVERIES')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['Pending', 'Partial']),
      orderBy('dueDate')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        daysUntilDue: this.calculateDaysUntilDue(data.dueDate),
        urgencyStatus: this.calculateUrgencyStatus(data.dueDate)
      };
    });
  }

  // Return Notes Management (Rule 7.3)
  static async getReturnNotes() {
    if (!hasPermission('PROCESS_RETURNS')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'returnNotes'),
      orderBy('returnDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private static calculateDaysUntilDue(dueDate: Timestamp): number {
    const now = new Date();
    const due = dueDate.toDate();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private static calculateUrgencyStatus(dueDate: Timestamp): string {
    const daysUntilDue = this.calculateDaysUntilDue(dueDate);
    if (daysUntilDue < 0) return 'OVERDUE';
    if (daysUntilDue <= 7) return 'DUE_SOON';
    return 'ON_TIME';
  }

  // Real-time subscription for incoming deliveries
  static subscribeIncomingDeliveries(callback: (data: any[]) => void) {
    if (!hasPermission('MANAGE_DELIVERIES')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['Pending', 'Partial']),
      orderBy('dueDate')
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          daysUntilDue: this.calculateDaysUntilDue(docData.dueDate),
          urgencyStatus: this.calculateUrgencyStatus(docData.dueDate)
        };
      });
      callback(data);
    });
  }
}

// =====================================================
// 4. STOCK MANAGER QUERIES
// =====================================================

export class StockManagerQueries {
  // Inventory Overview (Rule 7.1, 7.2)
  static async getInventoryOverview() {
    if (!hasPermission('MANAGE_INVENTORY')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'restockItems'),
      orderBy('currentStock')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        stockLevel: this.calculateStockLevel(data.currentStock, data.restockThreshold),
        suggestedReorder: this.calculateSuggestedReorder(data.currentStock, data.restockThreshold, data.restockQuantity)
      };
    }).sort((a, b) => this.getStockPriority(a.stockLevel) - this.getStockPriority(b.stockLevel));
  }

  // Damage Reports (Rule 7.4)
  static async getDamageReports() {
    if (!hasPermission('VIEW_DAMAGE_REPORTS')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'damages'),
      orderBy('damageDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        totalDamageValue: data.quantity * (data.buyingPrice || 0),
        daysAgo: this.calculateDaysAgo(data.damageDate)
      };
    });
  }

  private static calculateStockLevel(currentStock: number, threshold: number): string {
    if (currentStock === 0) return 'OUT_OF_STOCK';
    if (currentStock <= threshold) return 'CRITICAL';
    if (currentStock <= threshold * 1.5) return 'LOW';
    if (currentStock <= threshold * 2) return 'MEDIUM';
    return 'ADEQUATE';
  }

  private static calculateSuggestedReorder(currentStock: number, threshold: number, restockQuantity: number): number {
    return currentStock <= threshold ? restockQuantity : 0;
  }

  private static getStockPriority(stockLevel: string): number {
    const priorities = { 'OUT_OF_STOCK': 1, 'CRITICAL': 2, 'LOW': 3, 'MEDIUM': 4, 'ADEQUATE': 5 };
    return priorities[stockLevel as keyof typeof priorities] || 6;
  }

  private static calculateDaysAgo(date: Timestamp): number {
    const now = new Date();
    const damageDate = date.toDate();
    const diffTime = now.getTime() - damageDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Real-time subscription for inventory
  static subscribeInventoryOverview(callback: (data: any[]) => void) {
    if (!hasPermission('MANAGE_INVENTORY')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'restockItems'),
      orderBy('currentStock')
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          stockLevel: this.calculateStockLevel(docData.currentStock, docData.restockThreshold),
          suggestedReorder: this.calculateSuggestedReorder(docData.currentStock, docData.restockThreshold, docData.restockQuantity)
        };
      }).sort((a, b) => this.getStockPriority(a.stockLevel) - this.getStockPriority(b.stockLevel));
      callback(data);
    });
  }
}

// =====================================================
// 5. AUDITOR QUERIES
// =====================================================

export class AuditorQueries {
  // Comprehensive Audit Trail (Rule 13.1, 13.2, 13.3)
  static async getAuditTrail(limitCount: number = 100) {
    if (!hasPermission('VIEW_AUDIT_TRAIL')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Financial Discrepancies
  static async getFinancialDiscrepancies(): Promise<DiscrepancyRecord[]> {
    if (!hasPermission('VIEW_ALL_DATA')) {
      throw new Error('Unauthorized access');
    }

    const discrepancies: DiscrepancyRecord[] = [];

    // Fund acknowledgment discrepancies
    const fundAckQuery = query(
      collection(db, 'fundAcknowledgments'),
      where('discrepancyAmount', '!=', 0),
      orderBy('acknowledgedAt', 'desc')
    );

    const fundAckSnapshot = await getDocs(fundAckQuery);
    fundAckSnapshot.docs.forEach(doc => {
      const data = doc.data();
      discrepancies.push({
        type: 'Fund Acknowledgment',
        recordId: doc.id,
        amount: data.discrepancyAmount,
        description: data.notes || 'Fund acknowledgment discrepancy',
        date: data.acknowledgedAt,
        responsiblePerson: data.purchasingManagerId
      });
    });

    // Cash close variances
    const cashCloseQuery = query(
      collection(db, 'cashCloses'),
      orderBy('cashCloseDate', 'desc'),
      limit(50)
    );

    const cashCloseSnapshot = await getDocs(cashCloseQuery);
    cashCloseSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const variance = data.actualAmount - data.expectedAmount;
      if (variance !== 0) {
        discrepancies.push({
          type: 'Cash Close Variance',
          recordId: doc.id,
          amount: variance,
          description: 'Cash close variance',
          date: data.cashCloseDate,
          responsiblePerson: data.employeeId
        });
      }
    });

    return discrepancies.sort((a, b) => b.date.seconds - a.date.seconds);
  }

  // Real-time subscription for audit trail
  static subscribeAuditTrail(callback: (data: any[]) => void, limitCount: number = 50) {
    if (!hasPermission('VIEW_AUDIT_TRAIL')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  }
}

// =====================================================
// 6. HR QUERIES
// =====================================================

export class HRQueries {
  // Employee Management Overview (Rule 8.1-8.5)
  static async getEmployeeOverview(): Promise<EmployeeWithId[]> {
    if (!hasPermission('MANAGE_EMPLOYEES')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'employees'),
      orderBy('lastName')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as Employee;
      return {
        ...data,
        id: doc.id,
        yearsOfService: this.calculateYearsOfService(data.hireDate),
        statusCategory: data.employmentStatus.toUpperCase()
      } as EmployeeWithId;
    });
  }

  // Attendance Summary (Rule 10.1-10.4)
  static async getAttendanceSummary(months: number = 3) {
    if (!hasPermission('VIEW_ATTENDANCE')) {
      throw new Error('Unauthorized access');
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - months);

    const q = query(
      collection(db, 'attendances'),
      where('attendanceDate', '>=', Timestamp.fromDate(threeMonthsAgo)),
      orderBy('attendanceDate', 'desc')
    );

    const snapshot = await getDocs(q);
    const attendanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group by employee and calculate summary
    const summary = this.groupAttendanceByEmployee(attendanceData);
    return summary;
  }

  // Leave Requests Management
  static async getLeaveRequests(): Promise<LeaveRequestWithCalculations[]> {
    if (!hasPermission('MANAGE_LEAVE')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'leaveRequests'),
      orderBy('startDate')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as LeaveRequest;
      return {
        ...data,
        id: doc.id,
        totalDays: this.calculateLeaveDays(data.startDate, data.endDate),
        priority: this.calculateLeavePriority(data.status, data.startDate)
      };
    }).sort((a, b) => {
      // Sort by priority (pending first) then by start date
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return a.startDate.seconds - b.startDate.seconds;
    });
  }

  private static calculateYearsOfService(hireDate: Timestamp): number {
    const now = new Date();
    const hire = hireDate.toDate();
    return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }

  private static groupAttendanceByEmployee(attendanceData: any[]) {
    const grouped = attendanceData.reduce((acc, record) => {
      const employeeId = record.employeeId;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId,
          totalDays: 0,
          presentDays: 0,
          lateDays: 0,
          absentDays: 0,
          totalHours: 0,
          hoursCount: 0
        };
      }

      acc[employeeId].totalDays++;
      if (record.status === 'Present') acc[employeeId].presentDays++;
      if (record.status === 'Late') acc[employeeId].lateDays++;
      if (record.status === 'Absent') acc[employeeId].absentDays++;

      // Calculate hours worked if available
      if (record.checkInTime && record.checkOutTime) {
        const hours = (record.checkOutTime.seconds - record.checkInTime.seconds) / 3600;
        acc[employeeId].totalHours += hours;
        acc[employeeId].hoursCount++;
      }

      return acc;
    }, {});

    return Object.values(grouped).map((summary: any) => ({
      ...summary,
      attendanceRate: (summary.presentDays / summary.totalDays) * 100,
      avgHoursWorked: summary.hoursCount > 0 ? summary.totalHours / summary.hoursCount : 0
    }));
  }

  private static calculateLeaveDays(startDate: Timestamp, endDate: Timestamp): number {
    const start = startDate.toDate();
    const end = endDate.toDate();
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private static calculateLeavePriority(status: string, startDate: Timestamp): string {
    if (status !== 'Pending') return 'PROCESSED';
    
    const now = new Date();
    const start = startDate.toDate();
    const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilStart <= 7 ? 'URGENT' : 'NORMAL';
  }

  // Real-time subscription for leave requests
  static subscribeLeaveRequests(callback: (data: LeaveRequestWithCalculations[]) => void) {
    if (!hasPermission('MANAGE_LEAVE')) {
      throw new Error('Unauthorized access');
    }

    const q = query(
      collection(db, 'leaveRequests'),
      orderBy('startDate')
    );

          return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data() as LeaveRequest;
          return {
            ...docData,
            id: doc.id,
            totalDays: this.calculateLeaveDays(docData.startDate, docData.endDate),
            priority: this.calculateLeavePriority(docData.status, docData.startDate)
          };
        }).sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return a.startDate.seconds - b.startDate.seconds;
      });
      callback(data);
    });
  }
}

// =====================================================
// 7. MANAGER QUERIES
// =====================================================

export class ManagerQueries {
  // Branch Performance Dashboard
  static async getBranchPerformance() {
    if (!hasPermission('VIEW_PERFORMANCE')) {
      throw new Error('Unauthorized access');
    }

    const branches = await this.getAllBranches();
    const performance = [];

    for (const branch of branches) {
      const branchPerf = await this.calculateBranchPerformance(branch.id);
      performance.push({
        branchId: branch.id,
        branchName: branch.branchName,
        ...branchPerf
      });
    }

    return performance;
  }

  // Supplier Performance
  static async getSupplierPerformance() {
    if (!hasPermission('VIEW_PERFORMANCE')) {
      throw new Error('Unauthorized access');
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const suppliersQuery = query(collection(db, 'suppliers'));
    const suppliersSnapshot = await getDocs(suppliersQuery);
    
    const performance = [];

    for (const supplierDoc of suppliersSnapshot.docs) {
      const supplier = { id: supplierDoc.id, ...supplierDoc.data() } as SupplierWithId;
      const supplierPerf = await this.calculateSupplierPerformance(supplier.id, sixMonthsAgo);
      performance.push({
        supplierId: supplier.id,
        supplierName: supplier.supplierName,
        ...supplierPerf
      });
    }

    return performance;
  }

  private static async getAllBranches(): Promise<BranchWithId[]> {
    const q = query(collection(db, 'branches'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BranchWithId));
  }

  private static async calculateBranchPerformance(branchId: string) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Get employees for this branch
    const employeesQuery = query(
      collection(db, 'employees'),
      where('branchId', '==', branchId)
    );
    const employeesSnapshot = await getDocs(employeesQuery);
    const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeWithId));

    // Get cash closes for this branch (last month)
    const cashClosesQuery = query(
      collection(db, 'cashCloses'),
      where('branchId', '==', branchId),
      where('cashCloseDate', '>=', Timestamp.fromDate(oneMonthAgo))
    );
    const cashClosesSnapshot = await getDocs(cashClosesQuery);
    const cashCloses = cashClosesSnapshot.docs.map(doc => doc.data());

    // Calculate metrics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.employmentStatus === 'Active').length;
    const totalCashClosed = cashCloses.reduce((sum, cc) => sum + (cc.actualAmount || 0), 0);
    const cashCloseCount = cashCloses.length;

    return {
      totalEmployees,
      activeEmployees,
      totalCashClosed,
      cashCloseCount,
      netCashFlow: totalCashClosed // Simplified - would need expense data for accurate calculation
    };
  }

  private static async calculateSupplierPerformance(supplierId: string, since: Date) {
    // Get invoices for this supplier
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('supplierId', '==', supplierId),
      where('date', '>=', Timestamp.fromDate(since))
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceWithId));

    // Get payments for these invoices
    const invoiceIds = invoices.map(inv => inv.id);
    let totalPaid = 0;
    
    if (invoiceIds.length > 0) {
      // Note: Firestore doesn't support array queries > 10 items, so we'd need to batch this
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('invoiceId', 'in', invoiceIds.slice(0, 10)) // Limit to first 10 for demo
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      totalPaid = paymentsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    }

    const totalInvoiceValue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;

    return {
      totalInvoices: invoices.length,
      totalInvoiceValue,
      totalPaid,
      outstandingBalance: totalInvoiceValue - totalPaid,
      overdueInvoices
    };
  }
}

// =====================================================
// 8. ADMIN QUERIES
// =====================================================

export class AdminQueries {
  // System Overview
  static async getSystemOverview() {
    if (!hasPermission('*')) {
      throw new Error('Unauthorized access - Admin only');
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const collections = ['branches', 'employees', 'suppliers', 'invoices'];
    const overview = [];

    for (const collectionName of collections) {
      const totalQuery = query(collection(db, collectionName));
      const totalSnapshot = await getDocs(totalQuery);
      
      // For recent count, we need to check different date fields per collection
      let recentQuery;
      switch (collectionName) {
        case 'branches':
        case 'employees':
          recentQuery = query(
            collection(db, collectionName),
            where('createdAt', '>=', Timestamp.fromDate(oneMonthAgo))
          );
          break;
        case 'suppliers':
          recentQuery = query(
            collection(db, collectionName),
            where('dateOfRegistration', '>=', Timestamp.fromDate(oneMonthAgo))
          );
          break;
        case 'invoices':
          recentQuery = query(
            collection(db, collectionName),
            where('date', '>=', Timestamp.fromDate(oneMonthAgo))
          );
          break;
        default:
          recentQuery = totalQuery;
      }

      const recentSnapshot = await getDocs(recentQuery);

      overview.push({
        entityType: collectionName.charAt(0).toUpperCase() + collectionName.slice(1),
        totalCount: totalSnapshot.size,
        recentCount: recentSnapshot.size
      });
    }

    return overview;
  }

  // Security and Access Control
  static async getSecurityOverview() {
    if (!hasPermission('*')) {
      throw new Error('Unauthorized access - Admin only');
    }

    const employeesQuery = query(collection(db, 'employees'));
    const employeesSnapshot = await getDocs(employeesQuery);
    const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeWithId));

    const securityOverview = [];

    for (const employee of employees) {
      // Get last activity from audit logs
      const auditQuery = query(
        collection(db, 'auditLogs'),
        where('userId', '==', employee.id),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const auditSnapshot = await getDocs(auditQuery);
      const lastActivity = auditSnapshot.docs[0]?.data()?.timestamp || null;

      // Count total actions
      const actionsQuery = query(
        collection(db, 'auditLogs'),
        where('userId', '==', employee.id)
      );
      const actionsSnapshot = await getDocs(actionsQuery);

      securityOverview.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        employmentStatus: employee.employmentStatus,
        jobTitle: employee.roles?.[0]?.jobTitle || 'Unknown',
        accountCreated: employee.createdAt,
        lastActivity,
        totalActions: actionsSnapshot.size,
        activityLevel: this.calculateActivityLevel(lastActivity)
      });
    }

    return securityOverview;
  }

  private static calculateActivityLevel(lastActivity: Timestamp | null): string {
    if (!lastActivity) return 'INACTIVE';
    
    const now = new Date();
    const lastActivityDate = lastActivity.toDate();
    const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceActivity > 30) return 'INACTIVE';
    if (daysSinceActivity > 7) return 'LOW_ACTIVITY';
    return 'ACTIVE';
  }
}

// =====================================================
// EXPORT ALL QUERY CLASSES
// =====================================================

export const RoleBasedQueries = {
  PurchaseManager: PurchaseManagerQueries,
  Accountant: AccountantQueries,
  Receiver: ReceiverQueries,
  StockManager: StockManagerQueries,
  Auditor: AuditorQueries,
  HR: HRQueries,
  Manager: ManagerQueries,
  Admin: AdminQueries
}; 