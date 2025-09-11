'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Eye, Download, BarChart3, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import NetworkAssessmentDashboard from './NetworkAssessmentDashboard';
import { UnifiedCashCloseService } from '../../lib/firebase/unified-cash-close-service';
import { networkShiftAssignmentService } from '../../lib/firebase/network-shift-assignment-service';

interface CashCloseWithNetwork {
  id: string;
  businessDate: Date;
  totalRevenue: number;
  shift: 'day' | 'night';
  networkMoney: number;
  hasNetworkAssignment: boolean;
  networkAssignmentStatus: 'complete' | 'incomplete' | 'missing';
  employeeName?: string;
  branchId: string;
}

/**
 * 📱 Cash Close Assessment Page
 * Allows accountants to assess network assignments alongside cash close data
 * Integration point: Add this to your accountant dashboard routes
 */
export default function CashCloseAssessmentPage() {
  const [cashCloses, setCashCloses] = useState<CashCloseWithNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
    endDate: new Date()
  });
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'network' | 'combined'>('combined');

  useEffect(() => {
    loadCashCloseData();
  }, [selectedDateRange, selectedBranch]);

  const loadCashCloseData = async () => {
    setLoading(true);
    try {
      console.log('📊 Loading cash close data for assessment...');
      
      // Load cash closes from unified service
      const unifiedCashCloses = await UnifiedCashCloseService.getAllCashCloses();
      
      // Filter by date range
      const filteredCashCloses = unifiedCashCloses.filter(cashClose => {
        const closeDate = new Date(cashClose.date);
        return closeDate >= selectedDateRange.startDate && closeDate <= selectedDateRange.endDate;
      });

      // Enhance with network assignment data
      const enhancedCashCloses: CashCloseWithNetwork[] = [];
      
      for (const cashClose of filteredCashCloses) {
        try {
          // Check if network assignment exists
          const networkAssignment = await networkShiftAssignmentService.getNetworkAssignmentByCashCloseId(cashClose.id);
          
          let networkAssignmentStatus: 'complete' | 'incomplete' | 'missing' = 'missing';
          
          if (networkAssignment) {
            if (networkAssignment.summary.overallStatus === 'complete') {
              networkAssignmentStatus = 'complete';
            } else {
              networkAssignmentStatus = 'incomplete';
            }
          }

          enhancedCashCloses.push({
            id: cashClose.id,
            businessDate: new Date(cashClose.date),
            totalRevenue: cashClose.closeCash,
            shift: cashClose.shift,
            networkMoney: cashClose.totalNetworkMoney,
            hasNetworkAssignment: !!networkAssignment,
            networkAssignmentStatus,
            employeeName: cashClose.employeeName,
            branchId: cashClose.branchId
          });
        } catch (error) {
          console.error(`Error loading network assignment for cash close ${cashClose.id}:`, error);
          // Add without network assignment data
          enhancedCashCloses.push({
            id: cashClose.id,
            businessDate: new Date(cashClose.date),
            totalRevenue: cashClose.closeCash,
            shift: cashClose.shift,
            networkMoney: cashClose.totalNetworkMoney,
            hasNetworkAssignment: false,
            networkAssignmentStatus: 'missing',
            employeeName: cashClose.employeeName,
            branchId: cashClose.branchId
          });
        }
      }

      // Sort by date (newest first)
      enhancedCashCloses.sort((a, b) => new Date(b.businessDate).getTime() - new Date(a.businessDate).getTime());
      
      setCashCloses(enhancedCashCloses);
      console.log('✅ Cash close assessment data loaded:', enhancedCashCloses.length, 'records');
      
    } catch (error) {
      console.error('❌ Error loading cash close assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, hasAssignment: boolean) => {
    if (!hasAssignment) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3" />
          <span>No Assignment</span>
        </span>
      );
    }

    switch (status) {
      case 'complete':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>Complete</span>
          </span>
        );
      case 'incomplete':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Incomplete</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Missing</span>
          </span>
        );
    }
  };

  const calculateSummaryStats = () => {
    const total = cashCloses.length;
    const withAssignments = cashCloses.filter(cc => cc.hasNetworkAssignment).length;
    const complete = cashCloses.filter(cc => cc.networkAssignmentStatus === 'complete').length;
    const totalRevenue = cashCloses.reduce((sum, cc) => sum + cc.totalRevenue, 0);
    const totalNetworkMoney = cashCloses.reduce((sum, cc) => sum + cc.networkMoney, 0);

    return {
      total,
      withAssignments,
      complete,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      assignmentRate: total > 0 ? Math.round((withAssignments / total) * 100) : 0,
      totalRevenue,
      totalNetworkMoney,
      networkPercentage: totalRevenue > 0 ? Math.round((totalNetworkMoney / totalRevenue) * 100) : 0
    };
  };

  const stats = calculateSummaryStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📱 Cash Close Network Assessment
          </h1>
          <p className="text-gray-600 mt-1">
            Assess and verify network assignments across cash close operations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadCashCloseData}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh Data
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDateRange.startDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDateRange({
                ...selectedDateRange,
                startDate: new Date(e.target.value)
              })}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={selectedDateRange.endDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDateRange({
                ...selectedDateRange,
                endDate: new Date(e.target.value)
              })}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('network')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'network' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Network Analysis
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'combined' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Combined View
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cash Closes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Assignment Rate</p>
              <p className="text-2xl font-bold text-blue-900">{stats.assignmentRate}%</p>
              <p className="text-xs text-gray-500">{stats.withAssignments}/{stats.total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className={`text-2xl font-bold ${stats.completionRate >= 80 ? 'text-green-900' : 'text-red-900'}`}>
                {stats.completionRate}%
              </p>
              <p className="text-xs text-gray-500">{stats.complete}/{stats.total}</p>
            </div>
            {stats.completionRate >= 80 ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                UGX {(stats.totalRevenue / 1000000).toFixed(1)}M
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Network Money</p>
              <p className="text-2xl font-bold text-purple-900">
                UGX {(stats.totalNetworkMoney / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-gray-500">{stats.networkPercentage}% of total</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'overview' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Cash Close Records Overview</h3>
            <p className="text-sm text-gray-600">Click on any record to assess network assignments</p>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading cash close data...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {cashCloses.map((cashClose) => (
                <div key={cashClose.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {cashClose.businessDate.toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            cashClose.shift === 'day' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {cashClose.shift === 'day' ? '☀️ Day' : '🌙 Night'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {cashClose.employeeName || 'Unknown Employee'} • 
                          UGX {cashClose.totalRevenue.toLocaleString()} total • 
                          UGX {cashClose.networkMoney.toLocaleString()} network
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {getStatusBadge(cashClose.networkAssignmentStatus, cashClose.hasNetworkAssignment)}
                      <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">Assess</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {cashCloses.length === 0 && !loading && (
                <div className="p-8 text-center text-gray-600">
                  No cash close records found for the selected date range.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {viewMode === 'network' && (
        <NetworkAssessmentDashboard 
          branchId={selectedBranch === 'all' ? 'default-branch' : selectedBranch}
          dateRange={selectedDateRange}
        />
      )}

      {viewMode === 'combined' && (
        <div className="space-y-6">
          {/* Network Assessment Dashboard */}
          <NetworkAssessmentDashboard 
            branchId={selectedBranch === 'all' ? 'default-branch' : selectedBranch}
            dateRange={selectedDateRange}
          />
          
          {/* Cash Close Records with Network Status */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Detailed Assessment View</h3>
              <p className="text-sm text-gray-600">
                Combined view of cash close records and their network assignment status
              </p>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading combined data...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {cashCloses.map((cashClose) => (
                  <div key={cashClose.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {cashClose.businessDate.toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            cashClose.shift === 'day' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {cashClose.shift === 'day' ? '☀️ Day' : '🌙 Night'}
                          </span>
                          {getStatusBadge(cashClose.networkAssignmentStatus, cashClose.hasNetworkAssignment)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Employee</p>
                            <p className="font-medium">{cashClose.employeeName || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Revenue</p>
                            <p className="font-medium">UGX {cashClose.totalRevenue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Network Money</p>
                            <p className="font-medium">UGX {cashClose.networkMoney.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Network %</p>
                            <p className="font-medium">
                              {cashClose.totalRevenue > 0 
                                ? Math.round((cashClose.networkMoney / cashClose.totalRevenue) * 100) 
                                : 0}%
                            </p>
                          </div>
                        </div>
                        
                        {!cashClose.hasNetworkAssignment && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-700 font-medium">
                                ⚠️ Network assignment missing - this cash close needs network data input
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm">
                          <Eye className="h-4 w-4" />
                          <span>View Details</span>
                        </button>
                        {!cashClose.hasNetworkAssignment && (
                          <button className="text-green-600 hover:text-green-800 flex items-center space-x-1 text-sm">
                            <span>Create Assignment</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}















