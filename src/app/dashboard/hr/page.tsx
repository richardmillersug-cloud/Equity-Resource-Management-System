'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { HRQueries } from '../../../lib/firebase/role-based-queries';
import { useLanguage } from '../../../contexts/LanguageContext';
import { 
  Users, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText,
  Clock,
  UserCheck,
  DollarSign,
  BarChart3,
  QrCode,
  Plus,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  Clock3
} from 'lucide-react';

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  todayAttendance: number;
  pendingPayroll: number;
  thisMonthHires: number;
}

export default function HRDashboard() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<HRStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    todayAttendance: 0,
    pendingPayroll: 0,
    thisMonthHires: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHRData = async () => {
      try {
        setLoading(true);
        
        const [employeesData, leaveData] = await Promise.all([
          HRQueries.getEmployeeOverview(),
          HRQueries.getLeaveRequests()
        ]);

        setEmployees(employeesData);
        setLeaveRequests(leaveData);

        // Calculate stats
        const activeEmployees = employeesData.filter(emp => emp.employmentStatus === 'Active').length;
        const pendingLeaves = leaveData.filter(req => req.status === 'Pending').length;
        const currentMonth = new Date().getMonth();
        const thisMonthHires = employeesData.filter(emp => 
          emp.hireDate && new Date(emp.hireDate.seconds * 1000).getMonth() === currentMonth
        ).length;

        setStats({
          totalEmployees: employeesData.length,
          activeEmployees,
          pendingLeaves,
          todayAttendance: Math.floor(activeEmployees * 0.85), // Simulated for now
          pendingPayroll: Math.floor(activeEmployees * 0.1), // Simulated for now
          thisMonthHires
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading HR data:', err);
        setError('Failed to load HR dashboard data');
        setLoading(false);
      }
    };

    loadHRData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('navigation.hrDashboard', 'HR Dashboard')}</h1>
          <p className="text-gray-500">{t('hr.manageWorkforce', 'Manage your workforce and HR operations')}</p>
        </div>
        <Link 
          href="/dashboard/hr/employees/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('hr.addEmployee', 'Add Employee')}
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('hr.totalEmployees', 'Total Employees')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('hr.activeEmployees', 'Active Employees')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeEmployees}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('hr.pendingLeave', 'Pending Leave')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingLeaves}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('hr.todaysAttendance', 'Today\'s Attendance')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.todayAttendance}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('hr.pendingPayroll', 'Pending Payroll')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingPayroll}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('hr.newHiresMonth', 'New Hires (Month)')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.thisMonthHires}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('hr.quickActions', 'Quick Actions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/hr/employees">
            <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{t('hr.manageEmployees', 'Manage Employees')}</h3>
                  <p className="text-sm text-gray-500">{t('hr.addEditViewRecords', 'Add, edit, or view employee records')}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/hr/attendance">
            <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{t('hr.attendanceTracking', 'Attendance Tracking')}</h3>
                  <p className="text-sm text-gray-500">{t('hr.trackDailyAttendance', 'Track daily attendance and hours')}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/hr/leave-requests">
            <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{t('hr.leaveRequests', 'Leave Requests')}</h3>
                  <p className="text-sm text-gray-500">{t('hr.approveRejectLeave', 'Approve or reject leave applications')}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/hr/payroll">
            <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Payroll Processing</h3>
                  <p className="text-sm text-gray-500">Process employee salaries and payments</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/hr/barcodes">
            <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <QrCode className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Barcode Management</h3>
                  <p className="text-sm text-gray-500">Generate and manage employee IDs</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/hr/reports">
            <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">HR Reports</h3>
                  <p className="text-sm text-gray-500">Generate analytics and reports</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Employees */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Employees</h3>
            <Link href="/dashboard/hr/employees" className="text-blue-600 hover:text-blue-800 text-sm">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {employees.slice(0, 5).map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{employee.firstName} {employee.lastName}</p>
                    <p className="text-sm text-gray-500">{employee.roles?.[0]?.jobTitle || 'N/A'}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  employee.employmentStatus === 'Active' 
                    ? 'text-green-800 bg-green-100' 
                    : 'text-red-800 bg-red-100'
                }`}>
                  {employee.employmentStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Leave Requests</h3>
            <Link href="/dashboard/hr/leave-requests" className="text-blue-600 hover:text-blue-800 text-sm">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {leaveRequests.filter(req => req.status === 'Pending').slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{request.employeeName || 'Employee'}</p>
                    <p className="text-sm text-gray-500">{request.leaveType} - {request.daysRequested} days</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-1 text-green-600 hover:text-green-800">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-red-600 hover:text-red-800">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 