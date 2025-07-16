import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  runTransaction,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentReference,
  CollectionReference,
} from 'firebase/firestore';

import { db } from './config';
import {
  Branch,
  Employee,
  CashAllocation,
  FundAcknowledgment,
  SpecialFundsTracker,
  CashClose,
  Expense,
  CashInjection,
  Supplier,
  Invoice,
  Payment,
  RestockItems,
  ReturnNote,
  Damage,
  Attendance,
  Barcode,
  LeaveRequest,
  Payroll,
  AuditLog,
  COLLECTIONS,
  SUBCOLLECTIONS,
  PaginationOptions,
  QueryFilters,
  ValidationResult,
  BusinessRuleContext
} from './models';

// ==================== BASE FIRESTORE SERVICE ====================

export class FirestoreService<T extends { id: string }> {
  protected collectionName: string;
  protected collectionRef: CollectionReference;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Create a new document
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(this.collectionRef, docData);
    return docRef.id;
  }

  // Get document by ID
  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  // Update document
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  // Delete document
  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  // Get all documents with optional filters and pagination
  async getAll(
    filters?: QueryFilters[],
    pagination?: PaginationOptions
  ): Promise<T[]> {
    let q = query(this.collectionRef);

    // Apply filters
    if (filters) {
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
    }

    // Apply ordering
    if (pagination?.orderBy) {
      q = query(q, orderBy(pagination.orderBy, pagination.orderDirection || 'asc'));
    }

    // Apply pagination
    if (pagination?.limit) {
      q = query(q, limit(pagination.limit));
    }

    if (pagination?.startAfter) {
      q = query(q, startAfter(pagination.startAfter));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  }

  // Real-time listener
  onSnapshot(
    callback: (data: T[]) => void,
    filters?: QueryFilters[],
    pagination?: PaginationOptions
  ): () => void {
    let q = query(this.collectionRef);

    // Apply filters
    if (filters) {
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
    }

    // Apply ordering
    if (pagination?.orderBy) {
      q = query(q, orderBy(pagination.orderBy, pagination.orderDirection || 'asc'));
    }

    // Apply pagination
    if (pagination?.limit) {
      q = query(q, limit(pagination.limit));
    }

    return onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
      callback(data);
    });
  }
}

// ==================== SPECIALIZED SERVICES ====================

export class BranchService extends FirestoreService<Branch> {
  constructor() {
    super(COLLECTIONS.BRANCHES);
  }

  async getBranchEmployees(branchId: string): Promise<Employee[]> {
    const employeeService = new EmployeeService();
    return employeeService.getAll([
      { field: 'branchId', operator: '==', value: branchId }
    ]);
  }

  async getBranchCashCloses(branchId: string, dateRange?: { start: Date; end: Date }): Promise<CashClose[]> {
    const cashCloseService = new CashCloseService();
    const filters: QueryFilters[] = [
      { field: 'branchId', operator: '==', value: branchId }
    ];

    if (dateRange) {
      filters.push(
        { field: 'cashCloseDate', operator: '>=', value: Timestamp.fromDate(dateRange.start) },
        { field: 'cashCloseDate', operator: '<=', value: Timestamp.fromDate(dateRange.end) }
      );
    }

    return cashCloseService.getAll(filters, { orderBy: 'cashCloseDate', orderDirection: 'desc' });
  }
}

export class EmployeeService extends FirestoreService<Employee> {
  constructor() {
    super(COLLECTIONS.EMPLOYEES);
  }

  async getByNIN(nin: string): Promise<Employee | null> {
    const employees = await this.getAll([
      { field: 'employeeNIN', operator: '==', value: nin }
    ]);
    return employees.length > 0 ? employees[0] : null;
  }

  async getByEmail(email: string): Promise<Employee | null> {
    const employees = await this.getAll([
      { field: 'email', operator: '==', value: email }
    ]);
    return employees.length > 0 ? employees[0] : null;
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return this.getAll([
      { field: 'employmentStatus', operator: '==', value: 'Active' }
    ]);
  }

  async getEmployeesByRole(jobTitle: string): Promise<Employee[]> {
    return this.getAll([
      { field: 'roles', operator: 'array-contains', value: { jobTitle } }
    ]);
  }

  async updateEmployeeRoles(employeeId: string, roles: Record<string, unknown>[]): Promise<void> {
    await this.update(employeeId, { roles });
  }
}

export class CashAllocationService extends FirestoreService<CashAllocation> {
  constructor() {
    super(COLLECTIONS.CASH_ALLOCATIONS);
  }

