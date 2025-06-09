import {
  Supplier,
  Invoice,
  RestockItems,
  ReturnNote,
  Damage,
  Employee,
  EmployeeRole,
  InvoiceStatus,
  RestockStatus,
  ReturnStatus,
  DamageStatus
} from '../database/schema';
import { businessRules } from '../business-rules';

export class SupplyChainService {
  
  // ==================== SUPPLIER MANAGEMENT ====================
  
  /**
   * Creates a new supplier with TIN validation
   * Only purchasing managers can create suppliers
   */
  async createSupplier(
    supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>,
    createdBy: Employee
  ): Promise<Supplier> {
    // Validate permissions
    if (createdBy.role !== EmployeeRole.PURCHASING_MANAGER) {
      throw new Error('Only purchasing managers can create suppliers');
    }

    // Validate TIN uniqueness
    if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Supplier' } }, 'tin', supplier.tin)) {
      throw new Error('Supplier TIN must be unique');
    }

    const fullSupplier: Supplier = {
      ...supplier,
      id: this.generateId(),
      managed_by_employee_id: createdBy.id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveSupplier(fullSupplier);
  }

  /**
   * Updates supplier information with validation
   */
  async updateSupplier(
    supplierId: string,
    updates: Partial<Supplier>,
    updatedBy: Employee
  ): Promise<Supplier> {
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Validate permissions - only the managing employee or purchasing managers can update
    if (supplier.managed_by_employee_id !== updatedBy.id && 
        updatedBy.role !== EmployeeRole.PURCHASING_MANAGER) {
      throw new Error('Not authorized to update this supplier');
    }

    // Validate TIN uniqueness if being updated
    if (updates.tin && updates.tin !== supplier.tin) {
      if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Supplier' } }, 'tin', updates.tin)) {
        throw new Error('Supplier TIN must be unique');
      }
    }

