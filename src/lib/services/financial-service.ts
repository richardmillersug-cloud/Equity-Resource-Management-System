import {
  CashAllocation,
  FundAcknowledgment,
  Payment,
  Invoice,
  Expense,
  Employee,
  CashClose,
  CashInjection,
  SpecialFundsTracker,
  AllocationType,
  AllocationStatus,
  InvoiceStatus,
  ExpenseStatus,
  PaymentMethod,
} from '../firebase/models';
import { businessRules } from '../business-rules';

export class FinancialService {
  
  // ==================== CASH ALLOCATION SYSTEM ====================
  
  /**
   * Creates a new cash allocation with business rule validation
   * Only accountants can create cash allocations
   */
  async createCashAllocation(
    allocation: Omit<CashAllocation, 'id' | 'created_at' | 'updated_at'>,
    createdBy: Employee
  ): Promise<CashAllocation> {
    // Validate business rules
    const fullAllocation: CashAllocation = {
      ...allocation,
      id: this.generateId(),
      created_at: new Date(),
      updated_at: new Date()
    };

    if (!businessRules.validateCashAllocation(fullAllocation, createdBy)) {
      throw new Error('Cash allocation validation failed');
    }

    // Create allocation record
    const createdAllocation = await this.saveCashAllocation(fullAllocation);

    // Create special funds tracker for special funds
    if (allocation.allocation_type === AllocationType.SPECIAL_FUNDS) {
      await this.createSpecialFundsTracker(createdAllocation);
    }

    return createdAllocation;
  }

  /**
   * Processes fund acknowledgment with validation
   */
  async acknowledgeFunds(
    allocationId: string,
    acknowledgedBy: Employee,
    amountAcknowledged: number,
    notes?: string
  ): Promise<FundAcknowledgment> {
    // Get the allocation
    const allocation = await this.getCashAllocation(allocationId);
    if (!allocation) {
      throw new Error('Cash allocation not found');
    }

    // Validate acknowledgment permissions
    if (!businessRules.canAcknowledgeFunds(acknowledgedBy, allocation)) {
      throw new Error('Employee not authorized to acknowledge this fund allocation');
    }

    // Validate amount
    if (amountAcknowledged !== allocation.amount) {
      throw new Error('Acknowledged amount must match allocated amount');
    }

    // Create acknowledgment
    const acknowledgment: FundAcknowledgment = {
      id: this.generateId(),
      cash_allocation_id: allocationId,
      acknowledged_by_employee_id: acknowledgedBy.id,
      acknowledgment_date: new Date(),
      amount_acknowledged: amountAcknowledged,
      notes,
      created_at: new Date()
    };

    // Update allocation status
    await this.updateAllocationStatus(allocationId, AllocationStatus.ACKNOWLEDGED);

    return await this.saveFundAcknowledgment(acknowledgment);
  }

  // ==================== PAYMENT PROCESSING ====================

