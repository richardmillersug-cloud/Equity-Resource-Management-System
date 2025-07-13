'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Award, 
  Plus, 
  Eye,
  Search,
  Filter,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react';

interface PerformanceTarget {
  id: string;
  employeeName: string;
  targetName: string;
  targetType: string;
  targetValue: number;
  achievedValue: number;
  unit: string;
  period: string;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE';
  progress: number;
}

interface PerformanceEvaluation {
  id: string;
  employeeName: string;
  evaluatorName: string;
  period: string;
  overallRating: 'OUTSTANDING' | 'EXCEEDS_EXPECTATIONS' | 'MEETS_EXPECTATIONS' | 'BELOW_EXPECTATIONS' | 'UNSATISFACTORY';
  overallScore: number;
  status: 'DRAFT' | 'PENDING_EMPLOYEE_REVIEW' | 'PENDING_HR_REVIEW' | 'APPROVED';
  completedDate?: string;
}

interface PerformanceMetrics {
  totalActiveTargets: number;
  completedTargets: number;
  pendingEvaluations: number;
  averagePerformanceScore: number;
  employeesAboveTarget: number;
  employeesBelowTarget: number;
}

const PerformanceManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'targets' | 'evaluations' | 'reports'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalActiveTargets: 45,
    completedTargets: 32,
    pendingEvaluations: 8,
    averagePerformanceScore: 78.5,
    employeesAboveTarget: 28,
    employeesBelowTarget: 12
  });

  const [targets, setTargets] = useState<PerformanceTarget[]>([
    {
      id: '1',
      employeeName: 'John Doe',
      targetName: 'Monthly Scan Target',
      targetType: 'SCAN_TARGET',
      targetValue: 1000,
      achievedValue: 850,
      unit: 'scans',
      period: 'Monthly',
      status: 'ACTIVE',
      progress: 85
    },
    {
      id: '2',
      employeeName: 'Jane Smith',
      targetName: 'Attendance Rate',
      targetType: 'ATTENDANCE_RATE',
      targetValue: 95,
      achievedValue: 98,
      unit: '%',
      period: 'Monthly',
      status: 'COMPLETED',
      progress: 103
    },
    {
      id: '3',
      employeeName: 'Mike Johnson',
      targetName: 'Customer Service Rating',
      targetType: 'CUSTOMER_SERVICE_RATING',
      targetValue: 4.5,
      achievedValue: 3.8,
      unit: 'rating',
      period: 'Quarterly',
      status: 'ACTIVE',
      progress: 84
    }
  ]);

  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([
    {
      id: '1',
      employeeName: 'Alice Brown',
      evaluatorName: 'Sarah Wilson',
      period: 'Q1 2024',
      overallRating: 'EXCEEDS_EXPECTATIONS',
      overallScore: 85,
      status: 'APPROVED',
      completedDate: '2024-01-15'
    },
    {
      id: '2',
      employeeName: 'Bob Davis',
      evaluatorName: 'Sarah Wilson',
      period: 'Q1 2024',
      overallRating: 'MEETS_EXPECTATIONS',
      overallScore: 72,
      status: 'PENDING_EMPLOYEE_REVIEW'
    },
    {
      id: '3',
      employeeName: 'Carol Johnson',
      evaluatorName: 'Sarah Wilson',
      period: 'Q1 2024',
      overallRating: 'OUTSTANDING',
      overallScore: 95,
      status: 'DRAFT'
    }
  ]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'OUTSTANDING': return 'text-emerald-600 bg-emerald-50';
      case 'EXCEEDS_EXPECTATIONS': return 'text-blue-600 bg-blue-50';
      case 'MEETS_EXPECTATIONS': return 'text-green-600 bg-green-50';
      case 'BELOW_EXPECTATIONS': return 'text-yellow-600 bg-yellow-50';
      case 'UNSATISFACTORY': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'text-blue-600 bg-blue-50';
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'OVERDUE': return 'text-red-600 bg-red-50';
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'PENDING_EMPLOYEE_REVIEW': return 'text-yellow-600 bg-yellow-50';
      case 'PENDING_HR_REVIEW': return 'text-orange-600 bg-orange-50';
      case 'DRAFT': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Key Metrics Cards */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Targets</CardTitle>
          <Target className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{metrics.totalActiveTargets}</div>
          <p className="text-xs text-gray-600">+{metrics.completedTargets} completed this month</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Performance Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.averagePerformanceScore}%</div>
          <p className="text-xs text-gray-600">Across all active evaluations</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Evaluations</CardTitle>
          <Award className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{metrics.pendingEvaluations}</div>
          <p className="text-xs text-gray-600">Require immediate attention</p>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Distribution
          </CardTitle>
          <CardDescription>Employee performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.employeesAboveTarget}</div>
              <div className="text-sm text-green-700">Above Target</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{metrics.employeesBelowTarget}</div>
              <div className="text-sm text-yellow-700">Below Target</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.completedTargets}</div>
              <div className="text-sm text-blue-700">Completed Targets</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalActiveTargets}</div>
              <div className="text-sm text-purple-700">Active Targets</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTargetsTab = () => (
    <div className="space-y-6">
      {/* Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Targets</h2>
          <p className="text-gray-600">Manage and track employee performance targets</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Target
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search targets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="current-month">Current Month</option>
          <option value="current-quarter">Current Quarter</option>
          <option value="current-year">Current Year</option>
        </select>
      </div>

      {/* Targets List */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {targets.map((target) => (
                <tr key={target.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{target.employeeName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{target.targetName}</div>
                    <div className="text-sm text-gray-500">
                      {target.achievedValue}/{target.targetValue} {target.unit}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          target.progress >= 100 ? 'bg-green-500' : 
                          target.progress >= 80 ? 'bg-blue-500' : 
                          target.progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(target.progress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{target.progress}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(target.status)}`}>
                      {target.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEvaluationsTab = () => (
    <div className="space-y-6">
      {/* Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Evaluations</h2>
          <p className="text-gray-600">Review and manage employee performance evaluations</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Evaluation
        </Button>
      </div>

      {/* Evaluations List */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{evaluation.employeeName}</div>
                    <div className="text-sm text-gray-500">Evaluated by {evaluation.evaluatorName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {evaluation.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRatingColor(evaluation.overallRating)}`}>
                      {evaluation.overallRating.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{evaluation.overallScore}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(evaluation.status)}`}>
                      {evaluation.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Performance Reports</h2>
        <p className="text-gray-600">Generate and export performance reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Individual Performance</CardTitle>
            <CardDescription>Detailed performance report for individual employees</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Team Performance</CardTitle>
            <CardDescription>Team-level performance analysis and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Target Achievement</CardTitle>
            <CardDescription>Summary of target achievements across all employees</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Management</h1>
          <p className="text-gray-600">Comprehensive employee performance tracking and evaluation system</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'targets', label: 'Targets', icon: Target },
              { id: 'evaluations', label: 'Evaluations', icon: Award },
              { id: 'reports', label: 'Reports', icon: Download }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'targets' && renderTargetsTab()}
          {activeTab === 'evaluations' && renderEvaluationsTab()}
          {activeTab === 'reports' && renderReportsTab()}
        </div>
      </div>
    </div>
  );
};

export default PerformanceManagementPage; 
 
 
 
 