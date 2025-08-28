'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExpenseTypesService, ExpenseType } from '@/lib/firebase/expense-types';
import { SimpleExpenseTypesService } from '@/lib/firebase/expense-types-simple';
import { ExpenseTypeSeeder } from '@/lib/firebase/seed-expense-types';
import { ExpenseService } from '@/lib/firebase/firestore-service';
import { authService } from '@/lib/firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  Save,
  X,
  Upload,
  FileText,
  DollarSign,
  Calendar,
  Building,
  User,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  Database,
  RefreshCw,
  ExternalLink,
  Grid3X3,
  List
} from 'lucide-react';

interface ExpenseLineItem {
  id: string;
  description: string;
  amount: number;
  expenseType: ExpenseType | null;
  expenseTypeId?: string;
  accountingCode?: string;
  budgetCategory?: string;
  category: string;
  department: string;
  notes: string;
  tags: string[];
  projectCode?: string;
}

interface ExpenseReceiptData {
  // Receipt Information (Shared)
  vendor: string;
  receiptNumber: string;
  expenseDate: string;
  expenseTime: string;
  
  // Payment & Status (Shared)
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  
  // Files (Shared)
  attachments: File[];
  
  // Line Items (Multiple expense types)
  lineItems: ExpenseLineItem[];
}

