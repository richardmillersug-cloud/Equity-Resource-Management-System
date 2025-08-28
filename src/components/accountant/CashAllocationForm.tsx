'use client';

import React, { useState } from 'react';
import { X, Save, Calculator, DollarSign, Users, Banknote, FileText, AlertCircle } from 'lucide-react';
import { InterfaceDatabaseConnector } from '../../lib/firebase/interface-database-connector';
import { authService } from '../../lib/firebase/auth';

interface CashAllocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function CashAllocationForm({ isOpen, onClose, onSubmit }: CashAllocationFormProps) {
  const [formData, setFormData] = useState({
    cashCloseTotal: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Calculate derived values
  const cashCloseTotal = parseFloat(formData.cashCloseTotal) || 0;
  const savings = cashCloseTotal * 0.12; // 12% savings rule
  const remainingAmount = cashCloseTotal - savings;
  const specialFunds = remainingAmount * 0.3; // 30% of remaining goes to special funds
  const purchasingManager = remainingAmount * 0.7; // 70% of remaining goes to purchasing manager

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.cashCloseTotal || parseFloat(formData.cashCloseTotal) <= 0) {
      newErrors.cashCloseTotal = 'Cash close total must be greater than 0';
    }

    if (parseFloat(formData.cashCloseTotal) > 10000000) { // 10M limit
      newErrors.cashCloseTotal = 'Cash close total seems unusually high. Please verify.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const allocationData = {
        cashCloseTotal: parseFloat(formData.cashCloseTotal),
        savings,
        specialFunds,
        purchasingManager,
        accountantId: currentUser.uid,
        allocationStatus: 'BALANCED', // Always balanced since we calculate properly
        savingsValidation: 'CORRECT', // Always correct since we enforce 12%
        notes: formData.notes || `Cash allocation created on ${new Date().toLocaleDateString()}`
      };

      console.log('Creating cash allocation:', allocationData);
      
      await InterfaceDatabaseConnector.createCashAllocation(allocationData);
      
      // Reset form
      setFormData({
        cashCloseTotal: '',
        notes: ''
      });
      
      onSubmit(); // Trigger parent refresh
      onClose();
      
    } catch (error: any) {
      console.error('Error creating cash allocation:', error);
      setErrors({ submit: error.message || 'Failed to create cash allocation' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cashCloseTotal: '',
      notes: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
              <h2 className="text-xl font-semibold text-gray-900">Create Cash Allocation</h2>
              <p className="text-sm text-gray-600">Allocate funds across departments with automatic savings calculation</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cash Close Total Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Cash Close Total *
            </label>
            <input
              type="number"
              name="cashCloseTotal"
              value={formData.cashCloseTotal}
              onChange={handleInputChange}
              placeholder="Enter total cash amount"
              step="0.01"
              min="0"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg ${
                errors.cashCloseTotal ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.cashCloseTotal && (
              <p className="text-red-600 text-sm mt-1">{errors.cashCloseTotal}</p>
            )}
          </div>

          {/* Allocation Preview */}
          {cashCloseTotal > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Allocation Breakdown</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Banknote className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs text-purple-600 font-medium">12%</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Savings</p>
                    <p className="text-lg font-bold text-gray-900">UGX {savings.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs text-blue-600 font-medium">30%</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Special Funds</p>
                    <p className="text-lg font-bold text-gray-900">UGX {specialFunds.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-xs text-green-600 font-medium">70%</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Purchasing Manager</p>
                    <p className="text-lg font-bold text-gray-900">UGX {purchasingManager.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              <div className="flex items-center space-x-4 pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-700 font-medium">Allocation: BALANCED</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-700 font-medium">Savings: CORRECT (12%)</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any additional notes about this allocation..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || cashCloseTotal <= 0}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Allocation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}