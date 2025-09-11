'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Eye, EyeOff, RefreshCw, Bug, Clock } from 'lucide-react';
import { debugShiftData, processCashCloseShifts, extractShiftFromCashClose } from '../../lib/firebase/shift-data-fix';
import { UnifiedCashCloseService } from '../../lib/firebase/unified-cash-close-service';

interface ShiftDataDebuggerProps {
  cashCloseData?: any;
  showDebugger?: boolean;
}

/**
 * 🔧 Shift Data Debugger Component
 * Helps identify and fix shift assignment issues
 * Shows why data is being assigned to day vs night shifts
 */
export default function ShiftDataDebugger({ 
  cashCloseData, 
  showDebugger = false 
}: ShiftDataDebuggerProps) {
  const [isVisible, setIsVisible] = useState(showDebugger);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [recentCashCloses, setRecentCashCloses] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  useEffect(() => {
    if (cashCloseData && isVisible) {
      analyzeCashCloseData(cashCloseData);
    }
  }, [cashCloseData, isVisible]);

  useEffect(() => {
    if (isVisible) {
      loadRecentCashCloses();
    }
  }, [isVisible]);

  const analyzeCashCloseData = (data: any) => {
    console.log('🔍 ANALYZING CASH CLOSE DATA FOR SHIFT ISSUES...');
    
    // Debug the raw data
    debugShiftData(data, 'DEBUGGER ANALYSIS');
    
    // Process shifts
    const { dayShiftData, nightShiftData, hasMultipleShifts } = processCashCloseShifts(data);
    
    // Extract overall shift
    const extractedShift = extractShiftFromCashClose(data);
    
    const debugInfo = {
      rawData: {
        hasShiftField: 'shift' in data,
        shiftValue: data.shift,
        hasShiftsArray: 'shifts' in data,
        shiftsCount: data.shifts?.length || 0,
        timeFields: {
          time: data.time,
          timestamp: data.timestamp,
          createdAt: data.createdAt,
          cashCloseDate: data.cashCloseDate
        }
      },
      processing: {
        extractedShift,
        hasMultipleShifts,
        dayShiftFound: !!dayShiftData?.tills?.length,
        nightShiftFound: !!nightShiftData?.tills?.length
      },
      shiftBreakdown: {
        dayShift: {
          tillsCount: dayShiftData?.tills?.length || 0,
          networkPaymentsCount: dayShiftData?.tills?.reduce((sum: number, till: any) => 
            sum + (till.networkPayments?.length || 0), 0) || 0,
          totalNetworkAmount: dayShiftData?.tills?.reduce((sum: number, till: any) =>
            sum + (till.networkPayments?.reduce((tillSum: number, payment: any) => 
              tillSum + (payment.amount || 0), 0) || 0), 0) || 0
        },
        nightShift: {
          tillsCount: nightShiftData?.tills?.length || 0,
          networkPaymentsCount: nightShiftData?.tills?.reduce((sum: number, till: any) => 
            sum + (till.networkPayments?.length || 0), 0) || 0,
          totalNetworkAmount: nightShiftData?.tills?.reduce((sum: number, till: any) =>
            sum + (till.networkPayments?.reduce((tillSum: number, payment: any) => 
              tillSum + (payment.amount || 0), 0) || 0), 0) || 0
        }
      },
      issues: []
    };

    // Identify issues
    if (!hasMultipleShifts && extractedShift === 'day') {
      debugInfo.issues.push({
        type: 'warning',
        message: 'All data assigned to DAY shift - verify if night shift data exists'
      });
    }

    if (debugInfo.shiftBreakdown.dayShift.tillsCount > 0 && debugInfo.shiftBreakdown.nightShift.tillsCount === 0) {
      debugInfo.issues.push({
        type: 'warning',
        message: 'Only DAY shift has tills - night shift appears empty'
      });
    }

    if (!data.shift && !data.shifts) {
      debugInfo.issues.push({
        type: 'error',
        message: 'No shift information found in data - cannot properly assign network payments'
      });
    }

    setDebugInfo(debugInfo);
  };

  const loadRecentCashCloses = async () => {
    try {
      const cashCloses = await UnifiedCashCloseService.getAllCashCloses();
      setRecentCashCloses(cashCloses.slice(0, 10)); // Latest 10 records
    } catch (error) {
      console.error('Error loading recent cash closes:', error);
    }
  };

  const analyzeRecord = (record: any) => {
    setSelectedRecord(record);
    analyzeCashCloseData(record);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700"
          title="Open Shift Data Debugger"
        >
          <Bug className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bug className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-900">
                🔧 Shift Data Debugger
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadRecentCashCloses}
                className="text-gray-600 hover:text-gray-800 p-2"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Debug why data is being assigned to day shift instead of proper day/night distribution
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Recent Cash Closes */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Recent Cash Close Records</h4>
            <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
              {recentCashCloses.map((record, index) => (
                <div
                  key={record.id || index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => analyzeRecord(record)}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium text-sm">
                        {new Date(record.date || record.createdAt).toLocaleDateString()}
                      </span>
                      <div className="text-xs text-gray-600">
                        Shift: {record.shift || 'Unknown'} | 
                        Revenue: UGX {(record.closeCash || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.shift === 'night' 
                        ? 'bg-blue-100 text-blue-800' 
                        : record.shift === 'day'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {record.shift === 'night' ? '🌙' : record.shift === 'day' ? '☀️' : '❓'}
                      {record.shift || 'Unknown'}
                    </span>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Analysis */}
          {debugInfo && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Debug Analysis Results</h4>
                
                {/* Issues */}
                {debugInfo.issues.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">🚨 Identified Issues:</h5>
                    <div className="space-y-2">
                      {debugInfo.issues.map((issue: any, index: number) => (
                        <div
                          key={index}
                          className={`flex items-start space-x-2 p-2 rounded ${
                            issue.type === 'error' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {issue.type === 'error' ? (
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Data Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">📊 Raw Data Fields:</h5>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Has shift field:</span>
                        <span className={debugInfo.rawData.hasShiftField ? 'text-green-600' : 'text-red-600'}>
                          {debugInfo.rawData.hasShiftField ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shift value:</span>
                        <span className="font-mono">{debugInfo.rawData.shiftValue || 'null'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Has shifts array:</span>
                        <span className={debugInfo.rawData.hasShiftsArray ? 'text-green-600' : 'text-red-600'}>
                          {debugInfo.rawData.hasShiftsArray ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shifts count:</span>
                        <span>{debugInfo.rawData.shiftsCount}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">⏰ Time Fields:</h5>
                    <div className="text-xs space-y-1">
                      {Object.entries(debugInfo.rawData.timeFields).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span className={value ? 'text-green-600' : 'text-gray-400'}>
                            {value ? '✅' : '❌'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift Breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📈 Shift Processing Results</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">☀️</span>
                      <h5 className="font-medium text-yellow-900">Day Shift</h5>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Tills:</span>
                        <span className="font-medium">{debugInfo.shiftBreakdown.dayShift.tillsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Payments:</span>
                        <span className="font-medium">{debugInfo.shiftBreakdown.dayShift.networkPaymentsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-medium">
                          UGX {debugInfo.shiftBreakdown.dayShift.totalNetworkAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">🌙</span>
                      <h5 className="font-medium text-blue-900">Night Shift</h5>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Tills:</span>
                        <span className="font-medium">{debugInfo.shiftBreakdown.nightShift.tillsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Payments:</span>
                        <span className="font-medium">{debugInfo.shiftBreakdown.nightShift.networkPaymentsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-medium">
                          UGX {debugInfo.shiftBreakdown.nightShift.totalNetworkAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Data Display */}
              {selectedRecord && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">🔍 Raw Record Data</h4>
                    <button
                      onClick={() => setSelectedRecord(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  </div>
                  <pre className="text-xs bg-white border rounded p-3 overflow-auto max-h-64">
                    {JSON.stringify(selectedRecord, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              💡 This debugger helps identify why network data isn't properly split between day and night shifts
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setDebugInfo(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear Analysis
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close Debugger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}















