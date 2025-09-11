'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Building, 
  User, 
  Clock, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  RefreshCw,
  Filter,
  Eye,
  History
} from 'lucide-react';
import { dailyAllocationService, DailyAllocation } from '@/lib/firebase/daily-allocation-service';
import { authService } from '@/lib/firebase/auth';

export default function DailyAllocationPage() {
  const [allocations, setAllocations] = useState<DailyAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<DailyAllocation | null>(null);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalAccepted: 0,
    totalRejected: 0,
    totalAmount: 0,
    pendingAmount: 0,
    expiredCount: 0
  });
  
  // Create allocation form state
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    purpose: 'daily_operations',
    priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
    fundingSource: 'DAILY_EXPENSE_FUND' as 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT',
    expiryHours: '24',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllocations();
  }, []);

  const loadAllocations = async () => {
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      const branchId = currentUser?.employee?.branchId || 'main';
      
      console.log('📊 Loading daily allocations for branch:', branchId);
      
      const [allocationsList, statsData] = await Promise.all([
        dailyAllocationService.getAllocationsForBranch(branchId),
        dailyAllocationService.getAllocationStats(branchId)
      ]);
      
      setAllocations(allocationsList);
      setStats(statsData);
      
      console.log('✅ Loaded allocations:', {
        total: allocationsList.length,
        pending: statsData.totalPending,
        accepted: statsData.totalAccepted
      });
      
    } catch (error) {
      console.error('Error loading allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        alert('User not authenticated');
        return;
      }

      const allocationDate = new Date();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.expiryHours));

      const allocationData = {
        amount: parseFloat(formData.amount),
        allocationDate,
        status: 'pending' as const,
        allocatedBy: currentUser.uid,
        allocatedByName: currentUser.displayName || currentUser.email || 'Accountant',
        description: formData.description || `Daily allocation - ${new Date().toLocaleDateString()}`,
        purpose: formData.purpose,
        branchId: currentUser.employee?.branchId || 'main',
        expiresAt,
        priority: formData.priority,
        fundingSource: formData.fundingSource,
        notes: formData.notes
      };

      const allocationId = await dailyAllocationService.createAllocation(allocationData);
      
      console.log('✅ Daily allocation created:', allocationId);
      
      // Reset form and refresh data
      setFormData({
        amount: '',
        description: '',
        purpose: 'daily_operations',
        priority: 'medium',
        fundingSource: 'DAILY_EXPENSE_FUND',
        expiryHours: '24',
        notes: ''
      });
      setShowCreateForm(false);
      
      await loadAllocations();
      
    } catch (error) {
      console.error('Error creating allocation:', error);
      alert('Failed to create allocation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Daily Allocations</h2>
              <p className="text-gray-600">Loading allocation data from Firebase...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Cash Allocation</h1>
            <p className="text-gray-600">Allocate daily funds to Purchasing Managers</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadAllocations}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Allocation
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.totalPending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Accepted</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalAccepted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.totalRejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Amount</p>
                <p className="text-lg font-bold text-blue-900">UGX {stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending Amount</p>
                <p className="text-lg font-bold text-orange-900">UGX {stats.pendingAmount.toLocaleString()}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiredCount}</p>
              </div>
              <History className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Allocations List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Allocations</h3>
            <p className="text-sm text-gray-600 mt-1">Daily cash allocations to Purchasing Managers</p>
          </div>

          {allocations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💰</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Allocations Yet</h3>
              <p className="text-gray-500 mb-4">Create your first daily allocation to get started.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Allocation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <div key={allocation.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            UGX {allocation.totalAllocated.toLocaleString()}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(allocation.status)}`}>
                            {getStatusIcon(allocation.status)}
                            <span className="ml-1 capitalize">{allocation.status}</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {allocation.allocationDate.toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{allocation.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Building className="h-3 w-3 mr-1" />
                            {allocation.branchId}
                          </span>
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {allocation.allocatedByName}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expires: {allocation.expiresAt.toLocaleString()}
                          </span>
                        </div>

                        {/* Balance Tracking (for accepted allocations) */}
                        {allocation.status === 'accepted' && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-green-700 font-medium">Available Balance:</span>
                                <span className="ml-2 text-green-900 font-bold">UGX {allocation.availableBalance.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-green-600">Used: UGX {allocation.usedAmount.toLocaleString()}</span>
                                <span className="ml-2 text-green-600">({allocation.totalTransactions} transactions)</span>
                              </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="mt-2">
                              <div className="w-full bg-green-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${(allocation.usedAmount / allocation.totalAllocated) * 100}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-green-600 mt-1">
                                <span>{((allocation.usedAmount / allocation.totalAllocated) * 100).toFixed(1)}% used</span>
                                <span>{((allocation.availableBalance / allocation.totalAllocated) * 100).toFixed(1)}% remaining</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedAllocation(allocation)}
                        className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      
                      {allocation.status === 'accepted' && (
                        <button
                          onClick={async () => {
                            const history = await dailyAllocationService.getAllocationUsageHistory(allocation.id);
                            console.log('Allocation usage history:', history);
                          }}
                          className="flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <History className="h-4 w-4 mr-1" />
                          History
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Allocation Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Create Daily Allocation</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateAllocation} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allocation Amount (UGX) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Funding Source *
                    </label>
                    <select
                      value={formData.fundingSource}
                      onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value as 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DAILY_EXPENSE_FUND">Daily Expense Fund</option>
                      <option value="WALLET_GROSS_PROFIT">Wallet Gross Profit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expires In (Hours) *
                    </label>
                    <select
                      value={formData.expiryHours}
                      onChange={(e) => setFormData({ ...formData, expiryHours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="8">8 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">24 hours</option>
                      <option value="48">48 hours</option>
                      <option value="72">72 hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of allocation purpose"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Optional additional notes or instructions"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Create Allocation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
