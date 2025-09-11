'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, DollarSign, Users, Banknote, FileText, AlertCircle, Plus, Minus, CreditCard, Smartphone, Building, CheckCircle, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { InterfaceDatabaseConnector } from '../../lib/firebase/interface-database-connector';
import { authService } from '../../lib/firebase/auth';
import { CashCloseService } from '../../lib/firebase/firestore-service';
import { AutomatedAllocationService } from '../../lib/firebase/automated-allocation-service';

interface TillNetworkPayment {
  id: string;
  paymentMethod: 'mobile' | 'visa_machine';
  serviceProvider: string; // For mobile: 'airtel', 'mtn', etc. For visa: bank names
  amount: number;
}

interface TillExpense {
  id: string;
  description: string;
  amount: number;
  paidAmount: number; // Default 0 for new expenses
  remainingBalance: number; // amount - paidAmount
  expenseDate: Date;
  expenseTime: Date;
  category: string; // Free text category
  expenseType: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAY_TO_DAY';
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERPAID' | 'OVERDUE';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  vendor: string;
  receiptNumber: string;
  notes: string;
  employeeId: string; // Who created this expense
  employeeName: string; // Display name
  dueDate: Date;
  tags: string[];
  department: string;
  projectCode?: string;
  tillNumber: number; // Which till this expense belongs to
  shiftType: 'day' | 'night'; // Which shift
  approvalRequired: boolean;
  // Funding source will be assigned at payment time, not during expense creation
  // For future features
  receipts?: string[]; // File upload URLs
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

interface TillData {
  tillNumber: number; // Allow any till number, not just 1 or 2
  tillName?: string; // Optional till name for identification
  cashAmount: number;
  tillUsed: number; // Amount used before cash close
  expenses: number; // Total expenses per till (calculated from expenseDetails)
  expenseDetails: TillExpense[]; // Detailed expense records for this till
  cashAtHand: number; // Actual cash present
  totalCashInTill: number; // Total physical cash in the till at close
  expectedNetworkMoney: number; // Expected network money for this till
  actualNetworkMoney: number; // Actual network money recorded for this till
  networkPayments: TillNetworkPayment[]; // Network payments specific to this till
}

interface ShiftAllocation {
  allocated: boolean;
  allocationAmount: number;
  allocatedAt?: Date;
  allocatedBy?: string;
  allocationNotes?: string;
}

interface ShiftData {
  shift: 'day' | 'night';
  tills: TillData[];
  allocation?: ShiftAllocation;
}

interface WalletEntry {
  id: string;
  date: Date;
  grossProfit: number;
  dailyExpenseFund: number;
  totalAccumulated: number;
  notes?: string;
  branchId: string;
  createdBy: string;
}

interface WalletSummary {
  totalGrossProfit: number;
  totalExpenseFund: number;
  totalAccumulated: number;
  averageDaily: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
}

interface WalletData {
  entries: WalletEntry[];
  currentPeriod: 'daily' | 'weekly' | 'monthly';
  selectedDate: Date;
  summary: WalletSummary;
}

interface CashCloseData {
  shifts: ShiftData[];
  profitPercentage: number;
  taxRate: number; // 18% tax
  businessDate: string; // The actual business date (YYYY-MM-DD format)
  monthlyExpenseFundDeduction: number; // Monthly expense fund deduction (100,000 UGX)
  enableMonthlyExpenseFund: boolean; // Toggle to enable/disable monthly expense fund deduction

  userCashAllocation: number; // User-inputted cash allocation amount for validation
  notes: string;
  walletData?: WalletData; // Add wallet tracking to cash close data
}

interface ComprehensiveCashCloseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  initialShift?: 'day' | 'night'; // Allow pre-selecting a specific shift
  allowShiftSelection?: boolean; // Whether user can change shift selection
  existingCashCloseId?: string; // For editing existing cash close
}

export default function ComprehensiveCashCloseForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialShift, 
  allowShiftSelection = true, 
  existingCashCloseId 
}: ComprehensiveCashCloseFormProps) {
  const [cashCloseData, setCashCloseData] = useState<CashCloseData>({
    shifts: [
      {
        shift: 'day',
        tills: [
          { tillNumber: 1, tillName: 'Day Till 1', cashAmount: 0, tillUsed: 0, expenses: 0, expenseDetails: [], cashAtHand: 0, totalCashInTill: 0, expectedNetworkMoney: 0, actualNetworkMoney: 0, networkPayments: [] }
        ]
      }
    ],
    profitPercentage: 12, // Default 12% for savings
    taxRate: 18,
    businessDate: new Date().toISOString().split('T')[0], // Default to today
    monthlyExpenseFundDeduction: 100000, // Default 100,000 UGX monthly expense fund
    enableMonthlyExpenseFund: false, // Disabled by default

    userCashAllocation: 0, // User-inputted cash allocation for validation
    notes: '',
    walletData: {
      entries: [],
      currentPeriod: 'daily',
      selectedDate: new Date(),
      summary: {
        totalGrossProfit: 0,
        totalExpenseFund: 0,
        totalAccumulated: 0,
        averageDaily: 0,
        period: 'daily',
        startDate: new Date(),
        endDate: new Date()
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [newNetworkPayment, setNewNetworkPayment] = useState({
    paymentMethod: 'mobile' as 'mobile' | 'visa_machine',
    serviceProvider: '',
    amount: 0
  });
  const [showNetworkPaymentForm, setShowNetworkPaymentForm] = useState(false);
  const [selectedTillForPayment, setSelectedTillForPayment] = useState<{shiftIndex: number, tillIndex: number} | null>(null);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    category: '',
    expenseType: 'GENERAL' as 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAY_TO_DAY',
    priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
    vendor: '',
    receiptNumber: '',
    notes: '',
    expenseDate: new Date().toISOString().split('T')[0], // Date when expense occurred
    expenseTime: new Date().toISOString().split('T')[1]?.split('.')[0] || '12:00', // Time when expense occurred
    dueDate: new Date().toISOString().split('T')[0], // When payment is due
    tags: [] as string[],
    department: '',
    projectCode: '',
    approvalRequired: true,
    // No funding source assigned during creation
  });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedTillForExpense, setSelectedTillForExpense] = useState<{shiftIndex: number, tillIndex: number} | null>(null);

  // Allocation states
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedShiftForAllocation, setSelectedShiftForAllocation] = useState<number | null>(null);
  const [allocationNotes, setAllocationNotes] = useState('');

  // Auto-allocation states
  const [autoAllocationPreview, setAutoAllocationPreview] = useState<AllocationResult | null>(null);
  const [showAllocationPreview, setShowAllocationPreview] = useState(false);
  const [enableAutoAllocation, setEnableAutoAllocation] = useState(true);

  // Service providers
  const mobileProviders = ['Airtel Money', 'MTN Mobile Money', 'M-Sente', 'Chipper Cash'];
  const visaMachineProviders = [
    'Centenary Bank', 'Stanbic Bank', 'Standard Chartered', 'Barclays Bank', 
    'DFCU Bank', 'KCB Bank', 'Equity Bank', 'GT Bank', 'Orient Bank', 'PostBank'
  ];

  // Helper functions for managing shifts and tills
  const addShift = (shiftType: 'day' | 'night') => {
    // Check if shift already exists - only allow one of each type
    const existingShift = cashCloseData.shifts.find(shift => shift.shift === shiftType);
    if (existingShift) {
      alert(`${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} shift already exists. You can only have one day shift and one night shift.`);
      return;
    }

    const newShift: ShiftData = {
      shift: shiftType,
      tills: [
        { 
          tillNumber: 1, 
          tillName: `${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} Till 1`, 
          cashAmount: 0, 
          tillUsed: 0, 
          expenses: 0, 
          expenseDetails: [], 
          cashAtHand: 0, 
          totalCashInTill: 0, 
          expectedNetworkMoney: 0, // Will be auto-calculated as totalCashInTill - cashAmount
          actualNetworkMoney: 0, 
          networkPayments: [] 
        }
      ]
    };

    setCashCloseData(prev => ({
      ...prev,
      shifts: [...prev.shifts, newShift]
    }));
  };

  const removeShift = (shiftIndex: number) => {
    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.filter((_, index) => index !== shiftIndex)
    }));
  };

  const addTillToShift = (shiftIndex: number) => {
    const shift = cashCloseData.shifts[shiftIndex];
    const nextTillNumber = Math.max(...shift.tills.map(till => till.tillNumber)) + 1;
    
    const newTill: TillData = {
      tillNumber: nextTillNumber,
      tillName: `${shift.shift.charAt(0).toUpperCase() + shift.shift.slice(1)} Till ${nextTillNumber}`,
      cashAmount: 0,
      tillUsed: 0,
      expenses: 0,
      expenseDetails: [],
      cashAtHand: 0,
      totalCashInTill: 0,
      expectedNetworkMoney: 0, // Will be auto-calculated as totalCashInTill - cashAmount
      actualNetworkMoney: 0,
      networkPayments: []
    };

    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, index) => 
        index === shiftIndex ? {
          ...shift,
          tills: [...shift.tills, newTill]
        } : shift
      )
    }));
  };

  const removeTillFromShift = (shiftIndex: number, tillIndex: number) => {
    const shift = cashCloseData.shifts[shiftIndex];
    if (shift.tills.length <= 1) {
      return; // Don't allow removing the last till
    }

    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, index) => 
        index === shiftIndex ? {
          ...shift,
          tills: shift.tills.filter((_, tIndex) => tIndex !== tillIndex)
        } : shift
      )
    }));
  };

  const updateTill = (shiftIndex: number, tillIndex: number, field: keyof TillData, value: number) => {
    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, sIndex) => 
        sIndex === shiftIndex ? {
          ...shift,
          tills: shift.tills.map((till, tIndex) => 
            tIndex === tillIndex ? {
              ...till, 
              [field]: value,
              // Auto-calculate expected network money when total cash or cash amount changes
              ...(field === 'totalCashInTill' || field === 'cashAmount' ? {
                expectedNetworkMoney: field === 'totalCashInTill' 
                  ? value - till.cashAmount 
                  : till.totalCashInTill - value
              } : {})
            } : till
          )
        } : shift
      )
    }));
  };

  const addNetworkPaymentToTill = () => {
    if (!selectedTillForPayment) return;
    if (newNetworkPayment.amount <= 0) return;
    if (!newNetworkPayment.serviceProvider) return;

    const payment: TillNetworkPayment = {
      id: Date.now().toString(),
      paymentMethod: newNetworkPayment.paymentMethod,
      serviceProvider: newNetworkPayment.serviceProvider,
      amount: newNetworkPayment.amount
    };

    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, sIndex) => 
        sIndex === selectedTillForPayment.shiftIndex ? {
          ...shift,
          tills: shift.tills.map((till, tIndex) => 
            tIndex === selectedTillForPayment.tillIndex ? {
              ...till,
              networkPayments: [...till.networkPayments, payment]
            } : till
          )
        } : shift
      )
    }));

    setNewNetworkPayment({ paymentMethod: 'mobile', serviceProvider: '', amount: 0 });
    setShowNetworkPaymentForm(false);
    setSelectedTillForPayment(null);
  };

  const removeNetworkPaymentFromTill = (shiftIndex: number, tillIndex: number, paymentId: string) => {
    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, sIndex) => 
        sIndex === shiftIndex ? {
          ...shift,
          tills: shift.tills.map((till, tIndex) => 
            tIndex === tillIndex ? {
              ...till,
              networkPayments: till.networkPayments.filter(payment => payment.id !== paymentId)
            } : till
          )
        } : shift
      )
    }));
  };

  // Expense Management Functions
  const addExpenseToTill = (shiftIndex: number, tillIndex: number) => {
    if (!newExpense.description.trim() || newExpense.amount <= 0) {
      return;
    }

    const currentUser = authService.getCurrentUser();
    const shift = cashCloseData.shifts[shiftIndex];
    const till = shift.tills[tillIndex];
    const now = new Date();

    const expense: TillExpense = {
      id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: newExpense.description.trim(),
      amount: newExpense.amount,
      paidAmount: 0, // New expenses start unpaid
      remainingBalance: newExpense.amount,
      expenseDate: new Date(newExpense.expenseDate + 'T' + newExpense.expenseTime),
      expenseTime: new Date(newExpense.expenseDate + 'T' + newExpense.expenseTime),
      category: newExpense.category.trim(),
      expenseType: newExpense.expenseType,
      status: 'pending',
      paymentStatus: 'UNPAID',
      priority: newExpense.priority,
      vendor: newExpense.vendor.trim(),
      receiptNumber: newExpense.receiptNumber.trim(),
      notes: newExpense.notes.trim(),
      employeeId: currentUser?.uid || 'unknown-user',
      employeeName: currentUser?.displayName || 
                   (currentUser?.employee ? 
                    `${currentUser.employee.firstName} ${currentUser.employee.lastName}` : 
                    'Unknown Employee'),
      dueDate: new Date(newExpense.dueDate),
      tags: newExpense.tags.filter(tag => tag.trim().length > 0),
      department: newExpense.department.trim(),
      projectCode: newExpense.projectCode.trim() || undefined,
      tillNumber: till.tillNumber,
      shiftType: shift.shift,
      approvalRequired: newExpense.approvalRequired,
      fundingSource: newExpense.fundingSource,
      receipts: [] // Will be populated when file upload is implemented
    };

    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, sIndex) => 
        sIndex === shiftIndex ? {
          ...shift,
          tills: shift.tills.map((till, tIndex) => 
            tIndex === tillIndex ? {
              ...till,
              expenseDetails: [...till.expenseDetails, expense],
              expenses: till.expenseDetails.reduce((sum, exp) => sum + exp.amount, 0) + expense.amount
            } : till
          )
        } : shift
      )
    }));

    setNewExpense({ 
      description: '', 
      amount: 0, 
      category: '',
      expenseType: 'GENERAL',
      priority: 'medium',
      vendor: '',
      receiptNumber: '', 
      notes: '',
      expenseDate: new Date().toISOString().split('T')[0],
      expenseTime: new Date().toISOString().split('T')[1]?.split('.')[0] || '12:00',
      dueDate: new Date().toISOString().split('T')[0],
      tags: [],
      department: '',
      projectCode: '',
      approvalRequired: true,
      // No funding source assigned
    });
    setShowExpenseForm(false);
    setSelectedTillForExpense(null);
  };

  const removeExpenseFromTill = (shiftIndex: number, tillIndex: number, expenseId: string) => {
    setCashCloseData(prev => ({
      ...prev,
      shifts: prev.shifts.map((shift, sIndex) => 
        sIndex === shiftIndex ? {
          ...shift,
          tills: shift.tills.map((till, tIndex) => 
            tIndex === tillIndex ? {
              ...till,
              expenseDetails: till.expenseDetails.filter(expense => expense.id !== expenseId),
              expenses: till.expenseDetails
                .filter(expense => expense.id !== expenseId)
                .reduce((sum, exp) => sum + exp.amount, 0)
            } : till
          )
        } : shift
      )
    }));
  };

  // Calculations
  const calculateTillTotals = (till: TillData) => {
    const totalCash = till.cashAmount;
    const totalNetworkPayments = till.networkPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCashInTill = till.totalCashInTill; // Combined cash + network money before subtractions
    const totalTillRevenue = totalCashInTill; // Use the combined total
    
    // Expected cash at hand = cash amount - till used - expenses (network money is not physical cash)
    const expectedCashAtHand = totalCash - till.tillUsed - till.expenses;
    
    // Net cash (for revenue calculation) = cash amount - till used - expenses
    const netCash = totalCash - till.tillUsed - till.expenses;
    
    // Shortage/excess based on expected vs actual cash at hand
    const shortage = till.cashAtHand < expectedCashAtHand ? expectedCashAtHand - till.cashAtHand : 0;
    const excess = till.cashAtHand > expectedCashAtHand ? till.cashAtHand - expectedCashAtHand : 0;
    
    // SYSTEM-GENERATED: Actual Network Money = Sum of all network payments for this till
    const actualNetworkMoney = totalNetworkPayments;
    
    // Network money shortage/excess calculations
    const networkShortage = actualNetworkMoney < till.expectedNetworkMoney ? 
      till.expectedNetworkMoney - actualNetworkMoney : 0;
    const networkExcess = actualNetworkMoney > till.expectedNetworkMoney ? 
      actualNetworkMoney - till.expectedNetworkMoney : 0;
    
    return { 
      totalCash, 
      totalNetworkPayments,
      actualNetworkMoney, // System-generated from network payments
      totalCashInTill,
      totalTillRevenue, 
      expectedCashAtHand,
      netCash, 
      shortage, 
      excess,
      networkShortage,
      networkExcess
    };
  };

  // Calculate expected cash allocation based on the formula:
  // Money received after 12% savings + 100,000 daily set aside + total network + remainder after 12%
  const calculateExpectedCashAllocation = () => {
    const totalRevenue = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        return shiftSum + till.totalCashInTill;
      }, 0);
    }, 0);
    
    const totalNetworkPayments = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        const { totalNetworkPayments } = calculateTillTotals(till);
        return shiftSum + totalNetworkPayments;
      }, 0);
    }, 0);
    
    // Calculate after 12% savings (this is the profitPercentage/savings)
    const savingsPercentage = cashCloseData.profitPercentage / 100; // 12% = 0.12
    const savingsAmount = totalRevenue * savingsPercentage;
    const afterSavingsAmount = totalRevenue - savingsAmount;
    
    // Daily set aside amount (100,000 UGX)
    const dailySetAside = 100000;
    
    // Expected cash allocation formula:
    // = Money after 12% savings + Daily set aside + Total network payments + Purchasing Manager Amount
    // Where PM Amount = Total cash in till - 12% of total cash in till
    const profitAmount = totalRevenue * savingsPercentage; // Total Cash in Till × Percentage
    const savings12Percent = totalRevenue * 0.12; // 12% of total cash in till
    const purchasingManagerAmount = Math.max(0, totalRevenue - savings12Percent); // Total Cash in Till - 12%
    const expectedCashAllocation = afterSavingsAmount + dailySetAside + totalNetworkPayments + purchasingManagerAmount;
    
    return {
      totalRevenue,
      savingsAmount,
      afterSavingsAmount,
      dailySetAside,
      totalNetworkPayments,
      profitAmount,
      purchasingManagerAmount,
      expectedCashAllocation,
      userCashAllocation: cashCloseData.userCashAllocation,
      difference: cashCloseData.userCashAllocation - expectedCashAllocation,
      isAccurate: Math.abs(cashCloseData.userCashAllocation - expectedCashAllocation) <= 100 // Allow 100 UGX tolerance
    };
  };

  const calculateOverallTotals = () => {
    const totalTillCash = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        const { netCash } = calculateTillTotals(till);
        return shiftSum + netCash;
      }, 0);
    }, 0);

    // SYSTEM-GENERATED: Actual Network Money = Sum of all network payments from all tills
    const totalActualNetworkMoney = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        const { actualNetworkMoney } = calculateTillTotals(till);
        return shiftSum + actualNetworkMoney;
      }, 0);
    }, 0);

    const totalNetworkPayments = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        const { totalNetworkPayments } = calculateTillTotals(till);
        return shiftSum + totalNetworkPayments;
      }, 0);
    }, 0);

    const totalCashInTill = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        return shiftSum + till.totalCashInTill;
      }, 0);
    }, 0);

    const totalActualCash = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + till.cashAtHand, 0);
    }, 0);

    const totalRevenue = totalCashInTill;
    
    // Calculate tax (18%)
    const taxAmount = totalRevenue * (cashCloseData.taxRate / 100);
    const afterTaxAmount = totalRevenue - taxAmount;
    
    // PROFIT FORMULA: Total Cash in Till × Percentage
    const profitAmount = totalCashInTill * (cashCloseData.profitPercentage / 100);
    const remainingAmount = totalCashInTill - profitAmount; // For Distribution = Total Cash in Till - Profit
    
    // Distribution - purchasing manager gets total cash in till - 12% - monthly expense fund (if enabled)
    const savingsAmount = totalCashInTill * 0.12; // 12% of total cash in till
    const purchasingManagerBeforeDeduction = Math.max(0, totalCashInTill - savingsAmount); // Total Cash in Till - 12%
    const monthlyExpenseDeduction = cashCloseData.enableMonthlyExpenseFund ? cashCloseData.monthlyExpenseFundDeduction : 0; // Only apply if enabled
    const purchasingManager = Math.max(0, purchasingManagerBeforeDeduction - monthlyExpenseDeduction); // Subtract monthly expense fund if enabled

    const totalShortage = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + calculateTillTotals(till).shortage, 0);
    }, 0);
    
    const totalExcess = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + calculateTillTotals(till).excess, 0);
    }, 0);
    
    const totalNetworkShortage = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + calculateTillTotals(till).networkShortage, 0);
    }, 0);
    
    const totalNetworkExcess = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + calculateTillTotals(till).networkExcess, 0);
    }, 0);
    
    const totalExpenses = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + till.expenses, 0);
    }, 0);

    const totalExpectedCash = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => {
        const { expectedCashAtHand } = calculateTillTotals(till);
        return shiftSum + expectedCashAtHand;
      }, 0);
    }, 0);

    const totalTillUsed = cashCloseData.shifts.reduce((sum, shift) => {
      return sum + shift.tills.reduce((shiftSum, till) => shiftSum + till.tillUsed, 0);
    }, 0);

    return {
      totalRevenue,
      totalNetworkPayments,
      totalActualNetworkMoney,
      totalCashInTill,
      totalExpectedCash,
      totalActualCash,
      totalTillUsed,
      taxAmount,
      afterTaxAmount,
      profitAmount,
      remainingAmount,
      purchasingManager,
      totalShortage,
      totalExcess,
      totalNetworkShortage,
      totalNetworkExcess,
      totalExpenses
    };
  };

  const totals = calculateOverallTotals();

  // Calculate auto-allocation preview
  const calculateAutoAllocationPreview = () => {
    if (!enableAutoAllocation || totals.totalCashInTill <= 0) {
      setAutoAllocationPreview(null);
      setShowAllocationPreview(false);
      return;
    }

    // Calculate allocation breakdown using the service
    const preview = AutomatedAllocationService.calculateAllocationBreakdown(
      totals.totalCashInTill,
      'standard', // Use standard allocation method
      0.12 // Default monthly gross profit percentage
    );

    setAutoAllocationPreview(preview);
    setShowAllocationPreview(true);
  };

  // Trigger preview calculation when totals change
  useEffect(() => {
    if (enableAutoAllocation) {
      const debounceTimer = setTimeout(() => {
        calculateAutoAllocationPreview();
      }, 500); // 500ms debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [totals.totalCashInTill, enableAutoAllocation]);

  // Initialize notes field when monthly expense fund is enabled
  useEffect(() => {
    if (cashCloseData.enableMonthlyExpenseFund && !cashCloseData.notes.includes('Monthly Expense Fund:')) {
      const monthlyFundNote = 'Monthly Expense Fund: ENABLED - UGX 100,000 deducted for monthly expenses';
      setCashCloseData(prev => ({
        ...prev,
        notes: prev.notes
          ? `${monthlyFundNote}\n\n${prev.notes}`
          : monthlyFundNote,
        m_expenseFund: 100000
      }));
    }
  }, [cashCloseData.enableMonthlyExpenseFund]);

  // Calculate shift-specific purchasing manager allocation
  const calculateShiftPMAllocation = (shiftIndex: number): number => {
    const shift = cashCloseData.shifts[shiftIndex];
    if (!shift || shift.tills.length === 0) return 0;
    
    // Calculate totals for this shift only
    const shiftTotalCashInTill = shift.tills.reduce((sum, till) => sum + till.totalCashInTill, 0);
    const shiftTotalRevenue = shiftTotalCashInTill;
    
    // Calculate after 18% tax
    const shiftTaxAmount = shiftTotalRevenue * (cashCloseData.taxRate / 100);
    const shiftAfterTaxAmount = shiftTotalRevenue - shiftTaxAmount;
    
    // Apply profit percentage to total cash in till
    const shiftProfitAmount = shiftTotalCashInTill * (cashCloseData.profitPercentage / 100);
    
    // PM Allocation = Total Cash in Till - 12% of Total Cash in Till
    const shift12PercentSavings = shiftTotalCashInTill * 0.12; // 12% of this shift's total cash
    const shiftPMAllocation = Math.max(0, shiftTotalCashInTill - shift12PercentSavings);
    
    return shiftPMAllocation;
  };

  // Check if shift is balanced (all tills have proper data)
  const isShiftBalanced = (shiftIndex: number): boolean => {
    const shift = cashCloseData.shifts[shiftIndex];
    if (!shift) return false;
    
    // Check if all tills have basic data entered
    return shift.tills.every(till => 
      till.totalCashInTill > 0 && 
      till.cashAtHand >= 0
    );
  };

  // Wallet calculation functions
  const calculateGrossProfit = (): number => {
    // Gross profit is 12% of total cash in till
    return totals.totalCashInTill * 0.12;
  };

  const calculateDailyExpenseFund = (): number => {
    // Daily expense fund is fixed 100,000 UGX set aside daily
    return 100000;
  };

  const getDateRange = (period: 'daily' | 'weekly' | 'monthly', selectedDate: Date) => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);
    
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }
    
    return { start, end };
  };

  const calculateWalletSummary = (entries: WalletEntry[], period: 'daily' | 'weekly' | 'monthly', selectedDate: Date): WalletSummary => {
    const { start, end } = getDateRange(period, selectedDate);
    const filteredEntries = entries.filter(entry => 
      entry.date >= start && entry.date <= end
    );

    const totalGrossProfit = filteredEntries.reduce((sum, entry) => sum + entry.grossProfit, 0);
    const totalExpenseFund = filteredEntries.reduce((sum, entry) => sum + entry.dailyExpenseFund, 0);
    const totalAccumulated = filteredEntries.reduce((sum, entry) => sum + entry.totalAccumulated, 0);
    
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    const averageDaily = totalAccumulated / days;

    return {
      totalGrossProfit,
      totalExpenseFund,
      totalAccumulated,
      averageDaily,
      period,
      startDate: start,
      endDate: end
    };
  };

  // Handle shift allocation
  const handleAllocateShift = async () => {
    if (selectedShiftForAllocation === null) return;
    
    try {
      const shiftIndex = selectedShiftForAllocation;
      const allocationAmount = calculateShiftPMAllocation(shiftIndex);
      const currentUser = authService.getCurrentUser();
      
      // Update shift with allocation data
      setCashCloseData(prev => ({
        ...prev,
        shifts: prev.shifts.map((shift, index) => 
          index === shiftIndex ? {
            ...shift,
            allocation: {
              allocated: true,
              allocationAmount,
              allocatedAt: new Date(),
              allocatedBy: currentUser?.uid || 'unknown',
              allocationNotes: allocationNotes
            }
          } : shift
        )
      }));
      
      // Reset allocation modal
      setShowAllocationModal(false);
      setSelectedShiftForAllocation(null);
      setAllocationNotes('');
      
      console.log(`Allocated UGX ${allocationAmount.toLocaleString()} to ${cashCloseData.shifts[shiftIndex].shift} shift`);
      
    } catch (error) {
      console.error('Error allocating shift funds:', error);
      setErrors({ submit: 'Failed to allocate shift funds' });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate tills across all shifts
    cashCloseData.shifts.forEach((shift, shiftIndex) => {
      shift.tills.forEach((till, tillIndex) => {
        if (till.cashAtHand < 0) {
          newErrors[`shift${shiftIndex}till${tillIndex}CashAtHand`] = 'Cash at hand cannot be negative';
        }
      });
    });

    // Validate profit percentage
    if (cashCloseData.profitPercentage < 0 || cashCloseData.profitPercentage > 100) {
      newErrors.profitPercentage = 'Gross profit percentage must be between 0 and 100';
    }

    // Validate special funds amount
    const totals = calculateOverallTotals();

    // Note: userCashAllocation validation removed - will be auto-calculated during submission

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Wallet handler functions
  const handleWalletPeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setCashCloseData(prev => ({
      ...prev,
      walletData: prev.walletData ? {
        ...prev.walletData,
        currentPeriod: period,
        summary: calculateWalletSummary(prev.walletData.entries, period, prev.walletData.selectedDate)
      } : prev.walletData
    }));
  };

  const handleWalletDateChange = (date: Date) => {
    setCashCloseData(prev => ({
      ...prev,
      walletData: prev.walletData ? {
        ...prev.walletData,
        selectedDate: date,
        summary: calculateWalletSummary(prev.walletData.entries, prev.walletData.currentPeriod, date)
      } : prev.walletData
    }));
  };

  const addWalletEntry = () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const grossProfit = calculateGrossProfit();
    const dailyExpenseFund = calculateDailyExpenseFund();
    const totalAccumulated = grossProfit + dailyExpenseFund;

    const newEntry: WalletEntry = {
      id: `wallet_${Date.now()}`,
      date: new Date(cashCloseData.businessDate),
      grossProfit,
      dailyExpenseFund,
      totalAccumulated,
      notes: `Entry for ${cashCloseData.businessDate}`,
      branchId: (currentUser as any).branchId || 'default-branch',
      createdBy: currentUser.uid
    };

    setCashCloseData(prev => ({
      ...prev,
      walletData: prev.walletData ? {
        ...prev.walletData,
        entries: [...prev.walletData.entries, newEntry],
        summary: calculateWalletSummary([...prev.walletData.entries, newEntry], prev.walletData.currentPeriod, prev.walletData.selectedDate)
      } : prev.walletData
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Submit button clicked - starting submission process');
    
    const isValid = validateForm();
    console.log('📋 Form validation result:', isValid);
    console.log('⚠️ Current errors:', errors);
    
    if (!isValid) {
      console.log('❌ Form validation failed, stopping submission');
      return;
    }

    console.log('✅ Form validation passed, proceeding with submission');
    setLoading(true);
    
    try {
      console.log('🔐 Checking authentication...');
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.log('❌ No authenticated user found');
        throw new Error('No authenticated user found');
      }
      console.log('✅ User authenticated:', currentUser.uid);

      // Create the comprehensive cash close data
      console.log('📝 Creating cash close document...');
      const cashCloseDocument = {
        createdBy: currentUser.uid,
        branchId: (currentUser as any).branchId || 'default-branch',
        cashCloseDate: { seconds: Math.floor(new Date(cashCloseData.businessDate + 'T00:00:00').getTime() / 1000), nanoseconds: 0 } as any,
        
        // Global Settings
        profitPercentage: cashCloseData.profitPercentage,
        taxRate: cashCloseData.taxRate,
        notes: cashCloseData.notes || `Comprehensive cash close for ${new Date().toLocaleDateString()}`,
        
        // Shift Data
        shifts: cashCloseData.shifts.map(shift => ({
          ...shift,
          tills: shift.tills.map(till => ({
            ...till,
            // Ensure all fields have default values
            cashAmount: till.cashAmount || 0,
            tillUsed: till.tillUsed || 0,
            expenses: till.expenses || 0,
            expenseDetails: till.expenseDetails || [],
            cashAtHand: till.cashAtHand || 0,
            totalCashInTill: till.totalCashInTill || 0,
            expectedNetworkMoney: till.expectedNetworkMoney || 0,
            actualNetworkMoney: (() => {
              const { actualNetworkMoney } = calculateTillTotals(till);
              return actualNetworkMoney;
            })(),
            networkPayments: till.networkPayments || [],
          })),
          // Include allocation data if exists
          allocation: shift.allocation ? {
            allocated: shift.allocation.allocated,
            allocationAmount: shift.allocation.allocationAmount,
            allocatedAt: shift.allocation.allocatedAt,
            allocatedBy: shift.allocation.allocatedBy,
            allocationNotes: shift.allocation.allocationNotes
          } : undefined
        })),
        
        // Calculated Totals
        totalRevenue: totals.totalRevenue,
        totalCashInTill: totals.totalCashInTill,
        totalNetworkPayments: totals.totalNetworkPayments,
        totalActualNetworkMoney: totals.totalActualNetworkMoney,
        totalExpectedCash: totals.totalExpectedCash,
        totalActualCash: totals.totalActualCash,
        totalTillUsed: totals.totalTillUsed,
        totalExpenses: totals.totalExpenses,
        
        // Variances
        totalShortage: totals.totalShortage,
        totalExcess: totals.totalExcess,
        totalNetworkShortage: totals.totalNetworkShortage,
        totalNetworkExcess: totals.totalNetworkExcess,
        
        // Financial Calculations
        taxAmount: totals.taxAmount,
        afterTaxAmount: totals.afterTaxAmount,
        profitAmount: totals.profitAmount,
        remainingAmount: totals.remainingAmount,

        specialFunds: 0, // Removed from form, only available in PM allocation
        purchasingManager: totals.purchasingManager,
        m_expensefund: cashCloseData.enableMonthlyExpenseFund ? cashCloseData.monthlyExpenseFundDeduction : 0, // Monthly expense fund deduction (only if enabled)
        
        // Cash Allocation (auto-calculated)
        userCashAllocation: (() => {
          const cashAllocationData = calculateExpectedCashAllocation();
          return cashAllocationData.expectedCashAllocation;
        })(),
        expectedCashAllocation: (() => {
          const cashAllocationData = calculateExpectedCashAllocation();
          return cashAllocationData.expectedCashAllocation;
        })(),
        cashAllocationDifference: 0, // No difference since user allocation equals expected
        cashAllocationValidated: true, // Always validated since auto-calculated
        
        // Wallet Data
        walletData: cashCloseData.walletData ? {
          entries: cashCloseData.walletData.entries.map(entry => ({
            ...entry,
            date: { seconds: Math.floor(entry.date.getTime() / 1000), nanoseconds: 0 } as any
          })),
          currentPeriod: cashCloseData.walletData.currentPeriod,
          selectedDate: { seconds: Math.floor(cashCloseData.walletData.selectedDate.getTime() / 1000), nanoseconds: 0 } as any,
          summary: {
            ...cashCloseData.walletData.summary,
            startDate: { seconds: Math.floor(cashCloseData.walletData.summary.startDate.getTime() / 1000), nanoseconds: 0 } as any,
            endDate: { seconds: Math.floor(cashCloseData.walletData.summary.endDate.getTime() / 1000), nanoseconds: 0 } as any
          }
        } : undefined,
        
        // Workflow
        status: 'submitted' as const
      };

      console.log('📤 Cash close document ready:', cashCloseDocument);
      
      // Use the enhanced CashCloseService
      console.log('🔧 Initializing CashCloseService...');
      const cashCloseService = new CashCloseService();
      console.log('💾 Calling createCashClose...');
      const cashCloseId = await cashCloseService.createCashClose(cashCloseDocument);
      console.log('🎉 Cash close created with ID:', cashCloseId);
      
      // Count total expenses for feedback
      const totalExpenses = cashCloseData.shifts.reduce((total, shift) => 
        total + shift.tills.reduce((shiftTotal, till) => 
          shiftTotal + till.expenseDetails.length, 0), 0);
      
      console.log(`Cash close created successfully with ID: ${cashCloseId}`);
      if (totalExpenses > 0) {
        console.log(`${totalExpenses} expense records have been automatically created in the expenses collection`);
      }

      // Automatic allocation system removed per user request
      
      // Reset form
      setCashCloseData({
        shifts: [
          {
            shift: 'day',
            tills: [
              { tillNumber: 1, tillName: 'Day Till 1', cashAmount: 0, tillUsed: 0, expenses: 0, expenseDetails: [], cashAtHand: 0, totalCashInTill: 0, expectedNetworkMoney: 0, actualNetworkMoney: 0, networkPayments: [] }
            ]
          }
        ],
        profitPercentage: 12,
        taxRate: 18,
        businessDate: new Date().toISOString().split('T')[0], // Reset to today
        monthlyExpenseFundDeduction: 100000, // Default 100,000 UGX monthly expense fund
        enableMonthlyExpenseFund: false, // Disabled by default

        userCashAllocation: 0, // Reset cash allocation
        notes: ''
      });
      
      onSubmit();
      onClose();
      
    } catch (error: any) {
      console.error('Error creating cash close:', error);
      setErrors({ submit: error.message || 'Failed to create cash close' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Wallet Tracking & Cash Close</h2>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-gray-600">Track gross profit & expense fund accumulation with comprehensive cash close</p>
                {(() => {
                  const now = new Date();
                  const hour = now.getHours();
                  const isDayTime = hour >= 6 && hour < 18;
                  const currentShiftText = isDayTime ? 'Day Shift' : 'Night Shift';
                  const shiftIcon = isDayTime ? '☀️' : '🌙';
                  
                  return (
                    <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      isDayTime ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      <span className="mr-1">{shiftIcon}</span>
                      {currentShiftText} Active ({now.toLocaleTimeString()})
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Shift Management */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Shift Management</h3>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              {!cashCloseData.shifts.find(s => s.shift === 'day') && (
                <button
                  type="button"
                  onClick={() => addShift('day')}
                  className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Day Shift
                </button>
              )}
              {!cashCloseData.shifts.find(s => s.shift === 'night') && (
                <button
                  type="button"
                  onClick={() => addShift('night')}
                  className="flex items-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Night Shift
                </button>
              )}
              {cashCloseData.shifts.find(s => s.shift === 'day') && (
                <div className="flex items-center px-3 py-2 text-sm bg-green-100 text-green-800 rounded-md">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Day Shift Active
                </div>
              )}
              {cashCloseData.shifts.find(s => s.shift === 'night') && (
                <div className="flex items-center px-3 py-2 text-sm bg-indigo-100 text-indigo-800 rounded-md">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Night Shift Active
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Shift & Till Management:</strong> 
              Create one Day Shift and one Night Shift. Within each shift, you can add multiple tills as needed for your operations.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Till Management by Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Till Records by Shift</h3>
            
            {/* Day Shift Summary */}
            {cashCloseData.shifts.find(s => s.shift === 'day') && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-semibold text-green-900 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Day Shift Summary
                  </h4>
                  <div className="text-sm text-green-700">
                    Active Period: {new Date().toLocaleDateString()}
                  </div>
                </div>
                {(() => {
                  const dayShift = cashCloseData.shifts.find(s => s.shift === 'day');
                  const totalRevenue = dayShift?.tills.reduce((sum, till) => sum + till.totalCashInTill, 0) || 0;
                  const totalCashAtHand = dayShift?.tills.reduce((sum, till) => sum + till.cashAtHand, 0) || 0;
                  const totalExpenses = dayShift?.tills.reduce((sum, till) => sum + till.expenses, 0) || 0;
                  const totalNetworkPayments = dayShift?.tills.reduce((sum, till) => sum + till.networkPayments.reduce((tillSum, payment) => tillSum + payment.amount, 0), 0) || 0;
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">
                          UGX {totalRevenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-700">Total Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">
                          UGX {totalCashAtHand.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-700">Cash at Hand</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">
                          UGX {totalNetworkPayments.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-700">Network Payments</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-900">
                          UGX {totalExpenses.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-700">Total Expenses</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-8">
              {cashCloseData.shifts.map((shift, actualShiftIndex) => {
                  return (
                <div key={shift.shift} className={`border rounded-lg p-6 ${shift.shift === 'day' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${shift.shift === 'night' ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
                      <h4 className={`text-lg font-medium capitalize ${shift.shift === 'day' ? 'text-green-900' : 'text-gray-900'}`}>
                        {shift.shift} Shift
                        {shift.shift === 'day' && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded-full">
                            Main Operations
                          </span>
                        )}
                      </h4>
                      <span className="ml-3 text-sm text-gray-500">
                        ({shift.tills.length} till{shift.tills.length !== 1 ? 's' : ''})
                      </span>
                      <span className="ml-2 text-xs text-blue-600 font-medium">
                        • Add/Remove Tills as Needed
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Allocation functionality removed per user request */}
                      
                      <button
                        type="button"
                        onClick={() => addTillToShift(actualShiftIndex)}
                        className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Till
                      </button>
                      <button
                        type="button"
                        onClick={() => removeShift(actualShiftIndex)}
                        className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        <Minus className="w-3 h-3 mr-1" />
                        Remove {shift.shift} Shift
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {shift.tills.map((till, tillIndex) => (
                      <div key={`${shift.shift}-till-${till.tillNumber}`} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-md font-medium text-gray-900">
                            {till.tillName || `Till ${till.tillNumber}`}
                          </h5>
                          {shift.tills.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTillFromShift(actualShiftIndex, tillIndex)}
                              className="flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              <Minus className="w-3 h-3 mr-1" />
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          {/* Auto-calculation Info */}
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                            <div className="flex items-center text-blue-800 text-sm">
                              <Calculator className="w-4 h-4 mr-2" />
                              <strong>Auto-calculation:</strong> Expected Network = Total Cash in Till - Cash Amount
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Cash in Till</label>
                            <input
                              type="number"
                              value={till.totalCashInTill}
                            onChange={(e) => updateTill(actualShiftIndex, tillIndex, 'totalCashInTill', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                              placeholder="Combined cash + network money made in this till"
                            />
                            <p className="text-xs text-gray-500 mt-1">Total of cash and network money before any subtractions</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                            <input
                              type="number"
                              value={till.cashAmount}
                              onChange={(e) => updateTill(actualShiftIndex, tillIndex, 'cashAmount', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                              placeholder="Enter cash amount for this till"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Till Used</label>
                              <input
                                type="number"
                                value={till.tillUsed}
                                onChange={(e) => updateTill(actualShiftIndex, tillIndex, 'tillUsed', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                                placeholder="Amount used"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Expenses</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTillForExpense({ shiftIndex: actualShiftIndex, tillIndex });
                                    setShowExpenseForm(true);
                                  }}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Expense
                                </button>
                              </div>
                              <div className="text-sm font-medium text-gray-900 mb-2">
                                Total: UGX {till.expenses.toLocaleString()}
                              </div>
                              {till.expenseDetails.length > 0 && (
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {till.expenseDetails.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between p-2 bg-gray-100 rounded text-xs">
                                      <div className="flex-1">
                                        <div className="font-medium">{expense.description}</div>
                                        <div className="text-gray-600">
                                          {expense.expenseType} • {expense.category} • UGX {expense.amount.toLocaleString()}
                                          {expense.receiptNumber && ` • Receipt: ${expense.receiptNumber}`}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {expense.vendor} • {expense.priority} priority • Due: {expense.dueDate.toLocaleDateString()}
                                        </div>
                                        <div className="text-xs mt-1">
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                            📋 No Funding Assigned
                                          </span>
                                        </div>
                                        {expense.notes && (
                                          <div className="text-gray-500 italic">{expense.notes}</div>
                                        )}
                                        <div className="text-xs text-blue-600">
                                          Status: {expense.status} • Payment: {expense.paymentStatus}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => removeExpenseFromTill(actualShiftIndex, tillIndex, expense.id)}
                                        className="text-red-600 hover:text-red-800 ml-2"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cash at Hand</label>
                            <input
                              type="number"
                              value={till.cashAtHand}
                              onChange={(e) => updateTill(actualShiftIndex, tillIndex, 'cashAtHand', parseFloat(e.target.value) || 0)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300 ${
                                errors[`shift${actualShiftIndex}till${tillIndex}CashAtHand`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Actual cash present"
                            />
                            {errors[`shift${actualShiftIndex}till${tillIndex}CashAtHand`] && (
                              <p className="text-red-600 text-sm mt-1">{errors[`shift${actualShiftIndex}till${tillIndex}CashAtHand`]}</p>
                            )}
                          </div>
                          
                          {/* Network Money Tracking */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expected Network Money
                                <span className="ml-1 text-xs text-blue-600 font-normal">(Auto-calculated)</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={till.expectedNetworkMoney}
                                  readOnly
                                  className="w-full px-3 py-2 border border-blue-200 rounded-md bg-blue-50 text-blue-800 cursor-not-allowed"
                                  placeholder="Auto-calculated"
                                />
                                <div className="absolute right-2 top-2 text-blue-500">
                                  <Calculator className="w-4 h-4" />
                                </div>
                              </div>
                              <p className="text-xs text-blue-600 mt-1">
                                = Total Cash in Till - Cash Amount
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Actual Network Money 
                                <span className="text-xs text-green-600 ml-2">(System Generated)</span>
                              </label>
                              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-medium">
                                UGX {(() => {
                                  const { actualNetworkMoney } = calculateTillTotals(till);
                                  return actualNetworkMoney.toLocaleString();
                                })()}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Auto-calculated from network payments: UGX {till.networkPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          {/* Network Payments for this Till */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">Network Payments</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTillForPayment({shiftIndex: actualShiftIndex, tillIndex});
                                  setShowNetworkPaymentForm(true);
                                }}
                                className="flex items-center px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Payment
                              </button>
                            </div>
                            
                            {till.networkPayments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {till.networkPayments.map((payment) => (
                                  <div key={payment.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                                    <div className="flex items-center space-x-2">
                                      {payment.paymentMethod === 'mobile' ? (
                                        <Smartphone className="h-3 w-3 text-blue-500" />
                                      ) : (
                                        <CreditCard className="h-3 w-3 text-green-500" />
                                      )}
                                      <span className="font-medium">{payment.serviceProvider}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">UGX {payment.amount.toLocaleString()}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeNetworkPaymentFromTill(actualShiftIndex, tillIndex, payment.id)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Till Calculations */}
                          <div className="bg-white rounded-md p-3 border border-gray-200">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cash Amount:</span>
                                <span className="font-medium">UGX {calculateTillTotals(till).totalCash.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-600">Network Payments:</span>
                                <span className="font-medium text-blue-600">UGX {calculateTillTotals(till).totalNetworkPayments.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-600">Total Revenue:</span>
                                <span className="font-medium text-purple-600">UGX {calculateTillTotals(till).totalTillRevenue.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-600">Total Cash in Till:</span>
                                <span className="font-medium text-blue-600">UGX {calculateTillTotals(till).totalCashInTill.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-indigo-600">Expected Cash:</span>
                                <span className="font-medium text-indigo-600">UGX {calculateTillTotals(till).expectedCashAtHand.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Actual Cash:</span>
                                <span className="font-medium">UGX {till.cashAtHand.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={calculateTillTotals(till).shortage > 0 ? "text-red-600" : calculateTillTotals(till).excess > 0 ? "text-green-600" : "text-gray-600"}>
                                  {calculateTillTotals(till).shortage > 0 ? "Shortage:" : calculateTillTotals(till).excess > 0 ? "Excess:" : "Variance:"}
                                </span>
                                <span className={`font-medium ${calculateTillTotals(till).shortage > 0 ? "text-red-600" : calculateTillTotals(till).excess > 0 ? "text-green-600" : "text-gray-600"}`}>
                                  {calculateTillTotals(till).shortage > 0 ? 
                                    `UGX ${calculateTillTotals(till).shortage.toLocaleString()}` :
                                    calculateTillTotals(till).excess > 0 ?
                                    `UGX ${calculateTillTotals(till).excess.toLocaleString()}` :
                                    "UGX 0"
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={calculateTillTotals(till).networkShortage > 0 ? "text-red-600" : calculateTillTotals(till).networkExcess > 0 ? "text-green-600" : "text-gray-600"}>
                                  {calculateTillTotals(till).networkShortage > 0 ? "Network Shortage:" : calculateTillTotals(till).networkExcess > 0 ? "Network Excess:" : "Network Variance:"}
                                </span>
                                <span className={`font-medium ${calculateTillTotals(till).networkShortage > 0 ? "text-red-600" : calculateTillTotals(till).networkExcess > 0 ? "text-green-600" : "text-gray-600"}`}>
                                  {calculateTillTotals(till).networkShortage > 0 ? 
                                    `UGX ${calculateTillTotals(till).networkShortage.toLocaleString()}` :
                                    calculateTillTotals(till).networkExcess > 0 ?
                                    `UGX ${calculateTillTotals(till).networkExcess.toLocaleString()}` :
                                    "UGX 0"
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                  );
                })}
            </div>
          </div>

          {/* Network payments are now managed per till above */}

          {/* Business Date Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Close Date
                  <span className="text-xs text-gray-500 ml-1">(The actual business date for this cash close)</span>
                </label>
                <input
                  type="date"
                  value={cashCloseData.businessDate}
                  onChange={(e) => setCashCloseData(prev => ({ ...prev, businessDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Current Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-xs">Selected: {new Date(cashCloseData.businessDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tax, Gross Profit, and Monthly Expense Fund Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
              <input
                type="number"
                value={cashCloseData.taxRate}
                onChange={(e) => setCashCloseData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 18 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gross Profit Percentage (%)</label>
              <input
                type="number"
                value={cashCloseData.profitPercentage}
                onChange={(e) => setCashCloseData(prev => ({ ...prev, profitPercentage: parseFloat(e.target.value) || 12 }))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.profitPercentage ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.profitPercentage && (
                <p className="text-red-600 text-sm mt-1">{errors.profitPercentage}</p>
              )}
            </div>
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="enableMonthlyExpenseFund"
                  checked={cashCloseData.enableMonthlyExpenseFund}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const monthlyFundNote = `Monthly Expense Fund: ${isChecked ? 'ENABLED' : 'DISABLED'} - ${isChecked ? 'UGX 100,000 deducted for monthly expenses' : 'Monthly deduction removed'}`;

                    setCashCloseData(prev => {
                      let updatedNotes = prev.notes || '';

                      if (isChecked) {
                        // Add note if not already present
                        if (!updatedNotes.includes('Monthly Expense Fund:')) {
                          updatedNotes = updatedNotes
                            ? `${monthlyFundNote}\n\n${updatedNotes}`
                            : monthlyFundNote;
                        }
                      } else {
                        // Remove monthly fund note when unchecked
                        updatedNotes = updatedNotes
                          .split('\n\n')
                          .filter(note => !note.includes('Monthly Expense Fund:'))
                          .join('\n\n')
                          .trim();
                      }

                      return {
                        ...prev,
                        enableMonthlyExpenseFund: isChecked,
                        notes: updatedNotes,
                        m_expenseFund: isChecked ? 100000 : 0
                      };
                    });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableMonthlyExpenseFund" className="ml-2 text-sm font-medium text-gray-700">
                  Enable Monthly Expense Fund Deduction
                </label>
              </div>
              <input
                type="number"
                value={cashCloseData.monthlyExpenseFundDeduction}
                onChange={(e) => setCashCloseData(prev => ({ ...prev, monthlyExpenseFundDeduction: parseFloat(e.target.value) || 100000 }))}
                disabled={!cashCloseData.enableMonthlyExpenseFund}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !cashCloseData.enableMonthlyExpenseFund
                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                    : 'border-gray-300'
                }`}
                placeholder="100000"
              />
              <p className="text-xs text-gray-500 mt-1">
                {cashCloseData.enableMonthlyExpenseFund
                  ? 'Amount deducted daily from PM fund for monthly expenses'
                  : 'Check the box above to enable monthly expense fund deduction'
                }
              </p>
            </div>
          </div>

          {/* Financial Summary - Real-time Calculations */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Live Financial Summary</h3>
            
            {/* Revenue Breakdown */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">Revenue Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Cash</div>
                  <div className="text-xl font-bold text-gray-900">UGX {(totals.totalRevenue - totals.totalNetworkPayments).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Actual Network Money</div>
                  <div className="text-xl font-bold text-blue-600">UGX {totals.totalActualNetworkMoney.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">System-generated from network payments</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Revenue</div>
                  <div className="text-xl font-bold text-green-600">UGX {totals.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Expenses</div>
                  <div className="text-xl font-bold text-red-600">UGX {totals.totalExpenses.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Cash Reconciliation */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">Cash Reconciliation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Cash in Till</div>
                  <div className="text-xl font-bold text-blue-600">UGX {totals.totalCashInTill.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Cash + Network money before subtractions</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Expected Cash at Hand</div>
                  <div className="text-xl font-bold text-indigo-600">UGX {totals.totalExpectedCash.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Cash - Network - Used - Expenses</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Actual Cash at Hand</div>
                  <div className="text-xl font-bold text-gray-900">UGX {totals.totalActualCash.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Physical cash counted</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Cash Variance</div>
                  <div className={`text-xl font-bold ${totals.totalShortage > totals.totalExcess ? 'text-red-600' : totals.totalExcess > totals.totalShortage ? 'text-green-600' : 'text-gray-600'}`}>
                    {totals.totalShortage === totals.totalExcess ? (
                      'UGX 0'
                    ) : totals.totalShortage > totals.totalExcess ? (
                      `UGX ${(totals.totalShortage - totals.totalExcess).toLocaleString()}`
                    ) : (
                      `UGX ${(totals.totalExcess - totals.totalShortage).toLocaleString()}`
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {totals.totalShortage === totals.totalExcess ? 'Balanced' : 
                     totals.totalShortage > totals.totalExcess ? 'Short' : 'Over'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Network Variance</div>
                  <div className={`text-xl font-bold ${totals.totalNetworkShortage > totals.totalNetworkExcess ? 'text-red-600' : totals.totalNetworkExcess > totals.totalNetworkShortage ? 'text-green-600' : 'text-gray-600'}`}>
                    {totals.totalNetworkShortage === totals.totalNetworkExcess ? (
                      'UGX 0'
                    ) : totals.totalNetworkShortage > totals.totalNetworkExcess ? (
                      `UGX ${(totals.totalNetworkShortage - totals.totalNetworkExcess).toLocaleString()}`
                    ) : (
                      `UGX ${(totals.totalNetworkExcess - totals.totalNetworkShortage).toLocaleString()}`
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {totals.totalNetworkShortage === totals.totalNetworkExcess ? 'Balanced' : 
                     totals.totalNetworkShortage > totals.totalNetworkExcess ? 'Short' : 'Over'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Till Used Total</div>
                  <div className="text-xl font-bold text-orange-600">UGX {totals.totalTillUsed.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Amount used before close</div>
                </div>
              </div>
            </div>

            {/* Tax and Gross Profit Calculations */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">Tax & Gross Profit Calculations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Tax ({cashCloseData.taxRate}%)</div>
                  <div className="text-xl font-bold text-red-600">UGX {totals.taxAmount.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">After Tax</div>
                  <div className="text-xl font-bold text-green-600">UGX {totals.afterTaxAmount.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Gross Profit ({cashCloseData.profitPercentage}%)</div>
                  <div className="text-xl font-bold text-purple-600">UGX {totals.profitAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Cash in Till × {cashCloseData.profitPercentage}%</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">For Distribution</div>
                  <div className="text-xl font-bold text-indigo-600">UGX {totals.remainingAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Cash in Till - Gross Profit</div>
                </div>
              </div>
            </div>

            {/* Wallet tracking functionality removed per user request */}
            
            {/* Allocation & Variances */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-3">Allocation & Variances</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Purchasing Manager</div>
                  <div className="text-lg font-bold text-green-600">UGX {totals.purchasingManager.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    <span className="font-medium text-green-600">
                      {cashCloseData.enableMonthlyExpenseFund
                        ? 'Total Cash - 12% - Monthly Expense Fund'
                        : 'Total Cash - 12%'
                      }
                    </span>
                    {cashCloseData.enableMonthlyExpenseFund && (
                      <>
                        <br />
                        <span className="text-orange-600">
                          Monthly Expense Fund: UGX {cashCloseData.monthlyExpenseFundDeduction.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Net Shortage/Excess</div>
                  <div className={`text-lg font-bold ${totals.totalShortage > totals.totalExcess ? 'text-red-600' : totals.totalExcess > totals.totalShortage ? 'text-green-600' : 'text-gray-600'}`}>
                    {totals.totalShortage === totals.totalExcess ? (
                      'UGX 0 (Balanced)'
                    ) : totals.totalShortage > totals.totalExcess ? (
                      `UGX ${(totals.totalShortage - totals.totalExcess).toLocaleString()} (Shortage)`
                    ) : (
                      `UGX ${(totals.totalExcess - totals.totalShortage).toLocaleString()} (Excess)`
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Till Breakdown */}
            {cashCloseData.shifts.some(shift => shift.tills.some(till => till.cashAmount > 0 || till.networkPayments.length > 0)) && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">Till Breakdown</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {cashCloseData.shifts.map((shift, shiftIndex) => (
                    <div key={shift.shift} className="bg-white rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3 capitalize flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${shift.shift === 'night' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                        {shift.shift} Shift
                      </h5>
                      <div className="space-y-2">
                        {shift.tills.map((till, tillIndex) => {
                          const tillTotals = calculateTillTotals(till);
                          const hasData = till.cashAmount > 0 || till.networkPayments.length > 0 || till.expenses > 0 || till.tillUsed > 0;
                          
                          if (!hasData) return null;
                          
                          return (
                            <div key={till.tillNumber} className="text-xs border-l-2 border-gray-200 pl-3">
                              <div className="font-medium text-gray-700">Till {till.tillNumber}</div>
                              <div className="text-gray-600">
                                Revenue: UGX {tillTotals.totalTillRevenue.toLocaleString()}
                                {tillTotals.shortage > 0 && (
                                  <span className="text-red-600 ml-2">(-{tillTotals.shortage.toLocaleString()})</span>
                                )}
                                {tillTotals.excess > 0 && (
                                  <span className="text-green-600 ml-2">(+{tillTotals.excess.toLocaleString()})</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={cashCloseData.notes}
              onChange={(e) => setCashCloseData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes about this cash close..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div>
              <button
                type="button"
                onClick={async () => {
                    setLoading(true);
                    try {
                      const currentUser = authService.getCurrentUser();
                      if (!currentUser) {
                        throw new Error('No authenticated user found');
                      }

                      const draftDocument = {
                        createdBy: currentUser.uid,
                        branchId: (currentUser as any).branchId || 'default-branch',
                        cashCloseDate: { seconds: Math.floor(new Date(cashCloseData.businessDate + 'T00:00:00').getTime() / 1000), nanoseconds: 0 } as any,
                        profitPercentage: cashCloseData.profitPercentage,
                        taxRate: cashCloseData.taxRate,
                        notes: cashCloseData.notes || `Draft cash close - ${new Date().toLocaleDateString()}`,
                        shifts: cashCloseData.shifts.map(shift => ({
                          ...shift,
                          tills: shift.tills.map(till => ({
                            ...till,
                            // Ensure all fields have default values
                            cashAmount: till.cashAmount || 0,
                            tillUsed: till.tillUsed || 0,
                            expenses: till.expenses || 0,
                            expenseDetails: till.expenseDetails || [],
                            cashAtHand: till.cashAtHand || 0,
                            totalCashInTill: till.totalCashInTill || 0,
                            expectedNetworkMoney: till.expectedNetworkMoney || 0,
                            actualNetworkMoney: (() => {
              const { actualNetworkMoney } = calculateTillTotals(till);
              return actualNetworkMoney;
            })(),
                            networkPayments: till.networkPayments || []
                          })),
                          // Include allocation data if exists
                          allocation: shift.allocation ? {
                            allocated: shift.allocation.allocated,
                            allocationAmount: shift.allocation.allocationAmount,
                            allocatedAt: shift.allocation.allocatedAt,
                            allocatedBy: shift.allocation.allocatedBy,
                            allocationNotes: shift.allocation.allocationNotes
                          } : undefined
                        })),
                        totalRevenue: totals.totalRevenue,
                        totalCashInTill: totals.totalCashInTill,
                        totalNetworkPayments: totals.totalNetworkPayments,
        totalActualNetworkMoney: totals.totalActualNetworkMoney,
                        totalExpectedCash: totals.totalExpectedCash,
                        totalActualCash: totals.totalActualCash,
                        totalTillUsed: totals.totalTillUsed,
                        totalExpenses: totals.totalExpenses,
                        totalShortage: totals.totalShortage,
                        totalExcess: totals.totalExcess,
                        totalNetworkShortage: totals.totalNetworkShortage,
                        totalNetworkExcess: totals.totalNetworkExcess,
                        taxAmount: totals.taxAmount,
                        afterTaxAmount: totals.afterTaxAmount,
                        profitAmount: totals.profitAmount,
                        remainingAmount: totals.remainingAmount,
                
                        specialFunds: 0, // Removed from form, only available in PM allocation
        purchasingManager: totals.purchasingManager,
                        userCashAllocation: cashCloseData.userCashAllocation,
                        status: 'draft' as const
                      };
                      
                      const cashCloseService = new CashCloseService();
                      if (existingCashCloseId) {
                        await cashCloseService.updateCashClose(existingCashCloseId, draftDocument);
                        console.log(`Draft updated for cash close`);
                      } else {
                        const draftId = await cashCloseService.createCashClose(draftDocument);
                        console.log(`Draft saved for cash close with ID: ${draftId}`);
                      }
                    } catch (error: any) {
                      console.error('Error saving draft:', error);
                      setErrors({ submit: error.message || 'Failed to save draft' });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Save as Draft</span>
                </button>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                onClick={() => console.log('🖱️ Submit button clicked!')}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Submit Cash Close
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Network Payment Modal */}
      {showNetworkPaymentForm && selectedTillForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Network Payment
              </h3>
              <button 
                onClick={() => {
                  setShowNetworkPaymentForm(false);
                  setSelectedTillForPayment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={newNetworkPayment.paymentMethod}
                  onChange={(e) => setNewNetworkPayment(prev => ({ 
                    ...prev, 
                    paymentMethod: e.target.value as 'mobile' | 'visa_machine',
                    serviceProvider: '' // Reset service provider when method changes
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="mobile">Mobile Money</option>
                  <option value="visa_machine">Visa Machine</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider</label>
                <select
                  value={newNetworkPayment.serviceProvider}
                  onChange={(e) => setNewNetworkPayment(prev => ({ ...prev, serviceProvider: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Provider</option>
                  {(newNetworkPayment.paymentMethod === 'mobile' ? mobileProviders : visaMachineProviders).map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={newNetworkPayment.amount}
                  onChange={(e) => setNewNetworkPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                  placeholder="Enter amount"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNetworkPaymentForm(false);
                    setSelectedTillForPayment(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addNetworkPaymentToTill}
                  disabled={!newNetworkPayment.serviceProvider || newNetworkPayment.amount <= 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseForm && selectedTillForExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Expense</h3>
                <button
                  onClick={() => {
                    setShowExpenseForm(false);
                    setSelectedTillForExpense(null);
                    setNewExpense({ 
      description: '', 
      amount: 0, 
      category: '',
      expenseType: 'GENERAL',
      priority: 'medium',
      vendor: '',
      receiptNumber: '', 
      notes: '',
      expenseDate: new Date().toISOString().split('T')[0],
      expenseTime: new Date().toISOString().split('T')[1]?.split('.')[0] || '12:00',
      dueDate: new Date().toISOString().split('T')[0],
      tags: [],
      department: '',
      projectCode: '',
      approvalRequired: true,
      // No funding source assigned
    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="What was this expense for?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (UGX) *
                    </label>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      value={newExpense.expenseDate}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, expenseDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Time *
                    </label>
                    <input
                      type="time"
                      value={newExpense.expenseTime}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, expenseTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Type *
                    </label>
                    <select
                      value={newExpense.expenseType}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, expenseType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="GENERAL">General</option>
                      <option value="URA">URA</option>
                      <option value="EMERGENCIES">Emergencies</option>
                      <option value="DAY_TO_DAY">Day to Day</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority *
                    </label>
                    <select
                      value={newExpense.priority}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="e.g., Office supplies, Transport"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={newExpense.vendor}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, vendor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="Vendor/supplier name"
                    />
                  </div>
                </div>

                {/* Funding Source Selection */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <span className="flex items-center">
                      💰 Funding Source
                      <span className="ml-2 text-xs text-gray-500">(Required)</span>
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        newExpense.fundingSource === 'DAILY_EXPENSE_FUND' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                      onClick={() => setNewExpense(prev => ({ ...prev, fundingSource: 'DAILY_EXPENSE_FUND' }))}
                    >
                      <div className="flex items-center mb-2">
                        <div className="w-4 h-4 border-2 border-blue-500 rounded-full mr-3 flex items-center justify-center">
                          {newExpense.fundingSource === 'DAILY_EXPENSE_FUND' && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">Daily Expense Fund</span>
                      </div>
                      <div className="text-sm text-gray-600 ml-7">
                        <div className="font-medium text-blue-600">100,000 UGX Daily Collection</div>
                        <div className="text-xs mt-1">Fixed daily fund for regular expenses</div>
                      </div>
                    </div>
                    
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        newExpense.fundingSource === 'WALLET_GROSS_PROFIT' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                      onClick={() => setNewExpense(prev => ({ ...prev, fundingSource: 'WALLET_GROSS_PROFIT' }))}
                    >
                      <div className="flex items-center mb-2">
                        <div className="w-4 h-4 border-2 border-green-500 rounded-full mr-3 flex items-center justify-center">
                          {newExpense.fundingSource === 'WALLET_GROSS_PROFIT' && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">Wallet Gross Profit</span>
                      </div>
                      <div className="text-sm text-gray-600 ml-7">
                        <div className="font-medium text-green-600">12% Accumulated Profit</div>
                        <div className="text-xs mt-1">From daily cash close accumulations</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
                    💡 <strong>Tip:</strong> Choose the funding source that best matches this expense type. 
                    Daily expenses typically use the Daily Expense Fund, while larger investments or unexpected costs may use Wallet Gross Profit.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receipt Number
                    </label>
                    <input
                      type="text"
                      value={newExpense.receiptNumber}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="Receipt reference"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newExpense.dueDate}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={newExpense.department}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="Department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Code
                    </label>
                    <input
                      type="text"
                      value={newExpense.projectCode}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, projectCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                      placeholder="Optional project code"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newExpense.tags.join(', ')}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                    placeholder="urgent, operational, maintenance"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                    placeholder="Additional details about this expense"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="approvalRequired"
                    checked={newExpense.approvalRequired}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, approvalRequired: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="approvalRequired" className="ml-2 text-sm text-gray-700">
                    Requires approval
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setSelectedTillForExpense(null);
                    setNewExpense({ 
      description: '', 
      amount: 0, 
      category: '',
      expenseType: 'GENERAL',
      priority: 'medium',
      vendor: '',
      receiptNumber: '', 
      notes: '',
      expenseDate: new Date().toISOString().split('T')[0],
      expenseTime: new Date().toISOString().split('T')[1]?.split('.')[0] || '12:00',
      dueDate: new Date().toISOString().split('T')[0],
      tags: [],
      department: '',
      projectCode: '',
      approvalRequired: true,
      // No funding source assigned
    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTillForExpense) {
                      addExpenseToTill(selectedTillForExpense.shiftIndex, selectedTillForExpense.tillIndex);
                    }
                  }}
                  disabled={!newExpense.description.trim() || newExpense.amount <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocationModal && selectedShiftForAllocation !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Allocate Purchasing Manager Funds
              </h3>
              <button 
                onClick={() => {
                  setShowAllocationModal(false);
                  setSelectedShiftForAllocation(null);
                  setAllocationNotes('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Shift Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 capitalize">
                  {cashCloseData.shifts[selectedShiftForAllocation as number].shift} Shift
                </h4>
                <div className="mt-2 space-y-1 text-sm text-blue-800">
                  <p>Tills: {cashCloseData.shifts[selectedShiftForAllocation as number].tills.length}</p>
                  <p>Total Cash in Till: UGX {cashCloseData.shifts[selectedShiftForAllocation as number].tills.reduce((sum: number, till: any) => sum + till.totalCashInTill, 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Allocation Amount */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Allocation Amount</h4>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  UGX {calculateShiftPMAllocation(selectedShiftForAllocation as number).toLocaleString()}
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Formula: Total Cash in Till - (12% of Total Cash in Till + Proportional Daily Expense Fund)
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Notes (Optional)
                </label>
                <textarea
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about this allocation..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllocationModal(false);
                    setSelectedShiftForAllocation(null);
                    setAllocationNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAllocateShift}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Confirm Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}