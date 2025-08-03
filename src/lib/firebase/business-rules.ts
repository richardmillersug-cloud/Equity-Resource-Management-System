import { Timestamp } from 'firebase/firestore';
// import {
//   Employee,
//   CashAllocation,
//   FundAcknowledgment,
//   Invoice,
//   Payment,
//   Expense,
//   Supplier,
//   ValidationResult,
//   BusinessRuleContext,
// } from './models';
import { firestoreServices } from './firestore-service';

// ==================== ROLE-BASED ACCESS CONTROL ====================

export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  ACCOUNTANT = 'accountant',
  ACCOUNTANT_OPERATIONS = 'accountant_operations',
  PURCHASING_MANAGER = 'purchasing_manager',
  STOCK_MANAGER = 'stock_manager',
  SUPERVISOR = 'supervisor',
  RECEIVER = 'receiver',
  USER = 'user'
}

export interface RolePermissions {
  canManageCash: boolean;
  canManageInvoices: boolean;
  canManageSuppliers: boolean;
  canManageEmployees: boolean;
  canManagePayroll: boolean;
  canViewReports: boolean;
  canAdminSystem: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.ADMIN]: {
    canManageCash: true,
    canManageInvoices: true,
    canManageSuppliers: true,
    canManageEmployees: true,
    canManagePayroll: true,
    canViewReports: true,
    canAdminSystem: true
  },
  [UserRole.HR]: {
    canManageCash: false,
    canManageInvoices: false,
    canManageSuppliers: false,
    canManageEmployees: true,
    canManagePayroll: true,
    canViewReports: true,
    canAdminSystem: false
  },
  [UserRole.ACCOUNTANT]: {
    canManageCash: true,
    canManageInvoices: true,
    canManageSuppliers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: true,
    canAdminSystem: false
  },
  [UserRole.ACCOUNTANT_OPERATIONS]: {
    canManageCash: true,
    canManageInvoices: true,
    canManageSuppliers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: true,
    canAdminSystem: false
  },
  [UserRole.PURCHASING_MANAGER]: {
    canManageCash: false,
    canManageInvoices: true,
    canManageSuppliers: true,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: true,
    canAdminSystem: false
  },
  [UserRole.STOCK_MANAGER]: {
    canManageCash: false,
    canManageInvoices: false,
    canManageSuppliers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: true,
    canAdminSystem: false
  },
  [UserRole.SUPERVISOR]: {
    canManageCash: false,
    canManageInvoices: false,
    canManageSuppliers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: true,
    canAdminSystem: false
  },
  [UserRole.RECEIVER]: {
    canManageCash: false,
    canManageInvoices: true,
    canManageSuppliers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: false,
    canAdminSystem: false
  },
  [UserRole.USER]: {
    canManageCash: false,
    canManageInvoices: false,
    canManageSuppliers: false,
    canManageEmployees: false,
    canManagePayroll: false,
    canViewReports: false,
    canAdminSystem: false
  }
};

// ==================== BUSINESS RULES ENGINE ====================

export class FirebaseBusinessRules {
  
  // ==================== UTILITY METHODS ====================
  
  private getUserRoles(employee: Employee): UserRole[] {
    return employee.roles.map(role => {
      const roleTitle = role.jobTitle.toLowerCase().replace(/\s+/g, '_');
      return roleTitle as UserRole;
    });
  }

  private hasRole(employee: Employee, requiredRole: UserRole): boolean {
    const userRoles = this.getUserRoles(employee);
    return userRoles.includes(requiredRole);
  }

  private hasAnyRole(employee: Employee, requiredRoles: UserRole[]): boolean {
    const userRoles = this.getUserRoles(employee);
    return requiredRoles.some(role => userRoles.includes(role));
  }

