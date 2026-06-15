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
  serverTimestamp,
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
  BusinessRuleContext,
  JobRole
} from './models';

// ==================== BASE FIRESTORE SERVICE ====================

export class FirestoreService<T extends { id: string }> {
  protected collectionName: string;
  protected collectionRef!: CollectionReference;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn(`FirestoreService for '${collectionName}' created on server side. Collection reference will be created lazily.`);
      return; // Don't create collection reference on server side
    }
    
    // Check if db is properly initialized
    if (!db) {
      console.error('Firestore database not initialized. Make sure Firebase is properly configured.');
      throw new Error('Firestore database not initialized');
    }
    
    try {
      this.collectionRef = collection(db, collectionName);
    } catch (error) {
      console.error(`Error creating collection reference for '${collectionName}':`, error);
      console.error('Database object:', db);
      throw error;
    }
  }

  // Lazy collection reference getter for server-side rendering compatibility
  protected getCollectionRef(): CollectionReference {
    if (!this.collectionRef) {
      console.log('🔧 Creating collection reference for:', this.collectionName);
      console.log('🗄️ Database object:', db);
      console.log('🔍 Database type:', typeof db);
      
      if (!db) {
        console.error('❌ Firestore database is null/undefined');
        throw new Error('Firestore database not initialized. Please refresh the page and try again.');
      }
      
      try {
        this.collectionRef = collection(db, this.collectionName);
        console.log('✅ Collection reference created successfully for:', this.collectionName);
      } catch (error) {
        console.error('❌ Error creating collection reference:', error);
        console.error('🗄️ DB object details:', {
          db,
          type: typeof db,
          constructor: db?.constructor?.name,
          isFirestore: db?._delegate ? 'Has _delegate' : 'No _delegate'
        });
        throw new Error(`Failed to create collection reference for ${this.collectionName}: ${(error as Error).message}`);
      }
    }
    return this.collectionRef;
  }

  // Clean data to remove undefined values before sending to Firestore
  protected cleanData(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.cleanData(item)).filter(item => item !== undefined);
    }

    if (typeof data === 'object' && data.constructor === Object) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanData(value);
        }
      }
      return cleaned;
    }

    return data;
  }

  // Create a new document
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docData = this.cleanData({
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const docRef = await addDoc(this.getCollectionRef(), docData);
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
    const cleanedData = this.cleanData({
      ...data,
      updatedAt: Timestamp.now()
    });
    await updateDoc(docRef, cleanedData);
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
    let q = query(this.getCollectionRef());

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
    let q = query(this.getCollectionRef());

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

  async updateEmployeeRoles(employeeId: string, roles: JobRole[]): Promise<void> {
    await this.update(employeeId, { roles });
  }
}

export class CashAllocationService extends FirestoreService<CashAllocation> {
  constructor() {
    super(COLLECTIONS.CASH_ALLOCATIONS);
  }

  async createAllocation(
    totalCashInTill: number,
    accountantId: string,
    purchasingManagerId: string,
    notes?: string,
    profitPercentage: number = 12
  ): Promise<string> {
    // Calculate profit as direct percentage of total cash in till
    const savings = totalCashInTill * (profitPercentage / 100);
    const remainingAmount = totalCashInTill - savings; // For Distribution = Total Cash in Till - Profit
    
    // Default allocation (can be customized)
    const specialFunds = remainingAmount * 0.3;
    const purchasingManager = remainingAmount * 0.7;

    const allocation: Omit<CashAllocation, 'id' | 'createdAt' | 'updatedAt'> = {
      cashCloseTotal: totalCashInTill,
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

  async createCashClose(cashCloseData: Omit<CashClose, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Validate shift data integrity
    this.validateCashCloseData(cashCloseData);

    // Clean the data to remove undefined values
    const cleanedData = this.cleanCashCloseData(cashCloseData);

    const enhancedData: Omit<CashClose, 'id' | 'createdAt'> = {
      ...cleanedData,
      updatedAt: serverTimestamp() as Timestamp,
      status: cleanedData.status || 'draft'
    };

    // Create the cash close record
    const cashCloseId = await this.create(enhancedData);

    // If status is 'submitted', automatically create expense records
    if (cleanedData.status === 'submitted') {
      await this.createExpenseRecords(cleanedData, cashCloseId);
    }

    return cashCloseId;
  }

  async updateCashClose(id: string, updates: Partial<CashClose>): Promise<void> {
    if (updates.shifts) {
      this.validateCashCloseData(updates as any);
    }

    // Clean the updates to remove undefined values
    const cleanedUpdates = this.cleanCashCloseData(updates);

    const enhancedUpdates = {
      ...cleanedUpdates,
      updatedAt: serverTimestamp() as Timestamp
    };

    return this.update(id, enhancedUpdates);
  }

  async approveCashClose(id: string, approvedBy: string): Promise<void> {
    // Update cash close status
    await this.update(id, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    });

    // Update related expense records to approved status
    await this.updateRelatedExpenses(id, 'approved', approvedBy);
  }

  async rejectCashClose(id: string, rejectedBy: string, rejectionReason: string): Promise<void> {
    // Update cash close status
    await this.update(id, {
      status: 'rejected',
      rejectionReason,
      updatedAt: serverTimestamp() as Timestamp
    });

    // Update related expense records to rejected status
    await this.updateRelatedExpenses(id, 'rejected', rejectedBy);
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

    return this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  async getPendingCashCloses(): Promise<CashClose[]> {
    const filters: QueryFilters[] = [
      { field: 'status', operator: '==', value: 'submitted' }
    ];

    return this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  async getCashClosesByEmployee(employeeId: string, limit?: number): Promise<CashClose[]> {
    const filters: QueryFilters[] = [
      { field: 'createdBy', operator: '==', value: employeeId }
    ];

    const options = { orderBy: 'createdAt', orderDirection: 'desc' } as any;
    if (limit) {
      options.limit = limit;
    }

    return this.getAll(filters, options);
  }

  private async createExpenseRecords(cashCloseData: Partial<CashClose>, cashCloseId: string): Promise<void> {
    const expenseService = new ExpenseService();
    const expensePromises: Promise<string>[] = [];

    for (const shift of cashCloseData.shifts || []) {
      for (const till of shift.tills) {
        for (const tillExpense of till.expenseDetails) {
          // Convert TillExpense to main Expense format
          const expenseRecord = {
            employeeId: tillExpense.employeeId,
            name: tillExpense.description,
            expenseDate: Timestamp.fromDate(tillExpense.expenseDate),
            expenseTime: Timestamp.fromDate(tillExpense.expenseTime),
            amount: tillExpense.amount,
            note: tillExpense.notes || undefined,
            expenseType: tillExpense.expenseType,
            paidAmount: tillExpense.paidAmount,
            status: tillExpense.status === 'approved' ? 'approved' as const : 
                   tillExpense.status === 'rejected' ? 'rejected' as const :
                   tillExpense.status === 'processing' ? 'paid' as const : 'pending' as const,
            approvedBy: tillExpense.approvedBy,
            
            // Enhanced fields from cash close integration
            tillExpenseId: tillExpense.id,
            cashCloseId: cashCloseId,
            tillNumber: tillExpense.tillNumber,
            shiftType: tillExpense.shiftType,
            category: tillExpense.category,
            vendor: tillExpense.vendor,
            receiptNumber: tillExpense.receiptNumber,
            dueDate: tillExpense.dueDate,
            tags: tillExpense.tags,
            department: tillExpense.department,
            projectCode: tillExpense.projectCode,
            priority: tillExpense.priority,
            paymentStatus: tillExpense.paymentStatus,
            approvalRequired: tillExpense.approvalRequired,
            remainingBalance: tillExpense.remainingBalance,
            fundingSource: tillExpense.fundingSource
          };

          // Clean expense record and create
          const cleanedExpenseRecord = this.cleanCashCloseData(expenseRecord);
          const promise = expenseService.create(cleanedExpenseRecord);
          expensePromises.push(promise);
        }
      }
    }

    // Wait for all expense records to be created
    try {
      await Promise.all(expensePromises);
      console.log(`Successfully created ${expensePromises.length} expense records for cash close ${cashCloseId}`);
    } catch (error) {
      console.error('Error creating expense records:', error);
      throw new Error('Failed to create expense records. Cash close was saved but expenses were not processed.');
    }
  }

  private async updateRelatedExpenses(cashCloseId: string, status: 'approved' | 'rejected', actionBy: string): Promise<void> {
    const expenseService = new ExpenseService();
    
    try {
      // Get all expenses related to this cash close
      const filters = [
        { field: 'cashCloseId', operator: '==', value: cashCloseId }
      ];
      
      const relatedExpenses = await expenseService.getAll(filters as any);
      
      // Update each expense
      const updatePromises = relatedExpenses.map(expense => {
        const updates: any = {
          status,
          updatedAt: serverTimestamp()
        };
        
        if (status === 'approved') {
          updates.approvedBy = actionBy;
        }
        
        return expenseService.update(expense.id, updates);
      });
      
      await Promise.all(updatePromises);
      console.log(`Successfully updated ${relatedExpenses.length} related expenses to ${status} status`);
    } catch (error) {
      console.error('Error updating related expenses:', error);
      throw new Error(`Failed to update related expense records to ${status} status`);
    }
  }

  private cleanCashCloseData(data: any): any {
    // Recursively remove undefined values from the object
    const cleanObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
      }

      if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = cleanObject(value);
          }
        }
        return cleaned;
      }

      return obj;
    };

    return cleanObject(data);
  }

  private validateCashCloseData(cashCloseData: Partial<CashClose>): void {
    if (!cashCloseData.shifts || cashCloseData.shifts.length === 0) {
      throw new Error('Cash close must have at least one shift');
    }

    for (const shift of cashCloseData.shifts) {
      if (!shift.tills || shift.tills.length === 0) {
        throw new Error(`Shift ${shift.shift} must have at least one till`);
      }

      for (const till of shift.tills) {
        // Validate network payments total matches expected
        const networkTotal = till.networkPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        if (Math.abs(networkTotal - (till.actualNetworkMoney || 0)) > 0.01) {
          throw new Error(`Till ${till.tillNumber} network payments total (${networkTotal}) does not match actual network money (${till.actualNetworkMoney || 0})`);
        }

        // Validate expense details total matches expenses
        const expenseTotal = till.expenseDetails?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
        if (Math.abs(expenseTotal - (till.expenses || 0)) > 0.01) {
          throw new Error(`Till ${till.tillNumber} expense details total (${expenseTotal}) does not match total expenses (${till.expenses || 0})`);
        }
      }
    }
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
    objectRepr?: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const auditLog: Omit<AuditLog, 'id'> = {
      tableName,
      actionType,
      userId,
      timestamp: Timestamp.now(),
      objectId,
      objectRepr,
      changes,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
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

// ==================== IMPORTED SALES INTERFACES ====================

export interface ProductSalesTransaction {
  id: string;
  productRef: string;
  productDescription: string;
  date: Date;
  time: string;
  netUnit: number;
  unitsSold: number;
  totalAmount: number;
  discount: number;
  branch: 'MAINSHOP' | 'SHOP2';
  importSessionId: string;
  importDate: Date;
  importedBy: string;
  source: 'csv_import';
}

export interface ImportedCashCloseRecord {
  id: string;
  date: Date;
  tillId: string;
  shift: 'day' | 'night';
  totalSales: number;
  cashAmount?: number;
  cardAmount?: number;
  mobileMoneyAmount?: number;
  branch?: string;
  cashier?: string;
  openingBalance?: number;
  closingBalance?: number;
  importSessionId: string;
  importDate: Date;
  importedBy: string;
  source: 'csv_import';
}

export interface ImportSession {
  id: string;
  fileName: string;
  importDate: Date;
  importedBy: string;
  recordCount: number;
  totalAmount: number;
  status: 'processing' | 'completed' | 'error';
  errors?: string[];
  metadata?: {
    dateRange: {
      start: Date;
      end: Date;
    };
    categories: string[];
    branches: string[];
  };
}

// Sales Analytics Collection - Stores processed analytics results
export interface SalesAnalyticsReport {
  id: string;
  reportName: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  // Monthly organization fields
  reportMonth: number; // 1-12
  reportYear: number; // e.g., 2025
  monthName: string; // e.g., "January"
  createdDate: Date;
  createdBy: string;
  fileSource: {
    fileName: string;
    fileSize: number;
    importSessionId?: string;
  };
  summary: {
    totalRevenue: number;
    totalUnits: number;
    totalTransactions: number;
    avgTransactionValue: number;
    uniqueProducts: number;
    reportPeriod?: string;
    reportMonth?: number; // 1-12
    reportYear?: number; // e.g., 2025
    monthName?: string; // e.g., "January"
    dateRange?: {
      start: string;
      end: string;
      daysCount: number;
    };
    printDate?: string;
  };
  topProducts: Array<{
    productRef: string;
    description: string;
    totalRevenue: number;
    totalUnits: number;
    avgUnitPrice: number;
    transactions: number;
    rank: number;
  }>;
  productPerformance: Array<{
    productRef: string;
    description: string;
    totalRevenue: number;
    totalUnits: number;
    avgUnitPrice: number;
    transactions: number;
  }>;
  branchComparison: {
    MAINSHOP: { revenue: number; units: number; transactions: number };
    SHOP2: { revenue: number; units: number; transactions: number };
  };
  timeAnalysis: {
    hourlyPattern: Record<number, number>;
    dailyTrends: Record<string, number>;
  };
  tags: string[]; // For categorization (e.g., 'monthly', 'quarterly', 'special-analysis')
  status: 'active' | 'archived';
}

// ==================== IMPORTED SALES SERVICE ====================

export class ImportedCashCloseService extends FirestoreService<ImportedCashCloseRecord> {
  constructor() {
    super('importedCashCloses');
  }

  async getByImportSession(sessionId: string): Promise<ImportedCashCloseRecord[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        where('importSessionId', '==', sessionId),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ImportedCashCloseRecord));
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<ImportedCashCloseRecord[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ImportedCashCloseRecord));
  }

  async getByBranch(branch: string): Promise<ImportedCashCloseRecord[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        where('branch', '==', branch),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ImportedCashCloseRecord));
  }

  async getByShift(shift: 'day' | 'night'): Promise<ImportedCashCloseRecord[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        where('shift', '==', shift),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ImportedCashCloseRecord));
  }

  async getByTill(tillId: string): Promise<ImportedCashCloseRecord[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        where('tillId', '==', tillId),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ImportedCashCloseRecord));
  }

  async bulkCreate(records: Omit<ImportedCashCloseRecord, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    
    records.forEach(record => {
      const docRef = doc(this.getCollectionRef());
      batch.set(docRef, {
        ...record,
        date: Timestamp.fromDate(record.date),
        importDate: Timestamp.fromDate(record.importDate)
      });
    });
    
    await batch.commit();
  }

  async getAllRecent(limitCount: number = 100): Promise<ImportedCashCloseRecord[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        orderBy('importDate', 'desc'),
        orderBy('date', 'desc'),
        limit(limitCount)
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ImportedCashCloseRecord));
  }

  async getDailySalesTotal(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const records = await this.getByDateRange(startOfDay, endOfDay);
    return records.reduce((total, record) => total + record.totalSales, 0);
  }

  async getShiftPerformance(startDate: Date, endDate: Date): Promise<{
    dayShift: { total: number; count: number; average: number };
    nightShift: { total: number; count: number; average: number };
  }> {
    const records = await this.getByDateRange(startDate, endDate);
    
    const dayShiftRecords = records.filter(r => r.shift === 'day');
    const nightShiftRecords = records.filter(r => r.shift === 'night');
    
    const dayTotal = dayShiftRecords.reduce((sum, r) => sum + r.totalSales, 0);
    const nightTotal = nightShiftRecords.reduce((sum, r) => sum + r.totalSales, 0);
    
    return {
      dayShift: {
        total: dayTotal,
        count: dayShiftRecords.length,
        average: dayShiftRecords.length > 0 ? dayTotal / dayShiftRecords.length : 0
      },
      nightShift: {
        total: nightTotal,
        count: nightShiftRecords.length,
        average: nightShiftRecords.length > 0 ? nightTotal / nightShiftRecords.length : 0
      }
    };
  }
}

