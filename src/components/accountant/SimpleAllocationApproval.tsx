'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Calculator, DollarSign, Edit3 } from 'lucide-react';
import { autoAllocationService, AllocationResult } from '../../lib/firebase/auto-allocation-service';
import { authService } from '../../lib/firebase/auth';

interface SimpleAllocationApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproval: () => void;
  cashCloseId?: string;
}

export default function SimpleAllocationApproval({ 
  isOpen, 
  onClose, 
  onApproval,
  cashCloseId 
}: SimpleAllocationApprovalProps) {
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  
  // Override form state
  const [overrideAmounts, setOverrideAmounts] = useState({
    savings: 0,
    specialFunds: 0,
    purchasingManager: 0
  });
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (isOpen && cashCloseId) {
      loadAllocation();
    }
  }, [isOpen, cashCloseId]);

  const loadAllocation = async () => {
    if (!cashCloseId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const allocationResult = await autoAllocationService.getAllocationByCashCloseId(cashCloseId);
      if (allocationResult) {
        setAllocation(allocationResult);
        setOverrideAmounts({
          savings: allocationResult.savingsAmount,
          specialFunds: allocationResult.specialFundsAmount,
          purchasingManager: allocationResult.purchasingManagerAmount
        });
      } else {
        setError('No allocation found for this cash close');
      }
    } catch (err: any) {
      setError('Failed to load allocation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!allocation) return;
    
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');
      
      await autoAllocationService.approveAllocation(allocation.id, currentUser.uid);
      onApproval();
      onClose();
    } catch (err: any) {
      setError('Failed to approve allocation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!allocation) return;
    
    if (!overrideReason.trim()) {
      setError('Override reason is required');
      return;
    }

    const totalOverride = overrideAmounts.savings + overrideAmounts.specialFunds + overrideAmounts.purchasingManager;
    if (totalOverride > allocation.totalCashInTill) {
      setError('Total override amount cannot exceed total cash in till');
      return;
    }

    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');
      
      await autoAllocationService.overrideAllocation(
        allocation.id,
        overrideAmounts,
        overrideReason.trim(),
        currentUser.uid
      );
      
      onApproval();
      onClose();
    } catch (err: any) {
      setError('Failed to override allocation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTestAllocation = async () => {
    if (!cashCloseId) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Creating test allocation for cash close ID:', cashCloseId);
      
      // Create a test allocation with sample data
      const testAllocation = await autoAllocationService.calculateAutoAllocation(
        cashCloseId,
        1000000, // 1M UGX total cash in till
        200000   // 200K UGX special funds
      );
      
      console.log('Test allocation created:', testAllocation);
      
      // Reload the allocation
      await loadAllocation();
      
    } catch (err: any) {
      console.error('Error creating test allocation:', err);
      setError('Failed to create test allocation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Allocation Approval</h2>
              <p className="text-sm text-gray-600">Review and approve automatic allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading allocation...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !allocation && !error && cashCloseId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Allocation Found</h3>
              <p className="text-yellow-700 mb-4">
                No automatic allocation was found for cash close ID: <code className="bg-yellow-100 px-2 py-1 rounded">{cashCloseId}</code>
              </p>
              <div className="space-y-3">
                <p className="text-sm text-yellow-600">
                  This could happen if:
                </p>
                <ul className="text-sm text-yellow-600 list-disc list-inside space-y-1">
                  <li>The cash close was created before automatic allocation was enabled</li>
                  <li>The cash close didn't have special funds specified</li>
                  <li>There was an error during allocation creation</li>
                </ul>
                <div className="mt-4 space-x-3">
                  <button
                    onClick={createTestAllocation}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create Test Allocation
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {allocation && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    allocation.status === 'auto_calculated' ? 'bg-blue-100 text-blue-800' :
                    allocation.status === 'approved' ? 'bg-green-100 text-green-800' :
                    allocation.status === 'overridden' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {allocation.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {allocation.autoApproved && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">Auto-approved eligible</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Rule: {allocation.ruleName}</p>
              </div>

              {/* Allocation Breakdown */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Allocation Breakdown</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-xs text-purple-600 font-medium">12%</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
                      <p className="text-lg font-bold text-purple-600">
                        UGX {allocation.savingsAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-xs text-blue-600 font-medium">User Set</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Daily Expense Fund</p>
                      <p className="text-lg font-bold text-blue-600">
                        UGX {allocation.specialFundsAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-xs text-green-600 font-medium">Calculated</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Purchasing Manager</p>
                      <p className="text-lg font-bold text-green-600">
                        UGX {allocation.purchasingManagerAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formula Display */}
                <div className="bg-white rounded border p-3">
                  <p className="text-xs text-gray-600 mb-2">Calculation Formula:</p>
                  <div className="text-sm space-y-1">
                    <p>Total Cash in Till: <span className="font-medium">UGX {allocation.totalCashInTill.toLocaleString()}</span></p>
                    <p>Gross Profit ({allocation.profitPercentage || 12}%): <span className="font-medium">UGX {allocation.savingsAmount.toLocaleString()}</span></p>
                    <p>Daily Expense Fund: <span className="font-medium">UGX {allocation.specialFundsAmount.toLocaleString()}</span></p>
                    <hr className="my-1" />
                    <p className="font-bold">For Distribution = Total Cash in Till - Gross Profit</p>
                    <p className="font-bold">Purchasing Manager = For Distribution - Daily Expense Fund</p>
                    <p className="font-bold text-green-600">= UGX {allocation.purchasingManagerAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Allocated:</span>
                    <span className="text-lg font-bold text-gray-900">
                      UGX {allocation.totalAllocated.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Override Form */}
              {showOverrideForm && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-3">Override Allocation</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gross Profit</label>
                      <input
                        type="number"
                        value={overrideAmounts.savings}
                        onChange={(e) => setOverrideAmounts(prev => ({ ...prev, savings: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Daily Expense Fund</label>
                      <input
                        type="number"
                        value={overrideAmounts.specialFunds}
                        onChange={(e) => setOverrideAmounts(prev => ({ ...prev, specialFunds: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchasing Manager</label>
                      <input
                        type="number"
                        value={overrideAmounts.purchasingManager}
                        onChange={(e) => setOverrideAmounts(prev => ({ ...prev, purchasingManager: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Override Reason *</label>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Explain why you're overriding the automatic allocation..."
                    />
                  </div>

                  <div className="text-sm text-gray-600">
                    Override Total: <span className="font-medium">
                      UGX {(overrideAmounts.savings + overrideAmounts.specialFunds + overrideAmounts.purchasingManager).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {allocation.status === 'auto_calculated' && (
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowOverrideForm(!showOverrideForm)}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Override
                  </button>
                  
                  {showOverrideForm ? (
                    <button
                      type="button"
                      onClick={handleOverride}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Confirm Override
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Allocation
                    </button>
                  )}
                </div>
              )}

              {allocation.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">This allocation has been approved</p>
                  <p className="text-green-600 text-sm">
                    Approved by: {allocation.approvedBy} on {allocation.approvedAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
              )}

              {allocation.status === 'overridden' && allocation.originalAmounts && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium mb-2">This allocation has been overridden</p>
                  <p className="text-yellow-700 text-sm mb-2">Reason: {allocation.overrideReason}</p>
                  <div className="text-xs text-yellow-600">
                    Original: Gross Profit UGX {allocation.originalAmounts.savings.toLocaleString()}, 
                    Daily Expense Fund UGX {allocation.originalAmounts.specialFunds.toLocaleString()}, 
                    PM UGX {allocation.originalAmounts.purchasingManager.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
