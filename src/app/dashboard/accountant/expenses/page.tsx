'use client';

import { useState, useEffect } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { CashCloseService, ExpenseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
import { InterfaceDatabaseConnector } from '@/lib/firebase/interface-database-connector';
import { authService } from '@/lib/firebase/auth';
// REMOVED: No more mock/placeholder data - using real database data only
import { Timestamp } from 'firebase/firestore';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  Building,
  Receipt,
  RefreshCw,
  Filter,
  Printer,
  CreditCard,
  X
} from 'lucide-react';
import ExpenseReceiptView from '@/components/ui/ExpenseReceiptView';
import { ExpensePaymentService, PaymentMethod } from '@/lib/firebase/expense-payment-service';
import { FundingSourceDisplay, FundingSourceSelector } from '@/components/ui/FundingSourceDisplay';
import { FundingSourceService } from '@/lib/firebase/funding-source-service';

// Enhanced expense interface to combine expenses from both sources
interface CombinedExpense {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  remainingBalance: number;
  expenseDate: Date;
  category: string;
  expenseType?: string;
  status: string;
  paymentStatus: string;
  priority: string;
  vendor: string;
  receiptNumber: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  dueDate?: Date;
  tags?: string[];
  department?: string;
  projectCode?: string;
  fundingSource?: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT' | null;
  source: 'expenses_table' | 'expenses_collection' | 'cash_close';
  sourceDetails?: string;
  cashCloseDate?: Date;
  originalData?: any;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<CombinedExpense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<CombinedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // New filter for data source
  const [monthFilter, setMonthFilter] = useState('all'); // New filter for monthly view

