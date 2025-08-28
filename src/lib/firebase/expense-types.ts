// Expense Types Management
import { Timestamp } from 'firebase/firestore';
import { FirestoreService } from './firestore-service';

export interface ExpenseType {
  id: string;
  
  // Basic Information
  name: string;                    // "Office Rent", "Fuel & Transportation"
  description: string;             // Detailed description
  category: string;               // all
  subcategory?: string;           // "Vehicle Maintenance", "Office Supplies"
  
  // Financial Information
  currency: string;              // "UGX"
  
  // Approval Workflow
  requiresApproval: boolean;     // Needs approval?
  approvalLevel: 'manager' | 'director' | 'accountant' | 'auto';
  approvalThreshold?: number;    // Amount requiring approval
  
  // Department & Access Control
  allowedDepartments: string[];  // ["Administration", "Finance"]
  restrictedRoles?: string[];    // Roles that cannot use
  
  // Classification & Usage
  priority: 'critical' | 'high' | 'medium' | 'low';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one-time';
  isRecurring: boolean;          // Recurring expense?
  preferredVendors?: string[];   // Suggested vendors
  requiresReceipt: boolean;      // Must have documentation
  
  // Organization & Metadata
  tags: string[];               // ["rent", "facilities", "monthly"]
  accountingCode?: string;      // "RENT-001" for GL mapping
  budgetCategory?: string;      // Budget category mapping
  usageCount?: number;         // How often used
  lastUsed?: Timestamp;        // When last used
  
  // Status & Tracking
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}

// Firestore service for expense types
export class ExpenseTypesService extends FirestoreService<ExpenseType> {
  constructor() {
    super('expenseTypes');
  }

  // Get all active expense types
  async getActiveExpenseTypes(): Promise<ExpenseType[]> {
    const filters = [{ field: 'isActive', operator: '==', value: true }];
    const pagination = { 
      orderBy: 'category',
      orderDirection: 'asc' as 'asc' | 'desc'
    };
    return this.getAll(filters, pagination);
  }

  // Get expense types by category
  async getExpenseTypesByCategory(category: string): Promise<ExpenseType[]> {
    const filters = [
      { field: 'category', operator: '==', value: category },
      { field: 'isActive', operator: '==', value: true }
    ];
    const pagination = { 
      orderBy: 'name',
      orderDirection: 'asc' as 'asc' | 'desc'
    };
    return this.getAll(filters, pagination);
  }

  // Get expense types available to a specific department
  async getExpenseTypesForDepartment(department: string): Promise<ExpenseType[]> {
    const filters = [
      { field: 'allowedDepartments', operator: 'array-contains', value: department },
      { field: 'isActive', operator: '==', value: true }
    ];
    const pagination = { 
      orderBy: 'category',
      orderDirection: 'asc' as 'asc' | 'desc'
    };
    return this.getAll(filters, pagination);
  }

  // Generate accounting code based on category and name
  private generateAccountingCode(category: string, name: string): string {
    // Clean and format category
    const categoryCode = category
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    
    // Clean and format name
    const nameCode = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    
    // Generate timestamp-based unique suffix
    const timestamp = Date.now().toString().slice(-4);
    
    return `${categoryCode}-${nameCode}-${timestamp}`;
  }

