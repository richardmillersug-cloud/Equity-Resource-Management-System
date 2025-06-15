'use client';

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  DollarSign, 
  Calendar,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  User,
  Building,
  CreditCard,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckSquare,
  X
} from 'lucide-react';
import { ExpenseApproval, subscribeToExpenseApprovals, approveExpense, rejectExpense } from '../../lib/firebase/purchasing-manager-service';
import { authService } from '../../lib/firebase/auth';

interface ExpenseApprovalsInterfaceProps {
  className?: string;
}

interface ExpenseFilters {
  status: 'all' | 'pending' | 'approved' | 'rejected';
  type: 'all' | 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAYTODAY';
  amountRange: 'all' | 'under-100k' | '100k-500k' | '500k-1m' | 'over-1m';
  dateRange: 'all' | 'today' | 'week' | 'month';
  search: string;
}

interface ExpenseStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalAmount: number;
  averageAmount: number;
  urgentCount: number;
}

export const ExpenseApprovalsInterface: React.FC<ExpenseApprovalsInterfaceProps> = ({ className = '' }) => {
  const [expenses, setExpenses] = useState<ExpenseApproval[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ExpenseFilters>({
    status: 'pending',
    type: 'all',
    amountRange: 'all',
    dateRange: 'all',
    search: ''
  });
  const [selectedExpense, setSelectedExpense] = useState<ExpenseApproval | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState<ExpenseStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalAmount: 0,
    averageAmount: 0,
    urgentCount: 0
  });
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToExpenseApprovals((expenseData) => {
      setExpenses(expenseData);
      setLoading(false);
      calculateStats(expenseData);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, filters]);

  const calculateStats = (expenseData: ExpenseApproval[]) => {
    const pending = expenseData.filter(e => e.status === 'pending');
    const approved = expenseData.filter(e => e.status === 'approved');
    const rejected = expenseData.filter(e => e.status === 'rejected');
    const urgent = expenseData.filter(e => 
      e.type === 'EMERGENCIES' || 
      (e.type === 'URA' && e.status === 'pending') ||
      e.amount > 1000000
    );

    setStats({
      totalPending: pending.length,
      totalApproved: approved.length,
      totalRejected: rejected.length,
      totalAmount: expenseData.reduce((sum, e) => sum + e.amount, 0),
      averageAmount: expenseData.length > 0 ? expenseData.reduce((sum, e) => sum + e.amount, 0) / expenseData.length : 0,
      urgentCount: urgent.length
    });
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(expense => expense.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(expense => expense.type === filters.type);
    }

    // Amount range filter
    if (filters.amountRange !== 'all') {
      filtered = filtered.filter(expense => {
        switch (filters.amountRange) {
          case 'under-100k': return expense.amount < 100000;
          case '100k-500k': return expense.amount >= 100000 && expense.amount < 500000;
          case '500k-1m': return expense.amount >= 500000 && expense.amount < 1000000;
          case 'over-1m': return expense.amount >= 1000000;
          default: return true;
        }
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.requestDate);
        switch (filters.dateRange) {
          case 'today':
            return expenseDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return expenseDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return expenseDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(expense =>
        expense.name.toLowerCase().includes(searchLower) ||
        expense.employeeName.toLowerCase().includes(searchLower) ||
        expense.note?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredExpenses(filtered);
  };

  const handleApproval = async (expense: ExpenseApproval, action: 'approve' | 'reject') => {
    setSelectedExpense(expense);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedExpense) return;

    try {
      const currentUser = authService.getCurrentUser();
      const currentUserId = currentUser?.uid || 'anonymous-user';

      if (approvalAction === 'approve') {
        await approveExpense(selectedExpense.id, currentUserId);
      } else {
        if (!rejectionReason.trim()) {
          alert('Please provide a reason for rejection');
          return;
        }
        await rejectExpense(selectedExpense.id, currentUserId, rejectionReason);
      }
      
      setShowApprovalModal(false);
      setSelectedExpense(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error processing expense approval:', error);
      alert('Failed to process expense approval');
    }
  };

  const getExpenseTypeColor = (type: string) => {
    switch (type) {
      case 'EMERGENCIES': return 'bg-red-100 text-red-800 border-red-200';
      case 'URA': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DAYTODAY': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'GENERAL': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLevel = (expense: ExpenseApproval): 'high' | 'medium' | 'low' => {
    if (expense.type === 'EMERGENCIES') return 'high';
    if (expense.type === 'URA' || expense.amount > 1000000) return 'high';
    if (expense.amount > 500000) return 'medium';
    return 'low';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading expense approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Expense Approvals</h2>
              <p className="text-sm text-gray-600">Review and approve employee expense requests</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.totalPending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Approved</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalApproved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.totalRejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Amount</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Average</p>
                <p className="text-lg font-bold text-purple-900">{formatCurrency(stats.averageAmount)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Urgent</p>
                <p className="text-2xl font-bold text-orange-900">{stats.urgentCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="GENERAL">General</option>
            <option value="URA">URA</option>
            <option value="EMERGENCIES">Emergencies</option>
            <option value="DAYTODAY">Day to Day</option>
          </select>

          {/* Amount Range Filter */}
          <select
            value={filters.amountRange}
            onChange={(e) => setFilters({ ...filters, amountRange: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Amounts</option>
            <option value="under-100k">Under 100K</option>
            <option value="100k-500k">100K - 500K</option>
            <option value="500k-1m">500K - 1M</option>
            <option value="over-1m">Over 1M</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Expense List */}
      <div className="p-6">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-600">No expenses match your current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => {
              const priority = getPriorityLevel(expense);
              const isExpanded = expandedExpense === expense.id;
              
              return (
                <div
                  key={expense.id}
                  className={`border rounded-lg transition-all duration-200 ${
                    priority === 'high' ? 'border-red-300 bg-red-50' :
                    priority === 'medium' ? 'border-orange-300 bg-orange-50' :
                    'border-gray-200 bg-white'
                  } hover:shadow-md`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Priority Indicator */}
                        <div className={`w-3 h-3 rounded-full ${
                          priority === 'high' ? 'bg-red-500' :
                          priority === 'medium' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`} />
                        
                        {/* Expense Info */}
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{expense.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getExpenseTypeColor(expense.type)}`}>
                              {expense.type}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(expense.status)}`}>
                              {expense.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{expense.employeeName}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium">{formatCurrency(expense.amount)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(expense.requestDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {expense.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproval(expense, 'approve')}
                              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleApproval(expense, 'reject')}
                              className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Expense Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Employee ID:</span>
                                <span className="font-medium">{expense.employeeId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expense ID:</span>
                                <span className="font-medium">{expense.expenseId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Requested Amount:</span>
                                <span className="font-medium">{formatCurrency(expense.amount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Paid Amount:</span>
                                <span className="font-medium">{formatCurrency(expense.paidAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Remaining:</span>
                                <span className="font-medium">{formatCurrency(expense.remainingAmount)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                            <div className="space-y-2 text-sm">
                              {expense.note && (
                                <div>
                                  <span className="text-gray-600">Note:</span>
                                  <p className="mt-1 text-gray-900">{expense.note}</p>
                                </div>
                              )}
                              {expense.approvalDate && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Approval Date:</span>
                                  <span className="font-medium">{formatDate(expense.approvalDate)}</span>
                                </div>
                              )}
                              {expense.approvedBy && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Approved By:</span>
                                  <span className="font-medium">{expense.approvedBy}</span>
                                </div>
                              )}
                              {expense.rejectionReason && (
                                <div>
                                  <span className="text-gray-600">Rejection Reason:</span>
                                  <p className="mt-1 text-red-600">{expense.rejectionReason}</p>
                                </div>
                              )}
                              {expense.receipts && expense.receipts.length > 0 && (
                                <div>
                                  <span className="text-gray-600">Receipts:</span>
                                  <div className="mt-1 flex space-x-2">
                                    {expense.receipts.map((receipt, index) => (
                                      <button
                                        key={index}
                                        className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>Receipt {index + 1}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                </h3>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Expense: {selectedExpense.name}</p>
                <p className="text-sm text-gray-600 mb-2">Employee: {selectedExpense.employeeName}</p>
                <p className="text-sm text-gray-600 mb-2">Amount: {formatCurrency(selectedExpense.amount)}</p>
              </div>

              {approvalAction === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Please provide a reason for rejecting this expense..."
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproval}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 