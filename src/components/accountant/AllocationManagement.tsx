'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Calculator, DollarSign, Edit3, Banknote, CreditCard, Smartphone, Building, Receipt, Clock, ArrowRight } from 'lucide-react';
import { autoAllocationService, AllocationResult } from '../../lib/firebase/auto-allocation-service';
import { authService } from '../../lib/firebase/auth';

interface AllocationManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  cashCloseId?: string;
}

export default function AllocationManagement({ 
  isOpen, 
  onClose, 
  onUpdate,
  cashCloseId 
}: AllocationManagementProps) {
  const [allocations, setAllocations] = useState<AllocationResult[]>([]);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'collect' | 'distribute'>('overview');

  // Physical collection form state
  const [collectionForm, setCollectionForm] = useState({
    actualAmount: 0,
    collectionNotes: '',
    varianceReason: ''
  });

  // Distribution form state
  const [distributionForm, setDistributionForm] = useState({
    category: 'purchasingManager' as 'savings' | 'specialFunds' | 'purchasingManager',
    method: 'cash_handover' as string,
    reference: '',
    receivedBy: '',
    receiptNumber: '',
    distributionNotes: ''
  });

  useEffect(() => {
    if (isOpen && cashCloseId) {
      loadAllocations();
    }
  }, [isOpen, cashCloseId]);

  const loadAllocations = async () => {
    if (!cashCloseId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const allocationsList = await autoAllocationService.getAllAllocationsByCashCloseId(cashCloseId);
      setAllocations(allocationsList);
      
      if (allocationsList.length === 0) {
        setError('No allocations found for this cash close');
      } else {
        // Set first allocation as selected by default
        setSelectedAllocation(allocationsList[0]);
      }
    } catch (err: any) {
      setError('Failed to load allocations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalCollection = async () => {
    if (!selectedAllocation) return;
    
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');
      
      await autoAllocationService.recordPhysicalCollection(
        selectedAllocation.id,
        collectionForm.actualAmount,
        currentUser.uid,
        collectionForm.collectionNotes,
        collectionForm.varianceReason
      );
      
      // Reset form and reload
      setCollectionForm({
        actualAmount: 0,
        collectionNotes: '',
        varianceReason: ''
      });
      
      await loadAllocations();
      onUpdate();
      
    } catch (err: any) {
      setError('Failed to record collection: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribution = async () => {
    if (!selectedAllocation) return;
    
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error('User not authenticated');
      
      if (distributionForm.category === 'purchasingManager') {
        await autoAllocationService.markPurchasingManagerAsAllocated(
          selectedAllocation.id,
          distributionForm.method as 'cash_handover' | 'bank_transfer' | 'mobile_money',
          currentUser.uid,
          distributionForm.receivedBy,
          distributionForm.reference,
          distributionForm.receiptNumber
        );
      } else {
        await autoAllocationService.updateDistributionStatus(
          selectedAllocation.id,
          distributionForm.category,
          'distributed',
          {
            method: distributionForm.method,
            reference: distributionForm.reference,
            distributedBy: currentUser.uid
          }
        );
      }
      
      // Reset form and reload
      setDistributionForm({
        category: 'purchasingManager',
        method: 'cash_handover',
        reference: '',
        receivedBy: '',
        receiptNumber: '',
        distributionNotes: ''
      });
      
      await loadAllocations();
      onUpdate();
      
    } catch (err: any) {
      setError('Failed to record distribution: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'allocated': return 'bg-green-100 text-green-800';
      case 'distributed': return 'bg-blue-100 text-blue-800';
      case 'banked': return 'bg-purple-100 text-purple-800';
      case 'transferred': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDistributionIcon = (method: string) => {
    switch (method) {
      case 'cash_handover': return <Banknote className="w-4 h-4" />;
      case 'bank_transfer': return <Building className="w-4 h-4" />;
      case 'bank_deposit': return <Building className="w-4 h-4" />;
      case 'mobile_money': return <Smartphone className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
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
              <h2 className="text-xl font-semibold text-gray-900">Allocation Management</h2>
              <p className="text-sm text-gray-600">Manage per-shift allocations and distributions</p>
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
        <div className="flex h-[70vh]">
          {/* Left Sidebar - Allocation List */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Shift Allocations</h3>
              {cashCloseId && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {cashCloseId.substring(0, 8)}...
                </span>
              )}
            </div>

            {loading && allocations.length === 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading allocations...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  onClick={() => setSelectedAllocation(allocation)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAllocation?.id === allocation.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize text-gray-900">
                      {allocation.shiftType} Shift
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      allocation.distributionStatus.purchasingManager === 'allocated' ? 
                      'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {allocation.distributionStatus.purchasingManager === 'allocated' ? 
                       'Allocated' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Cash:</span>
                      <span className="font-medium">UGX {allocation.totalCashInTill.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PM Amount:</span>
                      <span className="font-medium text-green-600">
                        UGX {allocation.purchasingManagerAmount.toLocaleString()}
                      </span>
                    </div>
                    {allocation.physicalCollection && (
                      <div className="flex justify-between">
                        <span>Collected:</span>
                        <span className="font-medium text-blue-600">
                          UGX {allocation.physicalCollection.actualAmountCollected.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Selected Allocation Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedAllocation ? (
              <div className="space-y-6">
                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('collect')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'collect'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Collect Cash
                  </button>
                  <button
                    onClick={() => setActiveTab('distribute')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'distribute'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Distribute
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Allocation Summary */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                        {selectedAllocation.shiftType} Shift - Allocation Summary
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Banknote className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="text-xs text-purple-600 font-medium">12%</span>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
                          <p className="text-lg font-bold text-purple-600">
                            UGX {selectedAllocation.savingsAmount.toLocaleString()}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                            getStatusColor(selectedAllocation.distributionStatus.savings)
                          }`}>
                            {selectedAllocation.distributionStatus.savings}
                          </span>
                        </div>

                        <div className="bg-white rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-xs text-blue-600 font-medium">Special</span>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">Daily Expense Fund</p>
                          <p className="text-lg font-bold text-blue-600">
                            UGX {selectedAllocation.specialFundsAmount.toLocaleString()}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                            getStatusColor(selectedAllocation.distributionStatus.specialFunds)
                          }`}>
                            {selectedAllocation.distributionStatus.specialFunds}
                          </span>
                        </div>

                        <div className="bg-white rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <Receipt className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-xs text-green-600 font-medium">PM</span>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">Purchasing Manager</p>
                          <p className="text-lg font-bold text-green-600">
                            UGX {selectedAllocation.purchasingManagerAmount.toLocaleString()}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                            getStatusColor(selectedAllocation.distributionStatus.purchasingManager)
                          }`}>
                            {selectedAllocation.distributionStatus.purchasingManager}
                          </span>
                        </div>
                      </div>

                      {/* Formula Display */}
                      <div className="bg-white rounded border p-3">
                        <p className="text-xs text-gray-600 mb-2">Calculation Formula:</p>
                        <div className="text-sm space-y-1">
                          <p>Total Cash in Till: <span className="font-medium">UGX {selectedAllocation.totalCashInTill.toLocaleString()}</span></p>
                          <p>Gross Profit (12%): <span className="font-medium">UGX {selectedAllocation.savingsAmount.toLocaleString()}</span></p>
                          <p>Daily Expense Fund: <span className="font-medium">UGX {selectedAllocation.specialFundsAmount.toLocaleString()}</span></p>
                          <hr className="my-1" />
                          <p className="font-bold">PM = Total - (Gross Profit + Daily Expense Fund)</p>
                          <p className="font-bold text-green-600">= UGX {selectedAllocation.purchasingManagerAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Physical Collection Status */}
                      {selectedAllocation.physicalCollection && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">Physical Collection Recorded</h5>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700">Amount Collected:</span>
                              <span className="ml-2 font-medium">UGX {selectedAllocation.physicalCollection.actualAmountCollected.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-blue-700">Variance:</span>
                              <span className={`ml-2 font-medium ${
                                selectedAllocation.physicalCollection.varianceAmount === 0 ? 'text-green-600' :
                                selectedAllocation.physicalCollection.varianceAmount > 0 ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {selectedAllocation.physicalCollection.varianceAmount > 0 ? '+' : ''}
                                UGX {selectedAllocation.physicalCollection.varianceAmount.toLocaleString()}
                              </span>
                            </div>
                            {selectedAllocation.physicalCollection.varianceReason && (
                              <div className="col-span-2">
                                <span className="text-blue-700">Reason:</span>
                                <span className="ml-2">{selectedAllocation.physicalCollection.varianceReason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'collect' && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-yellow-900 mb-4">Physical Cash Collection</h4>
                      
                      {selectedAllocation.physicalCollection ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <span className="font-medium text-green-800">Cash already collected</span>
                          </div>
                          <p className="text-green-700 text-sm mt-1">
                            UGX {selectedAllocation.physicalCollection.actualAmountCollected.toLocaleString()} collected on{' '}
                            {selectedAllocation.physicalCollection.collectedAt.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-white rounded border p-4">
                            <h5 className="font-medium text-gray-900 mb-3">Expected vs Actual Collection</h5>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-gray-600">Expected Total:</span>
                                <span className="ml-2 font-bold text-green-600">
                                  UGX {selectedAllocation.totalAllocated.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Your Input:</span>
                                <span className="ml-2 font-bold text-blue-600">
                                  UGX {collectionForm.actualAmount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            {collectionForm.actualAmount > 0 && (
                              <div className="bg-gray-50 rounded p-3 text-sm">
                                <div className="flex justify-between items-center">
                                  <span>Variance:</span>
                                  <span className={`font-bold ${
                                    (collectionForm.actualAmount - selectedAllocation.totalAllocated) === 0 ? 'text-green-600' :
                                    (collectionForm.actualAmount - selectedAllocation.totalAllocated) > 0 ? 'text-blue-600' : 'text-red-600'
                                  }`}>
                                    {(collectionForm.actualAmount - selectedAllocation.totalAllocated) > 0 ? '+' : ''}
                                    UGX {(collectionForm.actualAmount - selectedAllocation.totalAllocated).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Actual Amount Collected (UGX) *
                            </label>
                            <input
                              type="number"
                              value={collectionForm.actualAmount}
                              onChange={(e) => setCollectionForm(prev => ({ ...prev, actualAmount: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Enter actual cash collected"
                              min="0"
                            />
                          </div>

                          {Math.abs(collectionForm.actualAmount - selectedAllocation.totalAllocated) > 1000 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Variance Reason *
                              </label>
                              <textarea
                                value={collectionForm.varianceReason}
                                onChange={(e) => setCollectionForm(prev => ({ ...prev, varianceReason: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Explain why the actual amount differs from expected..."
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Collection Notes (Optional)
                            </label>
                            <textarea
                              value={collectionForm.collectionNotes}
                              onChange={(e) => setCollectionForm(prev => ({ ...prev, collectionNotes: e.target.value }))}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Any additional notes about the collection..."
                            />
                          </div>

                          <div className="flex justify-end pt-4">
                            <button
                              onClick={handlePhysicalCollection}
                              disabled={loading || collectionForm.actualAmount <= 0}
                              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                            >
                              Record Collection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'distribute' && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-green-900 mb-4">Distribution Management</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Distribution Category
                          </label>
                          <select
                            value={distributionForm.category}
                            onChange={(e) => setDistributionForm(prev => ({ 
                              ...prev, 
                              category: e.target.value as 'savings' | 'specialFunds' | 'purchasingManager' 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="savings">Gross Profit (UGX {selectedAllocation.savingsAmount.toLocaleString()})</option>
                            <option value="specialFunds">Daily Expense Fund (UGX {selectedAllocation.specialFundsAmount.toLocaleString()})</option>
                            <option value="purchasingManager">Purchasing Manager (UGX {selectedAllocation.purchasingManagerAmount.toLocaleString()})</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Distribution Method
                          </label>
                          <select
                            value={distributionForm.method}
                            onChange={(e) => setDistributionForm(prev => ({ ...prev, method: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {distributionForm.category === 'savings' && (
                              <>
                                <option value="bank_deposit">Bank Deposit</option>
                                <option value="safe_storage">Safe Storage</option>
                              </>
                            )}
                            {distributionForm.category === 'specialFunds' && (
                              <>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash_envelope">Cash Envelope</option>
                                <option value="account_transfer">Account Transfer</option>
                              </>
                            )}
                            {distributionForm.category === 'purchasingManager' && (
                              <>
                                <option value="cash_handover">Cash Handover</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="mobile_money">Mobile Money</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reference/Transaction ID
                            </label>
                            <input
                              type="text"
                              value={distributionForm.reference}
                              onChange={(e) => setDistributionForm(prev => ({ ...prev, reference: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Bank ref, receipt no, etc."
                            />
                          </div>

                          {distributionForm.category === 'purchasingManager' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Received By *
                              </label>
                              <input
                                type="text"
                                value={distributionForm.receivedBy}
                                onChange={(e) => setDistributionForm(prev => ({ ...prev, receivedBy: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Purchasing Manager name"
                              />
                            </div>
                          )}
                        </div>

                        {distributionForm.category === 'purchasingManager' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Receipt Number
                            </label>
                            <input
                              type="text"
                              value={distributionForm.receiptNumber}
                              onChange={(e) => setDistributionForm(prev => ({ ...prev, receiptNumber: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Handover receipt number"
                            />
                          </div>
                        )}

                        <div className="flex justify-end pt-4">
                          <button
                            onClick={handleDistribution}
                            disabled={loading || (distributionForm.category === 'purchasingManager' && !distributionForm.receivedBy)}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <div className="flex items-center">
                              {getDistributionIcon(distributionForm.method)}
                              <span className="ml-2">Record Distribution</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a shift allocation to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





