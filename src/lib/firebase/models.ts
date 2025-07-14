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

// ==================== PERFORMANCE MANAGEMENT ====================

export interface PerformanceTarget {
  id: string;
  employeeId: string; // Reference to Employee
  targetName: string;
  description: string;
  targetType: TargetType;
  targetValue: number;
  unit: string; // e.g., 'scans', 'hours', 'percentage', 'items'
  targetPeriod: TargetPeriod;
  startDate: Timestamp;
  endDate: Timestamp;
  weightPercentage: number; // How much this target contributes to overall rating (0-100)
  isMandatory: boolean;
  createdByEmployeeId: string; // Reference to Employee
  status: TargetStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TargetType = 
  | 'ATTENDANCE_RATE' // Percentage of days present
  | 'PUNCTUALITY_SCORE' // On-time check-ins percentage
  | 'SCAN_TARGET' // Daily/weekly scan targets
  | 'HOURS_WORKED' // Total hours or average daily hours
  | 'SALES_TARGET' // For customer service/cashier roles
  | 'CUSTOMER_SERVICE_RATING' // Customer satisfaction
  | 'EFFICIENCY_SCORE' // Task completion rate
  | 'LEARNING_DEVELOPMENT' // Training completion
  | 'TEAMWORK_COLLABORATION' // Team projects/collaboration
  | 'INNOVATION_IMPROVEMENT' // Process improvements suggested
  | 'QUALITY_SCORE' // Work quality metrics
  | 'SAFETY_COMPLIANCE' // Safety protocol adherence
  | 'OVERTIME_MANAGEMENT' // Overtime efficiency
  | 'LEAVE_MANAGEMENT' // Appropriate leave usage
  | 'CUSTOM'; // Custom targets defined by managers

export type TargetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type TargetStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface PerformanceEvaluation {
  id: string;
  employeeId: string; // Reference to Employee
  evaluatorEmployeeId: string; // Reference to Employee
  evaluationPeriodStart: Timestamp;
  evaluationPeriodEnd: Timestamp;
  overallRating: PerformanceRating;
  overallScore: number; // Calculated weighted average (0-100)
  targetAchievements: TargetAchievement[];
  strengths: string[];
  areasForImprovement: string[];
  developmentGoals: string[];
  managerComments: string;
  employeeComments?: string;
  hrComments?: string;
  status: EvaluationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedByEmployeeDate?: Timestamp;
  reviewedByHrDate?: Timestamp;
  finalApprovalDate?: Timestamp;
}

export interface TargetAchievement {
  targetId: string;
  targetName: string;
  targetValue: number;
  achievedValue: number;
  achievementPercentage: number; // (achieved/target) * 100
  rating: PerformanceRating;
  notes?: string;
}

export type PerformanceRating = 
  | 'OUTSTANDING' // 90-100%
  | 'EXCEEDS_EXPECTATIONS' // 80-89%
  | 'MEETS_EXPECTATIONS' // 70-79%
  | 'BELOW_EXPECTATIONS' // 60-69%
  | 'UNSATISFACTORY'; // Below 60%

export type EvaluationStatus = 
  | 'DRAFT'
  | 'PENDING_EMPLOYEE_REVIEW'
  | 'PENDING_HR_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface PerformanceMetrics {
  id: string;
  employeeId: string; // Reference to Employee
  metricDate: Timestamp;
  targetId?: string; // Reference to specific target if applicable
  metricType: TargetType;
  value: number;
  notes?: string;
  recordedByEmployeeId: string; // Reference to Employee
  isAutoRecorded: boolean; // Whether this was automatically recorded by system
  createdAt: Timestamp;
}

export interface PerformanceDevelopmentPlan {
  id: string;
  employeeId: string; // Reference to Employee
  evaluationId: string; // Reference to the evaluation that created this plan
  goalTitle: string;
  goalDescription: string;
  targetCompletionDate: Timestamp;
  assignedByEmployeeId: string; // Reference to Employee
  priority: DevelopmentPriority;
  status: DevelopmentStatus;
  progressNotes: DevelopmentProgressNote[];
  resourcesRequired: string[];
  successCriteria: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface DevelopmentProgressNote {
  date: Timestamp;
  note: string;
  addedByEmployeeId: string; // Reference to Employee
  progressPercentage: number; // 0-100
}

export type DevelopmentPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type DevelopmentStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE';

export interface PerformanceReport {
  id: string;
  reportName: string;
  reportType: ReportType;
  generatedByEmployeeId: string; // Reference to Employee
  generationDate: Timestamp;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  includedEmployees: string[]; // Employee IDs
  includedBranches: string[]; // Branch IDs
  reportData: any; // JSON object containing the report data
  fileUrl?: string; // URL to generated PDF/Excel file
  createdAt: Timestamp;
}

export type ReportType = 
  | 'INDIVIDUAL_PERFORMANCE'
  | 'TEAM_PERFORMANCE'
  | 'BRANCH_PERFORMANCE'
  | 'DEPARTMENTAL_ANALYSIS'
  | 'TARGET_ACHIEVEMENT_SUMMARY'
  | 'DEVELOPMENT_PROGRESS'
  | 'PERFORMANCE_TRENDS';

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
  AUDIT_LOGS: 'auditLogs',
  // Performance Management Collections
  PERFORMANCE_TARGETS: 'performanceTargets',
  PERFORMANCE_EVALUATIONS: 'performanceEvaluations',
  PERFORMANCE_METRICS: 'performanceMetrics',
  PERFORMANCE_DEVELOPMENT_PLANS: 'performanceDevelopmentPlans',
  PERFORMANCE_REPORTS: 'performanceReports'
} as const;

// ==================== FIRESTORE SUBCOLLECTIONS ====================

// For better organization and querying, some related data can be stored as subcollections
export const SUBCOLLECTIONS = {
  EMPLOYEE_ATTENDANCE: 'attendance', // employees/{employeeId}/attendance
  EMPLOYEE_PAYROLL: 'payroll', // employees/{employeeId}/payroll
  EMPLOYEE_LEAVES: 'leaves', // employees/{employeeId}/leaves
  EMPLOYEE_PERFORMANCE_TARGETS: 'performanceTargets', // employees/{employeeId}/performanceTargets
  EMPLOYEE_PERFORMANCE_EVALUATIONS: 'performanceEvaluations', // employees/{employeeId}/performanceEvaluations
  EMPLOYEE_PERFORMANCE_METRICS: 'performanceMetrics', // employees/{employeeId}/performanceMetrics
  EMPLOYEE_DEVELOPMENT_PLANS: 'developmentPlans', // employees/{employeeId}/developmentPlans
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