// ==================== PRODUCT SALES SERVICE ====================

export class ProductSalesService extends FirestoreService<ProductSalesTransaction> {
  constructor() {
    super('productSales');
  }

  async getByImportSession(sessionId: string): Promise<ProductSalesTransaction[]> {
    const querySnapshot = await getDocs(
      query(
        this.getCollectionRef(),
        where('importSessionId', '==', sessionId),
        orderBy('date', 'desc'),
        orderBy('time', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ProductSalesTransaction));
  }

  async getByDateRange(startDate: Date, endDate: Date): Promise<ProductSalesTransaction[]> {
    const querySnapshot = await getDocs(
      query(
        collection(db, this.collectionName),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ProductSalesTransaction));
  }

  async getByProduct(productRef: string): Promise<ProductSalesTransaction[]> {
    const querySnapshot = await getDocs(
      query(
        collection(db, this.collectionName),
        where('productRef', '==', productRef),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ProductSalesTransaction));
  }

  async getByBranch(branch: 'MAINSHOP' | 'SHOP2'): Promise<ProductSalesTransaction[]> {
    const querySnapshot = await getDocs(
      query(
        collection(db, this.collectionName),
        where('branch', '==', branch),
        orderBy('date', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      importDate: doc.data().importDate?.toDate() || new Date()
    } as ProductSalesTransaction));
  }

  async bulkCreate(records: Omit<ProductSalesTransaction, 'id'>[]): Promise<void> {
    const batch = writeBatch(db);
    
    records.forEach(record => {
      const docRef = doc(collection(db, this.collectionName));
      batch.set(docRef, {
        ...record,
        date: Timestamp.fromDate(record.date),
        importDate: Timestamp.fromDate(record.importDate)
      });
    });
    
    await batch.commit();
  }

  async getProductPerformance(startDate: Date, endDate: Date): Promise<Array<{
    productRef: string;
    description: string;
    totalRevenue: number;
    totalUnits: number;
    transactions: number;
    avgUnitPrice: number;
  }>> {
    const transactions = await this.getByDateRange(startDate, endDate);
    
    const productMap = new Map();
    
    transactions.forEach(transaction => {
      const key = transaction.productRef;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productRef: transaction.productRef,
          description: transaction.productDescription,
          totalRevenue: 0,
          totalUnits: 0,
          transactions: 0,
          unitPrices: []
        });
      }
      
      const product = productMap.get(key);
      product.totalRevenue += transaction.totalAmount;
      product.totalUnits += transaction.unitsSold;
      product.transactions += 1;
      product.unitPrices.push(transaction.netUnit);
    });

    return Array.from(productMap.values()).map(product => ({
      productRef: product.productRef,
      description: product.description,
      totalRevenue: product.totalRevenue,
      totalUnits: product.totalUnits,
      transactions: product.transactions,
      avgUnitPrice: product.unitPrices.reduce((sum: number, price: number) => sum + price, 0) / product.unitPrices.length
    }));
  }

  async getBranchComparison(startDate: Date, endDate: Date): Promise<{
    MAINSHOP: { revenue: number; units: number; transactions: number };
    SHOP2: { revenue: number; units: number; transactions: number };
  }> {
    const transactions = await this.getByDateRange(startDate, endDate);
    
    const branchData = {
      MAINSHOP: { revenue: 0, units: 0, transactions: 0 },
      SHOP2: { revenue: 0, units: 0, transactions: 0 }
    };

    transactions.forEach(transaction => {
      if (transaction.branch === 'MAINSHOP' || transaction.branch === 'SHOP2') {
        branchData[transaction.branch].revenue += transaction.totalAmount;
        branchData[transaction.branch].units += transaction.unitsSold;
        branchData[transaction.branch].transactions += 1;
      }
    });

    return branchData;
  }
}

