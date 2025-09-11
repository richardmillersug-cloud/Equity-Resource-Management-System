'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Smartphone, ArrowRight } from 'lucide-react';
import NetworkShiftAssignmentManager, { validateNetworkAssignmentForCashClose } from './NetworkShiftAssignmentManager';

interface CashCloseNetworkIntegrationProps {
  cashCloseData: any;
  setCashCloseData: (data: any) => void;
  cashCloseId?: string;
  branchId: string;
  businessDate: Date;
  isReadOnly?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

/**
 * 📱 Integration component that ensures network assignments by shift are captured
 * CRITICAL: This component MUST be included in all cash close forms
 */
export default function CashCloseNetworkIntegration({
  cashCloseData,
  setCashCloseData,
  cashCloseId,
  branchId,
  businessDate,
  isReadOnly = false,
  onValidationChange
}: CashCloseNetworkIntegrationProps) {
  const [networkValidation, setNetworkValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isValid: false, errors: [], warnings: [] });
  
  const [showNetworkManager, setShowNetworkManager] = useState(false);
  const [networkDataSynced, setNetworkDataSynced] = useState(false);

  useEffect(() => {
    if (cashCloseId) {
      validateNetworkAssignments();
    }
  }, [cashCloseId]);

  useEffect(() => {
    // Sync network data from cash close form to ensure consistency
    if (cashCloseData && !networkDataSynced) {
      syncNetworkDataWithCashClose();
    }
  }, [cashCloseData]);

  const validateNetworkAssignments = async () => {
    if (!cashCloseId) return;

    try {
      const validation = await validateNetworkAssignmentForCashClose(cashCloseId);
      setNetworkValidation(validation);
      
      if (onValidationChange) {
        onValidationChange(validation.isValid);
      }
    } catch (error) {
      console.error('Error validating network assignments:', error);
      setNetworkValidation({
        isValid: false,
        errors: [`Validation error: ${error}`],
        warnings: []
      });
    }
  };

  const syncNetworkDataWithCashClose = () => {
    if (!cashCloseData.shifts) return;

    // Extract network data from cash close form and ensure it matches network assignment requirements
    let dayShiftNetworkTotal = 0;
    let nightShiftNetworkTotal = 0;

    for (const shift of cashCloseData.shifts) {
      let shiftNetworkTotal = 0;
      
      if (shift.tills && Array.isArray(shift.tills)) {
        for (const till of shift.tills) {
          if (till.networkPayments && Array.isArray(till.networkPayments)) {
            shiftNetworkTotal += till.networkPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
          }
        }
      }
      
      if (shift.shift === 'day') {
        dayShiftNetworkTotal = shiftNetworkTotal;
      } else if (shift.shift === 'night') {
        nightShiftNetworkTotal = shiftNetworkTotal;
      }
    }

    // Update cash close data with network totals
    const updatedCashCloseData = {
      ...cashCloseData,
      networkSummary: {
        dayShiftTotal: dayShiftNetworkTotal,
        nightShiftTotal: nightShiftNetworkTotal,
        combinedTotal: dayShiftNetworkTotal + nightShiftNetworkTotal,
        lastSyncedAt: new Date()
      }
    };

    setCashCloseData(updatedCashCloseData);
    setNetworkDataSynced(true);
  };

  const handleNetworkDataUpdate = (networkData: any) => {
    // Update cash close data with network assignment information
    const updatedCashCloseData = {
      ...cashCloseData,
      networkAssignments: networkData,
      lastNetworkUpdate: new Date()
    };
    
    setCashCloseData(updatedCashCloseData);
    
    // Re-validate after update
    if (cashCloseId) {
      setTimeout(() => validateNetworkAssignments(), 500);
    }
  };

  const getNetworkCompletionStatus = () => {
    if (networkValidation.isValid) {
      return { status: 'complete', color: 'green', icon: CheckCircle };
    } else if (networkValidation.errors.length > 0) {
      return { status: 'incomplete', color: 'red', icon: AlertTriangle };
    } else {
      return { status: 'pending', color: 'yellow', icon: AlertTriangle };
    }
  };

  const completionStatus = getNetworkCompletionStatus();
  const StatusIcon = completionStatus.icon;

