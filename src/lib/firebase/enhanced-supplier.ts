import { Timestamp } from 'firebase/firestore';
import { FirestoreService } from './firestore-service';
import { COLLECTIONS } from './models';

// Enhanced Supplier interfaces
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  bankNumber: string;
}

export interface MobilePayment {
  id: string;
  provider: 'MTN' | 'Airtel';
  merchantCode: string;
  phoneNumber: string;
}

export interface PendingEdit {
  id: string;
  supplierId: string;
  editedBy: string; // Employee ID who made the edit
  editedAt: Timestamp;
  status: 'Pending' | 'Approved' | 'Rejected';
  changes: Partial<Omit<EnhancedSupplier, 'id' | 'createdAt' | 'updatedAt'>>;
  approvedBy?: string; // Employee ID who approved/rejected
  approvedAt?: Timestamp;
  comments?: string;
}

export interface EnhancedSupplier {
  id: string;
  supplierName: string;
  tinNumber: string; // Unique
  dateOfRegistration: Timestamp;
  address: string;
  emailAddress?: string;
  phoneNumbers: string[];
  bankAccounts: BankAccount[];
  mobilePayments: MobilePayment[];
  employeeId: string; // Reference to Employee (managing employee)
  status: 'Active' | 'Inactive' | 'Pending';
  routeDays?: string[]; // Optional - Expected delivery days (e.g., ["Monday", "Thursday"])
  pendingEdits?: PendingEdit[]; // Pending edits for this supplier
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Input type for creating suppliers (without auto-generated fields)
export interface CreateSupplierInput {
  supplierName: string;
  tinNumber: string;
  dateOfRegistration: Date;
  address: string;
  emailAddress?: string;
  phoneNumbers: string[];
  bankAccounts: Omit<BankAccount, 'id'>[];
  mobilePayments: Omit<MobilePayment, 'id'>[];
  employeeId: string;
  routeDays?: string[]; // Optional - Expected delivery days (e.g., ["Monday", "Thursday"])
}

// Enhanced Supplier Service
export class EnhancedSupplierService extends FirestoreService<EnhancedSupplier> {
  constructor() {
    super(COLLECTIONS.SUPPLIERS);
  }

  // Create a new supplier with enhanced data
  async createSupplier(data: CreateSupplierInput): Promise<string> {
    // Generate IDs for bank accounts and mobile payments
    const bankAccountsWithIds: BankAccount[] = data.bankAccounts.map(account => ({
      ...account,
      id: Math.random().toString(36).substr(2, 9)
    }));

    const mobilePaymentsWithIds: MobilePayment[] = data.mobilePayments.map(payment => ({
      ...payment,
      id: Math.random().toString(36).substr(2, 9)
    }));

    const supplierData = {
      supplierName: data.supplierName,
      tinNumber: data.tinNumber,
      dateOfRegistration: Timestamp.fromDate(data.dateOfRegistration),
      address: data.address,
      emailAddress: data.emailAddress || '',
      phoneNumbers: data.phoneNumbers.filter(phone => phone.trim() !== ''),
      bankAccounts: bankAccountsWithIds,
      mobilePayments: mobilePaymentsWithIds,
      employeeId: data.employeeId,
      status: 'Active' as const,
      routeDays: data.routeDays && data.routeDays.length > 0 ? data.routeDays : undefined
    };

    return this.create(supplierData);
  }

  // Get supplier by TIN number
  async getByTIN(tinNumber: string): Promise<EnhancedSupplier | null> {
    const suppliers = await this.getAll([
      { field: 'tinNumber', operator: '==', value: tinNumber }
    ]);
    return suppliers.length > 0 ? suppliers[0] : null;
  }

  // Get active suppliers
  async getActiveSuppliers(): Promise<EnhancedSupplier[]> {
    return this.getAll([
      { field: 'status', operator: '==', value: 'Active' }
    ], { orderBy: 'supplierName', orderDirection: 'asc' });
  }

  // Get suppliers by status
  async getSuppliersByStatus(status: 'Active' | 'Inactive' | 'Pending'): Promise<EnhancedSupplier[]> {
    return this.getAll([
      { field: 'status', operator: '==', value: status }
    ], { orderBy: 'supplierName', orderDirection: 'asc' });
  }

  // Update supplier status
  async updateSupplierStatus(supplierId: string, status: 'Active' | 'Inactive' | 'Pending'): Promise<void> {
    await this.update(supplierId, { status });
  }

