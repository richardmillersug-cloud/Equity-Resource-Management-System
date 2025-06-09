import { Timestamp } from 'firebase/firestore';

// ==================== CORE ENTITIES ====================

export interface Branch {
  id: string;
  branchName: string;
  address: string;
  phoneNumber?: string;
  email?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNIN: string; // Unique
  email: string; // Unique
  phone?: string;
  address?: string;
  dateOfBirth?: Timestamp;
  hireDate: Timestamp;
  employeeSalary: number;
  employmentStatus: 'Active' | 'Inactive' | 'Terminated';
  branchId: string; // Reference to Branch
  nextOfKinName?: string;
  nextOfKinNIN?: string;
  nextOfKinPhoneNumber?: string;
  // Auth handled by Firebase Auth, no password field needed
  roles: JobRole[]; // Embedded job roles
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JobRole {
  jobRoleId: string;
  jobTitle: string;
  baseSalary: number;
  description?: string;
  assignedDate: Timestamp;
}

// ==================== FINANCIAL MANAGEMENT ====================

export interface CashAllocation {
  id: string;
  cashCloseTotal: number;
  savings: number; // 12% savings
  specialFunds: number;
  purchasingManager: number;
  notes?: string;
  allocationDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  accountantId: string; // Reference to Employee
  purchasingManagerId: string; // Reference to Employee
  status: 'pending' | 'acknowledged' | 'completed';
}

export interface FundAcknowledgment {
  id: string;
  actualAmountReceived: number;
  discrepancyAmount: number;
  isShortage: boolean;
  notes?: string;
  status: 'pending' | 'acknowledged' | 'disputed';
  acknowledgedAt: Timestamp;
  updatedAt: Timestamp;
  allocationId: string; // Reference to CashAllocation
  purchasingManagerId: string; // Reference to Employee
  accountantId?: string; // Reference to Employee
  fundType: 'purchasing' | 'special' | 'twelvePercent';
}

export interface SpecialFundsTracker {
  id: string;
  accountantId: string; // Reference to Employee
  specialFundsAllocated: number;
  specialFundsAcknowledged: number;
  savingsAllocated: number;
  savingsAcknowledged: number;
  lastUpdated: Timestamp;
  cashAllocationId?: string; // Reference to CashAllocation
}

export interface CashClose {
  id: string;
  employeeId: string; // Reference to Employee
  branchId: string; // Reference to Branch
  cashCloseDate: Timestamp;
  closeCashTime: Timestamp;
  shift: string;
  tillNumber: string;
  actualAmount: number;
  expectedAmount: number;
  // Payment method breakdowns
  cashPresent: number;
  airtel: number;
  stanbicBank: number;
  mtn: number;
  equityBank: number;
  absaBank: number;
  pesaPal: number;
  createdAt: Timestamp;
}

export interface Expense {
  id: string;
  employeeId: string; // Reference to Employee
  name: string;
  expenseDate: Timestamp;
  expenseTime: Timestamp;
  amount: number;
  note?: string;
  expenseType: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAY_TO_DAY';
  paidAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approvedBy?: string; // Reference to Employee
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CashInjection {
  id: string;
  date: Timestamp;
  amount: number;
  fromWhere: string;
  debt: boolean;
  employeeId: string; // Reference to Employee
  approvedBy?: string; // Reference to Employee
  status: 'pending' | 'approved' | 'processed';
  createdAt: Timestamp;
}

// ==================== SUPPLY CHAIN MANAGEMENT ====================

export interface Supplier {
  id: string;
  supplierName: string;
  tinNumber: string; // Unique
  dateOfRegistration: Timestamp;
  address?: string;
  emailAddress?: string;
  phoneNumber?: string;
  bankName?: string;
  accountNumber?: string;
  bankNumber?: string;
  employeeId: string; // Reference to Employee (managing employee)
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Invoice {
  id: string;
  date: Timestamp;
  amount: number;
  quantity: number;
  fdn: string; // Fiscal Document Number (Unique)
  supplierId?: string; // Reference to Supplier
  employeeId?: string; // Reference to Employee
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  shipping?: number;
  description: string;
  dueDate?: Timestamp;
  title: string;
  remainingBalance: number; // Calculated field
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  employeeId: string; // Reference to Employee
  invoiceId?: string; // Reference to Invoice
  supplierId?: string; // Reference to Supplier
  paymentDate: Timestamp;
  paymentTime: Timestamp;
  amount: number;
  paymentType: string;
  paymentMethod: 'Cash' | 'Airtel' | 'MTN' | 'StanbicBank' | 'EquityBank' | 'AbsaBank' | 'PesaPal';
  transactionId: string; // Unique
  createdAt: Timestamp;
}

export interface RestockItems {
  id: string;
  employeeId: string; // Reference to Employee
  productName: string;
  barcode?: string;
  currentStock: number;
  restockThreshold: number;
  restockQuantity: number;
  supplierId?: string; // Reference to Supplier
  invoiceId?: string; // Reference to Invoice
  status: 'requested' | 'approved' | 'ordered' | 'received' | 'cancelled';
  note?: string;
  costPerUnit: number;
  totalCost: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReturnNote {
  id: string;
  returnDate: Timestamp;
  quantity: number;
  amount: number;
  employeeId: string; // Reference to Employee
  supplierId: string; // Reference to Supplier
  invoiceId?: string; // Reference to Invoice
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  note?: string;
  items: ReturnItem[];
  totalReturnValue: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReturnItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reason: string;
}

export interface Damage {
  id: string;
  employeeId: string; // Reference to Employee
  invoiceId?: string; // Reference to Invoice
  status: 'reported' | 'investigated' | 'resolved';
  damageDate: Timestamp;
  quantity: number;
  amount: number;
  buyingPrice?: number;
  note?: string;
  itemName: string;
  unitCost: number;
  totalDamageCost: number;
  cause: string;
  branchId: string; // Reference to Branch
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== HUMAN RESOURCES ====================

export interface Attendance {
  id: string;
  employeeId: string; // Reference to Employee
  attendanceDate: Timestamp;
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  hoursWorked?: number;
  overtimeHours?: number;
  barcodeScanned?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Barcode {
  id: string;
  employeeId: string; // Reference to Employee
  name: string;
  barcodeNumber: string; // Unique
  barcodeDate: Timestamp;
  barcodeTime: Timestamp;
  createdAt: Timestamp;
}

export interface LeaveRequest {
  id: string;
  employeeId: string; // Reference to Employee
  leaveType: 'Annual' | 'Sick' | 'Maternity' | 'Paternity' | 'Emergency' | 'Unpaid';
  startDate: Timestamp;
  endDate: Timestamp;
  daysRequested: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reason: string;
  approvedBy?: string; // Reference to Employee
  approvalDate?: Timestamp;
  comments?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payroll {
  id: string;
  employeeId: string; // Reference to Employee
  payPeriodStart: Timestamp;
  payPeriodEnd: Timestamp;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  paymentDate: Timestamp;
  overtimePay: number;
  baseSalary: number;
  processedBy: string; // Reference to Employee
  status: 'draft' | 'processed' | 'paid';
  createdAt: Timestamp;
}

// ==================== AUDIT AND LOGGING ====================

export interface AuditLog {
  id: string;
  tableName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: string; // Reference to Employee
  timestamp: Timestamp;
  objectId: string;
  objectRepr?: string;
  changes?: Record<string, any>; // JSON object for changes
  ipAddress?: string;
  userAgent?: string;
}

// ==================== FIRESTORE COLLECTION NAMES ====================

export const COLLECTIONS = {
  BRANCHES: 'branches',
  EMPLOYEES: 'employees',
  CASH_ALLOCATIONS: 'cashAllocations',
  FUND_ACKNOWLEDGMENTS: 'fundAcknowledgments',
  SPECIAL_FUNDS_TRACKER: 'specialFundsTracker',
  CASH_CLOSES: 'cashCloses',
  EXPENSES: 'expenses',
  CASH_INJECTIONS: 'cashInjections',
  SUPPLIERS: 'suppliers',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  RESTOCK_ITEMS: 'restockItems',
  RETURN_NOTES: 'returnNotes',
  DAMAGES: 'damages',
  ATTENDANCE: 'attendance',
  BARCODES: 'barcodes',
  LEAVE_REQUESTS: 'leaveRequests',
  PAYROLL: 'payroll',
  AUDIT_LOGS: 'auditLogs'
} as const;

// ==================== FIRESTORE SUBCOLLECTIONS ====================

// For better organization and querying, some related data can be stored as subcollections
export const SUBCOLLECTIONS = {
  EMPLOYEE_ATTENDANCE: 'attendance', // employees/{employeeId}/attendance
  EMPLOYEE_PAYROLL: 'payroll', // employees/{employeeId}/payroll
  EMPLOYEE_LEAVES: 'leaves', // employees/{employeeId}/leaves
  SUPPLIER_INVOICES: 'invoices', // suppliers/{supplierId}/invoices
  SUPPLIER_PAYMENTS: 'payments', // suppliers/{supplierId}/payments
  INVOICE_PAYMENTS: 'payments', // invoices/{invoiceId}/payments
  BRANCH_CASH_CLOSES: 'cashCloses', // branches/{branchId}/cashCloses
  BRANCH_EMPLOYEES: 'employees' // branches/{branchId}/employees (for quick branch queries)
} as const;

// ==================== HELPER TYPES ====================

export type FirestoreTimestamp = Timestamp;

export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface PaginationOptions {
  limit?: number;
  startAfter?: any;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryFilters {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
  value: any;
}

// ==================== BUSINESS RULE TYPES ====================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BusinessRuleContext {
  currentUser: Employee;
  targetDocument: any;
  operation: 'create' | 'update' | 'delete';
  timestamp: Timestamp;
} 