  async createAllocation(
    cashCloseTotal: number,
    accountantId: string,
    purchasingManagerId: string,
    notes?: string
  ): Promise<string> {
    // Calculate 12% savings
    const savings = cashCloseTotal * 0.12;
    const remainingAmount = cashCloseTotal - savings;
    
    // Default allocation (can be customized)
    const specialFunds = remainingAmount * 0.3;
    const purchasingManager = remainingAmount * 0.7;

    const allocation: Omit<CashAllocation, 'id' | 'createdAt' | 'updatedAt'> = {
      cashCloseTotal,
      savings,
      specialFunds,
      purchasingManager,
      notes,
      allocationDate: Timestamp.now(),
      accountantId,
      purchasingManagerId,
      status: 'pending'
    };

    return this.create(allocation);
  }

  async getPendingAllocations(purchasingManagerId: string): Promise<CashAllocation[]> {
    return this.getAll([
      { field: 'purchasingManagerId', operator: '==', value: purchasingManagerId },
      { field: 'status', operator: '==', value: 'pending' }
    ]);
  }

  async acknowledgeAllocation(allocationId: string): Promise<void> {
    await this.update(allocationId, { status: 'acknowledged' });
  }
}

export class InvoiceService extends FirestoreService<Invoice> {
  constructor() {
    super(COLLECTIONS.INVOICES);
  }

  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'remainingBalance'>): Promise<string> {
    const invoice = {
      ...invoiceData,
      remainingBalance: invoiceData.amount
    };
    return this.create(invoice);
  }

  async getByFDN(fdn: string): Promise<Invoice | null> {
    const invoices = await this.getAll([
      { field: 'fdn', operator: '==', value: fdn }
    ]);
    return invoices.length > 0 ? invoices[0] : null;
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = Timestamp.now();
    return this.getAll([
      { field: 'dueDate', operator: '<', value: now },
      { field: 'status', operator: '!=', value: 'Paid' }
    ]);
  }

  // REMOVED: Old payment status update logic
  // Use PurchasingManagerService.makeInvoicePayment() instead

  async getSupplierInvoices(supplierId: string): Promise<Invoice[]> {
    return this.getAll([
      { field: 'supplierId', operator: '==', value: supplierId }
    ], { orderBy: 'date', orderDirection: 'desc' });
  }
}

// REMOVED: Old PaymentService class
// Use PurchasingManagerService payment methods instead

export class SupplierService extends FirestoreService<Supplier> {
  constructor() {
    super(COLLECTIONS.SUPPLIERS);
  }

  async getByTIN(tinNumber: string): Promise<Supplier | null> {
    const suppliers = await this.getAll([
      { field: 'tinNumber', operator: '==', value: tinNumber }
    ]);
    return suppliers.length > 0 ? suppliers[0] : null;
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return this.getAll([
      { field: 'isActive', operator: '==', value: true }
    ]);
  }

  async deactivateSupplier(supplierId: string): Promise<void> {
    await this.update(supplierId, { isActive: false });
  }
}

export class ExpenseService extends FirestoreService<Expense> {
  constructor() {
    super(COLLECTIONS.EXPENSES);
  }

  async createExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    const expense = {
      ...expenseData,
      status: 'pending' as const
    };
    return this.create(expense);
  }

  async approveExpense(expenseId: string, approvedBy: string): Promise<void> {
    await this.update(expenseId, {
      status: 'approved',
      approvedBy
    });
  }

  async getExpensesByType(expenseType: Expense['expenseType']): Promise<Expense[]> {
    return this.getAll([
      { field: 'expenseType', operator: '==', value: expenseType }
    ], { orderBy: 'expenseDate', orderDirection: 'desc' });
  }

  async getPendingExpenses(): Promise<Expense[]> {
    return this.getAll([
      { field: 'status', operator: '==', value: 'pending' }
    ]);
  }
}

export class AttendanceService extends FirestoreService<Attendance> {
  constructor() {
    super(COLLECTIONS.ATTENDANCE);
  }

  async checkIn(employeeId: string, barcodeScanned?: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already checked in today
    const existingAttendance = await this.getAll([
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'attendanceDate', operator: '>=', value: Timestamp.fromDate(today) }
    ]);

    if (existingAttendance.length > 0) {
      throw new Error('Already checked in today');
    }

    const attendance: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId,
      attendanceDate: Timestamp.fromDate(today),
      checkInTime: Timestamp.now(),
      status: 'Present',
      barcodeScanned
    };

    return this.create(attendance);
  }

  async checkOut(employeeId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await this.getAll([
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'attendanceDate', operator: '>=', value: Timestamp.fromDate(today) }
    ]);

    if (attendance.length === 0) {
      throw new Error('No check-in record found for today');
    }

    const record = attendance[0];
    if (record.checkOutTime) {
      throw new Error('Already checked out today');
    }

    const checkOutTime = Timestamp.now();
    const hoursWorked = record.checkInTime 
      ? (checkOutTime.seconds - record.checkInTime.seconds) / 3600 
      : 0;

    await this.update(record.id, {
      checkOutTime,
      hoursWorked: Math.round(hoursWorked * 100) / 100
    });
  }

  async getEmployeeAttendance(
    employeeId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Attendance[]> {
    return this.getAll([
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'attendanceDate', operator: '>=', value: Timestamp.fromDate(startDate) },
      { field: 'attendanceDate', operator: '<=', value: Timestamp.fromDate(endDate) }
    ], { orderBy: 'attendanceDate', orderDirection: 'desc' });
  }
}