  // Search suppliers by name or TIN
  async searchSuppliers(searchTerm: string): Promise<EnhancedSupplier[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - for production, consider Algolia or similar
    const allSuppliers = await this.getAll();
    return allSuppliers.filter(supplier => 
      supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.tinNumber.includes(searchTerm) ||
      supplier.phoneNumbers.some(phone => phone.includes(searchTerm))
    );
  }

  // Get supplier statistics
  async getSupplierStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    inactive: number;
  }> {
    const allSuppliers = await this.getAll();
    
    return {
      total: allSuppliers.length,
      active: allSuppliers.filter(s => s.status === 'Active').length,
      pending: allSuppliers.filter(s => s.status === 'Pending').length,
      inactive: allSuppliers.filter(s => s.status === 'Inactive').length,
    };
  }

  // Add bank account to existing supplier
  async addBankAccount(supplierId: string, bankAccount: Omit<BankAccount, 'id'>): Promise<void> {
    const supplier = await this.getById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const newBankAccount: BankAccount = {
      ...bankAccount,
      id: Math.random().toString(36).substr(2, 9)
    };

    await this.update(supplierId, {
      bankAccounts: [...supplier.bankAccounts, newBankAccount]
    });
  }

  // Add mobile payment to existing supplier
  async addMobilePayment(supplierId: string, mobilePayment: Omit<MobilePayment, 'id'>): Promise<void> {
    const supplier = await this.getById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const newMobilePayment: MobilePayment = {
      ...mobilePayment,
      id: Math.random().toString(36).substr(2, 9)
    };

    await this.update(supplierId, {
      mobilePayments: [...supplier.mobilePayments, newMobilePayment]
    });
  }

  // Create sample data for testing
  async createSampleSuppliers(): Promise<string[]> {
    const sampleSuppliers: CreateSupplierInput[] = [
      {
        supplierName: "TechFlow Solutions Ltd",
        tinNumber: "1001234567",
        dateOfRegistration: new Date('2024-01-15'),
        address: "Plot 45, Industrial Area, Kampala, Uganda",
        emailAddress: "contact@techflow.co.ug",
        phoneNumbers: ["+256701234567", "+256752123456"],
        bankAccounts: [
          {
            bankName: "Stanbic Bank Uganda",
            accountNumber: "1234567890123",
            bankNumber: "001234"
          },
          {
            bankName: "DFCU Bank",
            accountNumber: "9876543210987",
            bankNumber: "005678"
          }
        ],
        mobilePayments: [
          {
            provider: "MTN",
            merchantCode: "MTN001234",
            phoneNumber: "+256701234567"
          }
        ],
        employeeId: "EMP001",
        routeDays: ["Monday", "Friday"] // Bi-weekly delivery - Mondays and Fridays
      },
      {
        supplierName: "Green Valley Supplies",
        tinNumber: "1001234568",
        dateOfRegistration: new Date('2024-02-20'),
        address: "Jinja Road, Industrial Park, Mukono",
        emailAddress: "info@greenvalley.co.ug",
        phoneNumbers: ["+256712345678"],
        bankAccounts: [
          {
            bankName: "Centenary Bank",
            accountNumber: "5555666677778888",
            bankNumber: "002345"
          }
        ],
        mobilePayments: [
          {
            provider: "Airtel",
            merchantCode: "AIRTEL002345",
            phoneNumber: "+256712345678"
          }
        ],
        employeeId: "EMP002",
        routeDays: ["Wednesday"] // Weekly delivery - Wednesdays
      },
      {
        supplierName: "Metro Construction Materials",
        tinNumber: "1001234569",
        dateOfRegistration: new Date('2024-03-10'),
        address: "Namanve Industrial Area, Block C, Plot 12",
        phoneNumbers: ["+256723456789", "+256787654321"],
        bankAccounts: [
          {
            bankName: "Equity Bank Uganda",
            accountNumber: "1111222233334444",
            bankNumber: "003456"
          }
        ],
        mobilePayments: [
          {
            provider: "MTN",
            merchantCode: "MTN003456",
            phoneNumber: "+256723456789"
          },
          {
            provider: "Airtel",
            merchantCode: "AIRTEL003456",
            phoneNumber: "+256787654321"
          }
        ],
        employeeId: "EMP001",
        routeDays: ["Monday", "Thursday"] // Bi-weekly delivery - Mondays and Thursdays
      },
      {
        supplierName: "East Africa Logistics",
        tinNumber: "1001234570",
        dateOfRegistration: new Date('2024-04-05'),
        address: "Port Bell Road, Container Village, Luzira",
        emailAddress: "logistics@eastafrica.com",
        phoneNumbers: ["+256734567890"],
        bankAccounts: [],
        mobilePayments: [
          {
            provider: "MTN",
            merchantCode: "MTN004567",
            phoneNumber: "+256734567890"
          }
        ],
        employeeId: "EMP003"
        // No route days - ad-hoc deliveries
      },
      {
        supplierName: "Highland Coffee Exports",
        tinNumber: "1001234571",
        dateOfRegistration: new Date('2024-05-12'),
        address: "Mbale District, Highland Estates, Coffee Processing Center",
        emailAddress: "exports@highland-coffee.ug",
        phoneNumbers: ["+256745678901", "+256798765432", "+256701111222"],
        bankAccounts: [
          {
            bankName: "Bank of Africa Uganda",
            accountNumber: "9999888877776666",
            bankNumber: "004567"
          },
          {
            bankName: "Housing Finance Bank",
            accountNumber: "7777666655554444",
            bankNumber: "006789"
          }
        ],
        mobilePayments: [
          {
            provider: "MTN",
            merchantCode: "MTN005678",
            phoneNumber: "+256745678901"
          }
        ],
        employeeId: "EMP002",
        routeDays: ["Tuesday", "Saturday"] // Bi-weekly delivery - Tuesdays and Saturdays
      }
    ];

    const createdIds: string[] = [];
    for (const supplierData of sampleSuppliers) {
      try {
        const id = await this.createSupplier(supplierData);
        createdIds.push(id);
        console.log(`Created supplier: ${supplierData.supplierName} with ID: ${id}`);
      } catch (error) {
        console.error(`Error creating supplier ${supplierData.supplierName}:`, error);
      }
    }

    return createdIds;
  }