  return (
    <div className="space-y-6">
      {/* Network Assignment Status Card */}
      <div className={`border-2 rounded-lg p-4 ${
        completionStatus.status === 'complete' 
          ? 'border-green-200 bg-green-50' 
          : completionStatus.status === 'incomplete'
          ? 'border-red-200 bg-red-50'
          : 'border-yellow-200 bg-yellow-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              completionStatus.status === 'complete'
                ? 'bg-green-100'
                : completionStatus.status === 'incomplete'
                ? 'bg-red-100'
                : 'bg-yellow-100'
            }`}>
              <Smartphone className={`h-6 w-6 text-${completionStatus.color}-600`} />
            </div>
            <div>
              <h3 className={`font-medium text-${completionStatus.color}-900`}>
                📱 Network Assignments by Shift
              </h3>
              <p className={`text-sm text-${completionStatus.color}-700`}>
                {completionStatus.status === 'complete' 
                  ? '✅ All network assignments completed for both day and night shifts'
                  : completionStatus.status === 'incomplete'
                  ? '❌ Network assignments incomplete - required for cash close'
                  : '⏳ Network assignments pending - please complete for both shifts'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {completionStatus.status !== 'complete' && (
              <StatusIcon className={`h-6 w-6 text-${completionStatus.color}-600`} />
            )}
            <button
              onClick={() => setShowNetworkManager(!showNetworkManager)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                completionStatus.status === 'complete'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : completionStatus.status === 'incomplete'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {showNetworkManager ? 'Hide' : 'Manage'} Network Assignments
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {networkValidation.errors.length > 0 && (
          <div className="mt-4 p-3 bg-white border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Required Network Assignments</h4>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {networkValidation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Validation Warnings */}
        {networkValidation.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-white border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Network Assignment Warnings</h4>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {networkValidation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Network Summary from Cash Close Data */}
      {cashCloseData?.networkSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">
            📊 Network Money Summary from Cash Close Form
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-blue-700">☀️ Day Shift</p>
              <p className="text-xl font-bold text-blue-900">
                UGX {cashCloseData.networkSummary.dayShiftTotal.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-700">🌙 Night Shift</p>
              <p className="text-xl font-bold text-blue-900">
                UGX {cashCloseData.networkSummary.nightShiftTotal.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-700">📱 Total Network</p>
              <p className="text-xl font-bold text-blue-900">
                UGX {cashCloseData.networkSummary.combinedTotal.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-blue-700">
            <ArrowRight className="h-4 w-4" />
            <span>This data will be validated against network assignments</span>
          </div>
        </div>
      )}

      {/* Network Assignment Manager */}
      {showNetworkManager && cashCloseId && (
        <NetworkShiftAssignmentManager
          cashCloseId={cashCloseId}
          branchId={branchId}
          businessDate={businessDate}
          cashCloseData={cashCloseData}
          onNetworkDataUpdate={handleNetworkDataUpdate}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Required Notice for Accountants */}
      {!networkValidation.isValid && !isReadOnly && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">
                📱 Network Assignment Required
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p className="mb-2">
                  <strong>IMPORTANT:</strong> You must complete network assignments for BOTH day and night shifts before submitting the cash close.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Assign network money (Airtel, MTN, Banks) to appropriate shifts</li>
                  <li>Ensure assigned employees are recorded for each shift</li>
                  <li>Verify network totals match actual amounts collected</li>
                  <li>All major network providers must be accounted for</li>
                </ul>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setShowNetworkManager(true)}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  Complete Network Assignments Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export utility functions for parent components
export const isNetworkAssignmentComplete = async (cashCloseId: string): Promise<boolean> => {
  if (!cashCloseId) return false;
  
  try {
    const validation = await validateNetworkAssignmentForCashClose(cashCloseId);
    return validation.isValid;
  } catch (error) {
    console.error('Error checking network assignment completion:', error);
    return false;
  }
};

export const getNetworkAssignmentValidationErrors = async (cashCloseId: string): Promise<string[]> => {
  if (!cashCloseId) return ['Cash close ID is required for network validation'];
  
  try {
    const validation = await validateNetworkAssignmentForCashClose(cashCloseId);
    return validation.errors;
  } catch (error) {
    return [`Network validation failed: ${error}`];
  }
};















