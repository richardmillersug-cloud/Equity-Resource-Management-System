'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  TrendingUp, 
  Award, 
  Calendar,
  BarChart3,
  Star,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface EmployeeTarget {
  id: string;
  targetName: string;
  targetType: string;
  targetValue: number;
  achievedValue: number;
  unit: string;
  period: string;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE';
  progress: number;
  deadline: string;
}

interface EmployeeEvaluation {
  id: string;
  period: string;
  overallRating: 'OUTSTANDING' | 'EXCEEDS_EXPECTATIONS' | 'MEETS_EXPECTATIONS' | 'BELOW_EXPECTATIONS' | 'UNSATISFACTORY';
  overallScore: number;
  evaluatorName: string;
  status: 'DRAFT' | 'PENDING_EMPLOYEE_REVIEW' | 'PENDING_HR_REVIEW' | 'APPROVED';
  completedDate?: string;
  strengths: string[];
  areasForImprovement: string[];
}

interface PerformanceMetrics {
  currentMonthScore: number;
  quarterScore: number;
  yearScore: number;
  targetCompletion: number;
  attendanceRate: number;
  punctualityScore: number;
}

const EmployeePerformancePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'targets' | 'evaluations'>('overview');

  // Mock data - replace with actual API calls
  const [employeeInfo] = useState({
    name: 'John Doe',
    role: 'Customer Service Representative',
    department: 'Retail Operations',
    employeeId: 'EMP-001'
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    currentMonthScore: 85,
    quarterScore: 78,
    yearScore: 82,
    targetCompletion: 75,
    attendanceRate: 96,
    punctualityScore: 88
  });

  const [targets, setTargets] = useState<EmployeeTarget[]>([
    {
      id: '1',
      targetName: 'Customer Service Rating',
      targetType: 'CUSTOMER_SERVICE_RATING',
      targetValue: 4.5,
      achievedValue: 4.2,
      unit: 'rating',
      period: 'Monthly',
      status: 'ACTIVE',
      progress: 93,
      deadline: '2024-01-31'
    },
    {
      id: '2',
      targetName: 'Daily Attendance',
      targetType: 'ATTENDANCE_RATE',
      targetValue: 95,
      achievedValue: 96,
      unit: '%',
      period: 'Monthly',
      status: 'COMPLETED',
      progress: 101,
      deadline: '2024-01-31'
    },
    {
      id: '3',
      targetName: 'Sales Target',
      targetType: 'SALES_TARGET',
      targetValue: 50000,
      achievedValue: 32000,
      unit: 'UGX',
      period: 'Monthly',
      status: 'ACTIVE',
      progress: 64,
      deadline: '2024-01-31'
    }
  ]);

  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([
    {
      id: '1',
      period: 'Q4 2023',
      overallRating: 'EXCEEDS_EXPECTATIONS',
      overallScore: 85,
      evaluatorName: 'Sarah Wilson',
      status: 'APPROVED',
      completedDate: '2023-12-15',
      strengths: [
        'Excellent customer communication skills',
        'Consistently meets deadlines',
        'Proactive problem-solving approach'
      ],
      areasForImprovement: [
        'Improve technical product knowledge',
        'Develop leadership skills for team projects'
      ]
    },
    {
      id: '2',
      period: 'Q1 2024',
      overallRating: 'MEETS_EXPECTATIONS',
      overallScore: 75,
      evaluatorName: 'Sarah Wilson',
      status: 'PENDING_EMPLOYEE_REVIEW',
      strengths: [
        'Good team collaboration',
        'Reliable attendance record'
      ],
      areasForImprovement: [
        'Increase sales conversion rate',
        'Enhance product presentation skills'
      ]
    }
  ]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'OUTSTANDING': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'EXCEEDS_EXPECTATIONS': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'MEETS_EXPECTATIONS': return 'text-green-600 bg-green-50 border-green-200';
      case 'BELOW_EXPECTATIONS': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'UNSATISFACTORY': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE': return 'text-blue-600 bg-blue-50';
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'OVERDUE': return 'text-red-600 bg-red-50';
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'PENDING_EMPLOYEE_REVIEW': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.currentMonthScore}%</div>
            <p className="text-xs text-gray-600">+7% from last month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Completion</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.targetCompletion}%</div>
            <p className="text-xs text-gray-600">3 of 4 targets on track</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.attendanceRate}%</div>
            <p className="text-xs text-gray-600">Above company average</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Trend
          </CardTitle>
          <CardDescription>Your performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Performance chart visualization would go here</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Things you can do to improve your performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Complete Pending Review</h3>
              <p className="text-sm text-blue-700 mt-1">Review your Q1 2024 evaluation</p>
              <button className="mt-2 text-blue-600 text-sm font-medium hover:underline">
                Review Now →
              </button>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900">Check Active Targets</h3>
              <p className="text-sm text-green-700 mt-1">Monitor progress on current goals</p>
              <button className="mt-2 text-green-600 text-sm font-medium hover:underline">
                View Targets →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTargetsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Performance Targets</h2>
        <p className="text-gray-600">Track your progress towards achieving your performance goals</p>
      </div>

      <div className="space-y-4">
        {targets.map((target) => (
          <Card key={target.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{target.targetName}</h3>
                  <p className="text-sm text-gray-600">{target.period} target</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(target.status)}`}>
                  {target.status === 'ACTIVE' ? (
                    <><Clock className="w-3 h-3 inline mr-1" />Active</>
                  ) : target.status === 'COMPLETED' ? (
                    <><CheckCircle className="w-3 h-3 inline mr-1" />Completed</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 inline mr-1" />Overdue</>
                  )}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress: {target.achievedValue}/{target.targetValue} {target.unit}</span>
                  <span className="font-medium">{target.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(target.progress)}`}
                    style={{ width: `${Math.min(target.progress, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Deadline: {new Date(target.deadline).toLocaleDateString()}</span>
                <span>{target.progress >= 100 ? '🎉 Target Achieved!' : 
                      target.progress >= 80 ? '📈 On Track' : 
                      target.progress >= 60 ? '⚠️ Needs Attention' : '🚨 Behind Schedule'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEvaluationsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Performance Evaluations</h2>
        <p className="text-gray-600">Review your performance evaluations and feedback</p>
      </div>

      <div className="space-y-6">
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{evaluation.period} Evaluation</h3>
                  <p className="text-sm text-gray-600">Evaluated by {evaluation.evaluatorName}</p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 text-sm font-medium rounded-full border ${getRatingColor(evaluation.overallRating)}`}>
                    {evaluation.overallRating.replace('_', ' ')}
                  </div>
                  <div className="text-xl font-bold mt-1">{evaluation.overallScore}%</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-700 mb-2 flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-orange-700 mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-1">
                    {evaluation.areasForImprovement.map((area, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-orange-500 mr-2">•</span>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(evaluation.status)}`}>
                    {evaluation.status.replace('_', ' ')}
                  </span>
                  {evaluation.completedDate && (
                    <span className="text-sm text-gray-500">
                      Completed: {new Date(evaluation.completedDate).toLocaleDateString()}
                    </span>
                  )}
                  {evaluation.status === 'PENDING_EMPLOYEE_REVIEW' && (
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                      Review & Comment
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{employeeInfo.name}</h1>
                <p className="text-lg text-gray-600">{employeeInfo.role}</p>
                <p className="text-sm text-gray-500">{employeeInfo.department} • {employeeInfo.employeeId}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{metrics.currentMonthScore}%</div>
                <p className="text-sm text-gray-600">Current Performance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'targets', label: 'My Targets', icon: Target },
              { id: 'evaluations', label: 'Evaluations', icon: Award }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
        <div>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'targets' && renderTargetsTab()}
          {activeTab === 'evaluations' && renderEvaluationsTab()}
        </div>
      </div>
    </div>
  );
};

export default EmployeePerformancePage; 
 
 
 
 