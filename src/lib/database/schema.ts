// Database Schema for Multi-Branch Retail/Supply Chain Management System

export interface Branch {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
  manager_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Employee {
  id: string;
  nin: string; // National Identification Number (unique)
  email: string; // unique
  first_name: string;
  last_name: string;
  phone?: string;
  role: EmployeeRole;
  branch_id: string;
  salary?: number;
  hire_date: Date;
  is_active: boolean;
  working_section?: string; // For customer service employees - supermarket section
  passport_photo?: string; // URL to passport-sized photo
  passport_photo_filename?: string; // Original filename
  passport_photo_uploaded_at?: Date; // Upload timestamp
  created_at: Date;
  updated_at: Date;
}

export enum EmployeeRole {
  ADMIN = 'ADMIN',
  HR = 'HR',
  ACCOUNTANT = 'ACCOUNTANT',
  ACCOUNTANT_OPS = 'ACCOUNTANT_OPS',
  PURCHASING_MANAGER = 'PURCHASING_MANAGER',
  STOCK_MANAGER = 'STOCK_MANAGER',
  RECEIVER = 'RECEIVER',
  SUPERVISOR = 'SUPERVISOR',
  MANAGING_DIRECTOR = 'MANAGING_DIRECTOR'
}

export interface Supplier {
  id: string;
  name: string;
  tin: string; // Tax Identification Number (unique)
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  bank_name?: string;
  bank_account?: string;
  managed_by_employee_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  fdn: string; // Fiscal Document Number (unique)
  supplier_id: string;
  amount: number;
  due_date: Date;
  invoice_date: Date;
  description?: string;
  status: InvoiceStatus;
  remaining_balance: number;
  created_by_employee_id: string;
  created_at: Date;
  updated_at: Date;
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FULLY_PAID = 'FULLY_PAID',
  OVERDUE = 'OVERDUE'
}

export interface Payment {
  id: string;
  transaction_id: string; // unique
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: Date;
  processed_by_employee_id: string;
  notes?: string;
  created_at: Date;
}

export enum PaymentMethod {
  CASH = 'CASH',
  AIRTEL = 'AIRTEL',
  MTN = 'MTN',
  STANBIC_BANK = 'STANBIC_BANK',
  EQUITY_BANK = 'EQUITY_BANK',
  ABSA_BANK = 'ABSA_BANK',
  PESAPAL = 'PESAPAL'
}

export interface CashAllocation {
  id: string;
  allocation_type: AllocationType;
  amount: number;
  allocated_by_accountant_id: string;
  allocated_to_employee_id: string;
  allocation_date: Date;
  description?: string;
  status: AllocationStatus;
  created_at: Date;
  updated_at: Date;
}

export enum AllocationType {
  PURCHASING_MANAGER_FUNDS = 'PURCHASING_MANAGER_FUNDS',
  SPECIAL_FUNDS = 'SPECIAL_FUNDS',
  TWELVE_PERCENT_SAVINGS = 'TWELVE_PERCENT_SAVINGS'
}

export enum AllocationStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  REJECTED = 'REJECTED'
}

export interface FundAcknowledgment {
  id: string;
  cash_allocation_id: string;
  acknowledged_by_employee_id: string;
  acknowledgment_date: Date;
  amount_acknowledged: number;
  notes?: string;
  created_at: Date;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  employee_id: string;
  expense_date: Date;
  status: ExpenseStatus;
  paid_amount: number;
  remaining_balance: number;
  approved_by_employee_id?: string;
  created_at: Date;
  updated_at: Date;
}

export enum ExpenseCategory {
  GENERAL = 'GENERAL',
  URA = 'URA',
  EMERGENCIES = 'EMERGENCIES',
  DAY_TO_DAY = 'DAY_TO_DAY'
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FULLY_PAID = 'FULLY_PAID',
  REJECTED = 'REJECTED'
}

