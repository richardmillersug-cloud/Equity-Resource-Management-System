import { Timestamp } from 'firebase/firestore';
import { FirestoreService } from './firestore-service';

// Collection names
const COLLECTIONS = {
  INVOICES: 'invoices'
} as const;

export interface PaymentPlan {
  id: string;
  installmentNumber: number;
  dueDate: Timestamp;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
}

export interface Expense {
  id: string;
  employeeId: string; // Submitter
  name: string; // Label
  expenseDate: Timestamp;
  expenseTime: Timestamp;
  amount: number; // Must be >= 0
  note?: string; // Optional detail
  expenseType: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAYTODAY';
  paidAmount: number; // Partial/full paid
  invoiceId?: string; // Reference to related invoice
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Damage {
  id: string;
  invoiceId: string; // Reference to invoice
  itemDescription: string;
  quantityDamaged: number;
  estimatedValue: number;
  damageReason: string;
  reportedBy: string; // Employee ID
  reportedAt: Timestamp;
  status: 'Reported' | 'UnderReview' | 'Approved' | 'Rejected';
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Unique invoice number
  date: Timestamp;
  amount: number;
  quantity: number;
  fdn: string; // FDN (Fiscal Document Number)
  supplierId: string; // Reference to supplier
  supplierName: string; // For easy display
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  description: string; // Description of goods delivered
  
  // Goods verification
  goodsReceivedAsInvoiced: boolean;
  missingItems?: string; // What's missing
  missingReason?: string; // Reason for missing items
  
  // Transport payment
  hasTransportPayment: boolean;
  transportAmount?: number;
  transportExpenseId?: string; // Reference to expense record
  
  // Damages
  hasDamages: boolean;
  damageIds?: string[]; // References to damage records
  
  // Payment details
  amountInWords: string;
  amountInDigits: number;
  
  // Payment plan
  paymentPlan?: PaymentPlan[];
  
  // Other fields
  shippingAddress?: string;
  shippingDate?: Timestamp;
  dueDate?: Timestamp;
  notes?: string;
  employeeId: string; // Who created the invoice
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateInvoiceInput {
  invoiceNumber: string;
  date: Date;
  amount: number;
  quantity: number;
  fdn: string;
  supplierId: string;
  supplierName: string;
  status: 'Draft' | 'Pending';
  description: string;
  
  // Goods verification
  goodsReceivedAsInvoiced: boolean;
  missingItems?: string;
  missingReason?: string;
  
  // Transport payment
  hasTransportPayment: boolean;
  transportAmount?: number;
  
  // Damages
  hasDamages: boolean;
  damages?: Omit<Damage, 'id' | 'invoiceId' | 'reportedAt'>[];
  
  // Payment details
  amountInWords: string;
  amountInDigits: number;
  
  // Payment plan
  paymentPlan?: Omit<PaymentPlan, 'id'>[];
  
  // Other fields
  shippingAddress?: string;
  shippingDate?: Date;
  dueDate?: Date;
  notes?: string;
  employeeId: string;
}

export class EnhancedInvoiceService extends FirestoreService<Invoice> {
  constructor() {
    super(COLLECTIONS.INVOICES);
  }

  // Create a new invoice
  async createInvoice(data: CreateInvoiceInput): Promise<string> {
    // Generate payment plan with IDs
    const paymentPlan = data.paymentPlan?.map((plan, index) => ({
      ...plan,
      id: `payment_${Date.now()}_${index}`,
      dueDate: Timestamp.fromDate(plan.dueDate)
    })) || [];

    const invoiceData = {
      invoiceNumber: data.invoiceNumber,
      date: Timestamp.fromDate(data.date),
      amount: data.amount,
      quantity: data.quantity,
      fdn: data.fdn,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      status: data.status,
      description: data.description,
      
      // Goods verification
      goodsReceivedAsInvoiced: data.goodsReceivedAsInvoiced,
      missingItems: data.missingItems,
      missingReason: data.missingReason,
      
      // Transport payment
      hasTransportPayment: data.hasTransportPayment,
      transportAmount: data.transportAmount,
      transportExpenseId: undefined as string | undefined, // Will be set when expense is created
      
      // Damages
      hasDamages: data.hasDamages,
      damageIds: [] as string[], // Will be populated when damages are created
      
      // Payment details
      amountInWords: data.amountInWords,
      amountInDigits: data.amountInDigits,
      
      // Payment plan
      paymentPlan: paymentPlan,
      
      // Other fields
      shippingAddress: data.shippingAddress || '',
      shippingDate: data.shippingDate ? Timestamp.fromDate(data.shippingDate) : undefined,
      dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
      notes: data.notes || '',
      employeeId: data.employeeId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const invoiceId = await this.create(invoiceData);
    
    // Note: In a real implementation, you would create expense and damage records
    // in their respective collections. For now, we're just storing the data in the invoice.

    return invoiceId;
  }

  // Get invoice by invoice number
  async getByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const invoices = await this.getAll([
      { field: 'invoiceNumber', operator: '==', value: invoiceNumber }
    ]);
    return invoices.length > 0 ? invoices[0] : null;
  }

  // Get invoices by supplier
  async getBySupplier(supplierId: string): Promise<Invoice[]> {
    return this.getAll([
      { field: 'supplierId', operator: '==', value: supplierId }
    ], { orderBy: 'date', orderDirection: 'desc' });
  }

  // Get invoices by status
  async getByStatus(status: Invoice['status']): Promise<Invoice[]> {
    return this.getAll([
      { field: 'status', operator: '==', value: status }
    ], { orderBy: 'date', orderDirection: 'desc' });
  }

  // Update invoice status
  async updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Promise<void> {
    await this.update(invoiceId, { status, updatedAt: Timestamp.now() });
  }

  // Search invoices
  async searchInvoices(searchTerm: string): Promise<Invoice[]> {
    const allInvoices = await this.getAll();
    return allInvoices.filter(invoice => 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.fdn.includes(searchTerm) ||
      (invoice.description && invoice.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  // Get invoice statistics
  async getInvoiceStats(): Promise<{
    total: number;
    draft: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
    totalAmount: number;
    pendingAmount: number;
  }> {
    const allInvoices = await this.getAll();
    
    const totalAmount = allInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const pendingAmount = allInvoices
      .filter(invoice => ['Pending', 'Approved'].includes(invoice.status))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    
    return {
      total: allInvoices.length,
      draft: allInvoices.filter(i => i.status === 'Draft').length,
      pending: allInvoices.filter(i => i.status === 'Pending').length,
      approved: allInvoices.filter(i => i.status === 'Approved').length,
      paid: allInvoices.filter(i => i.status === 'Paid').length,
      rejected: allInvoices.filter(i => i.status === 'Rejected').length,
      totalAmount,
      pendingAmount
    };
  }

  // Get overdue invoices
  async getOverdueInvoices(): Promise<Invoice[]> {
    const allInvoices = await this.getAll();
    const now = new Date();
    
    return allInvoices.filter(invoice => 
      invoice.dueDate && 
      invoice.dueDate.toDate() < now && 
      !['Paid', 'Rejected'].includes(invoice.status)
    );
  }

  // Create sample invoices for testing
  async createSampleInvoices(): Promise<string[]> {
    const sampleInvoices: CreateInvoiceInput[] = [
      {
        invoiceNumber: "INV-2024-001",
        date: new Date('2024-01-15'),
        amount: 2500000,
        quantity: 50,
        fdn: "FDN-001-2024",
        supplierId: "supplier1", // This should match actual supplier IDs
        supplierName: "TechFlow Solutions Ltd",
        status: "Pending",
        description: "Office computers and accessories delivered in good condition",
        goodsReceivedAsInvoiced: true,
        hasTransportPayment: true,
        transportAmount: 150000,
        hasDamages: false,
        amountInWords: "Two Million Five Hundred Thousand Shillings Only",
        amountInDigits: 2500000,
        paymentPlan: [
          {
            installmentNumber: 1,
            dueDate: new Date('2024-02-15'),
            amount: 1250000,
            status: 'Pending'
          },
          {
            installmentNumber: 2,
            dueDate: new Date('2024-03-15'),
            amount: 1250000,
            status: 'Pending'
          }
        ],
        shippingAddress: "Main Office, Kampala",
        shippingDate: new Date('2024-01-20'),
        dueDate: new Date('2024-02-15'),
        notes: "Urgent delivery required",
        employeeId: "EMP001"
      },
      {
        invoiceNumber: "INV-2024-002",
        date: new Date('2024-01-18'),
        amount: 1800000,
        quantity: 30,
        fdn: "FDN-002-2024",
        supplierId: "supplier2",
        supplierName: "Green Valley Supplies",
        status: "Approved",
        description: "Agricultural equipment and tools",
        shippingAddress: "Warehouse B, Industrial Area",
        shippingDate: new Date('2024-01-25'),
        dueDate: new Date('2024-02-18'),
        employeeId: "EMP002"
      },
      {
        invoiceNumber: "INV-2024-003",
        date: new Date('2024-01-20'),
        amount: 3200000,
        quantity: 25,
        fdn: "FDN-003-2024",
        supplierId: "supplier3",
        supplierName: "Metro Construction Materials",
        status: "Draft",
        description: "Construction materials - cement and steel",
        shippingAddress: "Construction Site A",
        dueDate: new Date('2024-02-20'),
        notes: "Check quality before acceptance",
        employeeId: "EMP001"
      },
      {
        invoiceNumber: "INV-2024-004",
        date: new Date('2024-01-22'),
        amount: 950000,
        quantity: 15,
        fdn: "FDN-004-2024",
        supplierId: "supplier4",
        supplierName: "East Africa Logistics",
        status: "Paid",
        description: "Transportation and logistics services",
        shippingAddress: "Multiple locations",
        shippingDate: new Date('2024-01-22'),
        dueDate: new Date('2024-02-22'),
        employeeId: "EMP003"
      },
      {
        invoiceNumber: "INV-2024-005",
        date: new Date('2024-01-25'),
        amount: 1200000,
        quantity: 100,
        fdn: "FDN-005-2024",
        supplierId: "supplier5",
        supplierName: "Highland Coffee Exports",
        status: "Pending",
        description: "Coffee beans - premium grade",
        shippingAddress: "Processing Plant",
        shippingDate: new Date('2024-02-01'),
        dueDate: new Date('2024-02-25'),
        notes: "Temperature controlled storage required",
        employeeId: "EMP002"
      }
    ];

    const createdIds: string[] = [];
    for (const invoiceData of sampleInvoices) {
      try {
        const id = await this.createInvoice(invoiceData);
        createdIds.push(id);
        console.log(`Created invoice: ${invoiceData.invoiceNumber} with ID: ${id}`);
      } catch (error) {
        console.error(`Error creating invoice ${invoiceData.invoiceNumber}:`, error);
      }
    }

    return createdIds;
  }
}

// Export singleton instance
export const enhancedInvoiceService = new EnhancedInvoiceService(); 