export default function CreateExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [seeding, setSeeding] = useState(false);
  
  // Services
  const [expenseTypesService] = useState(new ExpenseTypesService());
  const [simpleExpenseTypesService] = useState(new SimpleExpenseTypesService());
  const [expenseTypeSeeder] = useState(new ExpenseTypeSeeder());
  const [expenseService] = useState(new ExpenseService());
  
  // Data
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [filteredExpenseTypes, setFilteredExpenseTypes] = useState<ExpenseType[]>([]);
  const [expenseTypeSearch, setExpenseTypeSearch] = useState('');

  // Auto-generate receipt number
  const generateReceiptNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness
    return `RCP-${year}${month}${day}-${timestamp}`;
  };

  // Form Data - Split into Receipt (shared) and Line Items (multiple)
  const [receiptData, setReceiptData] = useState<ExpenseReceiptData>({
    vendor: '',
    receiptNumber: generateReceiptNumber(),
    expenseDate: new Date().toISOString().split('T')[0],
    expenseTime: new Date().toTimeString().slice(0, 5),
    paymentMethod: 'cash',
    status: 'pending',
    priority: 'medium',
    attachments: [],
    lineItems: []
  });

  // Active line item being edited
  const [activeLineItemId, setActiveLineItemId] = useState<string | null>(null);
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);

  // Current user info
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadExpenseTypes();
    loadCurrentUser();
  }, []);

  // Handle URL parameters for pre-selecting expense type
  useEffect(() => {
    const typeId = searchParams.get('type');
    if (typeId && expenseTypes.length > 0) {
      const type = expenseTypes.find(t => t.id === typeId);
      if (type) {
        // Add first line item with pre-selected type
        addLineItem();
        setTimeout(() => {
          handleExpenseTypeSelect(type);
        }, 100);
      }
    }
  }, [expenseTypes, searchParams]);

  useEffect(() => {
    filterExpenseTypes();
  }, [expenseTypes, expenseTypeSearch]);

  // Auto-add first line item when user is loaded
  useEffect(() => {
    if (currentUser && receiptData.lineItems.length === 0) {
      addLineItem();
    }
  }, [currentUser]);

  const loadCurrentUser = () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    console.log('Current user for expense creation:', user);
  };

  const loadExpenseTypes = async () => {
    try {
      console.log('🔄 Loading expense types for expense creation...');
      let types: ExpenseType[] = [];
      
      // Always try simple service first to avoid index issues
      try {
        console.log('🔄 Using simple expense types service (no index required)...');
        types = await simpleExpenseTypesService.getActiveExpenseTypesSimple();
        console.log('✅ Successfully loaded expense types with simple service');
      } catch (simpleError: any) {
        console.warn('⚠️ Simple service failed, trying regular service:', simpleError.message);
        
        try {
          console.log('🔄 Falling back to regular service...');
          types = await expenseTypesService.getActiveExpenseTypes();
          console.log('✅ Successfully loaded expense types with regular service');
        } catch (regularError: any) {
          console.error('❌ Both services failed:', regularError);
          
          // If both fail, show a helpful error with the index creation link
          if (regularError.message?.includes('requires an index')) {
            throw new Error(
              'Expense types require a Firestore index to load efficiently. ' +
              'Please create the index using the Firebase Console link that appeared in the error, ' +
              'or contact your system administrator. The system will work normally once the index is created.'
            );
          } else {
            throw new Error('Failed to load expense types from database: ' + regularError.message);
          }
        }
      }
      
      if (types.length === 0) {
        setError('No expense types found. Please create some expense types first using the Expense Types page.');
        return;
      }
      
      setExpenseTypes(types);
      console.log(`📋 Loaded ${types.length} expense types for expense creation`);
      
      // Clear any previous errors
      setError('');
      
    } catch (err: any) {
      console.error('❌ Error loading expense types:', err);
      setError('Failed to load expense types: ' + err.message);
    }
  };

  const filterExpenseTypes = () => {
    if (!expenseTypeSearch.trim()) {
      setFilteredExpenseTypes([]);
      return;
    }

    const searchTerm = expenseTypeSearch.toLowerCase();
    const filtered = expenseTypes.filter(type =>
      type.name.toLowerCase().includes(searchTerm) ||
      type.description.toLowerCase().includes(searchTerm) ||
      type.category.toLowerCase().includes(searchTerm) ||
      type.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );

    setFilteredExpenseTypes(filtered);
  };

  const handleSeedExpenseTypes = async () => {
    try {
      setSeeding(true);
      setError('');
      
      console.log('🌱 Seeding expense types...');
      await expenseTypeSeeder.seedExpenseTypes();
      
      // Reload expense types after seeding
      await loadExpenseTypes();
      
      setSuccess('Sample expense types have been created successfully!');
      
    } catch (err: any) {
      console.error('❌ Failed to seed expense types:', err);
      setError('Failed to create sample expense types: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // Line Item Management Functions
  const createNewLineItem = (): ExpenseLineItem => ({
    id: Date.now().toString(),
    description: '',
    amount: 0,
    expenseType: null,
    category: '',
    department: currentUser?.employee?.department || currentUser?.department || 'Operations',
    notes: '',
    tags: [],
  });

  const addLineItem = () => {
    const newLineItem = createNewLineItem();
    setReceiptData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newLineItem]
    }));
    setActiveLineItemId(newLineItem.id);
  };

  const removeLineItem = (lineItemId: string) => {
    setReceiptData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== lineItemId)
    }));
    if (activeLineItemId === lineItemId) {
      setActiveLineItemId(null);
      setSelectedExpenseType(null);
    }
  };

  const updateLineItem = (lineItemId: string, updates: Partial<ExpenseLineItem>) => {
    setReceiptData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => 
        item.id === lineItemId ? { ...item, ...updates } : item
      )
    }));
  };

  const getActiveLineItem = (): ExpenseLineItem | null => {
    if (!activeLineItemId) return null;
    return receiptData.lineItems.find(item => item.id === activeLineItemId) || null;
  };

  const handleExpenseTypeSelect = (type: ExpenseType) => {
    if (!activeLineItemId) return;
    
    setSelectedExpenseType(type);
    updateLineItem(activeLineItemId, {
      expenseType: type,
      expenseTypeId: type.id,
      accountingCode: type.accountingCode,
      budgetCategory: type.budgetCategory,
      category: type.category
    });
  };

  const getTotalAmount = (): number => {
    return receiptData.lineItems.reduce((total, item) => total + (item.amount || 0), 0);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Receipt-level validation
    if (!receiptData.vendor.trim()) errors.push('Vendor is required');
    if (!receiptData.receiptNumber.trim()) errors.push('Receipt number is required');
    if (!receiptData.expenseDate) errors.push('Expense date is required');
    
    // Line items validation
    if (receiptData.lineItems.length === 0) {
      errors.push('At least one expense line item is required');
    }
    
    receiptData.lineItems.forEach((item, index) => {
      const lineNumber = index + 1;
      
      if (!item.description.trim()) {
        errors.push(`Line ${lineNumber}: Description is required`);
      }
      if (!item.amount || item.amount <= 0) {
        errors.push(`Line ${lineNumber}: Amount must be greater than 0`);
      }
      if (!item.expenseType || !item.expenseTypeId) {
        errors.push(`Line ${lineNumber}: Expense type is required`);
      }
      if (!item.category.trim()) {
        errors.push(`Line ${lineNumber}: Category is required`);
      }
      if (!item.department.trim()) {
        errors.push(`Line ${lineNumber}: Department is required`);
      }
      
      // Check approval threshold for each line item
      if (item.expenseType?.requiresApproval && item.expenseType?.approvalThreshold) {
        if (item.amount > item.expenseType.approvalThreshold && receiptData.status !== 'pending') {
          errors.push(`Line ${lineNumber}: Amount exceeds approval threshold of ${item.expenseType.approvalThreshold}. Status should be pending.`);
        }
      }
    });
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Combine date and time
      const expenseDateTime = new Date(`${receiptData.expenseDate}T${receiptData.expenseTime}`);
      
      // Generate a shared receipt reference for linking related expenses
      const receiptReference = `RCPT-${Date.now()}`;
      const createdExpenseIds: string[] = [];
      
      // Create separate expense for each line item
      for (let i = 0; i < receiptData.lineItems.length; i++) {
        const lineItem = receiptData.lineItems[i];
        const lineNumber = i + 1;
        
        const expenseData = {
          // Line item specific data
          description: lineItem.description.trim(),
          amount: lineItem.amount,
          category: lineItem.category,
          department: lineItem.department,
          notes: lineItem.notes.trim(),
          tags: lineItem.tags,
          projectCode: lineItem.projectCode?.trim(),
          accountingCode: lineItem.accountingCode,
          budgetCategory: lineItem.budgetCategory,
          expenseTypeId: lineItem.expenseTypeId,
          
          // Shared receipt data
          expenseDate: Timestamp.fromDate(expenseDateTime),
          vendor: receiptData.vendor.trim(),
          receiptNumber: receiptData.receiptNumber.trim(),
          paymentMethod: receiptData.paymentMethod,
          status: receiptData.status,
          priority: receiptData.priority,
          
          // System fields
          paymentStatus: 'UNPAID',
          createdBy: currentUser?.uid || 'unknown',
          branchId: currentUser?.branchId || 'main-branch',
          
          // Linking fields for multiple expense types per receipt
          receiptReference,
          lineItemNumber: lineNumber,
          isMultiLineReceipt: receiptData.lineItems.length > 1,
          totalReceiptAmount: getTotalAmount(),
          
          // Default values
          amountPaid: 0,
          dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        };

        console.log(`Creating expense ${lineNumber}/${receiptData.lineItems.length} for receipt ${receiptReference}`);
        const expenseId = await expenseService.create(expenseData);
        createdExpenseIds.push(expenseId);
      }
      
      const totalExpenses = receiptData.lineItems.length;
      const totalAmount = getTotalAmount();
      
      setSuccess(
        `Successfully created ${totalExpenses} expense${totalExpenses > 1 ? 's' : ''} ` +
        `from receipt ${receiptData.receiptNumber} (Total: ${formatCurrency(totalAmount)})`
      );
      
      console.log(`✅ Created ${totalExpenses} linked expenses:`, createdExpenseIds);
      
      // Reset form after 3 seconds and redirect
      setTimeout(() => {
        router.push('/dashboard/accountant/expenses');
      }, 3000);

    } catch (err: any) {
      console.error('❌ Failed to create expenses:', err);
      setError('Failed to create expenses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 opacity-90"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all duration-300"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
                    Multi-Line Receipt Entry
                  </h1>
                  <p className="text-green-100 text-lg">Create multiple expenses from a single receipt with different expense types</p>
                </div>
              </div>
              
              {/* Total Amount Display */}
              {receiptData.lineItems.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-green-200">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-2xl font-bold text-green-800">{formatCurrency(getTotalAmount())}</div>
                  <div className="text-xs text-gray-500">{receiptData.lineItems.length} line item{receiptData.lineItems.length !== 1 ? 's' : ''}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  {error.includes('requires an index') || error.includes('Firestore index') ? 'Database Index Required' : 'Validation Error'}
                </h3>
                <p className="text-red-700 mb-4">{error}</p>
                
                {/* Show solutions for common issues */}
                {(error.includes('requires an index') || error.includes('Firestore index') || expenseTypes.length === 0) && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-red-800">🔧 Quick Solutions:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Seed Data Option */}
                      <button
                        onClick={handleSeedExpenseTypes}
                        disabled={seeding}
                        className="bg-white border border-red-300 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-red-50 transition-colors text-sm"
                      >
                        {seeding ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Creating Sample Data...</span>
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            <span>Create Sample Expense Types</span>
                          </>
                        )}
                      </button>
                      
                      {/* Create Index Option */}
                      <a
                        href="https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=ClRwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2V4cGVuc2VUeXBlcy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKCGNhdGVnb3J5EAEaDAoIX19uYW1lX18QAQ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white border border-red-300 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-red-50 transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Create Firebase Index</span>
                      </a>
                    </div>
                    
                    {/* Retry Button */}
                    <button
                      onClick={loadExpenseTypes}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-700 transition-colors text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Loading</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-1">Success</h3>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form - Multiple Expense Types per Receipt */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                Multi-Line Receipt Entry
              </h2>
            </div>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Receipt Information Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-blue-600" />
                Receipt Information
                <span className="text-sm font-normal text-gray-600">(Shared across all expense types)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor/Supplier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptData.vendor}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, vendor: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ABC Suppliers Ltd"
                  />
                </div>
                
                {/* Receipt Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Number <span className="text-red-500">*</span>
                    <span className="text-xs text-green-600 ml-2">(Auto-generated)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={receiptData.receiptNumber}
                      onChange={(e) => setReceiptData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-green-50"
                      placeholder="e.g., RCP-001234"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptData(prev => ({ ...prev, receiptNumber: generateReceiptNumber() }))}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1 transition-colors text-sm"
                      title="Generate new receipt number"
                    >
                      <RefreshCw className="w-4 h-4" />
                      New
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Format: RCP-YYYYMMDD-XXXXXX (automatically generated, but you can modify if needed)
                  </p>
                </div>
                
                {/* Expense Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={receiptData.expenseDate}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Expense Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={receiptData.expenseTime}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, expenseTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={receiptData.paymentMethod}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={receiptData.priority}
                    onChange={(e) => setReceiptData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Line Items Management */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  Expense Line Items
                  <span className="text-sm font-normal text-gray-600">(Different expense types on one receipt)</span>
                </h3>
                
                <button
                  type="button"
                  onClick={addLineItem}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add Line Item
                </button>
              </div>
              
              {receiptData.lineItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-purple-300">
                  <Receipt className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">No line items yet</h4>
                  <p className="text-gray-500 mb-4">Add your first expense line item to get started</p>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Line Item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {receiptData.lineItems.map((lineItem, index) => (
                    <div 
                      key={lineItem.id} 
                      className={`bg-white rounded-2xl border-2 p-6 transition-all ${
                        activeLineItemId === lineItem.id 
                          ? 'border-purple-400 bg-purple-50 shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            activeLineItemId === lineItem.id 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Line Item {index + 1}
                              {lineItem.expenseType && (
                                <span className="ml-2 text-sm text-purple-600">
                                  - {lineItem.expenseType.name}
                                </span>
                              )}
                            </h4>
                            {lineItem.amount > 0 && (
                              <p className="text-sm text-gray-600">{formatCurrency(lineItem.amount)}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveLineItemId(lineItem.id)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              activeLineItemId === lineItem.id 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {activeLineItemId === lineItem.id ? 'Editing' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLineItem(lineItem.id)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-100 p-2 rounded-full transition-colors"
                            title="Remove line item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {activeLineItemId === lineItem.id && (
                        <div className="space-y-6 border-t border-purple-200 pt-6">
                          
                          {/* Expense Type Selection for Active Line Item */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Expense Type <span className="text-red-500">*</span>
                            </label>
                            
                            {lineItem.expenseType ? (
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <div>
                                      <h5 className="font-medium text-green-800">{lineItem.expenseType.name}</h5>
                                      <p className="text-sm text-green-700">{lineItem.expenseType.description}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                                          {lineItem.expenseType.category}
                                        </span>
                                        {lineItem.expenseType.accountingCode && (
                                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-mono rounded-full">
                                            {lineItem.expenseType.accountingCode}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateLineItem(lineItem.id, { expenseType: null, expenseTypeId: undefined });
                                      setSelectedExpenseType(null);
                                    }}
                                    className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1 rounded-full transition-colors"
                                    title="Change expense type"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-red-200 rounded-xl">
                                <div className="p-4">
                                  <div className="relative mb-4">
                                    <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="🔍 Search expense types..."
                                      value={expenseTypeSearch}
                                      onChange={(e) => setExpenseTypeSearch(e.target.value)}
                                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                  </div>
                                  
                                  <div className="max-h-64 overflow-y-auto">
                                    {expenseTypeSearch ? (
                                      filteredExpenseTypes.length > 0 ? (
                                        <div className="space-y-2">
                                          {filteredExpenseTypes.map((type) => (
                                            <button
                                              key={type.id}
                                              type="button"
                                              onClick={() => handleExpenseTypeSelect(type)}
                                              className="w-full text-left p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-lg transition-all"
                                            >
                                              <h5 className="font-medium text-gray-900">{type.name}</h5>
                                              <p className="text-sm text-gray-600">{type.description}</p>
                                              <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                  {type.category}
                                                </span>
                                                {type.accountingCode && (
                                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded-full">
                                                    {type.accountingCode}
                                                  </span>
                                                )}
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-center text-gray-500 py-4">No matching expense types</p>
                                      )
                                    ) : (
                                      <p className="text-center text-gray-500 py-4">Start typing to search...</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Line Item Details Form */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={lineItem.description}
                                onChange={(e) => updateLineItem(lineItem.id, { description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="Describe this expense..."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount (UGX) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                required
                                min="0"
                                step="1"
                                value={lineItem.amount || ''}
                                onChange={(e) => updateLineItem(lineItem.id, { amount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="0"
                              />
                              {lineItem.amount > 0 && (
                                <p className="text-sm text-gray-600 mt-1">{formatCurrency(lineItem.amount)}</p>
                              )}
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Department <span className="text-red-500">*</span>
                              </label>
                              <select
                                required
                                value={lineItem.department}
                                onChange={(e) => updateLineItem(lineItem.id, { department: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              >
                                <option value="">Select Department</option>
                                <option value="Operations">Operations</option>
                                <option value="Finance">Finance</option>
                                <option value="Administration">Administration</option>
                                <option value="HR">Human Resources</option>
                                <option value="IT">Information Technology</option>
                                <option value="Sales">Sales</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Procurement">Procurement</option>
                                <option value="Customer Service">Customer Service</option>
                                <option value="Logistics">Logistics</option>
                                <option value="Security">Security</option>
                                <option value="Maintenance">Maintenance</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                              <input
                                type="text"
                                value={lineItem.notes}
                                onChange={(e) => updateLineItem(lineItem.id, { notes: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="Additional notes..."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Project Code</label>
                              <input
                                type="text"
                                value={lineItem.projectCode || ''}
                                onChange={(e) => updateLineItem(lineItem.id, { projectCode: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="e.g., PROJ-2024-001"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-green-800">Receipt Summary</h4>
                        <p className="text-sm text-green-700">{receiptData.lineItems.length} line items</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-800">{formatCurrency(getTotalAmount())}</div>
                        <div className="text-sm text-green-600">Total Amount</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File Attachments - Shared for the entire receipt */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-gray-600" />
                Receipt Attachments
                <span className="text-sm font-normal text-gray-600">(Upload receipt images, PDFs, etc.)</span>
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center">
                <input
                  type="file"
                  id="attachments"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setReceiptData(prev => ({
                      ...prev,
                      attachments: [...prev.attachments, ...files]
                    }));
                  }}
                  className="hidden"
                />
                <label htmlFor="attachments" className="cursor-pointer">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">Click to upload receipts or documents</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC files accepted</p>
                </label>
              </div>

              {receiptData.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Attached Files:</h4>
                  {receiptData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptData(prev => ({
                          ...prev,
                          attachments: prev.attachments.filter((_, i) => i !== index)
                        }))}
                        className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1 rounded-full transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading || receiptData.lineItems.length === 0}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-medium transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create {receiptData.lineItems.length > 1 ? 'Multiple Expenses' : 'Expense'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}