// ==================== IMPORT SESSION SERVICE ====================

export class ImportSessionService extends FirestoreService<ImportSession> {
  constructor() {
    super('importSessions');
  }

  async getByUser(userId: string): Promise<ImportSession[]> {
    const querySnapshot = await getDocs(
      query(
        collection(db, this.collectionName),
        where('importedBy', '==', userId),
        orderBy('importDate', 'desc'),
        limit(10)
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      importDate: doc.data().importDate?.toDate() || new Date(),
      metadata: doc.data().metadata ? {
        ...doc.data().metadata,
        dateRange: {
          start: doc.data().metadata.dateRange?.start?.toDate() || new Date(),
          end: doc.data().metadata.dateRange?.end?.toDate() || new Date()
        }
      } : undefined
    } as ImportSession));
  }

  async createWithTimestamp(session: Omit<ImportSession, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...session,
      importDate: Timestamp.fromDate(session.importDate),
      metadata: session.metadata ? {
        ...session.metadata,
        dateRange: {
          start: Timestamp.fromDate(session.metadata.dateRange.start),
          end: Timestamp.fromDate(session.metadata.dateRange.end)
        }
      } : undefined
    });
    
    return docRef.id;
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

// ==================== SALES ANALYTICS SERVICE ====================

export class SalesAnalyticsService extends FirestoreService<SalesAnalyticsReport> {
  constructor() {
    super('salesAnalytics');
  }

