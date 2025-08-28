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
  workingSection?: string; // For customer service employees - supermarket section
  nextOfKinName?: string;
  nextOfKinNIN?: string;
  nextOfKinPhoneNumber?: string;
  passportPhoto?: string; // URL to passport-sized photo
  passportPhotoFilename?: string; // Original filename
  passportPhotoUploadedAt?: Timestamp; // Upload timestamp
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
  // Document Metadata
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  branchId: string;
  cashCloseDate: Timestamp;
  
  // Global Settings
  profitPercentage: number;
  taxRate: number; // 18% tax
  notes: string;
  
  // Shift Data
  shifts: ShiftData[];
  
  // Calculated Totals
  totalRevenue: number;
  totalCashInTill: number; // Combined cash + network money before subtractions
  totalNetworkPayments: number;
  totalExpectedCash: number; // Expected physical cash only
  totalActualCash: number; // Actual physical cash present
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

// Supporting interfaces for CashClose
export interface TillNetworkPayment {
  id: string;
  paymentMethod: 'mobile' | 'visa_machine';
  serviceProvider: string; // For mobile: 'airtel', 'mtn', etc. For visa: bank names
  amount: number;
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
  tillNumber: number;
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
  tillNumber: number;
  tillName?: string; // Optional till name for identification
  
  // Core Cash Fields
  cashAmount: number; // Physical cash in till
  tillUsed: number; // Amount used before cash close
  expenses: number; // Total expenses per till (calculated from expenseDetails)
  expenseDetails: TillExpense[]; // Detailed expense records for this till
  cashAtHand: number; // Actual cash present
  totalCashInTill: number; // Total physical cash in the till at close
  
  // Network Money Tracking
  expectedNetworkMoney: number; // Expected network money for this till
  actualNetworkMoney: number; // Actual network money recorded for this till
  networkPayments: TillNetworkPayment[]; // Network payments specific to this till
  
  // Till Metadata
  tillOperator?: string;
  tillLocation?: string;
  tillNotes?: string;
}

export interface ShiftData {
  shift: 'day' | 'night';
  tills: TillData[];
  
  // Shift Metadata
  shiftStartTime?: Timestamp;
  shiftEndTime?: Timestamp;
  shiftSupervisor?: string;
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
  
  // Enhanced fields from cash close integration
  tillExpenseId?: string; // Reference to original till expense
  cashCloseId?: string; // Reference to source cash close
  tillNumber?: number; // Which till this came from
  shiftType?: 'day' | 'night'; // Which shift
  category?: string; // Free text category
  vendor?: string; // Vendor/supplier
  receiptNumber?: string; // Receipt reference
  dueDate?: Date; // When payment is due
  tags?: string[]; // Categorization tags
  department?: string; // Department
  projectCode?: string; // Project reference
  priority?: 'urgent' | 'high' | 'medium' | 'low'; // Priority level
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID' | 'OVERDUE'; // Payment tracking
  approvalRequired?: boolean; // Whether approval is needed
  remainingBalance?: number; // Outstanding amount
  fundingSource?: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT'; // Funding source for payment allocation
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

export interface Delivery {
  id: string;
  supplierId: string; // Reference to Supplier
  receiverId: string; // Reference to Employee (receiver)
  scheduledDate: Timestamp;
  scheduledTime: string; // Time in HH:MM format
  actualDeliveryDate?: Timestamp;
  status: 'scheduled' | 'in-transit' | 'delivered' | 'delayed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  totalValue: number;
  itemCount: number;
  contactPerson: string;
  contactPhone: string;
  deliveryItems: DeliveryItem[];
  notes?: string;
  trackingNumber?: string;
  urgent: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeliveryItem {
  itemName: string;
  quantity: number;
  category: string;
  unitPrice?: number;
  totalValue?: number;
  description?: string;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  barcode?: string;
  category: string;
  currentStock: number;
  restockThreshold: number;
  maxStock?: number;
  unitCost: number;
  sellingPrice?: number;
  supplierId?: string; // Reference to Supplier
  branchId: string; // Reference to Branch
  location?: string; // Storage location
  lastRestocked?: Timestamp;
  averageUsage: number; // Average daily/weekly usage
  status: 'active' | 'discontinued' | 'out-of-stock';
  expiryDate?: Timestamp;
  batchNumber?: string;
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
  shiftStartTotalScans?: number;
  shiftEndTotalScans?: number;
  totalScansDuringShift?: number;
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
  startAfter?: unknown;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryFilters {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
  value: unknown;
}

// ==================== BUSINESS RULE TYPES ====================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BusinessRuleContext {
  currentUser: Employee;
  targetDocument: unknown;
  operation: 'create' | 'update' | 'delete';
  timestamp: Timestamp;
} 