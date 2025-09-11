'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Eye, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { networkShiftAssignmentService, NetworkAssignmentByShift } from '../../lib/firebase/network-shift-assignment-service';

interface NetworkAssessmentDashboardProps {
  branchId: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  showFilters?: boolean;
}

interface NetworkAssessmentData {
  assignments: NetworkAssignmentByShift[];
  summary: {
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    averageCompletionRate: number;
    totalNetworkMoney: number;
    totalVariance: number;
  };
  shiftBreakdown: {
    dayShiftComplete: number;
    nightShiftComplete: number;
    bothShiftsComplete: number;
  };
  providerBreakdown: {
    [provider: string]: {
      totalAmount: number;
      dayShiftAmount: number;
      nightShiftAmount: number;
      transactionCount: number;
    };
  };
}

export default function NetworkAssessmentDashboard({ 
  branchId, 
  dateRange,
  showFilters = true 
}: NetworkAssessmentDashboardProps) {
  const [assessmentData, setAssessmentData] = useState<NetworkAssessmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<NetworkAssignmentByShift | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'analysis'>('summary');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete' | 'discrepancy'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'completion' | 'variance'>('date');

  useEffect(() => {
    loadAssessmentData();
  }, [branchId, dateRange, filterStatus]);

  const loadAssessmentData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading network assignment data for assessment...');
      
      const report = await networkShiftAssignmentService.generateNetworkAssignmentReport(branchId, dateRange);
      
      // Filter assignments based on status
      let filteredAssignments = report.assignments;
      
      switch (filterStatus) {
        case 'complete':
          filteredAssignments = report.assignments.filter(a => a.summary.overallStatus === 'complete');
          break;
        case 'incomplete':
          filteredAssignments = report.assignments.filter(a => a.summary.overallStatus === 'incomplete');
          break;
        case 'discrepancy':
          filteredAssignments = report.assignments.filter(a => a.summary.overallStatus === 'discrepancy');
          break;
      }

      // Sort assignments
      filteredAssignments.sort((a, b) => {
        switch (sortBy) {
          case 'completion':
            return b.summary.completionPercentage - a.summary.completionPercentage;
          case 'variance':
            return Math.abs(b.summary.totalVariance) - Math.abs(a.summary.totalVariance);
          default:
            return new Date(b.businessDate).getTime() - new Date(a.businessDate).getTime();
        }
      });

      // Calculate enhanced provider breakdown
      const providerBreakdown: any = {};
      const providers = ['airtel', 'mtn', 'stanbicBank', 'equityBank', 'absaBank', 'pesaPal'];
      
      for (const provider of providers) {
        providerBreakdown[provider] = {
          totalAmount: 0,
          dayShiftAmount: 0,
          nightShiftAmount: 0,
          transactionCount: 0
        };

        for (const assignment of filteredAssignments) {
          const dayAmount = assignment.dayShift.networkBreakdown[provider] || 0;
          const nightAmount = assignment.nightShift.networkBreakdown[provider] || 0;
          
          if (dayAmount > 0) providerBreakdown[provider].transactionCount++;
          if (nightAmount > 0) providerBreakdown[provider].transactionCount++;
          
          providerBreakdown[provider].dayShiftAmount += dayAmount;
          providerBreakdown[provider].nightShiftAmount += nightAmount;
          providerBreakdown[provider].totalAmount += dayAmount + nightAmount;
        }
      }

      const assessmentData: NetworkAssessmentData = {
        assignments: filteredAssignments,
        summary: {
          totalAssignments: filteredAssignments.length,
          completedAssignments: filteredAssignments.filter(a => a.summary.overallStatus === 'complete').length,
          pendingAssignments: filteredAssignments.filter(a => a.summary.overallStatus === 'incomplete').length,
          averageCompletionRate: filteredAssignments.length > 0 ? 
            filteredAssignments.reduce((sum, a) => sum + a.summary.completionPercentage, 0) / filteredAssignments.length : 0,
          totalNetworkMoney: filteredAssignments.reduce((sum, a) => sum + a.summary.totalNetworkMoney, 0),
          totalVariance: filteredAssignments.reduce((sum, a) => sum + Math.abs(a.summary.totalVariance), 0)
        },
        shiftBreakdown: {
          dayShiftComplete: filteredAssignments.filter(a => 
            a.dayShift.verificationStatus === 'verified').length,
          nightShiftComplete: filteredAssignments.filter(a => 
            a.nightShift.verificationStatus === 'verified').length,
          bothShiftsComplete: filteredAssignments.filter(a => 
            a.dayShift.verificationStatus === 'verified' && 
            a.nightShift.verificationStatus === 'verified').length
        },
        providerBreakdown
      };

      setAssessmentData(assessmentData);
      console.log('✅ Network assessment data loaded:', assessmentData.summary);
      
    } catch (error) {
      console.error('❌ Error loading network assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-100';
      case 'incomplete':
        return 'text-red-600 bg-red-100';
      case 'discrepancy':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getVerificationIcon = (status: string) => {
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
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading network assessment data...</span>
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Network Data Available</h3>
        <p className="text-gray-600 mb-4">No network assignment data found for the selected criteria.</p>
        <button
          onClick={loadAssessmentData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              📱 Network Assessment Dashboard
            </h2>
            <p className="text-sm text-gray-600">
              Assess network assignments across day and night shifts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadAssessmentData}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
              <option value="discrepancy">Has Discrepancy</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="completion">Sort by Completion</option>
              <option value="variance">Sort by Variance</option>
            </select>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                Detailed
              </button>
              <button
                onClick={() => setViewMode('analysis')}
                className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'analysis' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessmentData.summary.totalAssignments}
              </p>
              <p className="text-sm text-green-600">
                {assessmentData.summary.completedAssignments} completed
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(assessmentData.summary.averageCompletionRate)}%
              </p>
              <p className="text-sm text-blue-600">
                {assessmentData.shiftBreakdown.bothShiftsComplete} both shifts complete
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Network Money</p>
              <p className="text-2xl font-bold text-gray-900">
                UGX {assessmentData.summary.totalNetworkMoney.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Across all assignments</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Variance</p>
              <p className={`text-2xl font-bold ${assessmentData.summary.totalVariance > 10000 ? 'text-red-600' : 'text-green-600'}`}>
                UGX {assessmentData.summary.totalVariance.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Absolute variance</p>
            </div>
            {assessmentData.summary.totalVariance > 10000 ? (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {/* View Mode Content */}
      {viewMode === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shift Completion Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Shift Completion Status</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">☀️ Day Shifts Complete</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{width: `${(assessmentData.shiftBreakdown.dayShiftComplete / assessmentData.summary.totalAssignments) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {assessmentData.shiftBreakdown.dayShiftComplete}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">🌙 Night Shifts Complete</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{width: `${(assessmentData.shiftBreakdown.nightShiftComplete / assessmentData.summary.totalAssignments) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {assessmentData.shiftBreakdown.nightShiftComplete}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Both Shifts Complete</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{width: `${(assessmentData.shiftBreakdown.bothShiftsComplete / assessmentData.summary.totalAssignments) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {assessmentData.shiftBreakdown.bothShiftsComplete}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Network Provider Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Network Provider Breakdown</h3>
            </div>
            
            <div className="space-y-3">
              {Object.entries(assessmentData.providerBreakdown).map(([provider, data]) => {
                const percentage = assessmentData.summary.totalNetworkMoney > 0 ? 
                  (data.totalAmount / assessmentData.summary.totalNetworkMoney) * 100 : 0;
                
                return (
                  <div key={provider} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        provider === 'airtel' ? 'bg-red-500' :
                        provider === 'mtn' ? 'bg-yellow-500' :
                        provider === 'stanbicBank' ? 'bg-blue-500' :
                        provider === 'equityBank' ? 'bg-green-500' :
                        provider === 'absaBank' ? 'bg-red-700' :
                        'bg-purple-500'
                      }`}></div>
                      <span className="text-sm text-gray-600 capitalize">
                        {provider.replace('Bank', ' Bank')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        UGX {data.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Network Assignment Details</h3>
            <p className="text-sm text-gray-600">Click on any assignment to view detailed information</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {assessmentData.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {assignment.businessDate.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        UGX {assignment.summary.totalNetworkMoney.toLocaleString()} network money
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">☀️</span>
                      {getVerificationIcon(assignment.dayShift.verificationStatus)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">🌙</span>
                      {getVerificationIcon(assignment.nightShift.verificationStatus)}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.summary.overallStatus)}`}>
                      {assignment.summary.overallStatus}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {assignment.summary.completionPercentage}%
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Shift Performance Analysis</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Day Shift Performance</span>
                  <span>{Math.round((assessmentData.shiftBreakdown.dayShiftComplete / assessmentData.summary.totalAssignments) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{width: `${(assessmentData.shiftBreakdown.dayShiftComplete / assessmentData.summary.totalAssignments) * 100}%`}}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Night Shift Performance</span>
                  <span>{Math.round((assessmentData.shiftBreakdown.nightShiftComplete / assessmentData.summary.totalAssignments) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{width: `${(assessmentData.shiftBreakdown.nightShiftComplete / assessmentData.summary.totalAssignments) * 100}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Key Insights</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                {assessmentData.summary.averageCompletionRate >= 80 ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                )}
                <div className="text-sm">
                  <span className="font-medium">
                    {assessmentData.summary.averageCompletionRate >= 80 ? 'Good' : 'Needs Attention'} completion rate
                  </span>
                  <p className="text-gray-600">
                    Average completion: {Math.round(assessmentData.summary.averageCompletionRate)}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                {assessmentData.summary.totalVariance <= 10000 ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <div className="text-sm">
                  <span className="font-medium">
                    Variance {assessmentData.summary.totalVariance <= 10000 ? 'within' : 'exceeds'} acceptable limits
                  </span>
                  <p className="text-gray-600">
                    Total variance: UGX {assessmentData.summary.totalVariance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                {assessmentData.shiftBreakdown.bothShiftsComplete >= (assessmentData.summary.totalAssignments * 0.8) ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                )}
                <div className="text-sm">
                  <span className="font-medium">
                    Shift coverage {assessmentData.shiftBreakdown.bothShiftsComplete >= (assessmentData.summary.totalAssignments * 0.8) ? 'excellent' : 'needs improvement'}
                  </span>
                  <p className="text-gray-600">
                    {assessmentData.shiftBreakdown.bothShiftsComplete}/{assessmentData.summary.totalAssignments} have both shifts complete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Assignment Modal/Detail View */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Network Assignment Details - {selectedAssignment.businessDate.toLocaleDateString()}
                </h3>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Assignment Overview */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">☀️ Day Shift</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employee:</span>
                      <span>{selectedAssignment.dayShift.assignedEmployeeName || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network Money:</span>
                      <span>UGX {selectedAssignment.dayShift.totalNetworkMoney.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual:</span>
                      <span>UGX {selectedAssignment.dayShift.actualNetworkMoney.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variance:</span>
                      <span className={selectedAssignment.dayShift.variance === 0 ? 'text-green-600' : 'text-red-600'}>
                        UGX {selectedAssignment.dayShift.variance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="flex items-center space-x-1">
                        {getVerificationIcon(selectedAssignment.dayShift.verificationStatus)}
                        <span>{selectedAssignment.dayShift.verificationStatus}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">🌙 Night Shift</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employee:</span>
                      <span>{selectedAssignment.nightShift.assignedEmployeeName || 'Not assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network Money:</span>
                      <span>UGX {selectedAssignment.nightShift.totalNetworkMoney.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual:</span>
                      <span>UGX {selectedAssignment.nightShift.actualNetworkMoney.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variance:</span>
                      <span className={selectedAssignment.nightShift.variance === 0 ? 'text-green-600' : 'text-red-600'}>
                        UGX {selectedAssignment.nightShift.variance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="flex items-center space-x-1">
                        {getVerificationIcon(selectedAssignment.nightShift.verificationStatus)}
                        <span>{selectedAssignment.nightShift.verificationStatus}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Network Provider Breakdown</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">☀️ Day Shift</h5>
                    <div className="space-y-2 text-sm">
                      {Object.entries(selectedAssignment.dayShift.networkBreakdown).map(([provider, amount]) => (
                        <div key={provider} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{provider.replace('Bank', ' Bank')}</span>
                          <span>UGX {amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">🌙 Night Shift</h5>
                    <div className="space-y-2 text-sm">
                      {Object.entries(selectedAssignment.nightShift.networkBreakdown).map(([provider, amount]) => (
                        <div key={provider} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{provider.replace('Bank', ' Bank')}</span>
                          <span>UGX {amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}















