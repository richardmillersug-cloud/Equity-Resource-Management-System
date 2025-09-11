'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Eye, EyeOff, Smartphone, CreditCard, Building, DollarSign, Users, Clock, AlertCircle, Plus, Minus } from 'lucide-react';
import { networkShiftAssignmentService, NetworkAssignmentByShift, NetworkBreakdown, NetworkValidationResult } from '../../lib/firebase/network-shift-assignment-service';

interface NetworkShiftAssignmentManagerProps {
  cashCloseId: string;
  branchId: string;
  businessDate: Date;
  cashCloseData: any; // The comprehensive cash close data
  onNetworkDataUpdate: (networkData: any) => void;
  isReadOnly?: boolean;
}

// Network provider configuration
const NETWORK_PROVIDERS = [
  { key: 'airtel', name: 'Airtel Money', icon: Smartphone, color: 'text-red-600' },
  { key: 'mtn', name: 'MTN Mobile Money', icon: Smartphone, color: 'text-yellow-600' },
  { key: 'stanbicBank', name: 'Stanbic Bank', icon: Building, color: 'text-blue-600' },
  { key: 'equityBank', name: 'Equity Bank', icon: Building, color: 'text-green-600' },
  { key: 'absaBank', name: 'Absa Bank', icon: Building, color: 'text-red-700' },
  { key: 'pesaPal', name: 'PesaPal', icon: CreditCard, color: 'text-purple-600' }
];