  async saveAnalyticsReport(
    analytics: any, // ProductAnalytics from the page
    fileName: string,
    fileSize: number,
    userId: string,
    importSessionId?: string
  ): Promise<string> {
    // Generate report name with month and year
    const monthName = analytics.summary.monthName || 'Unknown';
    const reportYear = analytics.summary.reportYear || new Date().getFullYear();
    const reportName = `${monthName} ${reportYear} - ${fileName.replace(/\.[^/.]+$/, "")}`;
    
    // Convert analytics to our storage format
    const report: Omit<SalesAnalyticsReport, 'id'> = {
      reportName,
      reportPeriod: {
        start: analytics.summary.dateRange?.start || 'Unknown',
        end: analytics.summary.dateRange?.end || 'Unknown'
      },
      // Monthly organization fields
      reportMonth: analytics.summary.reportMonth || new Date().getMonth() + 1,
      reportYear: analytics.summary.reportYear || new Date().getFullYear(),
      monthName: analytics.summary.monthName || 'Unknown',
      createdDate: new Date(),
      createdBy: userId,
      fileSource: {
        fileName,
        fileSize,
        importSessionId
      },
      summary: analytics.summary,
      topProducts: analytics.topProducts.map((product: any, index: number) => ({
        ...product,
        totalRevenue: product.totalRevenue || product.revenue,
        totalUnits: product.totalUnits || product.units,
        avgUnitPrice: product.avgUnitPrice || (product.totalRevenue / product.totalUnits),
        rank: index + 1
      })),
      productPerformance: analytics.productPerformance,
      branchComparison: analytics.branchComparison,
      timeAnalysis: analytics.timeAnalysis,
      tags: [
        'csv-import', 
        `${analytics.summary.reportYear || new Date().getFullYear()}`,
        `${monthName.toLowerCase()}-${analytics.summary.reportYear || new Date().getFullYear()}`,
        'monthly-report'
      ],
      status: 'active'
    };

    return await this.create(report);
  }