  // Pagination
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems: paginatedExpenses,
    startIndex: pageStartIndex,
    endIndex: pageEndIndex,
  } = usePagination(filteredExpenses, 10);

  // Fund balance states
  const [fundBalances, setFundBalances] = useState<{
    dailyFund: { currentBalance: number; totalAllocated: number } | null;
    grossProfit: { currentBalance: number; totalAllocated: number } | null;
  }>({ dailyFund: null, grossProfit: null });

  // Print modal states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedExpenseForPrint, setSelectedExpenseForPrint] = useState<CombinedExpense | null>(null);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<CombinedExpense | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'bank_deposit' | 'mobile_money'>('cash');
  const [fundingSource, setFundingSource] = useState<'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT'>('DAILY_EXPENSE_FUND');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Print handler
  const handlePrintExpense = (expense: CombinedExpense) => {
    setSelectedExpenseForPrint(expense);
    setShowPrintModal(true);
  };

  // Payment handlers
  const handlePayExpense = (expense: CombinedExpense) => {
    // Check if expense is fully paid
    if (expense.paymentStatus === 'FULLY_PAID' || expense.remainingBalance <= 0) {
      setPaymentError(`This expense is already fully paid! Total: ${formatCurrency(expense.amount)}, Paid: ${formatCurrency(expense.paidAmount)}`);
      setPaymentSuccess(null);
      
      // Show error message for 3 seconds
      setTimeout(() => {
        setPaymentError(null);
      }, 3000);
      return;
    }
    
    // Check if there's a valid remaining balance
    const actualRemainingBalance = Math.max(0, expense.amount - expense.paidAmount);
    if (actualRemainingBalance <= 0 && expense.paidAmount >= expense.amount) {
      setPaymentError(`No payment needed. This expense is fully paid!`);
      setPaymentSuccess(null);
      
      // Show error message for 3 seconds
      setTimeout(() => {
        setPaymentError(null);
      }, 3000);
      return;
    }
    
    setSelectedExpenseForPayment(expense);
    setPaymentAmount(Math.max(0, expense.amount - expense.paidAmount).toString());
    setShowPaymentModal(true);
    setPaymentSuccess(null);
    setPaymentError(null);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedExpenseForPayment || !paymentAmount) return;

    try {
      setPaymentLoading(true);
      setPaymentError(null);
      
      // Double-check if expense is fully paid
      const actualRemainingBalance = Math.max(0, selectedExpenseForPayment.amount - selectedExpenseForPayment.paidAmount);
      if (selectedExpenseForPayment.paymentStatus === 'FULLY_PAID' || actualRemainingBalance <= 0) {
        setPaymentError('This expense is already fully paid! Cannot process additional payments.');
        return;
      }
      
      const amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        setPaymentError('Payment amount must be greater than 0');
        return;
      }

      if (amount > actualRemainingBalance) {
        setPaymentError(`Payment amount (${formatCurrency(amount)}) cannot exceed remaining balance (${formatCurrency(actualRemainingBalance)})`);
        return;
      }

      // Check if this payment would overpay
      if (selectedExpenseForPayment.paidAmount + amount > selectedExpenseForPayment.amount) {
        setPaymentError(`This payment would result in overpayment. Maximum allowed: ${formatCurrency(actualRemainingBalance)}`);
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        setPaymentError('User not authenticated');
        return;
      }

      // Create payment method data
      const paymentMethodData: PaymentMethod = {
        type: paymentMethod,
        details: {
          payerName: currentUser.displayName || 'Unknown User'
        },
        amount: amount,
        status: 'cleared'
      };

      const currentUserId = currentUser.uid;
      const currentUserName = currentUser.displayName || 
                             (currentUser?.employee ? 
                              `${currentUser.employee.firstName} ${currentUser.employee.lastName}` : 
                              'Unknown User');

      // Process payment through expense payment service
      await ExpensePaymentService.makeExpensePayment(
        selectedExpenseForPayment.id, 
        amount,
        paymentMethodData, 
        currentUserId,
        currentUserName,
        fundingSource,
        paymentNotes
      );

      setPaymentSuccess(`Payment of ${formatCurrency(amount)} processed successfully!`);
      
      // Reload expenses to show updated payment status
      setTimeout(() => {
        setShowPaymentModal(false);
        loadExpenses();
      }, 2000);

    } catch (error) {
      console.error('Payment processing error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetPaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedExpenseForPayment(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setFundingSource('DAILY_EXPENSE_FUND');
    setPaymentNotes('');
    setPaymentSuccess(null);
    setPaymentError(null);
  };

  useEffect(() => {
    loadExpenses();
    loadFundBalances();
  }, []);

  useEffect(() => {
    let filtered = [...expenses];

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(expense => expense.source === sourceFilter);
    }

    // Apply month filter
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-');
      filtered = filtered.filter(expense => {
        const expenseDate = expense.expenseDate;
        return expenseDate.getFullYear() === parseInt(year) && 
               expenseDate.getMonth() === parseInt(month) - 1;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(search) ||
        expense.vendor.toLowerCase().includes(search) ||
        expense.category.toLowerCase().includes(search) ||
        expense.department?.toLowerCase().includes(search) ||
        expense.sourceDetails?.toLowerCase().includes(search) ||
        expense.receiptNumber.toLowerCase().includes(search)
      );
    }

    // Apply other filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(expense => expense.priority === priorityFilter);
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.paymentStatus === paymentStatusFilter);
    }

    setFilteredExpenses(filtered);
  }, [expenses, searchTerm, statusFilter, categoryFilter, priorityFilter, paymentStatusFilter, sourceFilter, monthFilter]);

  // Load fund balances
  const loadFundBalances = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.employee?.branchId) {
        console.log('No branch ID found, using default balances');
        setFundBalances({
          dailyFund: { currentBalance: 100000, totalAllocated: 0 }, // Default daily fund
          grossProfit: { currentBalance: 0, totalAllocated: 0 }
        });
        return;
      }

      const fundingService = new FundingSourceService();
      const balances = await fundingService.getFundBalances(currentUser.employee.branchId);
      
      setFundBalances({
        dailyFund: balances.dailyFund ? {
          currentBalance: balances.dailyFund.currentBalance,
          totalAllocated: balances.dailyFund.totalAllocated
        } : { currentBalance: 100000, totalAllocated: 0 },
        grossProfit: balances.grossProfit ? {
          currentBalance: balances.grossProfit.currentBalance,
          totalAllocated: balances.grossProfit.totalAllocated
        } : { currentBalance: 0, totalAllocated: 0 }
      });
    } catch (error) {
      console.error('Error loading fund balances:', error);
      // Use default values on error
      setFundBalances({
        dailyFund: { currentBalance: 100000, totalAllocated: 0 },
        grossProfit: { currentBalance: 0, totalAllocated: 0 }
      });
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading expenses from all sources...');
      
      const combinedExpenses: CombinedExpense[] = [];
      let errors: string[] = [];

      // 1. Load expenses from expenses table
      try {
        console.log('📊 Loading expenses from expenses table...');
        const tableExpenses = await AccountantQueries.getExpenseManagement();
        
        if (tableExpenses && tableExpenses.length > 0) {
          const convertedExpenses: CombinedExpense[] = tableExpenses.map((expense: any, index: number) => ({
            id: expense.id || `table_${index}`,
            description: expense.description || 'Expense from table',
            amount: expense.amount || 0,
            paidAmount: expense.paidAmount || 0,
            remainingBalance: Math.max(0, (expense.amount || 0) - (expense.paidAmount || 0)),
            expenseDate: expense.expenseDate?.toDate ? expense.expenseDate.toDate() : new Date(expense.expenseDate),
            category: expense.category || 'General',
            expenseType: expense.expenseType || expense.type || 'General Expense',
            status: expense.status || 'pending',
            paymentStatus: expense.paymentStatus || (expense.paidAmount === 0 ? 'UNPAID' : expense.paidAmount >= expense.amount ? 'FULLY_PAID' : 'PARTIALLY_PAID'),
            priority: expense.priority || 'medium',
            vendor: expense.vendor || 'Unknown Vendor',
            receiptNumber: expense.receiptNumber || `TBL-${expense.id}`,
            notes: expense.notes || '',
            createdBy: expense.createdBy || 'System',
            approvedBy: expense.approvedBy,
            dueDate: expense.dueDate?.toDate ? expense.dueDate.toDate() : new Date(),
            tags: expense.tags || ['from-table'],
            department: expense.department || 'Accounting',
            projectCode: expense.projectCode,
            fundingSource: expense.fundingSource || null,
            source: 'expenses_table' as const,
            sourceDetails: expense.vendor || expense.category || expense.department || `Expense ${expense.id}`,
            originalData: expense
          }));
          
          combinedExpenses.push(...convertedExpenses);
          console.log(`✅ Loaded ${convertedExpenses.length} expenses from expenses table`);
        }
      } catch (tableError) {
        console.warn('Failed to load expenses from table:', tableError);
        errors.push('Failed to load expenses from table');
      }

      // 2. Load till expenses from cash closes
      try {
        console.log('🏦 Loading till expenses from cash closes...');
        const currentUser = authService.getCurrentUser();
        
        let cashCloses: any[] = [];
        
        // Try simple service first
        try {
          const simpleCashCloseService = new SimpleCashCloseService();
          cashCloses = await simpleCashCloseService.getAllCashClosesSimple();
        } catch (simpleError) {
          console.warn('Simple service failed, trying full service:', simpleError);
          const cashCloseService = new CashCloseService();
          if (currentUser?.employee?.branchId) {
            cashCloses = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
          } else {
            cashCloses = await cashCloseService.getAll();
          }
        }
        
        if (cashCloses && cashCloses.length > 0) {
          let tillExpenseCount = 0;
          
          cashCloses.forEach((cashClose, closeIndex) => {
            const cashCloseDate = cashClose.createdAt?.toDate?.() || cashClose.cashCloseDate?.toDate?.() || new Date();
            
            cashClose.shifts?.forEach((shift: any, shiftIndex: number) => {
              shift.tills?.forEach((till: any, tillIndex: number) => {
                till.expenseDetails?.forEach((expense: any, expenseIndex: number) => {
                  const combinedExpense: CombinedExpense = {
                    id: `cash_${closeIndex}_${shiftIndex}_${tillIndex}_${expenseIndex}`,
                    description: expense.description || `Till ${till.tillNumber || tillIndex + 1} Expense`,
                    amount: expense.amount || 0,
                    paidAmount: expense.paidAmount || expense.amount || 0, // Till expenses are typically paid immediately
                    remainingBalance: Math.max(0, (expense.amount || 0) - (expense.paidAmount || expense.amount || 0)),
                    expenseDate: expense.expenseDate?.toDate ? expense.expenseDate.toDate() : 
                                 expense.expenseTime?.toDate ? expense.expenseTime.toDate() : 
                                 cashCloseDate,
                    category: expense.category || 'Till Operations',
                    expenseType: expense.expenseType || expense.type || 'Till Expense',
                    status: 'approved' as const, // Till expenses are typically approved
                    paymentStatus: 'FULLY_PAID' as const,
                    priority: 'medium' as const,
                    vendor: expense.vendor || 'Till Transaction',
                    receiptNumber: expense.receiptNumber || `TILL-${till.tillNumber || tillIndex + 1}-${expenseIndex + 1}`,
                    notes: expense.notes || `Expense from ${shift.shift || 'Unknown'} shift`,
                    createdBy: expense.createdBy || cashClose.createdBy || 'Till System',
                    dueDate: cashCloseDate,
                    tags: ['till-expense', shift.shift || 'unknown-shift'],
                    department: 'Operations',
                    fundingSource: expense.fundingSource || null,
                    source: 'cash_close' as const,
                    sourceDetails: `Till ${till.tillNumber || tillIndex + 1}, ${shift.shift || 'Unknown'} Shift`,
                    cashCloseDate,
                    originalData: { expense, till, shift, cashClose }
                  };
                  
                  combinedExpenses.push(combinedExpense);
                  tillExpenseCount++;
                });
              });
            });
          });
          
          console.log(`✅ Loaded ${tillExpenseCount} till expenses from ${cashCloses.length} cash closes`);
        }
      } catch (cashCloseError) {
        console.warn('Failed to load cash close expenses:', cashCloseError);
        errors.push('Failed to load cash close expenses');
      }

      // 3. Load expenses directly from expenses collection
      try {
        console.log('💰 Loading expenses from expenses collection...');
        const expenseService = new ExpenseService();
        const collectionExpenses = await expenseService.getAll();
        
        if (collectionExpenses && collectionExpenses.length > 0) {
          const convertedCollectionExpenses: CombinedExpense[] = collectionExpenses.map((expense: any, index: number) => ({
            id: expense.id || `collection_${index}`,
            description: expense.description || expense.itemName || 'Expense from collection',
            amount: expense.amount || expense.totalAmount || 0,
            paidAmount: expense.paidAmount || 0,
            remainingBalance: Math.max(0, (expense.amount || expense.totalAmount || 0) - (expense.paidAmount || 0)),
            expenseDate: expense.expenseDate?.toDate ? expense.expenseDate.toDate() : 
                         expense.date?.toDate ? expense.date.toDate() : 
                         new Date(expense.expenseDate || expense.date),
            category: expense.category || expense.expenseType || 'General',
            expenseType: expense.expenseType || expense.type || expense.category || 'Collection Expense',
            status: expense.status || 'pending',
            paymentStatus: expense.paymentStatus || (expense.paidAmount === 0 ? 'UNPAID' : expense.paidAmount >= (expense.amount || expense.totalAmount || 0) ? 'FULLY_PAID' : 'PARTIALLY_PAID'),
            priority: expense.priority || 'medium',
            vendor: expense.vendor || expense.supplierName || 'Unknown Vendor',
            receiptNumber: expense.receiptNumber || expense.referenceNumber || `COL-${expense.id}`,
            notes: expense.notes || expense.description || '',
            createdBy: expense.createdBy || 'System',
            approvedBy: expense.approvedBy,
            dueDate: expense.dueDate?.toDate ? expense.dueDate.toDate() : 
                     expense.expenseDate?.toDate ? expense.expenseDate.toDate() : 
                     new Date(),
            tags: expense.tags || ['from-collection'],
            department: expense.department || 'General',
            projectCode: expense.projectCode,
            fundingSource: expense.fundingSource || null,
            source: 'expenses_collection' as const,
            sourceDetails: expense.itemName || expense.description || expense.category || `Item ${expense.id}`,
            originalData: expense
          }));
          
          combinedExpenses.push(...convertedCollectionExpenses);
          console.log(`✅ Loaded ${convertedCollectionExpenses.length} expenses from expenses collection`);
        }
      } catch (collectionError) {
        console.warn('Failed to load expenses from collection:', collectionError);
        errors.push('Failed to load expenses from collection');
      }

      // NO MORE MOCK DATA - Show empty state if no real data is available
      if (combinedExpenses.length === 0) {
        console.log('📋 No real expense data found - showing empty state');
      }

      // Sort by expense date (newest first)
      combinedExpenses.sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime());

      setExpenses(combinedExpenses);
      console.log(`✅ Total expenses loaded: ${combinedExpenses.length}`);
      
      if (errors.length > 0) {
        setError(`Some data sources failed: ${errors.join(', ')}`);
      }

    } catch (err: any) {
      console.error('Error loading expenses:', err);
      
      // NO MORE MOCK DATA - Show error state with empty data
      setExpenses([]);
      setError(`Database connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_PAID': return 'text-green-600 bg-green-100';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-100';
      case 'UNPAID': return 'text-gray-600 bg-gray-100';
      case 'OVERDUE': return 'text-red-600 bg-red-100';
      case 'OVERPAID': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'expenses_table': return 'text-blue-600 bg-blue-100';
      case 'expenses_collection': return 'text-purple-600 bg-purple-100';
      case 'cash_close': return 'text-green-600 bg-green-100';
      // Removed mock data support
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'expenses_table': return Receipt;
      case 'expenses_collection': return DollarSign;
      case 'cash_close': return Building;
      // Removed mock data support
      default: return Receipt;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Balance calculation functions
  const calculateFundBalances = (expenses: CombinedExpense[]) => {
    const dailyFundExpenses = expenses.filter(exp => exp.fundingSource === 'DAILY_EXPENSE_FUND');
    const grossProfitExpenses = expenses.filter(exp => exp.fundingSource === 'WALLET_GROSS_PROFIT');
    const unallocatedExpenses = expenses.filter(exp => !exp.fundingSource);

    const dailyFundAllocated = dailyFundExpenses.reduce((sum, exp) => sum + exp.paidAmount, 0);
    const grossProfitAllocated = grossProfitExpenses.reduce((sum, exp) => sum + exp.paidAmount, 0);
    const unallocatedAmount = unallocatedExpenses.reduce((sum, exp) => sum + exp.paidAmount, 0);

    return {
      dailyFund: {
        currentBalance: fundBalances.dailyFund?.currentBalance || 100000,
        allocated: dailyFundAllocated,
        remainingBalance: (fundBalances.dailyFund?.currentBalance || 100000) - dailyFundAllocated,
        expenseCount: dailyFundExpenses.length
      },
      grossProfit: {
        currentBalance: fundBalances.grossProfit?.currentBalance || 0,
        allocated: grossProfitAllocated,
        remainingBalance: (fundBalances.grossProfit?.currentBalance || 0) - grossProfitAllocated,
        expenseCount: grossProfitExpenses.length
      },
      unallocated: {
        amount: unallocatedAmount,
        expenseCount: unallocatedExpenses.length
      }
    };
  };

  // Generate month options for filter
  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthValue = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push({ value: monthValue, label: monthLabel });
    }
    
    return months;
  };

  // Custom summary calculation for combined expenses
  const calculateSummary = (expenses: CombinedExpense[]) => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalPaid = expenses.reduce((sum, exp) => sum + exp.paidAmount, 0);
    const pendingPayments = expenses.reduce((sum, exp) => {
      return sum + (exp.paymentStatus !== 'FULLY_PAID' ? exp.remainingBalance : 0);
    }, 0);
    const overdueCount = expenses.filter(exp => {
      const dueDate = exp.dueDate instanceof Date ? exp.dueDate : exp.dueDate ? new Date(exp.dueDate) : null;
      return exp.paymentStatus !== 'FULLY_PAID' && dueDate && dueDate < new Date();
    }).length;

    return {
      totalExpenses,
      totalPaid,
      pendingPayments,
      overdueCount
    };
  };

  const summary = calculateSummary(filteredExpenses);
  const balanceSummary = calculateFundBalances(filteredExpenses);
  const monthOptions = getMonthOptions();
  
  // Get unique categories from expenses
  const categories = [...new Set(expenses.map(exp => exp.category))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Global Success/Error Messages */}
        {(paymentSuccess || paymentError) && !showPaymentModal && (
          <div className={`rounded-2xl shadow-lg border p-4 mb-6 ${
            paymentSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {paymentSuccess ? (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium ${
                  paymentSuccess ? 'text-green-800' : 'text-red-800'
                }`}>
                  {paymentSuccess ? 'Payment Successful!' : 'Payment Not Allowed'}
                </h3>
                <p className={`text-sm ${
                  paymentSuccess ? 'text-green-700' : 'text-red-700'
                }`}>
                  {paymentSuccess || paymentError}
                </p>
              </div>
              <button
                onClick={() => {
                  setPaymentSuccess(null);
                  setPaymentError(null);
                }}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${
                  paymentSuccess ? 'hover:text-green-600' : 'hover:text-red-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 opacity-90"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-8 h-8 text-white" />
                </div>
        <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                    Expense Management
                  </h1>
                  <p className="text-emerald-100 text-lg">Track and manage comprehensive business expenses</p>
                  <p className="text-sm text-emerald-200 mt-2">
                    📊 <strong>Unified Management:</strong> Complete expense tracking and payment processing
                  </p>
                </div>
        </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    loadExpenses();
                    loadFundBalances();
                  }}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh</span>
                </button>
                <button 
                  onClick={() => window.location.href = '/dashboard/accountant/expenses/payments'}
                  className="bg-green-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-green-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Make Payments</span>
          </button>
                <button 
                  onClick={() => window.location.href = '/dashboard/accountant/expenses/create'}
                  className="bg-white text-emerald-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-emerald-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Expense</span>
          </button>
              </div>
            </div>
        </div>
      </div>



        {/* Enhanced Stats Dashboard with Balance Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Daily Expense Fund Balance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Daily Expense Fund</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {formatCurrency(balanceSummary.dailyFund.remainingBalance).replace('UGX', '').trim()}
                </p>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-medium">{formatCurrency(balanceSummary.dailyFund.currentBalance).replace('UGX', '').trim()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Spent:</span>
                    <span className="text-red-600 font-medium">{formatCurrency(balanceSummary.dailyFund.allocated).replace('UGX', '').trim()}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">{balanceSummary.dailyFund.expenseCount} expenses</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Gross Profit Fund Balance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Gross Profit Fund</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {formatCurrency(balanceSummary.grossProfit.remainingBalance).replace('UGX', '').trim()}
                </p>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-medium">{formatCurrency(balanceSummary.grossProfit.currentBalance).replace('UGX', '').trim()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Spent:</span>
                    <span className="text-red-600 font-medium">{formatCurrency(balanceSummary.grossProfit.allocated).replace('UGX', '').trim()}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">{balanceSummary.grossProfit.expenseCount} expenses</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Total Paid Expenses */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  {formatCurrency(summary.totalPaid).replace('UGX', '').trim()}
                </p>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Unallocated:</span>
                    <span className="text-orange-600 font-medium">{formatCurrency(balanceSummary.unallocated.amount).replace('UGX', '').trim()}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">Completed payments</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Pending</p>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {formatCurrency(summary.pendingPayments).replace('UGX', '').trim()}
                </p>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total Due:</span>
                    <span className="font-medium">{formatCurrency(summary.totalExpenses - summary.totalPaid).replace('UGX', '').trim()}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">{summary.overdueCount} overdue</span>
                  </div>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
        </div>

        {/* Additional Financial Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Financial Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(balanceSummary.dailyFund.allocated + balanceSummary.grossProfit.allocated)}
              </div>
              <div className="text-sm text-gray-500">Total Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </div>
              <div className="text-sm text-gray-500">Total Expenses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalPaid)}
              </div>
              <div className="text-sm text-gray-500">Total Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.pendingPayments)}
              </div>
              <div className="text-sm text-gray-500">Pending Payments</div>
            </div>
          </div>
          {expenses.length === 0 ? (
            <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-gray-400 text-lg mb-2">📊</div>
              <h3 className="text-gray-600 font-medium">No Historical Data Available</h3>
              <p className="text-gray-500 text-sm mt-1">Create cash closes and expense records to see detailed reports and trends.</p>
            </div>
          ) : (
            <div className="mt-8 text-center py-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
              <div className="text-emerald-500 text-lg mb-2">📈</div>
              <h3 className="text-emerald-700 font-medium">Financial Data Available</h3>
              <p className="text-emerald-600 text-sm mt-1">
                Showing {filteredExpenses.length} expenses with comprehensive financial tracking.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-sm font-medium text-emerald-700">Fund Utilization</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {((balanceSummary.dailyFund.allocated + balanceSummary.grossProfit.allocated) / 
                      Math.max(1, balanceSummary.dailyFund.currentBalance + balanceSummary.grossProfit.currentBalance) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-emerald-700">Payment Rate</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {summary.totalExpenses > 0 ? (summary.totalPaid / summary.totalExpenses * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 max-w-lg">
            <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                  placeholder="Search expenses, vendors, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
          </select>
              </div>
              
              {/* Monthly Filter */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
              >
                <option value="all">All Months</option>
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              
          <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
              >
                <option value="all">All Sources</option>
                <option value="expenses_table">Expenses Table</option>
                <option value="expenses_collection">Expenses Collection</option>
                <option value="cash_close">Till Expenses</option>
                {/* Removed mock data option */}
          </select>
              <button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg font-medium">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Expenses List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              Expenses ({(filteredExpenses || []).length})
            </h2>
      </div>

          {!filteredExpenses || filteredExpenses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Receipt className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No expenses found</h3>
              <p className="text-gray-500 max-w-md mx-auto">No expenses match your current search criteria. Try adjusting your filters or search terms.</p>
            </div>
          ) : (
        <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gradient-to-r from-gray-50 to-emerald-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount & Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category & Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor & Date
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-300 group border-l-4 border-transparent hover:border-emerald-400">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {expense.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {expense.receiptNumber}
                      </div>
                            {expense.tags && expense.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {expense.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid: {formatCurrency(expense.paidAmount)}
                      </div>
                      {expense.remainingBalance !== 0 && (
                        <div className={`text-sm ${expense.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Balance: {formatCurrency(Math.abs(expense.remainingBalance))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(expense.paymentStatus)}`}>
                          {expense.paymentStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                        {expense.expenseType || 'General'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-900">{expense.category}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(expense.priority)}`}>
                        {expense.priority}
                      </span>
                      {expense.fundingSource ? (
                        <div>
                          <FundingSourceDisplay 
                            fundingSource={expense.fundingSource} 
                            size="sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            📋 No Funding Assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{expense.vendor}</div>
                      <div className="text-sm text-gray-500">
                        {expense.expenseDate.toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Due: {expense.dueDate instanceof Date ? expense.dueDate.toLocaleDateString() : expense.dueDate ? new Date(expense.dueDate).toLocaleDateString() : 'No due date'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {(() => {
                        const SourceIcon = getSourceIcon(expense.source);
                        return (
                          <div className="flex items-center">
                            <SourceIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceColor(expense.source)}`}>
                                {expense.source === 'expenses_table' ? 'Table' : 
                                 expense.source === 'expenses_collection' ? 'Collection' :
                                 expense.source === 'cash_close' ? 'Till' : 'Mock'}
                              </span>
                              {expense.sourceDetails && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {expense.sourceDetails}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {/* Payment button with proper validation */}
                      {(() => {
                        const actualRemainingBalance = Math.max(0, expense.amount - expense.paidAmount);
                        const isFullyPaid = expense.paymentStatus === 'FULLY_PAID' || actualRemainingBalance <= 0;
                        const canMakePayment = !isFullyPaid && actualRemainingBalance > 0;
                        
                        return (
                          <button 
                            onClick={() => handlePayExpense(expense)}
                            className={`transition-colors ${
                              isFullyPaid 
                                ? 'text-gray-400 hover:text-gray-500 cursor-not-allowed' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={
                              isFullyPaid 
                                ? `Fully Paid - No payment needed (${formatCurrency(expense.amount)} paid)` 
                                : `Make Payment - Balance: ${formatCurrency(actualRemainingBalance)}`
                            }
                          >
                            <CreditCard className={`w-4 h-4 ${isFullyPaid ? 'opacity-50' : ''}`} />
                          </button>
                        );
                      })()}
                      <button 
                        onClick={() => handlePrintExpense(expense)}
                        className="text-emerald-600 hover:text-emerald-900 transition-colors" 
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900 transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            startIndex={pageStartIndex}
            endIndex={pageEndIndex}
            totalItems={filteredExpenses.length}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </div>

        {/* Print Modal */}
        {showPrintModal && selectedExpenseForPrint && (
          <ExpenseReceiptView 
            expense={selectedExpenseForPrint}
            onClose={() => setShowPrintModal(false)}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedExpenseForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Make Payment</h2>
                      <p className="text-green-100 text-sm">Process expense payment</p>
                    </div>
                  </div>
                  <button
                    onClick={resetPaymentModal}
                    className="text-white hover:text-green-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Expense Details */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Expense Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Description:</span>
                      <span className="font-medium">{selectedExpenseForPayment.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedExpenseForPayment.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Already Paid:</span>
                      <span className="font-medium text-green-600">{formatCurrency(selectedExpenseForPayment.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining Balance:</span>
                      <span className={`font-medium ${selectedExpenseForPayment.remainingBalance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedExpenseForPayment.remainingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedExpenseForPayment.paymentStatus)}`}>
                        {selectedExpenseForPayment.paymentStatus.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium">{selectedExpenseForPayment.vendor}</span>
                    </div>
                  </div>
                  
                  {/* Warning for fully paid expenses */}
                  {(selectedExpenseForPayment.paymentStatus === 'FULLY_PAID' || Math.max(0, selectedExpenseForPayment.amount - selectedExpenseForPayment.paidAmount) <= 0) && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-800 text-sm font-medium">
                          This expense is already fully paid!
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      disabled={selectedExpenseForPayment.paymentStatus === 'FULLY_PAID' || Math.max(0, selectedExpenseForPayment.amount - selectedExpenseForPayment.paidAmount) <= 0}
                      className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        selectedExpenseForPayment.paymentStatus === 'FULLY_PAID' || Math.max(0, selectedExpenseForPayment.amount - selectedExpenseForPayment.paidAmount) <= 0
                          ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                          : 'border-gray-300'
                      }`}
                      placeholder={
                        selectedExpenseForPayment.paymentStatus === 'FULLY_PAID' || Math.max(0, selectedExpenseForPayment.amount - selectedExpenseForPayment.paidAmount) <= 0
                          ? "Expense is fully paid"
                          : "Enter payment amount"
                      }
                      max={Math.max(0, selectedExpenseForPayment.amount - selectedExpenseForPayment.paidAmount)}
                      min="0"
                      step="0.01"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">UGX</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_deposit">Bank Deposit</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>

                {/* Funding Source */}
                <div>
                  <FundingSourceSelector
                    value={fundingSource}
                    onChange={setFundingSource}
                    label="Funding Source"
                    description="Assign funding source for this payment"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add any notes about this payment..."
                  />
                </div>

                {/* Success Message */}
                {paymentSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-800 font-medium">{paymentSuccess}</span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-800 font-medium">{paymentError}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetPaymentModal}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    disabled={paymentLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePaymentSubmit}
                    disabled={paymentLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {paymentLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Make Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 