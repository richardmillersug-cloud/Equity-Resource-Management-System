import {
  Employee,
  EmployeeRole,
  CashAllocation,
  AllocationType,
  Payment,
  Invoice,
  InvoiceStatus,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  BusinessRules
} from '../database/schema';

export class RetailBusinessRules implements BusinessRules {
  
  // ==================== FINANCIAL CONTROLS ====================
  
  /**
   * Validates cash allocation based on business rules:
   * - Only accountants can create cash allocations
   * - Purchasing managers can only acknowledge their allocated funds
   * - Special funds require accountant acknowledgment
   * - 12% savings are mandatory and tracked separately
   */
  validateCashAllocation(allocation: CashAllocation, employee: Employee): boolean {
    // Only accountants can create cash allocations
    if (employee.role !== EmployeeRole.ACCOUNTANT) {
      throw new Error('Only accountants can create cash allocations');
    }

    // Validate allocation amount is positive
    if (allocation.amount <= 0) {
      throw new Error('Allocation amount must be positive');
    }

    // Validate allocation type specific rules
    switch (allocation.allocation_type) {
      case AllocationType.PURCHASING_MANAGER_FUNDS:
        // Must be allocated to a purchasing manager
        return this.validatePurchasingManagerAllocation(allocation);
      
      case AllocationType.SPECIAL_FUNDS:
        // Special funds require additional validation
        return this.validateSpecialFundsAllocation(allocation);
      
      case AllocationType.TWELVE_PERCENT_SAVINGS:
        // 12% savings are mandatory - validate calculation
        return this.validateTwelvePercentSavings(allocation);
      
      default:
        throw new Error('Invalid allocation type');
    }
  }