  // Generate sequential accounting code (alternative method)
  private async generateSequentialAccountingCode(category: string): Promise<string> {
    try {
      // Get existing types in this category to generate next number
      const categoryTypes = await this.getExpenseTypesByCategory(category);
      const nextNumber = (categoryTypes.length + 1).toString().padStart(3, '0');
      
      const categoryCode = category
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 4)
        .toUpperCase();
      
      return `${categoryCode}-${nextNumber}`;
    } catch (error) {
      console.warn('Failed to generate sequential code, using timestamp method');
      return this.generateAccountingCode(category, 'TYPE');
    }
  }

  // Create new expense type
  async createExpenseType(expenseType: Omit<ExpenseType, 'id' | 'createdAt' | 'updatedAt' | 'accountingCode'>): Promise<string> {
    const now = Timestamp.now();
    
    // Auto-generate accounting code
    const accountingCode = await this.generateSequentialAccountingCode(expenseType.category);
    
    console.log(`🏷️ Generated accounting code: ${accountingCode} for ${expenseType.name}`);
    
    const newExpenseType: Omit<ExpenseType, 'id'> = {
      ...expenseType,
      accountingCode,
      createdAt: now,
      updatedAt: now,
      usageCount: 0
    };
    
    return this.create(newExpenseType);
  }

  // Update expense type
  async updateExpenseType(id: string, updates: Partial<ExpenseType>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    return this.update(id, updateData);
  }

  // Increment usage count
  async incrementUsageCount(id: string): Promise<void> {
    const expenseType = await this.getById(id);
    if (expenseType) {
      await this.update(id, {
        usageCount: (expenseType.usageCount || 0) + 1,
        lastUsed: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
  }

  // Search expense types by name or tags
  async searchExpenseTypes(searchTerm: string): Promise<ExpenseType[]> {
    const allTypes = await this.getActiveExpenseTypes();
    const searchLower = searchTerm.toLowerCase();
    
    return allTypes.filter(type => 
      type.name.toLowerCase().includes(searchLower) ||
      type.description.toLowerCase().includes(searchLower) ||
      type.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // Get most used expense types
  async getMostUsedExpenseTypes(limit: number = 10): Promise<ExpenseType[]> {
    const filters = [{ field: 'isActive', operator: '==', value: true }];
    const pagination = { 
      orderBy: 'usageCount',
      orderDirection: 'desc' as 'asc' | 'desc',
      limit
    };
    return this.getAll(filters, pagination);
  }
}

// Sample expense types data
export const sampleExpenseTypes: Omit<ExpenseType, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: "Office Rent",
    description: "Monthly rental payments for office premises",
    category: "Operations",
    subcategory: "Facilities",
    currency: "UGX",
    requiresApproval: true,
    approvalLevel: "manager",
    approvalThreshold: 1000000,
    allowedDepartments: ["Administration", "Finance"],
    priority: "critical",
    frequency: "monthly",
    isRecurring: true,
    preferredVendors: ["Kampala Property Management", "City Real Estate"],
    requiresReceipt: true,
    tags: ["rent", "facilities", "monthly", "fixed-cost"],
    budgetCategory: "Operating Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Fuel & Transportation",
    description: "Fuel costs and transportation expenses for company vehicles",
    category: "Operations",
    subcategory: "Transportation",
    currency: "UGX",
    requiresApproval: false,
    approvalLevel: "auto",
    approvalThreshold: 200000,
    allowedDepartments: ["Operations", "Sales", "Administration"],
    priority: "high",
    frequency: "daily",
    isRecurring: false,
    preferredVendors: ["Shell Uganda", "Total Uganda", "Petro Uganda"],
    requiresReceipt: true,
    tags: ["fuel", "transport", "vehicles", "daily"],
    budgetCategory: "Variable Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Office Supplies",
    description: "Stationery, printing materials, and general office supplies",
    category: "Operations",
    subcategory: "Supplies",
    currency: "UGX",
    requiresApproval: false,
    approvalLevel: "accountant",
    approvalThreshold: 150000,
    allowedDepartments: ["Administration", "HR", "Finance", "Operations"],
    priority: "medium",
    frequency: "monthly",
    isRecurring: false,
    preferredVendors: ["Aristoc Booklex", "Text Book Centre", "Printing World"],
    requiresReceipt: true,
    tags: ["supplies", "stationery", "printing", "office"],
    budgetCategory: "Operating Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Utilities - Electricity",
    description: "Monthly electricity bills for office premises",
    category: "Operations",
    subcategory: "Utilities",
    currency: "UGX",
    requiresApproval: true,
    approvalLevel: "manager",
    approvalThreshold: 500000,
    allowedDepartments: ["Administration", "Finance"],
    priority: "critical",
    frequency: "monthly",
    isRecurring: true,
    preferredVendors: ["UMEME"],
    requiresReceipt: true,
    tags: ["utilities", "electricity", "monthly", "bills"],
    budgetCategory: "Operating Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Marketing & Advertising",
    description: "Promotional materials, advertising costs, and marketing campaigns",
    category: "Marketing",
    subcategory: "Promotion",
    currency: "UGX",
    requiresApproval: true,
    approvalLevel: "director",
    approvalThreshold: 500000,
    allowedDepartments: ["Marketing", "Sales"],
    priority: "high",
    frequency: "weekly",
    isRecurring: false,
    preferredVendors: ["Creative Agency", "Radio Stations", "Print Media"],
    requiresReceipt: true,
    tags: ["marketing", "advertising", "promotion", "campaigns"],
    budgetCategory: "Marketing Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Staff Training & Development",
    description: "Employee training programs, workshops, and skill development",
    category: "Human Resources",
    subcategory: "Training",
    currency: "UGX",
    requiresApproval: true,
    approvalLevel: "director",
    approvalThreshold: 300000,
    allowedDepartments: ["HR", "Administration"],
    priority: "medium",
    frequency: "quarterly",
    isRecurring: false,
    preferredVendors: ["Training Institutes", "Consultants"],
    requiresReceipt: true,
    tags: ["training", "development", "staff", "education"],
    budgetCategory: "Human Resources",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Equipment Maintenance",
    description: "Repair and maintenance of office equipment, computers, and machinery",
    category: "Operations",
    subcategory: "Maintenance",
    currency: "UGX",
    requiresApproval: false,
    approvalLevel: "manager",
    approvalThreshold: 400000,
    allowedDepartments: ["IT", "Operations", "Administration"],
    priority: "high",
    frequency: "weekly",
    isRecurring: false,
    preferredVendors: ["Tech Solutions", "Equipment Service Co."],
    requiresReceipt: true,
    tags: ["maintenance", "repair", "equipment", "it"],
    budgetCategory: "Operating Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  },
  {
    name: "Internet & Communication",
    description: "Internet services, phone bills, and communication expenses",
    category: "Operations",
    subcategory: "Communication",
    currency: "UGX",
    requiresApproval: false,
    approvalLevel: "accountant",
    approvalThreshold: 300000,
    allowedDepartments: ["IT", "Administration"],
    priority: "critical",
    frequency: "monthly",
    isRecurring: true,
    preferredVendors: ["MTN Uganda", "Airtel Uganda", "Uganda Telecom"],
    requiresReceipt: true,
    tags: ["internet", "communication", "phone", "monthly"],
    budgetCategory: "Operating Expenses",
    isActive: true,
    createdBy: "system",
    lastModifiedBy: "system"
  }
];
