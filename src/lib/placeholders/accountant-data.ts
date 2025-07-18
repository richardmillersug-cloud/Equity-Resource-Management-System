// Placeholder data for accountant views
import { Timestamp } from 'firebase/firestore';
import { mockExpensesData } from './expenses-mock-data';

export const placeholderCashAllocations = [
  {
    id: 'ca_001',
    allocationDate: Timestamp.fromDate(new Date('2024-01-15')),
    cashCloseTotal: 150000,
    savings: 18000, // 12% of total
    specialFunds: 45000,
    purchasingManager: 87000,
    accountantId: 'acc_001',
    allocationStatus: 'BALANCED',
    savingsValidation: 'CORRECT',
    notes: 'Monthly allocation for January operations'
  },
  {
    id: 'ca_002',
    allocationDate: Timestamp.fromDate(new Date('2024-01-10')),
    cashCloseTotal: 125000,
    savings: 15000,
    specialFunds: 37500,
    purchasingManager: 72500,
    accountantId: 'acc_001',
    allocationStatus: 'BALANCED',
    savingsValidation: 'CORRECT',
    notes: 'Weekly allocation for branch operations'
  },
  {
    id: 'ca_003',
    allocationDate: Timestamp.fromDate(new Date('2024-01-08')),
    cashCloseTotal: 200000,
    savings: 22000, // Incorrect - should be 24000
    specialFunds: 60000,
    purchasingManager: 118000,
    accountantId: 'acc_001',
    allocationStatus: 'UNBALANCED',
    savingsValidation: 'INCORRECT',
    notes: 'Emergency allocation for urgent supplies'
  },
  {
    id: 'ca_004',
    allocationDate: Timestamp.fromDate(new Date('2024-01-05')),
    cashCloseTotal: 175000,
    savings: 21000,
    specialFunds: 52500,
    purchasingManager: 101500,
    accountantId: 'acc_001',
    allocationStatus: 'BALANCED',
    savingsValidation: 'CORRECT',
    notes: 'Regular weekly allocation'
  },
  {
    id: 'ca_005',
    allocationDate: Timestamp.fromDate(new Date('2024-01-01')),
    cashCloseTotal: 300000,
    savings: 36000,
    specialFunds: 90000,
    purchasingManager: 174000,
    accountantId: 'acc_001',
    allocationStatus: 'BALANCED',
    savingsValidation: 'CORRECT',
    notes: 'New Year allocation for Q1 operations'
  }
];

// Use the comprehensive mock expenses data
export const placeholderExpenses = mockExpensesData;

export const placeholderSpecialFunds = [
  {
    id: 'sf_001',
    accountantId: 'acc_001',
    specialFundsAllocated: 150000,
    specialFundsAcknowledged: 120000,
    specialFundsBalance: 30000,
    savingsAllocated: 60000,
    savingsAcknowledged: 60000,
    savingsBalance: 0,
    lastUpdated: Timestamp.fromDate(new Date('2024-01-15')),
    notes: 'Q1 special funds allocation'
  },
  {
    id: 'sf_002',
    accountantId: 'acc_001',
    specialFundsAllocated: 200000,
    specialFundsAcknowledged: 180000,
    specialFundsBalance: 20000,
    savingsAllocated: 80000,
    savingsAcknowledged: 75000,
    savingsBalance: 5000,
    lastUpdated: Timestamp.fromDate(new Date('2024-01-10')),
    notes: 'Emergency fund allocation'
  },
  {
    id: 'sf_003',
    accountantId: 'acc_001',
    specialFundsAllocated: 100000,
    specialFundsAcknowledged: 100000,
    specialFundsBalance: 0,
    savingsAllocated: 40000,
    savingsAcknowledged: 40000,
    savingsBalance: 0,
    lastUpdated: Timestamp.fromDate(new Date('2024-01-05')),
    notes: 'Regular monthly allocation'
  }
];

// Calculate financial summary from mock expenses
const calculateFinancialSummary = () => {
  const totalExpenses = mockExpensesData.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPaid = mockExpensesData.reduce((sum, exp) => sum + exp.paidAmount, 0);
  const pendingPayments = mockExpensesData.reduce((sum, exp) => sum + exp.remainingBalance, 0);
  
  return {
    totalAllocated: 650000,
    totalExpenses,
    totalPaid,
    pendingPayments,
    savingsTotal: 112000,
    specialFundsTotal: 50000,
    monthlyTrends: [
      { month: 'Aug 2023', allocated: 500000, expenses: 120000 },
      { month: 'Sep 2023', allocated: 550000, expenses: 135000 },
      { month: 'Oct 2023', allocated: 600000, expenses: 145000 },
      { month: 'Nov 2023', allocated: 580000, expenses: 140000 },
      { month: 'Dec 2023', allocated: 620000, expenses: 155000 },
      { month: 'Jan 2024', allocated: 650000, expenses: totalExpenses }
    ],
    expensesByCategory: [
      { category: 'Rent & Utilities', amount: 3350000, percentage: 20.2 },
      { category: 'Software & Technology', amount: 4500000, percentage: 27.1 },
      { category: 'Insurance & Legal', amount: 6300000, percentage: 38.0 },
      { category: 'Vehicle & Transport', amount: 3000000, percentage: 18.1 },
      { category: 'Marketing & Advertising', amount: 1500000, percentage: 9.0 },
      { category: 'Office Supplies', amount: 1200000, percentage: 7.2 },
      { category: 'Equipment & Hardware', amount: 8500000, percentage: 51.2 },
      { category: 'Training & Development', amount: 2200000, percentage: 13.3 }
    ]
  };
};

export const placeholderFinancialSummary = calculateFinancialSummary();

// Helper function to get placeholder data when real data is empty
export const getPlaceholderData = (dataType: 'cashAllocations' | 'expenses' | 'specialFunds' | 'summary') => {
  switch (dataType) {
    case 'cashAllocations':
      return placeholderCashAllocations;
    case 'expenses':
      return placeholderExpenses;
    case 'specialFunds':
      return placeholderSpecialFunds;
    case 'summary':
      return placeholderFinancialSummary;
    default:
      return [];
  }
};

// Helper function to merge real data with placeholders
export const mergeWithPlaceholders = (realData: Record<string, unknown>[], placeholderData: Record<string, unknown>[]) => {
  if (realData && realData.length > 0) {
    return realData;
  }
  return placeholderData;
}; 