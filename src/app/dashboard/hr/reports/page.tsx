'use client';

import React, { useState, useEffect } from 'react';
// Note: Reports page uses mock data for demo purposes
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar, 
  DollarSign,
  Clock,
  UserCheck,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  FileText,
  Eye
} from 'lucide-react';

interface HRMetrics {
  totalEmployees: number;
  activeEmployees: number;
  newHires: { month: string; count: number }[];
  resignations: { month: string; count: number }[];
  departmentStats: { department: string; count: number; percentage: number }[];
  attendanceStats: { present: number; absent: number; late: number };
  leaveStats: { approved: number; pending: number; rejected: number };
  payrollStats: { totalGross: number; totalNet: number; totalDeductions: number };
  ageDistribution: { range: string; count: number }[];
  genderDistribution: { male: number; female: number };
  salaryBands: { band: string; count: number; avgSalary: number }[];
}

export default function HRReportsPage() {
  const [metrics, setMetrics] = useState<HRMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  const [selectedReport, setSelectedReport] = useState('overview');

  useEffect(() => {
    loadMetrics();
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // In a real application, you would fetch data from your HR analytics service
      // For demo purposes, we'll generate mock data
      const mockMetrics: HRMetrics = {
        totalEmployees: 156,
        activeEmployees: 142,
        newHires: [
          { month: 'Jan', count: 8 },
          { month: 'Feb', count: 12 },
          { month: 'Mar', count: 6 },
          { month: 'Apr', count: 15 },
          { month: 'May', count: 9 },
          { month: 'Jun', count: 11 },
          { month: 'Jul', count: 7 },
          { month: 'Aug', count: 14 },
          { month: 'Sep', count: 10 },
          { month: 'Oct', count: 13 },
          { month: 'Nov', count: 8 },
          { month: 'Dec', count: 5 }
        ],
        resignations: [
          { month: 'Jan', count: 3 },
          { month: 'Feb', count: 2 },
          { month: 'Mar', count: 5 },
          { month: 'Apr', count: 1 },
          { month: 'May', count: 4 },
          { month: 'Jun', count: 2 },
          { month: 'Jul', count: 6 },
          { month: 'Aug', count: 3 },
          { month: 'Sep', count: 4 },
          { month: 'Oct', count: 2 },
          { month: 'Nov', count: 1 },
          { month: 'Dec', count: 3 }
        ],
        departmentStats: [
          { department: 'Operations', count: 45, percentage: 28.8 },
          { department: 'Sales', count: 38, percentage: 24.4 },
          { department: 'Technology', count: 32, percentage: 20.5 },
          { department: 'Finance', count: 24, percentage: 15.4 },
          { department: 'HR', count: 17, percentage: 10.9 }
        ],
        attendanceStats: { present: 134, absent: 8, late: 14 },
        leaveStats: { approved: 28, pending: 12, rejected: 3 },
        payrollStats: { 
          totalGross: 185600000, 
          totalNet: 142800000, 
          totalDeductions: 42800000 
        },
        ageDistribution: [
          { range: '20-25', count: 32 },
          { range: '26-30', count: 48 },
          { range: '31-35', count: 41 },
          { range: '36-40', count: 25 },
          { range: '41-50', count: 8 },
          { range: '50+', count: 2 }
        ],
        genderDistribution: { male: 89, female: 67 },
        salaryBands: [
          { band: '500K-1M', count: 45, avgSalary: 750000 },
          { band: '1M-1.5M', count: 67, avgSalary: 1250000 },
          { band: '1.5M-2M', count: 32, avgSalary: 1750000 },
          { band: '2M+', count: 12, avgSalary: 2800000 }
        ]
      };

      setMetrics(mockMetrics);
      setError(null);
    } catch (err) {
      console.error('Error loading HR metrics:', err);
      setError('Failed to load HR metrics');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (reportType: string) => {
    if (!metrics) return;

    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'overview':
        csvContent = [
          ['Metric', 'Value'],
          ['Total Employees', metrics.totalEmployees.toString()],
          ['Active Employees', metrics.activeEmployees.toString()],
          ['Present Today', metrics.attendanceStats.present.toString()],
          ['Absent Today', metrics.attendanceStats.absent.toString()],
          ['Late Today', metrics.attendanceStats.late.toString()],
          ['Total Gross Payroll', metrics.payrollStats.totalGross.toString()],
          ['Total Net Payroll', metrics.payrollStats.totalNet.toString()]
        ].map(row => row.join(',')).join('\n');
        filename = 'hr_overview_report.csv';
        break;
        
      case 'headcount':
        csvContent = [
          ['Month', 'New Hires', 'Resignations', 'Net Change'],
          ...metrics.newHires.map((hire, index) => [
            hire.month,
            hire.count.toString(),
            metrics.resignations[index]?.count.toString() || '0',
            (hire.count - (metrics.resignations[index]?.count || 0)).toString()
          ])
        ].map(row => row.join(',')).join('\n');
        filename = 'headcount_trends.csv';
        break;
        
      case 'department':
        csvContent = [
          ['Department', 'Employee Count', 'Percentage'],
          ...metrics.departmentStats.map(dept => [
            dept.department,
            dept.count.toString(),
            dept.percentage.toString()
          ])
        ].map(row => row.join(',')).join('\n');
        filename = 'department_breakdown.csv';
        break;
        
      default:
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error || 'Failed to load metrics'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const turnoverRate = ((metrics.resignations.reduce((sum, r) => sum + r.count, 0) / metrics.totalEmployees) * 100).toFixed(1);
  const hireRate = ((metrics.newHires.reduce((sum, h) => sum + h.count, 0) / metrics.totalEmployees) * 100).toFixed(1);
  const attendanceRate = ((metrics.attendanceStats.present / metrics.totalEmployees) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Analytics & Reports</h1>
          <p className="text-gray-500">Comprehensive insights into your workforce metrics</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadMetrics}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button 
            onClick={() => exportReport(selectedReport)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="overview">Overview</option>
              <option value="headcount">Headcount Trends</option>
              <option value="department">Department Analysis</option>
              <option value="attendance">Attendance Analytics</option>
              <option value="payroll">Payroll Analytics</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-green-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              +{hireRate}%
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalEmployees}</p>
            <p className="text-xs text-gray-500">{metrics.activeEmployees} active</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-green-600">
              {attendanceRate}%
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Attendance Rate</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.attendanceStats.present}</p>
            <p className="text-xs text-gray-500">Present today</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm text-red-600">
              {turnoverRate}%
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Turnover Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.resignations.reduce((sum, r) => sum + r.count, 0)}
            </p>
            <p className="text-xs text-gray-500">Yearly</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-purple-600">
              Monthly
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Avg. Salary Cost</p>
            <p className="text-2xl font-bold text-gray-900">
              UGX {Math.round(metrics.payrollStats.totalNet / metrics.totalEmployees / 1000)}K
            </p>
            <p className="text-xs text-gray-500">Per employee</p>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Department Distribution
          </h3>
          <div className="space-y-3">
            {metrics.departmentStats.map((dept) => (
              <div key={dept.department} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ 
                      backgroundColor: `hsl(${(dept.percentage * 360) / 100}, 70%, 50%)` 
                    }}
                  ></div>
                  <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{dept.count}</span>
                  <span className="text-xs text-gray-500 ml-1">({dept.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hiring Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hiring vs Resignation Trends
          </h3>
          <div className="space-y-2">
            {metrics.newHires.slice(-6).map((month, index) => {
              const resignation = metrics.resignations.slice(-6)[index];
              const netChange = month.count - (resignation?.count || 0);
              return (
                <div key={month.month} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700 w-12">{month.month}</span>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(month.count / 20) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{month.count}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-medium w-12 text-right ${
                    netChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {netChange >= 0 ? '+' : ''}{netChange}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Age Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Age Distribution
          </h3>
          <div className="space-y-3">
            {metrics.ageDistribution.map((age) => (
              <div key={age.range} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{age.range}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(age.count / metrics.totalEmployees) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">{age.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Salary Bands */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Band Analysis
          </h3>
          <div className="space-y-3">
            {metrics.salaryBands.map((band) => (
              <div key={band.band} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{band.band}</span>
                  <div className="text-xs text-gray-500">
                    Avg: UGX {band.avgSalary.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{band.count}</span>
                  <span className="text-xs text-gray-500 ml-1">employees</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Quick Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => exportReport('overview')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Overview Report</h4>
                <p className="text-sm text-gray-500">Complete HR metrics summary</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => exportReport('headcount')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Headcount Trends</h4>
                <p className="text-sm text-gray-500">Hiring and attrition analysis</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => exportReport('department')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Department Breakdown</h4>
                <p className="text-sm text-gray-500">Team distribution analysis</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
} 