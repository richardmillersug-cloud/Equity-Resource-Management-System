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
  validateUniqueConstraints: (entity: any, field: string, value: any) => boolean;
  validateReferentialIntegrity: (entity: any) => boolean;
  validateBusinessLogicConstraints: (entity: any) => boolean;
  
  // Performance Management
  canCreatePerformanceTarget: (employee: Employee) => boolean;
  canEvaluateEmployee: (evaluator: Employee, targetEmployee: Employee) => boolean;
  validatePerformanceRating: (rating: PerformanceRating) => boolean;
}

// ==================== PERFORMANCE MANAGEMENT ====================

export interface PerformanceTarget {
  id: string;
  employee_id: string;
  target_name: string;
  description: string;
  target_type: TargetType;
  target_value: number;
  unit: string; // e.g., 'scans', 'hours', 'percentage', 'items'
  target_period: TargetPeriod;
  start_date: Date;
  end_date: Date;
  weight_percentage: number; // How much this target contributes to overall rating (0-100)
  is_mandatory: boolean;
  created_by_employee_id: string;
  status: TargetStatus;
  created_at: Date;
  updated_at: Date;
}

export enum TargetType {
  ATTENDANCE_RATE = 'ATTENDANCE_RATE', // Percentage of days present
  PUNCTUALITY_SCORE = 'PUNCTUALITY_SCORE', // On-time check-ins percentage
  SCAN_TARGET = 'SCAN_TARGET', // Daily/weekly scan targets
  HOURS_WORKED = 'HOURS_WORKED', // Total hours or average daily hours
  SALES_TARGET = 'SALES_TARGET', // For customer service/cashier roles
  CUSTOMER_SERVICE_RATING = 'CUSTOMER_SERVICE_RATING', // Customer satisfaction
  EFFICIENCY_SCORE = 'EFFICIENCY_SCORE', // Task completion rate
  LEARNING_DEVELOPMENT = 'LEARNING_DEVELOPMENT', // Training completion
  TEAMWORK_COLLABORATION = 'TEAMWORK_COLLABORATION', // Team projects/collaboration
  INNOVATION_IMPROVEMENT = 'INNOVATION_IMPROVEMENT', // Process improvements suggested
  QUALITY_SCORE = 'QUALITY_SCORE', // Work quality metrics
  SAFETY_COMPLIANCE = 'SAFETY_COMPLIANCE', // Safety protocol adherence
  OVERTIME_MANAGEMENT = 'OVERTIME_MANAGEMENT', // Overtime efficiency
  LEAVE_MANAGEMENT = 'LEAVE_MANAGEMENT', // Appropriate leave usage
  CUSTOM = 'CUSTOM' // Custom targets defined by managers
}

export enum TargetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export enum TargetStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

export interface PerformanceEvaluation {
  id: string;
  employee_id: string;
  evaluator_employee_id: string;
  evaluation_period_start: Date;
  evaluation_period_end: Date;
  overall_rating: PerformanceRating;
  overall_score: number; // Calculated weighted average (0-100)
  target_achievements: TargetAchievement[];
  strengths: string[];
  areas_for_improvement: string[];
  development_goals: string[];
  manager_comments: string;
  employee_comments?: string;
  hr_comments?: string;
  status: EvaluationStatus;
  created_at: Date;
  updated_at: Date;
  reviewed_by_employee_date?: Date;
  reviewed_by_hr_date?: Date;
  final_approval_date?: Date;
}

export interface TargetAchievement {
  target_id: string;
  target_name: string;
  target_value: number;
  achieved_value: number;
  achievement_percentage: number; // (achieved/target) * 100
  rating: PerformanceRating;
  notes?: string;
}

export enum PerformanceRating {
  OUTSTANDING = 'OUTSTANDING', // 90-100%
  EXCEEDS_EXPECTATIONS = 'EXCEEDS_EXPECTATIONS', // 80-89%
  MEETS_EXPECTATIONS = 'MEETS_EXPECTATIONS', // 70-79%
  BELOW_EXPECTATIONS = 'BELOW_EXPECTATIONS', // 60-69%
  UNSATISFACTORY = 'UNSATISFACTORY' // Below 60%
}

export enum EvaluationStatus {
  DRAFT = 'DRAFT',
  PENDING_EMPLOYEE_REVIEW = 'PENDING_EMPLOYEE_REVIEW',
  PENDING_HR_REVIEW = 'PENDING_HR_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface PerformanceMetrics {
  id: string;
  employee_id: string;
  metric_date: Date;
  target_id?: string; // Reference to specific target if applicable
  metric_type: TargetType;
  value: number;
  notes?: string;
  recorded_by_employee_id: string;
  is_auto_recorded: boolean; // Whether this was automatically recorded by system
  created_at: Date;
}

export interface PerformanceDevelopmentPlan {
  id: string;
  employee_id: string;
  evaluation_id: string; // Reference to the evaluation that created this plan
  goal_title: string;
  goal_description: string;
  target_completion_date: Date;
  assigned_by_employee_id: string;
  priority: DevelopmentPriority;
  status: DevelopmentStatus;
  progress_notes: DevelopmentProgressNote[];
  resources_required: string[];
  success_criteria: string[];
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface DevelopmentProgressNote {
  date: Date;
  note: string;
  added_by_employee_id: string;
  progress_percentage: number; // 0-100
}

export enum DevelopmentPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum DevelopmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

export interface PerformanceReport {
  id: string;
  report_name: string;
  report_type: ReportType;
  generated_by_employee_id: string;
  generation_date: Date;
  period_start: Date;
  period_end: Date;
  included_employees: string[]; // Employee IDs
  included_branches: string[]; // Branch IDs
  report_data: any; // JSON object containing the report data
  file_url?: string; // URL to generated PDF/Excel file
  created_at: Date;
}

export enum ReportType {
  INDIVIDUAL_PERFORMANCE = 'INDIVIDUAL_PERFORMANCE',
  TEAM_PERFORMANCE = 'TEAM_PERFORMANCE',
  BRANCH_PERFORMANCE = 'BRANCH_PERFORMANCE',
  DEPARTMENTAL_ANALYSIS = 'DEPARTMENTAL_ANALYSIS',
  TARGET_ACHIEVEMENT_SUMMARY = 'TARGET_ACHIEVEMENT_SUMMARY',
  DEVELOPMENT_PROGRESS = 'DEVELOPMENT_PROGRESS',
  PERFORMANCE_TRENDS = 'PERFORMANCE_TRENDS'
} 