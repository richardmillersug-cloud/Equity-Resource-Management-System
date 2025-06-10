// Comprehensive mock expense data for the expenses view
import { Timestamp } from 'firebase/firestore';

export interface MockExpense {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  remainingBalance: number;
  expenseDate: Timestamp;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID' | 'OVERDUE';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  vendor: string;
  receiptNumber: string;
  notes: string;
  createdBy: string;
  approvedBy?: string;
  dueDate: Timestamp;
  tags: string[];
  department: string;
  projectCode?: string;
}

export const mockExpensesData: MockExpense[] = [
  {
    id: 'exp_001',
    description: 'Office Rent - January 2024',
    amount: 2500000,
    paidAmount: 2500000,
    remainingBalance: 0,
    expenseDate: Timestamp.fromDate(new Date('2024-01-01')),
    dueDate: Timestamp.fromDate(new Date('2024-01-05')),
    category: 'Rent & Utilities',
    status: 'approved',
    paymentStatus: 'FULLY_PAID',
    priority: 'high',
    vendor: 'Kampala Property Management Ltd',
    receiptNumber: 'KPM-2024-001',
    notes: 'Monthly office rent payment for main branch',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['recurring', 'fixed-cost'],
    department: 'Administration',
    projectCode: 'ADM-2024-001'
  },
  {
    id: 'exp_002',
    description: 'Electricity Bill - December 2023',
    amount: 850000,
    paidAmount: 425000,
    remainingBalance: 425000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-03')),
    dueDate: Timestamp.fromDate(new Date('2024-01-15')),
    category: 'Rent & Utilities',
    status: 'approved',
    paymentStatus: 'PARTIALLY_PAID',
    priority: 'medium',
    vendor: 'Uganda Electricity Distribution Company',
    receiptNumber: 'UMEME-2023-12-001',
    notes: 'Partial payment made, balance due end of month',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['utilities', 'recurring'],
    department: 'Operations'
  },
  {
    id: 'exp_003',
    description: 'Office Supplies - Stationery and Equipment',
    amount: 1200000,
    paidAmount: 0,
    remainingBalance: 1200000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-05')),
    dueDate: Timestamp.fromDate(new Date('2024-01-20')),
    category: 'Office Supplies',
    status: 'pending',
    paymentStatus: 'UNPAID',
    priority: 'low',
    vendor: 'Office Depot Uganda',
    receiptNumber: 'ODU-2024-001',
    notes: 'Bulk purchase of office supplies for Q1 operations',
    createdBy: 'acc_001',
    tags: ['supplies', 'bulk-purchase'],
    department: 'Administration'
  },
  {
    id: 'exp_004',
    description: 'Marketing Campaign - Digital Advertising',
    amount: 1500000,
    paidAmount: 1500000,
    remainingBalance: 0,
    expenseDate: Timestamp.fromDate(new Date('2024-01-07')),
    dueDate: Timestamp.fromDate(new Date('2024-01-10')),
    category: 'Marketing & Advertising',
    status: 'approved',
    paymentStatus: 'FULLY_PAID',
    priority: 'medium',
    vendor: 'Digital Marketing Solutions Uganda',
    receiptNumber: 'DMS-2024-001',
    notes: 'Q1 social media advertising campaign across platforms',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['marketing', 'digital', 'campaign'],
    department: 'Marketing',
    projectCode: 'MKT-2024-Q1'
  },
  {
    id: 'exp_005',
    description: 'Software Licenses - Accounting & CRM Systems',
    amount: 4500000,
    paidAmount: 0,
    remainingBalance: 4500000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-10')),
    dueDate: Timestamp.fromDate(new Date('2024-01-25')),
    category: 'Software & Technology',
    status: 'pending',
    paymentStatus: 'OVERDUE',
    priority: 'urgent',
    vendor: 'TechSoft Solutions East Africa',
    receiptNumber: 'TSS-2024-001',
    notes: 'Annual license renewal for accounting and CRM software',
    createdBy: 'acc_001',
    tags: ['software', 'annual', 'critical'],
    department: 'IT'
  },
  {
    id: 'exp_006',
    description: 'Vehicle Maintenance - Fleet Service',
    amount: 1800000,
    paidAmount: 2000000,
    remainingBalance: -200000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-12')),
    dueDate: Timestamp.fromDate(new Date('2024-01-15')),
    category: 'Vehicle & Transport',
    status: 'approved',
    paymentStatus: 'OVERPAID',
    priority: 'medium',
    vendor: 'Kampala Auto Service Center',
    receiptNumber: 'KASC-2024-001',
    notes: 'Overpaid due to additional repairs discovered during service',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['maintenance', 'fleet', 'overpaid'],
    department: 'Operations'
  },
  {
    id: 'exp_007',
    description: 'Business Travel - Jinja Branch Visit',
    amount: 750000,
    paidAmount: 300000,
    remainingBalance: 450000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-14')),
    dueDate: Timestamp.fromDate(new Date('2024-01-18')),
    category: 'Travel & Accommodation',
    status: 'approved',
    paymentStatus: 'PARTIALLY_PAID',
    priority: 'low',
    vendor: 'Travel Plus Uganda',
    receiptNumber: 'TPU-2024-001',
    notes: 'Advance payment made, balance for accommodation and meals',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['travel', 'branch-visit'],
    department: 'Management'
  },
  {
    id: 'exp_008',
    description: 'Insurance Premium - Business Comprehensive',
    amount: 3500000,
    paidAmount: 0,
    remainingBalance: 3500000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-15')),
    dueDate: Timestamp.fromDate(new Date('2024-01-30')),
    category: 'Insurance & Legal',
    status: 'pending',
    paymentStatus: 'UNPAID',
    priority: 'high',
    vendor: 'National Insurance Company Uganda',
    receiptNumber: 'NICU-2024-001',
    notes: 'Quarterly business insurance premium covering all operations',
    createdBy: 'acc_001',
    tags: ['insurance', 'quarterly', 'comprehensive'],
    department: 'Administration'
  },
  {
    id: 'exp_009',
    description: 'Training & Development - Staff Workshop',
    amount: 2200000,
    paidAmount: 1100000,
    remainingBalance: 1100000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-16')),
    dueDate: Timestamp.fromDate(new Date('2024-01-22')),
    category: 'Training & Development',
    status: 'approved',
    paymentStatus: 'PARTIALLY_PAID',
    priority: 'medium',
    vendor: 'Professional Development Institute',
    receiptNumber: 'PDI-2024-001',
    notes: '50% advance paid, balance due after workshop completion',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['training', 'staff-development'],
    department: 'Human Resources',
    projectCode: 'HR-2024-001'
  },
  {
    id: 'exp_010',
    description: 'Equipment Purchase - Computers & Printers',
    amount: 8500000,
    paidAmount: 0,
    remainingBalance: 8500000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-18')),
    dueDate: Timestamp.fromDate(new Date('2024-02-01')),
    category: 'Equipment & Hardware',
    status: 'processing',
    paymentStatus: 'UNPAID',
    priority: 'high',
    vendor: 'Computer World Uganda',
    receiptNumber: 'CWU-2024-001',
    notes: 'New computers and printers for expanded operations',
    createdBy: 'acc_001',
    tags: ['equipment', 'computers', 'expansion'],
    department: 'IT',
    projectCode: 'IT-2024-001'
  },
  {
    id: 'exp_011',
    description: 'Security Services - Monthly Contract',
    amount: 1800000,
    paidAmount: 1800000,
    remainingBalance: 0,
    expenseDate: Timestamp.fromDate(new Date('2024-01-20')),
    dueDate: Timestamp.fromDate(new Date('2024-01-25')),
    category: 'Security & Safety',
    status: 'approved',
    paymentStatus: 'FULLY_PAID',
    priority: 'high',
    vendor: 'Elite Security Services Uganda',
    receiptNumber: 'ESS-2024-001',
    notes: 'Monthly security services for all branches',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['security', 'monthly', 'all-branches'],
    department: 'Security'
  },
  {
    id: 'exp_012',
    description: 'Telecommunications - Internet & Phone Bills',
    amount: 950000,
    paidAmount: 0,
    remainingBalance: 950000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-22')),
    dueDate: Timestamp.fromDate(new Date('2024-01-28')),
    category: 'Telecommunications',
    status: 'approved',
    paymentStatus: 'OVERDUE',
    priority: 'urgent',
    vendor: 'MTN Uganda Business',
    receiptNumber: 'MTN-2024-001',
    notes: 'Monthly internet and phone services - payment overdue',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['telecom', 'internet', 'overdue'],
    department: 'IT'
  },
  {
    id: 'exp_013',
    description: 'Cleaning & Maintenance - Janitorial Services',
    amount: 650000,
    paidAmount: 650000,
    remainingBalance: 0,
    expenseDate: Timestamp.fromDate(new Date('2024-01-24')),
    dueDate: Timestamp.fromDate(new Date('2024-01-26')),
    category: 'Maintenance & Cleaning',
    status: 'approved',
    paymentStatus: 'FULLY_PAID',
    priority: 'low',
    vendor: 'Clean Pro Services',
    receiptNumber: 'CPS-2024-001',
    notes: 'Monthly cleaning and janitorial services',
    createdBy: 'acc_001',
    approvedBy: 'mgr_001',
    tags: ['cleaning', 'janitorial', 'monthly'],
    department: 'Administration'
  },
  {
    id: 'exp_014',
    description: 'Legal & Professional Services - Consultation',
    amount: 2800000,
    paidAmount: 1400000,
    remainingBalance: 1400000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-25')),
    dueDate: Timestamp.fromDate(new Date('2024-02-05')),
    category: 'Insurance & Legal',
    status: 'processing',
    paymentStatus: 'PARTIALLY_PAID',
    priority: 'medium',
    vendor: 'Kampala Legal Associates',
    receiptNumber: 'KLA-2024-001',
    notes: 'Legal consultation for business expansion - 50% paid',
    createdBy: 'acc_001',
    tags: ['legal', 'consultation', 'expansion'],
    department: 'Legal'
  },
  {
    id: 'exp_015',
    description: 'Fuel & Transport - Fleet Operations',
    amount: 1200000,
    paidAmount: 0,
    remainingBalance: 1200000,
    expenseDate: Timestamp.fromDate(new Date('2024-01-26')),
    dueDate: Timestamp.fromDate(new Date('2024-01-30')),
    category: 'Vehicle & Transport',
    status: 'rejected',
    paymentStatus: 'UNPAID',
    priority: 'medium',
    vendor: 'Shell Uganda',
    receiptNumber: 'SHELL-2024-001',
    notes: 'Rejected due to incomplete documentation - resubmit required',
    createdBy: 'acc_001',
    tags: ['fuel', 'transport', 'rejected'],
    department: 'Operations'
  }
];