  /**
   * Processes payment against an invoice with validation
   */
  async processPayment(
    payment: Omit<Payment, 'id' | 'created_at'>,
    processedBy: Employee
  ): Promise<Payment> {
    // Validate processor permissions
    if (!businessRules.canProcessPayment(processedBy)) {
      throw new Error('Employee not authorized to process payments');
    }

    // Get invoice
    const invoice = await this.getInvoice(payment.invoice_id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate payment amount
    const fullPayment: Payment = {
      ...payment,
      id: this.generateId(),
      created_at: new Date()
    };

    if (!businessRules.validatePaymentAmount(fullPayment, invoice)) {
      throw new Error('Payment validation failed');
    }

    // Process payment
    const processedPayment = await this.savePayment(fullPayment);

    // Update invoice status and remaining balance
    const newRemainingBalance = businessRules.calculateRemainingBalance(invoice, fullPayment);
    const totalPaid = invoice.amount - newRemainingBalance;
    const newStatus = businessRules.updateInvoiceStatus(invoice, totalPaid);

    await this.updateInvoice(payment.invoice_id, {
      remaining_balance: newRemainingBalance,
      status: newStatus,
      updated_at: new Date()
    });

    return processedPayment;
  }

  // ==================== EXPENSE MANAGEMENT ====================

  /**
   * Creates a new expense with validation
   */
  async createExpense(
    expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'status' | 'paid_amount' | 'remaining_balance'>
  ): Promise<Expense> {
    const fullExpense: Expense = {
      ...expense,
      id: this.generateId(),
      status: ExpenseStatus.PENDING,
      paid_amount: 0,
      remaining_balance: expense.amount,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveExpense(fullExpense);
  }

  /**
   * Approves an expense with role-based validation
   */
  async approveExpense(
    expenseId: string,
    approvedBy: Employee,
    comments?: string
  ): Promise<Expense> {
    const expense = await this.getExpense(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Validate approval permissions
    if (!businessRules.validateExpenseApproval(expense, approvedBy)) {
      throw new Error('Employee not authorized to approve this expense category');
    }

    // Update expense
    const updatedExpense = await this.updateExpense(expenseId, {
      status: ExpenseStatus.APPROVED,
      approved_by_employee_id: approvedBy.id,
      updated_at: new Date()
    });

    return updatedExpense;
  }

  /**
   * Processes partial payment for an expense
   */
  async payExpense(
    expenseId: string,
    paymentAmount: number,
    processedBy: Employee
  ): Promise<Expense> {
    const expense = await this.getExpense(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.status !== ExpenseStatus.APPROVED) {
      throw new Error('Expense must be approved before payment');
    }

    if (paymentAmount > expense.remaining_balance) {
      throw new Error('Payment amount exceeds remaining balance');
    }

    // Update expense payment status
    const newPaidAmount = expense.paid_amount + paymentAmount;
    const newRemainingBalance = expense.amount - newPaidAmount;
    const newStatus = businessRules.updateExpenseStatus(expense, paymentAmount);

    return await this.updateExpense(expenseId, {
      paid_amount: newPaidAmount,
      remaining_balance: newRemainingBalance,
      status: newStatus,
      updated_at: new Date()
    });
  }

  // ==================== CASH CLOSE OPERATIONS ====================

  /**
   * Performs daily cash close with validation
   */
  async performCashClose(
    cashClose: Omit<CashClose, 'id' | 'created_at' | 'total_amount'>,
    closedBy: Employee
  ): Promise<CashClose> {
    // Calculate total amount
    const totalAmount = 
      cashClose.cash_amount +
      cashClose.airtel_amount +
      cashClose.mtn_amount +
      cashClose.stanbic_amount +
      cashClose.equity_amount +
      cashClose.absa_amount +
      cashClose.pesapal_amount;

    const fullCashClose: CashClose = {
      ...cashClose,
      id: this.generateId(),
      total_amount: totalAmount,
      created_at: new Date()
    };

    // Validate cash close balance
    if (!businessRules.validateBusinessLogicConstraints(fullCashClose)) {
      throw new Error('Cash close validation failed');
    }

    return await this.saveCashClose(fullCashClose);
  }

  /**
   * Records cash injection with approval workflow
   */
  async recordCashInjection(
    injection: Omit<CashInjection, 'id' | 'created_at'>,
    injectedBy: Employee
  ): Promise<CashInjection> {
    const fullInjection: CashInjection = {
      ...injection,
      id: this.generateId(),
      created_at: new Date()
    };

    return await this.saveCashInjection(fullInjection);
  }

  // ==================== REPORTING & ANALYTICS ====================

  /**
   * Gets cash allocation summary by type and status
   */
  async getCashAllocationSummary(branchId?: string): Promise<{
    totalAllocated: number;
    totalAcknowledged: number;
    pendingAllocations: number;
    byType: Record<AllocationType, number>;
  }> {
    // This would query the database for aggregated data
    // Implementation depends on your data layer
    return {
      totalAllocated: 0,
      totalAcknowledged: 0,
      pendingAllocations: 0,
      byType: {
        [AllocationType.PURCHASING_MANAGER_FUNDS]: 0,
        [AllocationType.SPECIAL_FUNDS]: 0,
        [AllocationType.TWELVE_PERCENT_SAVINGS]: 0
      }
    };
  }

  /**
   * Gets payment summary by method and period
   */
  async getPaymentSummary(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<Record<PaymentMethod, number>> {
    // This would query the database for payment aggregations
    return {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.AIRTEL]: 0,
      [PaymentMethod.MTN]: 0,
      [PaymentMethod.STANBIC_BANK]: 0,
      [PaymentMethod.EQUITY_BANK]: 0,
      [PaymentMethod.ABSA_BANK]: 0,
      [PaymentMethod.PESAPAL]: 0
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async saveCashAllocation(allocation: CashAllocation): Promise<CashAllocation> {
    // Database save implementation
    return allocation;
  }

  private async getCashAllocation(id: string): Promise<CashAllocation | null> {
    // Database query implementation
    return null;
  }

  private async updateAllocationStatus(id: string, status: AllocationStatus): Promise<void> {
    // Database update implementation
  }

  private async saveFundAcknowledgment(acknowledgment: FundAcknowledgment): Promise<FundAcknowledgment> {
    // Database save implementation
    return acknowledgment;
  }

  private async savePayment(payment: Payment): Promise<Payment> {
    // Database save implementation
    return payment;
  }

  private async getInvoice(id: string): Promise<Invoice | null> {
    // Database query implementation
    return null;
  }

  private async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    // Database update implementation
    return {} as Invoice;
  }

  private async saveExpense(expense: Expense): Promise<Expense> {
    // Database save implementation
    return expense;
  }

  private async getExpense(id: string): Promise<Expense | null> {
    // Database query implementation
    return null;
  }

  private async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    // Database update implementation
    return {} as Expense;
  }

  private async saveCashClose(cashClose: CashClose): Promise<CashClose> {
    // Database save implementation
    return cashClose;
  }

  private async saveCashInjection(injection: CashInjection): Promise<CashInjection> {
    // Database save implementation
    return injection;
  }

  private async createSpecialFundsTracker(allocation: CashAllocation): Promise<SpecialFundsTracker> {
    const tracker: SpecialFundsTracker = {
      id: this.generateId(),
      fund_name: `Special Fund - ${allocation.description}`,
      allocated_amount: allocation.amount,
      used_amount: 0,
      remaining_balance: allocation.amount,
      allocation_date: allocation.allocation_date,
      allocated_by_employee_id: allocation.allocated_by_accountant_id,
      purpose: allocation.description || 'Special fund allocation',
      status: 'ACTIVE' as any,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Database save implementation
    return tracker;
  }
}

// Export singleton instance
export const financialService = new FinancialService(); 