  /**
   * Validates payment amounts against invoice constraints:
   * - Payments cannot exceed invoice remaining balance
   * - Invoice status automatically updates based on payment percentage
   */
  validatePaymentAmount(payment: Payment, invoice: Invoice): boolean {
    // Payment amount must be positive
    if (payment.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // Payment cannot exceed remaining balance
    if (payment.amount > invoice.remaining_balance) {
      throw new Error('Payment amount cannot exceed invoice remaining balance');
    }

    // Validate payment method is supported
    if (!this.isValidPaymentMethod(payment.payment_method)) {
      throw new Error('Invalid payment method');
    }

    return true;
  }

  /**
   * Validates expense approval workflow based on category and employee role
   */
  validateExpenseApproval(expense: Expense, approver: Employee): boolean {
    // Validate approver has permission for expense category
    switch (expense.category) {
      case ExpenseCategory.GENERAL:
        return this.canApproveGeneralExpenses(approver);
      
      case ExpenseCategory.URA:
        return this.canApproveURAExpenses(approver);
      
      case ExpenseCategory.EMERGENCIES:
        return this.canApproveEmergencyExpenses(approver);
      
      case ExpenseCategory.DAY_TO_DAY:
        return this.canApproveDayToDayExpenses(approver);
      
      default:
        throw new Error('Invalid expense category');
    }
  }

  // ==================== ACCESS CONTROL ====================

  /**
   * Determines if employee can create cash allocations
   */
  canCreateCashAllocation(employee: Employee): boolean {
    return employee.role === EmployeeRole.ACCOUNTANT;
  }

  /**
   * Determines if employee can acknowledge funds based on allocation type and role
   */
  canAcknowledgeFunds(employee: Employee, allocation: CashAllocation): boolean {
    switch (allocation.allocation_type) {
      case AllocationType.PURCHASING_MANAGER_FUNDS:
        // Only the allocated purchasing manager can acknowledge
        return employee.role === EmployeeRole.PURCHASING_MANAGER && 
               employee.id === allocation.allocated_to_employee_id;
      
      case AllocationType.SPECIAL_FUNDS:
        // Special funds require accountant acknowledgment
        return employee.role === EmployeeRole.ACCOUNTANT;
      
      case AllocationType.TWELVE_PERCENT_SAVINGS:
        // 12% savings are automatically acknowledged
        return employee.role === EmployeeRole.ACCOUNTANT;
      
      default:
        return false;
    }
  }

  /**
   * Determines if employee can process payments
   */
  canProcessPayment(employee: Employee): boolean {
    return [
      EmployeeRole.ACCOUNTANT,
      EmployeeRole.ACCOUNTANT_OPS,
      EmployeeRole.MANAGING_DIRECTOR
    ].includes(employee.role);
  }

  /**
   * Role-based permission matrix for various operations
   */
  getPermissions(role: EmployeeRole): string[] {
    const permissionMatrix: Record<EmployeeRole, string[]> = {
      [EmployeeRole.ADMIN]: ['*'], // Full system access
      
      [EmployeeRole.HR]: [
        'employee.read', 'employee.create', 'employee.update',
        'payroll.read', 'payroll.create', 'payroll.process',
        'attendance.read', 'attendance.manage',
        'leave.read', 'leave.approve'
      ],
      
      [EmployeeRole.ACCOUNTANT]: [
        'cash_allocation.create', 'cash_allocation.read',
        'fund_acknowledgment.create', 'fund_acknowledgment.read',
        'expense.read', 'expense.approve',
        'payment.create', 'payment.read',
        'invoice.read', 'cash_close.create'
      ],
      
      [EmployeeRole.ACCOUNTANT_OPS]: [
        'cash_management.read', 'cash_management.update',
        'fund_acknowledgment.create', 'fund_acknowledgment.read',
        'cash_close.create', 'cash_injection.create'
      ],
      
      [EmployeeRole.PURCHASING_MANAGER]: [
        'supplier.read', 'supplier.create', 'supplier.update',
        'invoice.read', 'invoice.create',
        'purchase_order.read', 'purchase_order.create',
        'fund_acknowledgment.create'
      ],
      
      [EmployeeRole.STOCK_MANAGER]: [
        'inventory.read', 'inventory.update',
        'restock.read', 'restock.create',
        'return_note.read', 'return_note.create',
        'damage.read', 'damage.create'
      ],
      
      [EmployeeRole.RECEIVER]: [
        'purchase.receive', 'stock.update',
        'return_note.process'
      ],
      
      [EmployeeRole.SUPERVISOR]: [
        'analytics.read', 'reports.read'
      ],
      
      [EmployeeRole.MANAGING_DIRECTOR]: [
        'banking.read', 'financial_overview.read',
        'cash_injection.approve', 'high_value_transactions.approve'
      ]
    };

    return permissionMatrix[role] || [];
  }

  // ==================== DATA INTEGRITY ====================

  /**
   * Validates unique constraints across the system
   */
  validateUniqueConstraints(entity: any, field: string, value: any): boolean {
    // This would typically check against the database
    // Implementation depends on your data layer
    const uniqueFields: Record<string, boolean> = {
      'Employee.nin': true,
      'Employee.email': true,
      'Supplier.tin': true,
      'Invoice.fdn': true,
      'Payment.transaction_id': true
    };

    const key = `${entity.constructor.name}.${field}`;
    return uniqueFields[key] || false;
  }

  /**
   * Validates referential integrity constraints
   */
  validateReferentialIntegrity(entity: any): boolean {
    // Validate foreign key relationships exist
    // This would check against the database in a real implementation
    return true;
  }

  /**
   * Validates business logic constraints
   */
  validateBusinessLogicConstraints(entity: any): boolean {
    // Due dates must be after invoice dates
    if (entity.due_date && entity.invoice_date) {
      if (entity.due_date <= entity.invoice_date) {
        throw new Error('Due date must be after invoice date');
      }
    }

    // Payment amounts cannot be negative
    if (entity.amount !== undefined && entity.amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    // Cash close amounts must balance
    if (entity.constructor.name === 'CashClose') {
      return this.validateCashCloseBalance(entity);
    }

    return true;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private validatePurchasingManagerAllocation(allocation: CashAllocation): boolean {
    // Validate that the allocated employee is a purchasing manager
    // This would require a database lookup in real implementation
    return true;
  }

  private validateSpecialFundsAllocation(allocation: CashAllocation): boolean {
    // Special funds require additional documentation and approval
    if (!allocation.description || allocation.description.trim().length < 10) {
      throw new Error('Special funds allocation requires detailed description');
    }
    return true;
  }

  private validateTwelvePercentSavings(allocation: CashAllocation): boolean {
    // Validate that the amount represents exactly 12% of some base amount
    // This would require business context about what the 12% is calculated from
    return true;
  }

  private isValidPaymentMethod(method: string): boolean {
    const validMethods = ['CASH', 'AIRTEL', 'MTN', 'STANBIC_BANK', 'EQUITY_BANK', 'ABSA_BANK', 'PESAPAL'];
    return validMethods.includes(method);
  }

  private canApproveGeneralExpenses(employee: Employee): boolean {
    return [EmployeeRole.ACCOUNTANT, EmployeeRole.MANAGING_DIRECTOR].includes(employee.role);
  }

  private canApproveURAExpenses(employee: Employee): boolean {
    return [EmployeeRole.ACCOUNTANT, EmployeeRole.MANAGING_DIRECTOR].includes(employee.role);
  }

  private canApproveEmergencyExpenses(employee: Employee): boolean {
    return [EmployeeRole.ACCOUNTANT, EmployeeRole.MANAGING_DIRECTOR, EmployeeRole.SUPERVISOR].includes(employee.role);
  }

  private canApproveDayToDayExpenses(employee: Employee): boolean {
    return [EmployeeRole.ACCOUNTANT, EmployeeRole.ACCOUNTANT_OPS, EmployeeRole.SUPERVISOR].includes(employee.role);
  }

  private validateCashCloseBalance(cashClose: any): boolean {
    const calculatedTotal = 
      cashClose.cash_amount +
      cashClose.airtel_amount +
      cashClose.mtn_amount +
      cashClose.stanbic_amount +
      cashClose.equity_amount +
      cashClose.absa_amount +
      cashClose.pesapal_amount;

    if (Math.abs(calculatedTotal - cashClose.total_amount) > 0.01) {
      throw new Error('Cash close amounts do not balance');
    }

    return true;
  }

  // ==================== INVOICE STATUS MANAGEMENT ====================

  /**
   * Updates invoice status based on payment percentage
   */
  updateInvoiceStatus(invoice: Invoice, totalPaid: number): InvoiceStatus {
    const paymentPercentage = totalPaid / invoice.amount;
    
    if (paymentPercentage >= 1.0) {
      return InvoiceStatus.FULLY_PAID;
    } else if (paymentPercentage > 0) {
      return InvoiceStatus.PARTIALLY_PAID;
    } else if (new Date() > invoice.due_date) {
      return InvoiceStatus.OVERDUE;
    } else {
      return InvoiceStatus.PENDING;
    }
  }

  /**
   * Calculates remaining balance after payment
   */
  calculateRemainingBalance(invoice: Invoice, payment: Payment): number {
    return Math.max(0, invoice.remaining_balance - payment.amount);
  }

  // ==================== EXPENSE MANAGEMENT ====================

  /**
   * Updates expense status based on payment amount
   */
  updateExpenseStatus(expense: Expense, paymentAmount: number): ExpenseStatus {
    const newPaidAmount = expense.paid_amount + paymentAmount;
    const paymentPercentage = newPaidAmount / expense.amount;

    if (paymentPercentage >= 1.0) {
      return ExpenseStatus.FULLY_PAID;
    } else if (paymentPercentage > 0) {
      return ExpenseStatus.PARTIALLY_PAID;
    } else {
      return expense.status;
    }
  }
}

// Export singleton instance
export const businessRules = new RetailBusinessRules(); 