export class CashCloseService extends FirestoreService<CashClose> {
  constructor() {
    super(COLLECTIONS.CASH_CLOSES);
  }

  async createCashClose(cashCloseData: Omit<CashClose, 'id' | 'createdAt'>): Promise<string> {
    // Validate that all payment methods sum to actual amount
    const paymentMethodsTotal = 
      cashCloseData.cashPresent +
      cashCloseData.airtel +
      cashCloseData.stanbicBank +
      cashCloseData.mtn +
      cashCloseData.equityBank +
      cashCloseData.absaBank +
      cashCloseData.pesaPal;

    if (Math.abs(paymentMethodsTotal - cashCloseData.actualAmount) > 0.01) {
      throw new Error('Payment methods total does not match actual amount');
    }

    return this.create(cashCloseData);
  }

  async getBranchCashCloses(branchId: string, date?: Date): Promise<CashClose[]> {
    const filters: QueryFilters[] = [
      { field: 'branchId', operator: '==', value: branchId }
    ];

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filters.push(
        { field: 'cashCloseDate', operator: '>=', value: Timestamp.fromDate(startOfDay) },
        { field: 'cashCloseDate', operator: '<=', value: Timestamp.fromDate(endOfDay) }
      );
    }

    return this.getAll(filters, { orderBy: 'closeCashTime', orderDirection: 'desc' });
  }
}

// ==================== AUDIT SERVICE ====================

export class AuditService extends FirestoreService<AuditLog> {
  constructor() {
    super(COLLECTIONS.AUDIT_LOGS);
  }

  async logAction(
    tableName: string,
    actionType: AuditLog['actionType'],
    userId: string,
    objectId: string,
    changes?: Record<string, any>,
    objectRepr?: string
  ): Promise<void> {
    const auditLog: Omit<AuditLog, 'id'> = {
      tableName,
      actionType,
      userId,
      timestamp: Timestamp.now(),
      objectId,
      objectRepr,
      changes
    };

    await this.create(auditLog);
  }

  async getAuditTrail(objectId: string, tableName?: string): Promise<AuditLog[]> {
    const filters: QueryFilters[] = [
      { field: 'objectId', operator: '==', value: objectId }
    ];

    if (tableName) {
      filters.push({ field: 'tableName', operator: '==', value: tableName });
    }

    return this.getAll(filters, { orderBy: 'timestamp', orderDirection: 'desc' });
  }

  async getUserActivity(userId: string, limit?: number): Promise<AuditLog[]> {
    return this.getAll([
      { field: 'userId', operator: '==', value: userId }
    ], { 
      orderBy: 'timestamp', 
      orderDirection: 'desc',
      limit: limit || 50
    });
  }
}

// ==================== HR SERVICES ====================

export class PayrollService extends FirestoreService<Payroll> {
  constructor() {
    super(COLLECTIONS.PAYROLL);
  }

  async createPayroll(payrollData: Omit<Payroll, 'id' | 'createdAt'>): Promise<string> {
    // Validate that net salary is calculated correctly
    const calculatedNetSalary = payrollData.grossSalary - payrollData.deductions;
    if (Math.abs(calculatedNetSalary - payrollData.netSalary) > 0.01) {
      throw new Error('Net salary calculation is incorrect');
    }

    return this.create(payrollData);
  }

  async getEmployeePayroll(employeeId: string, year?: number, month?: number): Promise<Payroll[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId }
    ];

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filters.push(
        { field: 'payPeriodStart', operator: '>=', value: Timestamp.fromDate(startDate) },
        { field: 'payPeriodEnd', operator: '<=', value: Timestamp.fromDate(endDate) }
      );
    }

    return this.getAll(filters, { orderBy: 'payPeriodStart', orderDirection: 'desc' });
  }

  async getPayrollByStatus(status: Payroll['status']): Promise<Payroll[]> {
    return this.getAll([
      { field: 'status', operator: '==', value: status }
    ], { orderBy: 'payPeriodStart', orderDirection: 'desc' });
  }

  async processPayroll(payrollId: string, processedBy: string): Promise<void> {
    await this.update(payrollId, {
      status: 'processed',
      processedBy
    });
  }

  async markPayrollAsPaid(payrollId: string): Promise<void> {
    await this.update(payrollId, {
      status: 'paid',
      paymentDate: Timestamp.now()
    });
  }
}