export default function NetworkShiftAssignmentManager({
  cashCloseId,
  branchId,
  businessDate,
  cashCloseData,
  onNetworkDataUpdate,
  isReadOnly = false
}: NetworkShiftAssignmentManagerProps) {
  const [networkAssignment, setNetworkAssignment] = useState<NetworkAssignmentByShift | null>(null);
  const [validationResult, setValidationResult] = useState<NetworkValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [activeShift, setActiveShift] = useState<'day' | 'night'>('day');
  const [autoAggregated, setAutoAggregated] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (cashCloseId) {
      loadNetworkAssignment();
    }
  }, [cashCloseId]);

  useEffect(() => {
    if (cashCloseData && !autoAggregated) {
      autoAggregateFromCashClose();
    }
  }, [cashCloseData]);

  const loadNetworkAssignment = async () => {
    setLoading(true);
    try {
      const assignment = await networkShiftAssignmentService.getNetworkAssignmentByCashCloseId(cashCloseId);
      
      if (assignment) {
        setNetworkAssignment(assignment);
        await validateAssignment(assignment.id);
      } else if (cashCloseData) {
        // Create new assignment with auto-aggregated data
        await createNewAssignment();
      }
    } catch (error) {
      console.error('Error loading network assignment:', error);
      setErrors([`Failed to load network assignment: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  const createNewAssignment = async () => {
    try {
      // Auto-aggregate network data from cash close
      const aggregatedData = await networkShiftAssignmentService.aggregateNetworkDataFromCashClose(cashCloseData);
      
      const assignmentId = await networkShiftAssignmentService.createNetworkAssignment(
        cashCloseId,
        branchId,
        businessDate,
        'current-user', // TODO: Get from auth service
        'Current User', // TODO: Get from auth service
        {
          dayShiftData: {
            employeeId: '',
            employeeName: '',
            networkBreakdown: aggregatedData.dayShift
          },
          nightShiftData: {
            employeeId: '',
            employeeName: '',
            networkBreakdown: aggregatedData.nightShift
          }
        }
      );

      // Reload the created assignment
      await loadNetworkAssignment();
      setAutoAggregated(true);
    } catch (error) {
      console.error('Error creating network assignment:', error);
      setErrors([`Failed to create network assignment: ${error}`]);
    }
  };

  const autoAggregateFromCashClose = async () => {
    if (!cashCloseData || autoAggregated) return;

    try {
      const aggregatedData = await networkShiftAssignmentService.aggregateNetworkDataFromCashClose(cashCloseData);
      
      // If we have an existing assignment, update it with aggregated data
      if (networkAssignment) {
        // Update day shift
        await updateShiftData('day', {
          ...networkAssignment.dayShift,
          networkBreakdown: aggregatedData.dayShift
        });
        
        // Update night shift
        await updateShiftData('night', {
          ...networkAssignment.nightShift,
          networkBreakdown: aggregatedData.nightShift
        });
      }
      
      setAutoAggregated(true);
      console.log('✅ Network data auto-aggregated from cash close form');
    } catch (error) {
      console.error('Error auto-aggregating network data:', error);
    }
  };

  const updateShiftData = async (shift: 'day' | 'night', shiftData: any) => {
    if (!networkAssignment || isReadOnly) return;

    try {
      await networkShiftAssignmentService.updateShiftNetworkData(
        networkAssignment.id,
        shift,
        {
          assignedEmployeeId: shiftData.assignedEmployeeId,
          assignedEmployeeName: shiftData.assignedEmployeeName,
          networkBreakdown: shiftData.networkBreakdown,
          tillAssignments: shiftData.tillAssignments || []
        }
      );

      // Reload assignment to get updated data
      await loadNetworkAssignment();
    } catch (error) {
      console.error(`Error updating ${shift} shift data:`, error);
      setErrors([...errors, `Failed to update ${shift} shift: ${error}`]);
    }
  };

  const validateAssignment = async (assignmentId: string) => {
    try {
      const result = await networkShiftAssignmentService.validateNetworkAssignments(assignmentId);
      setValidationResult(result);
      
      if (!result.isValid) {
        setErrors(result.errors);
      } else {
        setErrors([]);
      }
    } catch (error) {
      console.error('Error validating assignment:', error);
      setErrors([`Validation error: ${error}`]);
    }
  };

  const updateNetworkAmount = (shift: 'day' | 'night', provider: string, amount: number) => {
    if (!networkAssignment || isReadOnly) return;

    const updatedAssignment = { ...networkAssignment };
    updatedAssignment[`${shift}Shift`].networkBreakdown[provider] = amount;
    
    setNetworkAssignment(updatedAssignment);
    
    // Trigger update
    updateShiftData(shift, updatedAssignment[`${shift}Shift`]);
  };

  const updateEmployeeAssignment = (shift: 'day' | 'night', employeeId: string, employeeName: string) => {
    if (!networkAssignment || isReadOnly) return;

    const updatedAssignment = { ...networkAssignment };
    updatedAssignment[`${shift}Shift`].assignedEmployeeId = employeeId;
    updatedAssignment[`${shift}Shift`].assignedEmployeeName = employeeName;
    
    setNetworkAssignment(updatedAssignment);
    
    // Trigger update
    updateShiftData(shift, updatedAssignment[`${shift}Shift`]);
  };

  const calculateShiftTotals = (shiftData: any) => {
    const networkTotal = Object.values(shiftData.networkBreakdown).reduce((sum: number, val: any) => sum + (val as number), 0);
    return {
      networkTotal,
      actualTotal: shiftData.actualNetworkMoney || 0,
      variance: networkTotal - (shiftData.actualNetworkMoney || 0)
    };
  };

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'discrepancy':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading network assignments...</span>
        </div>
      </div>
    );
  }

  if (!networkAssignment) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Network Assignment Required</h3>
          <p className="text-gray-600 mb-4">
            📱 Network assignments by shift must be tracked for this cash close.
          </p>
          <button
            onClick={createNewAssignment}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Network Assignment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            📱 Network Assignments by Shift
          </h3>
          {validationResult && (
            <div className="flex items-center space-x-2">
              {validationResult.isValid ? (
                <div className="flex items-center space-x-1 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Complete</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{validationResult.errors.length} issues</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          
          <div className="text-sm text-gray-500">
            {networkAssignment.summary.completionPercentage}% Complete
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Issues Found</h4>
              <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Total Network Money</p>
              <p className="text-2xl font-bold text-blue-900">
                UGX {networkAssignment.summary.totalNetworkMoney.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Total Actual</p>
              <p className="text-2xl font-bold text-green-900">
                UGX {networkAssignment.summary.totalActualMoney.toLocaleString()}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className={`rounded-lg p-4 ${
          Math.abs(networkAssignment.summary.totalVariance) < 1000 
            ? 'bg-green-50' 
            : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${
                Math.abs(networkAssignment.summary.totalVariance) < 1000 
                  ? 'text-green-700' 
                  : 'text-red-700'
              }`}>
                Total Variance
              </p>
              <p className={`text-2xl font-bold ${
                Math.abs(networkAssignment.summary.totalVariance) < 1000 
                  ? 'text-green-900' 
                  : 'text-red-900'
              }`}>
                UGX {networkAssignment.summary.totalVariance.toLocaleString()}
              </p>
            </div>
            {Math.abs(networkAssignment.summary.totalVariance) < 1000 ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            )}
          </div>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Shift Selection Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveShift('day')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeShift === 'day'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>☀️ Day Shift</span>
                {getValidationStatusIcon(networkAssignment.dayShift.verificationStatus)}
              </div>
            </button>
            <button
              onClick={() => setActiveShift('night')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeShift === 'night'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>🌙 Night Shift</span>
                {getValidationStatusIcon(networkAssignment.nightShift.verificationStatus)}
              </div>
            </button>
          </div>

          {/* Active Shift Details */}
          {['day', 'night'].map(shift => {
            const shiftKey = `${shift}Shift` as keyof NetworkAssignmentByShift;
            const shiftData = networkAssignment[shiftKey] as any;
            const totals = calculateShiftTotals(shiftData);
            
            if (activeShift !== shift) return null;

            return (
              <div key={shift} className="space-y-6">
                {/* Employee Assignment */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="h-4 w-4 inline mr-1" />
                    {shift === 'day' ? '☀️ Day' : '🌙 Night'} Shift Assigned Employee
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Employee ID"
                      value={shiftData.assignedEmployeeId}
                      onChange={(e) => updateEmployeeAssignment(
                        shift as 'day' | 'night', 
                        e.target.value, 
                        shiftData.assignedEmployeeName
                      )}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isReadOnly}
                    />
                    <input
                      type="text"
                      placeholder="Employee Name"
                      value={shiftData.assignedEmployeeName}
                      onChange={(e) => updateEmployeeAssignment(
                        shift as 'day' | 'night', 
                        shiftData.assignedEmployeeId, 
                        e.target.value
                      )}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                {/* Network Provider Breakdown */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-4">
                    📱 Network Provider Assignments - {shift === 'day' ? '☀️ Day' : '🌙 Night'} Shift
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {NETWORK_PROVIDERS.map(provider => {
                      const Icon = provider.icon;
                      const amount = shiftData.networkBreakdown[provider.key] || 0;
                      
                      return (
                        <div key={provider.key} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Icon className={`h-5 w-5 ${provider.color}`} />
                            <span className="font-medium text-gray-900">{provider.name}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => updateNetworkAmount(
                                shift as 'day' | 'night',
                                provider.key,
                                Number(e.target.value) || 0
                              )}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Amount (UGX)"
                              disabled={isReadOnly}
                            />
                            <p className="text-sm text-gray-600">
                              UGX {amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shift Totals */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-800 mb-3">
                    {shift === 'day' ? '☀️ Day' : '🌙 Night'} Shift Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Expected Network Money</p>
                      <p className="text-xl font-bold text-blue-900">
                        UGX {totals.networkTotal.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Actual Network Money</p>
                      <p className="text-xl font-bold text-green-900">
                        UGX {totals.actualTotal.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Variance</p>
                      <p className={`text-xl font-bold ${
                        Math.abs(totals.variance) < 1000 ? 'text-green-900' : 'text-red-900'
                      }`}>
                        UGX {totals.variance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Validation Results */}
          {validationResult && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-800 mb-4">Validation Status</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg ${
                  validationResult.completionStatus.dayShiftComplete
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className="text-center">
                    {validationResult.completionStatus.dayShiftComplete ? (
                      <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">Day Shift Complete</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  validationResult.completionStatus.nightShiftComplete
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className="text-center">
                    {validationResult.completionStatus.nightShiftComplete ? (
                      <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">Night Shift Complete</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  validationResult.completionStatus.allNetworkProvidersAssigned
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className="text-center">
                    {validationResult.completionStatus.allNetworkProvidersAssigned ? (
                      <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">All Providers Assigned</p>
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  validationResult.completionStatus.noVarianceIssues
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <div className="text-center">
                    {validationResult.completionStatus.noVarianceIssues ? (
                      <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
                    )}
                    <p className="text-xs font-medium">No Variance Issues</p>
                  </div>
                </div>
              </div>

              {validationResult.warnings.length > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-900">Warnings</h5>
                      <ul className="mt-1 list-disc list-inside text-sm text-yellow-700">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      {!isReadOnly && (
        <div className="border-t border-gray-200 pt-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              📱 Ensure ALL network assignments are captured for BOTH day and night shifts
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => validateAssignment(networkAssignment.id)}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                Validate Assignment
              </button>
              <button
                onClick={autoAggregateFromCashClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Auto-Aggregate from Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export validation utility for use in parent components
export const validateNetworkAssignmentForCashClose = async (cashCloseId: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  try {
    const assignment = await networkShiftAssignmentService.getNetworkAssignmentByCashCloseId(cashCloseId);
    
    if (!assignment) {
      return {
        isValid: false,
        errors: ['📱 Network assignments by shift are required for cash close'],
        warnings: []
      };
    }

    const validationResult = await networkShiftAssignmentService.validateNetworkAssignments(assignment.id);
    
    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation failed: ${error}`],
      warnings: []
    };
  }
};