  // Submit pending edit for approval
  async submitPendingEdit(
    supplierId: string, 
    changes: Partial<Omit<EnhancedSupplier, 'id' | 'createdAt' | 'updatedAt'>>,
    editedBy: string
  ): Promise<string> {
    const supplier = await this.getById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const pendingEdit: PendingEdit = {
      id: Math.random().toString(36).substr(2, 9),
      supplierId,
      editedBy,
      editedAt: Timestamp.now(),
      status: 'Pending',
      changes
    };

    // Add pending edit to supplier's pendingEdits array
    const updatedPendingEdits = [...(supplier.pendingEdits || []), pendingEdit];
    
    await this.update(supplierId, {
      pendingEdits: updatedPendingEdits,
      updatedAt: Timestamp.now()
    });

    return pendingEdit.id;
  }

  // Get suppliers with pending edits
  async getSuppliersWithPendingEdits(): Promise<EnhancedSupplier[]> {
    const allSuppliers = await this.getAll();
    return allSuppliers.filter(supplier => 
      supplier.pendingEdits && supplier.pendingEdits.some(edit => edit.status === 'Pending')
    );
  }

  // Approve pending edit
  async approvePendingEdit(supplierId: string, editId: string, approvedBy: string): Promise<void> {
    const supplier = await this.getById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const pendingEdit = supplier.pendingEdits?.find(edit => edit.id === editId);
    if (!pendingEdit) throw new Error('Pending edit not found');

    // Apply the changes to the supplier
    const updateData = {
      ...pendingEdit.changes,
      updatedAt: Timestamp.now()
    };

    // Update pending edit status
    const updatedPendingEdits = supplier.pendingEdits?.map(edit => 
      edit.id === editId 
        ? { ...edit, status: 'Approved' as const, approvedBy, approvedAt: Timestamp.now() }
        : edit
    ) || [];

    await this.update(supplierId, {
      ...updateData,
      pendingEdits: updatedPendingEdits
    });
  }

  // Reject pending edit
  async rejectPendingEdit(supplierId: string, editId: string, approvedBy: string, comments?: string): Promise<void> {
    const supplier = await this.getById(supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const updatedPendingEdits = supplier.pendingEdits?.map(edit => 
      edit.id === editId 
        ? { ...edit, status: 'Rejected' as const, approvedBy, approvedAt: Timestamp.now(), comments }
        : edit
    ) || [];

    await this.update(supplierId, {
      pendingEdits: updatedPendingEdits,
      updatedAt: Timestamp.now()
    });
  }
}

// Export singleton instance
export const enhancedSupplierService = new EnhancedSupplierService(); 