// Summary calculations
export const getExpensesSummary = (expenses: MockExpense[]) => {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPaid = expenses.reduce((sum, exp) => sum + exp.paidAmount, 0);
  const pendingPayments = expenses.reduce((sum, exp) => sum + exp.remainingBalance, 0);
  const approvedCount = expenses.filter(exp => exp.status === 'approved').length;
  const pendingCount = expenses.filter(exp => exp.status === 'pending').length;
  const overdueCount = expenses.filter(exp => exp.paymentStatus === 'OVERDUE').length;
  const urgentCount = expenses.filter(exp => exp.priority === 'urgent').length;

  return {
    totalExpenses,
    totalPaid,
    pendingPayments,
    approvedCount,
    pendingCount,
    overdueCount,
    urgentCount,
    totalCount: expenses.length
  };
};

// Get unique categories
export const getExpenseCategories = (expenses: MockExpense[]) => {
  return [...new Set(expenses.map(exp => exp.category))];
};

// Get unique departments
export const getExpenseDepartments = (expenses: MockExpense[]) => {
  return [...new Set(expenses.map(exp => exp.department))];
};

// Filter expenses by various criteria
export const filterExpenses = (
  expenses: MockExpense[],
  searchTerm: string = '',
  statusFilter: string = 'all',
  categoryFilter: string = 'all',
  priorityFilter: string = 'all',
  paymentStatusFilter: string = 'all'
) => {
  return expenses.filter(expense => {
    const matchesSearch = searchTerm === '' || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || expense.priority === priorityFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || expense.paymentStatus === paymentStatusFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesPaymentStatus;
  });
}; 