export class LeaveRequestService extends FirestoreService<LeaveRequest> {
  constructor() {
    super(COLLECTIONS.LEAVE_REQUESTS);
  }

  async createLeaveRequest(leaveData: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    // Calculate days requested
    const startDate = leaveData.startDate.toDate();
    const endDate = leaveData.endDate.toDate();
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const leaveRequest: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      ...leaveData,
      daysRequested: daysDiff,
      status: 'Pending'
    };

    return this.create(leaveRequest);
  }

  async getEmployeeLeaveRequests(employeeId: string, status?: LeaveRequest['status']): Promise<LeaveRequest[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId }
    ];

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

    return this.getAll(filters, { orderBy: 'startDate', orderDirection: 'desc' });
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return this.getAll([
      { field: 'status', operator: '==', value: 'Pending' }
    ], { orderBy: 'startDate', orderDirection: 'asc' });
  }

  async approveLeaveRequest(leaveRequestId: string, approvedBy: string, comments?: string): Promise<void> {
    await this.update(leaveRequestId, {
      status: 'Approved',
      approvedBy,
      approvalDate: Timestamp.now(),
      comments
    });
  }

  async rejectLeaveRequest(leaveRequestId: string, approvedBy: string, comments: string): Promise<void> {
    await this.update(leaveRequestId, {
      status: 'Rejected',
      approvedBy,
      approvalDate: Timestamp.now(),
      comments
    });
  }

  async getLeaveBalance(employeeId: string, leaveType: LeaveRequest['leaveType'], year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const approvedLeaves = await this.getAll([
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'leaveType', operator: '==', value: leaveType },
      { field: 'status', operator: '==', value: 'Approved' },
      { field: 'startDate', operator: '>=', value: Timestamp.fromDate(startDate) },
      { field: 'endDate', operator: '<=', value: Timestamp.fromDate(endDate) }
    ]);

    const usedDays = approvedLeaves.reduce((total, leave) => total + leave.daysRequested, 0);
    
    // Default annual leave allocation (could be configurable)
    const annualAllocation = leaveType === 'Annual' ? 21 : 
                           leaveType === 'Sick' ? 7 : 
                           leaveType === 'Maternity' ? 84 : 
                           leaveType === 'Paternity' ? 4 : 0;

    return Math.max(0, annualAllocation - usedDays);
  }
}

export class BarcodeService extends FirestoreService<Barcode> {
  constructor() {
    super(COLLECTIONS.BARCODES);
  }

  async createBarcode(barcodeData: Omit<Barcode, 'id' | 'createdAt'>): Promise<string> {
    // Check if barcode number is unique
    const existingBarcode = await this.getAll([
      { field: 'barcodeNumber', operator: '==', value: barcodeData.barcodeNumber }
    ]);

    if (existingBarcode.length > 0) {
      throw new Error('Barcode number already exists');
    }

    return this.create(barcodeData);
  }

  async getEmployeeBarcodes(employeeId: string): Promise<Barcode[]> {
    return this.getAll([
      { field: 'employeeId', operator: '==', value: employeeId }
    ], { orderBy: 'barcodeDate', orderDirection: 'desc' });
  }

  async getByBarcodeNumber(barcodeNumber: string): Promise<Barcode | null> {
    const barcodes = await this.getAll([
      { field: 'barcodeNumber', operator: '==', value: barcodeNumber }
    ]);

    return barcodes.length > 0 ? barcodes[0] : null;
  }

  async generateBarcodeNumber(): Promise<string> {
    // Generate a unique barcode number
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `BC${timestamp}${random}`.toUpperCase();
  }
}

// ==================== TRANSACTION SERVICE ====================

export class TransactionService {
  async executeTransaction<T>(
    operation: (transaction: unknown) => Promise<T>
  ): Promise<T> {
    return runTransaction(db, operation);
  }

  async executeBatch(operations: (() => void)[]): Promise<void> {
    const batch = writeBatch(db);
    
    operations.forEach(operation => operation());
    
    await batch.commit();
  }
}

// ==================== EXPORT ALL SERVICES ====================

export const firestoreServices = {
  branch: new BranchService(),
  employee: new EmployeeService(),
  cashAllocation: new CashAllocationService(),
  invoice: new InvoiceService(),
  // payment: REMOVED - Use PurchasingManagerService instead
  supplier: new SupplierService(),
  expense: new ExpenseService(),
  attendance: new AttendanceService(),
  cashClose: new CashCloseService(),
  audit: new AuditService(),
  payroll: new PayrollService(),
  leaveRequest: new LeaveRequestService(),
  barcode: new BarcodeService(),
  transaction: new TransactionService()
}; 