  async getReportsByDateRange(startDate: Date, endDate: Date): Promise<SalesAnalyticsReport[]> {
    const filters = [
      { field: 'createdDate', operator: '>=' as const, value: Timestamp.fromDate(startDate) },
      { field: 'createdDate', operator: '<=' as const, value: Timestamp.fromDate(endDate) }
    ];
    return await this.getAll(filters);
  }

  async getReportsByUser(userId: string): Promise<SalesAnalyticsReport[]> {
    const filters = [
      { field: 'createdBy', operator: '==' as const, value: userId }
    ];
    return await this.getAll(filters);
  }

  async getActiveReports(): Promise<SalesAnalyticsReport[]> {
    const filters = [
      { field: 'status', operator: '==' as const, value: 'active' }
    ];
    return await this.getAll(filters);
  }

  async archiveReport(reportId: string): Promise<void> {
    await this.update(reportId, { status: 'archived' });
  }

  async getTopProductsAcrossReports(limit: number = 10): Promise<any[]> {
    const reports = await this.getActiveReports();
    const productMap = new Map<string, {
      productRef: string;
      description: string;
      totalRevenue: number;
      totalUnits: number;
      reportCount: number;
    }>();

    // Aggregate data across all reports
    reports.forEach(report => {
      report.topProducts.forEach(product => {
        const key = product.productRef;
        if (productMap.has(key)) {
          const existing = productMap.get(key)!;
          existing.totalRevenue += product.totalRevenue;
          existing.totalUnits += product.totalUnits;
          existing.reportCount += 1;
        } else {
          productMap.set(key, {
            productRef: product.productRef,
            description: product.description,
            totalRevenue: product.totalRevenue,
            totalUnits: product.totalUnits,
            reportCount: 1
          });
        }
      });
    });

    // Convert to array and sort by revenue
    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  async getRevenueHistory(): Promise<{ date: string; revenue: number; units: number }[]> {
    const reports = await this.getActiveReports();
    return reports
      .sort((a, b) => a.createdDate.getTime() - b.createdDate.getTime())
      .map(report => ({
        date: report.createdDate.toLocaleDateString(),
        revenue: report.summary.totalRevenue,
        units: report.summary.totalUnits
      }));
  }

  // Monthly organization methods
  async getReportsByMonth(month: number, year: number): Promise<SalesAnalyticsReport[]> {
    const filters = [
      { field: 'reportMonth', operator: '==' as const, value: month },
      { field: 'reportYear', operator: '==' as const, value: year },
      { field: 'status', operator: '==' as const, value: 'active' }
    ];
    return await this.getAll(filters);
  }

  async getReportsByYear(year: number): Promise<SalesAnalyticsReport[]> {
    const filters = [
      { field: 'reportYear', operator: '==' as const, value: year },
      { field: 'status', operator: '==' as const, value: 'active' }
    ];
    return await this.getAll(filters);
  }

  async getMonthlyReportsGrouped(): Promise<Record<string, SalesAnalyticsReport[]>> {
    const reports = await this.getActiveReports();
    const grouped: Record<string, SalesAnalyticsReport[]> = {};
    
    reports.forEach(report => {
      const key = `${report.reportYear}-${report.reportMonth.toString().padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(report);
    });
    
    return grouped;
  }

  async getAvailableMonths(): Promise<Array<{ month: number; year: number; monthName: string; count: number }>> {
    const reports = await this.getActiveReports();
    const monthMap = new Map<string, { month: number; year: number; monthName: string; count: number }>();
    
    reports.forEach(report => {
      const key = `${report.reportYear}-${report.reportMonth}`;
      if (monthMap.has(key)) {
        monthMap.get(key)!.count++;
      } else {
        monthMap.set(key, {
          month: report.reportMonth,
          year: report.reportYear,
          monthName: report.monthName,
          count: 1
        });
      }
    });
    
    return Array.from(monthMap.values())
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
  }
}

// ==================== EXPORT ALL SERVICES ====================

// Lazy initialization to avoid Firebase initialization issues
let _services: any = {};

export const firestoreServices = {
  get branch() {
    if (!_services.branch) _services.branch = new BranchService();
    return _services.branch;
  },
  get employee() {
    if (!_services.employee) _services.employee = new EmployeeService();
    return _services.employee;
  },
  get cashAllocation() {
    if (!_services.cashAllocation) _services.cashAllocation = new CashAllocationService();
    return _services.cashAllocation;
  },
  get invoice() {
    if (!_services.invoice) _services.invoice = new InvoiceService();
    return _services.invoice;
  },
  // payment: REMOVED - Use PurchasingManagerService instead
  get supplier() {
    if (!_services.supplier) _services.supplier = new SupplierService();
    return _services.supplier;
  },
  get expense() {
    if (!_services.expense) _services.expense = new ExpenseService();
    return _services.expense;
  },
  get attendance() {
    if (!_services.attendance) _services.attendance = new AttendanceService();
    return _services.attendance;
  },
  get cashClose() {
    if (!_services.cashClose) _services.cashClose = new CashCloseService();
    return _services.cashClose;
  },
  get audit() {
    if (!_services.audit) _services.audit = new AuditService();
    return _services.audit;
  },
  get payroll() {
    if (!_services.payroll) _services.payroll = new PayrollService();
    return _services.payroll;
  },
  get leaveRequest() {
    if (!_services.leaveRequest) _services.leaveRequest = new LeaveRequestService();
    return _services.leaveRequest;
  },
  get barcode() {
    if (!_services.barcode) _services.barcode = new BarcodeService();
    return _services.barcode;
  },
  get importedCashClose() {
    if (!_services.importedCashClose) _services.importedCashClose = new ImportedCashCloseService();
    return _services.importedCashClose;
  },
  get productSales() {
    if (!_services.productSales) _services.productSales = new ProductSalesService();
    return _services.productSales;
  },
  get importSession() {
    if (!_services.importSession) _services.importSession = new ImportSessionService();
    return _services.importSession;
  },
  get salesAnalytics() {
    if (!_services.salesAnalytics) _services.salesAnalytics = new SalesAnalyticsService();
    return _services.salesAnalytics;
  },
  get transaction() {
    if (!_services.transaction) _services.transaction = new TransactionService();
    return _services.transaction;
  }
}; 