export interface CashClose {
  id: string;
  branch_id: string;
  close_date: Date;
  cash_amount: number;
  airtel_amount: number;
  mtn_amount: number;
  stanbic_amount: number;
  equity_amount: number;
  absa_amount: number;
  pesapal_amount: number;
  total_amount: number;
  closed_by_employee_id: string;
  notes?: string;
  created_at: Date;
}

export interface CashInjection {
  id: string;
  branch_id: string;
  amount: number;
  injection_date: Date;
  source: string;
  injected_by_employee_id: string;
  approved_by_employee_id?: string;
  notes?: string;
  created_at: Date;
}

export interface SpecialFundsTracker {
  id: string;
  fund_name: string;
  allocated_amount: number;
  used_amount: number;
  remaining_balance: number;
  allocation_date: Date;
  allocated_by_employee_id: string;
  purpose: string;
  status: FundStatus;
  created_at: Date;
  updated_at: Date;
}

export enum FundStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface RestockItems {
  id: string;
  item_name: string;
  current_stock: number;
  minimum_threshold: number;
  restock_quantity: number;
  supplier_id: string;
  requested_by_employee_id: string;
  request_date: Date;
  status: RestockStatus;
  cost_per_unit: number;
  total_cost: number;
  created_at: Date;
  updated_at: Date;
}

export enum RestockStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export interface ReturnNote {
  id: string;
  supplier_id: string;
  return_date: Date;
  items: ReturnItem[];
  total_return_value: number;
  reason: string;
  processed_by_employee_id: string;
  status: ReturnStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ReturnItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  reason: string;
}

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED'
}

export interface Damage {
  id: string;
  item_name: string;
  quantity_damaged: number;
  unit_cost: number;
  total_damage_cost: number;
  damage_date: Date;
  cause: string;
  reported_by_employee_id: string;
  branch_id: string;
  status: DamageStatus;
  created_at: Date;
  updated_at: Date;
}

export enum DamageStatus {
  REPORTED = 'REPORTED',
  INVESTIGATED = 'INVESTIGATED',
  RESOLVED = 'RESOLVED'
}

export interface Attendance {
  id: string;
  employee_id: string;
  check_in_time: Date;
  check_out_time?: Date;
  date: Date;
  barcode_scan?: string;
  hours_worked?: number;
  overtime_hours?: number;
  shift_start_total_scans?: number;
  shift_end_total_scans?: number;
  total_scans_during_shift?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Payroll {
  id: string;
  employee_id: string;
  pay_period_start: Date;
  pay_period_end: Date;
  base_salary: number;
  overtime_pay: number;
  deductions: number;
  net_pay: number;
  processed_date: Date;
  processed_by_employee_id: string;
  status: PayrollStatus;
  created_at: Date;
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  PROCESSED = 'PROCESSED',
  PAID = 'PAID'
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: Date;
  end_date: Date;
  days_requested: number;
  reason: string;
  status: LeaveStatus;
  approved_by_employee_id?: string;
  approval_date?: Date;
  comments?: string;
  created_at: Date;
  updated_at: Date;
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  EMERGENCY = 'EMERGENCY',
  UNPAID = 'UNPAID'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Business Logic Constraints and Validation Rules
export interface BusinessRules {
  // Financial Controls
  validateCashAllocation: (allocation: CashAllocation, employee: Employee) => boolean;
  validatePaymentAmount: (payment: Payment, invoice: Invoice) => boolean;
  validateExpenseApproval: (expense: Expense, approver: Employee) => boolean;
  
  // Access Control
  canCreateCashAllocation: (employee: Employee) => boolean;
  canAcknowledgeFunds: (employee: Employee, allocation: CashAllocation) => boolean;
  canProcessPayment: (employee: Employee) => boolean;
  
  // Data Integrity
  validateUniqueConstraints: (entity: unknown, field: string, value: unknown) => boolean;
  validateReferentialIntegrity: (entity: Record<string, unknown>) => boolean;
  validateBusinessLogicConstraints: (entity: Record<string, unknown>) => boolean;
} 