  private getUserPermissions(employee: Employee): RolePermissions {
    const userRoles = this.getUserRoles(employee);
    
    // Combine permissions from all roles (OR operation)
    const combinedPermissions: RolePermissions = {
      canManageCash: false,
      canManageInvoices: false,
      canManageSuppliers: false,
      canManageEmployees: false,
      canManagePayroll: false,
      canViewReports: false,
      canAdminSystem: false
    };

    userRoles.forEach(role => {
      const rolePermissions = ROLE_PERMISSIONS[role];
      if (rolePermissions) {
        Object.keys(combinedPermissions).forEach(key => {
          if (rolePermissions[key as keyof RolePermissions]) {
            combinedPermissions[key as keyof RolePermissions] = true;
          }
        });
      }
    });

    return combinedPermissions;
  }

  // ==================== FINANCIAL MANAGEMENT RULES ====================

  async validateCashAllocation(
    allocation: Omit<CashAllocation, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1.1: Only accountants can create cash allocations
    if (!this.hasAnyRole(currentUser, [UserRole.ACCOUNTANT, UserRole.ACCOUNTANT_OPERATIONS])) {
      errors.push('Only accountants can create cash allocations');
    }

    // Rule 1.2: Must include at least one fund type
    if (allocation.savings <= 0 && allocation.specialFunds <= 0 && allocation.purchasingManager <= 0) {
      errors.push('Cash allocation must include at least one fund type');
    }

    // Rule 1.3: 12% savings is mandatory
    const expectedSavings = allocation.cashCloseTotal * 0.12;
    if (Math.abs(allocation.savings - expectedSavings) > 0.01) {
      warnings.push(`Savings should be 12% of cash close total (${expectedSavings.toFixed(2)})`);
    }

    // Rule 1.5: Total allocation cannot exceed cash close total
    const totalAllocation = allocation.savings + allocation.specialFunds + allocation.purchasingManager;
    if (totalAllocation > allocation.cashCloseTotal) {
      errors.push(`Total allocation (${totalAllocation}) exceeds cash close total (${allocation.cashCloseTotal})`);
    }

    // Validate purchasing manager exists and has correct role
    const purchasingManager = await firestoreServices.employee.getById(allocation.purchasingManagerId);
    if (!purchasingManager) {
      errors.push('Purchasing manager not found');
    } else if (!this.hasRole(purchasingManager, UserRole.PURCHASING_MANAGER)) {
      errors.push('Assigned employee is not a purchasing manager');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateFundAcknowledgment(
    acknowledgment: Omit<FundAcknowledgment, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get the related cash allocation
    const allocation = await firestoreServices.cashAllocation.getById(acknowledgment.allocationId);
    if (!allocation) {
      errors.push('Related cash allocation not found');
      return { isValid: false, errors, warnings };
    }

    // Rule 2.1: Purchasing managers can only acknowledge funds allocated to them
    if (acknowledgment.fundType === 'purchasing') {
      if (currentUser.id !== allocation.purchasingManagerId) {
        errors.push('Only the assigned purchasing manager can acknowledge these funds');
      }
    }

    // Rule 2.2: Accountants can acknowledge special funds and 12% savings
    if (acknowledgment.fundType === 'special' || acknowledgment.fundType === 'twelvePercent') {
      if (!this.hasAnyRole(currentUser, [UserRole.ACCOUNTANT, UserRole.ACCOUNTANT_OPERATIONS])) {
        errors.push('Only accountants can acknowledge special funds and savings');
      }
    }

    // Rule 2.3: Actual amount cannot exceed allocated amount by more than 5%
    let allocatedAmount = 0;
    switch (acknowledgment.fundType) {
      case 'purchasing':
        allocatedAmount = allocation.purchasingManager;
        break;
      case 'special':
        allocatedAmount = allocation.specialFunds;
        break;
      case 'twelvePercent':
        allocatedAmount = allocation.savings;
        break;
    }

    const maxAllowedAmount = allocatedAmount * 1.05;
    if (acknowledgment.actualAmountReceived > maxAllowedAmount) {
      errors.push(`Actual amount received (${acknowledgment.actualAmountReceived}) exceeds allocated amount by more than 5%`);
    }

    // Rule 2.4: Discrepancies above 1% require mandatory notes
    const discrepancyPercentage = Math.abs(acknowledgment.discrepancyAmount) / allocatedAmount;
    if (discrepancyPercentage > 0.01 && !acknowledgment.notes) {
      errors.push('Discrepancies above 1% require mandatory notes');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validatePayment(
    payment: Omit<Payment, 'id' | 'createdAt'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 3.1: Payment amount cannot exceed invoice remaining balance
    if (payment.invoiceId) {
      const invoice = await firestoreServices.invoice.getById(payment.invoiceId);
      if (!invoice) {
        errors.push('Invoice not found');
      } else if (payment.amount > invoice.remainingBalance) {
        errors.push(`Payment amount (${payment.amount}) exceeds remaining balance (${invoice.remainingBalance})`);
      }
    }

    // Rule 3.3: All payments require valid transaction ID
    if (!payment.transactionId || payment.transactionId.trim().length === 0) {
      errors.push('Payment requires a valid transaction ID');
    }

    // Rule 3.4: Payment method must be from approved list
    const approvedMethods = ['Cash', 'Airtel', 'MTN', 'StanbicBank', 'EquityBank', 'AbsaBank', 'PesaPal'];
    if (!approvedMethods.includes(payment.paymentMethod)) {
      errors.push(`Payment method must be one of: ${approvedMethods.join(', ')}`);
    }

    // Validate positive amount
    if (payment.amount <= 0) {
      errors.push('Payment amount must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateExpense(
    expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 4.3: Expense amount must be positive and non-zero
    if (expense.amount <= 0) {
      errors.push('Expense amount must be positive and non-zero');
    }

    // Rule 4.1: Expense types have different approval workflows
    const permissions = this.getUserPermissions(currentUser);
    
    switch (expense.expenseType) {
      case 'URA':
        if (!permissions.canManageCash) {
          warnings.push('URA expenses require finance manager approval');
        }
        break;
      case 'GENERAL':
        if (!permissions.canViewReports) {
          warnings.push('General expenses require department head approval');
        }
        break;
      case 'DAY_TO_DAY':
        // Auto-approval under threshold (e.g., $100)
        if (expense.amount > 100) {
          warnings.push('Day-to-day expenses over $100 require approval');
        }
        break;
      case 'EMERGENCIES':
        warnings.push('Emergency expenses have immediate approval but require post-audit');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ==================== SUPPLY CHAIN RULES ====================

  async validateSupplier(
    supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 5.1: TIN number must be unique
    const existingSupplier = await firestoreServices.supplier.getByTIN(supplier.tinNumber);
    if (existingSupplier) {
      errors.push('TIN number must be unique across all suppliers');
    }

    // Rule 5.3: Bank details required for payment processing
    if (!supplier.bankName || !supplier.accountNumber) {
      warnings.push('Bank details are required for payment processing');
    }

    // Validate TIN format (basic validation)
    if (!/^\d{10}$/.test(supplier.tinNumber)) {
      warnings.push('TIN number should be 10 digits');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateInvoice(
    invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'remainingBalance'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 6.1: FDN must be unique
    const existingInvoice = await firestoreServices.invoice.getByFDN(invoice.fdn);
    if (existingInvoice) {
      errors.push('FDN (Fiscal Document Number) must be unique');
    }

    // Rule 6.2: Due date must be after invoice date
    if (invoice.dueDate && invoice.dueDate.toDate() <= invoice.date.toDate()) {
      errors.push('Due date must be after invoice date');
    }

    // Rule 6.3: Invoice amount must be positive
    if (invoice.amount <= 0) {
      errors.push('Invoice amount must be positive');
    }

    // Validate quantity
    if (invoice.quantity <= 0) {
      errors.push('Invoice quantity must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ==================== HUMAN RESOURCES RULES ====================

  async validateEmployee(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser: Employee
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 8.1: Employee NIN must be unique
    const existingEmployeeByNIN = await firestoreServices.employee.getByNIN(employee.employeeNIN);
    if (existingEmployeeByNIN) {
      errors.push('Employee NIN must be unique');
    }

    // Rule 8.2: Email must be unique
    const existingEmployeeByEmail = await firestoreServices.employee.getByEmail(employee.email);
    if (existingEmployeeByEmail) {
      errors.push('Email must be unique across all employees');
    }

    // Rule 8.3: Employee must be assigned to valid branch
    const branch = await firestoreServices.branch.getById(employee.branchId);
    if (!branch) {
      errors.push('Employee must be assigned to a valid branch');
    }

    // Rule 8.4: Salary must be positive
    if (employee.employeeSalary <= 0) {
      errors.push('Employee salary must be positive');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employee.email)) {
      errors.push('Invalid email format');
    }

    // Validate NIN format (basic validation)
    if (!/^[A-Z0-9]{14}$/.test(employee.employeeNIN)) {
      warnings.push('NIN should be 14 alphanumeric characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ==================== AUTHORIZATION METHODS ====================

  canCreateCashAllocation(user: Employee): boolean {
    return this.hasAnyRole(user, [UserRole.ACCOUNTANT, UserRole.ACCOUNTANT_OPERATIONS]);
  }

  canAcknowledgeFunds(user: Employee, fundType: 'purchasing' | 'special' | 'twelvePercent'): boolean {
    if (fundType === 'purchasing') {
      return this.hasRole(user, UserRole.PURCHASING_MANAGER);
    }
    return this.hasAnyRole(user, [UserRole.ACCOUNTANT, UserRole.ACCOUNTANT_OPERATIONS]);
  }

  canProcessPayment(user: Employee): boolean {
    const permissions = this.getUserPermissions(user);
    return permissions.canManageInvoices;
  }

  canManageSuppliers(user: Employee): boolean {
    const permissions = this.getUserPermissions(user);
    return permissions.canManageSuppliers;
  }

  canManageEmployees(user: Employee): boolean {
    const permissions = this.getUserPermissions(user);
    return permissions.canManageEmployees;
  }

  canViewReports(user: Employee): boolean {
    const permissions = this.getUserPermissions(user);
    return permissions.canViewReports;
  }

  canAdminSystem(user: Employee): boolean {
    const permissions = this.getUserPermissions(user);
    return permissions.canAdminSystem;
  }

  // ==================== BUSINESS LOGIC HELPERS ====================

  calculateInvoiceStatus(invoice: Invoice, totalPaid: number): Invoice['status'] {
    const remainingBalance = invoice.amount - totalPaid;
    
    if (remainingBalance <= 0) {
      return 'Paid';
    } else if (totalPaid > 0) {
      return 'Partial';
    } else if (invoice.dueDate && invoice.dueDate.toDate() < new Date()) {
      return 'Overdue';
    }
    
    return 'Pending';
  }

  calculateCashAllocationDefaults(cashCloseTotal: number): {
    savings: number;
    specialFunds: number;
    purchasingManager: number;
  } {
    const savings = cashCloseTotal * 0.12; // 12% mandatory savings
    const remainingAmount = cashCloseTotal - savings;
    const specialFunds = remainingAmount * 0.3; // 30% to special funds
    const purchasingManager = remainingAmount * 0.7; // 70% to purchasing manager

    return {
      savings: Math.round(savings * 100) / 100,
      specialFunds: Math.round(specialFunds * 100) / 100,
      purchasingManager: Math.round(purchasingManager * 100) / 100
    };
  }

  isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  }

  calculateOvertimeHours(checkIn: Timestamp, checkOut: Timestamp): number {
    const hoursWorked = (checkOut.seconds - checkIn.seconds) / 3600;
    const standardHours = 8;
    return Math.max(0, hoursWorked - standardHours);
  }

  // ==================== AUDIT HELPERS ====================

  async logBusinessRuleViolation(
    ruleName: string,
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    await firestoreServices.audit.logAction(
      'business_rules',
      'CREATE',
      userId,
      `rule_violation_${Date.now()}`,
      {
        ruleName,
        details,
        timestamp: Timestamp.now()
      },
      `Business rule violation: ${ruleName}`
    );
  }
}

// ==================== SINGLETON INSTANCE ====================

export const businessRules = new FirebaseBusinessRules(); 