    return await this.updateSupplierRecord(supplierId, {
      ...updates,
      updated_at: new Date()
    });
  }

  // ==================== INVOICE PROCESSING ====================

  /**
   * Creates a new invoice with FDN validation
   */
  async createInvoice(
    invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'status' | 'remaining_balance'>,
    createdBy: Employee
  ): Promise<Invoice> {
    // Validate permissions
    if (createdBy.role !== EmployeeRole.PURCHASING_MANAGER) {
      throw new Error('Only purchasing managers can create invoices');
    }

    // Validate FDN uniqueness
    if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Invoice' } }, 'fdn', invoice.fdn)) {
      throw new Error('Invoice FDN must be unique');
    }

    // Validate supplier exists
    const supplier = await this.getSupplier(invoice.supplier_id);
    if (!supplier || !supplier.is_active) {
      throw new Error('Invalid or inactive supplier');
    }

    const fullInvoice: Invoice = {
      ...invoice,
      id: this.generateId(),
      status: InvoiceStatus.PENDING,
      remaining_balance: invoice.amount,
      created_by_employee_id: createdBy.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Validate business logic constraints
    if (!businessRules.validateBusinessLogicConstraints(fullInvoice)) {
      throw new Error('Invoice validation failed');
    }

    return await this.saveInvoice(fullInvoice);
  }

  /**
   * Gets overdue invoices for follow-up
   */
  async getOverdueInvoices(branchId?: string): Promise<Invoice[]> {
    const currentDate = new Date();
    // This would query the database for invoices where due_date < current_date and status != FULLY_PAID
    return await this.queryOverdueInvoices(currentDate, branchId);
  }

  /**
   * Gets invoice payment history
   */
  async getInvoicePaymentHistory(invoiceId: string): Promise<{
    invoice: Invoice;
    payments: any[]; // Payment records
    totalPaid: number;
    remainingBalance: number;
  }> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const payments = await this.getPaymentsByInvoice(invoiceId);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      invoice,
      payments,
      totalPaid,
      remainingBalance: invoice.remaining_balance
    };
  }

  // ==================== RESTOCK MANAGEMENT ====================

  /**
   * Creates a restock request with threshold validation
   */
  async createRestockRequest(
    restock: Omit<RestockItems, 'id' | 'created_at' | 'updated_at' | 'status'>,
    requestedBy: Employee
  ): Promise<RestockItems> {
    // Validate permissions
    if (![EmployeeRole.STOCK_MANAGER, EmployeeRole.PURCHASING_MANAGER].includes(requestedBy.role)) {
      throw new Error('Only stock managers or purchasing managers can create restock requests');
    }

    // Validate supplier exists and is active
    const supplier = await this.getSupplier(restock.supplier_id);
    if (!supplier || !supplier.is_active) {
      throw new Error('Invalid or inactive supplier');
    }

    // Validate restock is needed (current stock <= minimum threshold)
    if (restock.current_stock > restock.minimum_threshold) {
      throw new Error('Restock not needed - current stock above minimum threshold');
    }

    const fullRestock: RestockItems = {
      ...restock,
      id: this.generateId(),
      requested_by_employee_id: requestedBy.id,
      status: RestockStatus.REQUESTED,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveRestockRequest(fullRestock);
  }

  /**
   * Approves a restock request
   */
  async approveRestockRequest(
    restockId: string,
    approvedBy: Employee
  ): Promise<RestockItems> {
    const restock = await this.getRestockRequest(restockId);
    if (!restock) {
      throw new Error('Restock request not found');
    }

    // Validate permissions
    if (![EmployeeRole.PURCHASING_MANAGER, EmployeeRole.STOCK_MANAGER].includes(approvedBy.role)) {
      throw new Error('Only purchasing managers or stock managers can approve restock requests');
    }

    if (restock.status !== RestockStatus.REQUESTED) {
      throw new Error('Only requested restock items can be approved');
    }

    return await this.updateRestockStatus(restockId, RestockStatus.APPROVED);
  }

  /**
   * Marks restock as received and updates inventory
   */
  async receiveRestockItems(
    restockId: string,
    receivedBy: Employee,
    actualQuantity?: number
  ): Promise<RestockItems> {
    const restock = await this.getRestockRequest(restockId);
    if (!restock) {
      throw new Error('Restock request not found');
    }

    // Validate permissions
    if (![EmployeeRole.RECEIVER, EmployeeRole.STOCK_MANAGER].includes(receivedBy.role)) {
      throw new Error('Only receivers or stock managers can mark items as received');
    }

    if (restock.status !== RestockStatus.ORDERED) {
      throw new Error('Only ordered items can be marked as received');
    }

    // Update inventory levels
    const newStockLevel = restock.current_stock + (actualQuantity || restock.restock_quantity);
    await this.updateInventoryLevel(restock.item_name, newStockLevel);

    return await this.updateRestockStatus(restockId, RestockStatus.RECEIVED);
  }

  // ==================== RETURN NOTE MANAGEMENT ====================

  /**
   * Creates a return note for defective or excess items
   */
  async createReturnNote(
    returnNote: Omit<ReturnNote, 'id' | 'created_at' | 'updated_at' | 'status'>,
    processedBy: Employee
  ): Promise<ReturnNote> {
    // Validate permissions
    if (![EmployeeRole.STOCK_MANAGER, EmployeeRole.RECEIVER].includes(processedBy.role)) {
      throw new Error('Only stock managers or receivers can create return notes');
    }

    // Validate supplier exists
    const supplier = await this.getSupplier(returnNote.supplier_id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Calculate total return value
    const totalValue = returnNote.items.reduce((sum, item) => sum + item.total_value, 0);

    const fullReturnNote: ReturnNote = {
      ...returnNote,
      id: this.generateId(),
      total_return_value: totalValue,
      processed_by_employee_id: processedBy.id,
      status: ReturnStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveReturnNote(fullReturnNote);
  }

  /**
   * Approves a return note
   */
  async approveReturnNote(
    returnNoteId: string,
    approvedBy: Employee
  ): Promise<ReturnNote> {
    const returnNote = await this.getReturnNote(returnNoteId);
    if (!returnNote) {
      throw new Error('Return note not found');
    }

    // Validate permissions
    if (![EmployeeRole.PURCHASING_MANAGER, EmployeeRole.STOCK_MANAGER].includes(approvedBy.role)) {
      throw new Error('Only purchasing managers or stock managers can approve return notes');
    }

    if (returnNote.status !== ReturnStatus.PENDING) {
      throw new Error('Only pending return notes can be approved');
    }

    return await this.updateReturnNoteStatus(returnNoteId, ReturnStatus.APPROVED);
  }

  // ==================== DAMAGE TRACKING ====================

  /**
   * Reports product damage with cost calculation
   */
  async reportDamage(
    damage: Omit<Damage, 'id' | 'created_at' | 'updated_at' | 'status' | 'total_damage_cost'>,
    reportedBy: Employee
  ): Promise<Damage> {
    // Calculate total damage cost
    const totalCost = damage.quantity_damaged * damage.unit_cost;

    const fullDamage: Damage = {
      ...damage,
      id: this.generateId(),
      total_damage_cost: totalCost,
      reported_by_employee_id: reportedBy.id,
      status: DamageStatus.REPORTED,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Update inventory levels to reflect damage
    await this.adjustInventoryForDamage(damage.item_name, damage.quantity_damaged);

    return await this.saveDamageReport(fullDamage);
  }

  /**
   * Gets damage summary by period and branch
   */
  async getDamageSummary(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<{
    totalDamageCount: number;
    totalDamageCost: number;
    damagesByCategory: Record<string, number>;
    topDamagedItems: Array<{ item: string; cost: number; quantity: number }>;
  }> {
    // This would query the database for damage aggregations
    return {
      totalDamageCount: 0,
      totalDamageCost: 0,
      damagesByCategory: {},
      topDamagedItems: []
    };
  }

  // ==================== ANALYTICS & REPORTING ====================

  /**
   * Gets supplier performance metrics
   */
  async getSupplierPerformance(supplierId: string): Promise<{
    totalInvoices: number;
    totalValue: number;
    averagePaymentTime: number;
    overdueInvoices: number;
    returnRate: number;
    damageRate: number;
  }> {
    // This would calculate supplier performance metrics from the database
    return {
      totalInvoices: 0,
      totalValue: 0,
      averagePaymentTime: 0,
      overdueInvoices: 0,
      returnRate: 0,
      damageRate: 0
    };
  }

  /**
   * Gets inventory turnover analysis
   */
  async getInventoryTurnover(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ): Promise<Array<{
    item: string;
    turnoverRate: number;
    averageStock: number;
    restockFrequency: number;
    recommendedThreshold: number;
  }>> {
    // This would analyze inventory movement patterns
    return [];
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async saveSupplier(supplier: Supplier): Promise<Supplier> {
    // Database save implementation
    return supplier;
  }

  private async getSupplier(id: string): Promise<Supplier | null> {
    // Database query implementation
    return null;
  }

  private async updateSupplierRecord(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    // Database update implementation
    return {} as Supplier;
  }

  private async saveInvoice(invoice: Invoice): Promise<Invoice> {
    // Database save implementation
    return invoice;
  }

  private async getInvoice(id: string): Promise<Invoice | null> {
    // Database query implementation
    return null;
  }

  private async queryOverdueInvoices(currentDate: Date, branchId?: string): Promise<Invoice[]> {
    // Database query implementation
    return [];
  }

  private async getPaymentsByInvoice(invoiceId: string): Promise<any[]> {
    // Database query implementation
    return [];
  }

  private async saveRestockRequest(restock: RestockItems): Promise<RestockItems> {
    // Database save implementation
    return restock;
  }

  private async getRestockRequest(id: string): Promise<RestockItems | null> {
    // Database query implementation
    return null;
  }

  private async updateRestockStatus(id: string, status: RestockStatus): Promise<RestockItems> {
    // Database update implementation
    return {} as RestockItems;
  }

  private async updateInventoryLevel(itemName: string, newLevel: number): Promise<void> {
    // Database update implementation
  }

  private async saveReturnNote(returnNote: ReturnNote): Promise<ReturnNote> {
    // Database save implementation
    return returnNote;
  }

  private async getReturnNote(id: string): Promise<ReturnNote | null> {
    // Database query implementation
    return null;
  }

  private async updateReturnNoteStatus(id: string, status: ReturnStatus): Promise<ReturnNote> {
    // Database update implementation
    return {} as ReturnNote;
  }

  private async saveDamageReport(damage: Damage): Promise<Damage> {
    // Database save implementation
    return damage;
  }

  private async adjustInventoryForDamage(itemName: string, quantity: number): Promise<void> {
    // Database update implementation to reduce inventory
  }
}

// Export singleton instance
export const supplyChainService = new SupplyChainService(); 