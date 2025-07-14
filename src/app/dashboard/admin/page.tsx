'use client';

import React, { useState, useEffect } from 'react';
import { MetricCard } from '../../../components/ui/card';
import { AdminQueries } from '../../../lib/firebase/role-based-queries';
import { useLanguage } from '../../../contexts/LanguageContext';
import { 
  Users, 
  Building2, 
  Truck, 
  FileText, 
  Shield, 
  Activity,
  AlertTriangle,
  TrendingUp,
  Database,
  Settings
} from 'lucide-react';

interface SystemOverview {
  entityType: string;
  totalCount: number;
  recentCount: number;
}

interface SecurityOverview {
  employeeId: string;
  employeeName: string;
  email: string;
  employmentStatus: string;
  jobTitle: string;
  lastActivity: any;
  totalActions: number;
  activityLevel: string;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [systemOverview, setSystemOverview] = useState<SystemOverview[]>([]);
  const [securityOverview, setSecurityOverview] = useState<SecurityOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        
        // Load system overview
        const systemData = await AdminQueries.getSystemOverview();
        setSystemOverview(systemData);

        // Load security overview
        const securityData = await AdminQueries.getSecurityOverview();
        setSecurityOverview(securityData);

        setLoading(false);
      } catch (err) {
        console.error('Error loading admin data:', err);
        setError('Failed to load admin dashboard data');
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'LOW_ACTIVITY': return 'text-yellow-600 bg-yellow-100';
      case 'INACTIVE': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'branches': return Building2;
      case 'employees': return Users;
      case 'suppliers': return Truck;
      case 'invoices': return FileText;
      default: return Database;
    }
  };

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
            <AlertTriangle className="h-5 w-5 text-red-400" />
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
      {/* System Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.systemOverview', 'System Overview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systemOverview.map((item) => {
            const IconComponent = getEntityIcon(item.entityType);
            return (
              <div key={item.entityType} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-blue-600" />
                  </div>
                  {item.recentCount > 0 && (
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                      <span>↗</span>
                      <span>+{item.recentCount}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{item.entityType}</p>
                  <p className="text-2xl font-bold text-gray-900">{item.totalCount}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.recentCount} added this month</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('receiver.quickActions', 'Quick Actions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">{t('admin.manageUsers', 'Manage Users')}</h3>
                <p className="text-sm text-gray-500">{t('admin.manageUsers', 'Add, edit, or deactivate users')}</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">{t('admin.systemSettings', 'System Settings')}</h3>
                <p className="text-sm text-gray-500">{t('admin.configureSystem', 'Configure system parameters')}</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">{t('admin.securityAlerts', 'Security Audit')}</h3>
                <p className="text-sm text-gray-500">{t('admin.viewReports', 'Review security logs')}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Security Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security & Access Overview</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {securityOverview.slice(0, 10).map((employee) => (
                  <tr key={employee.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.jobTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.employmentStatus === 'Active' 
                          ? 'text-green-800 bg-green-100' 
                          : 'text-red-800 bg-red-100'
                      }`}>
                        {employee.employmentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityLevelColor(employee.activityLevel)}`}>
                        {employee.activityLevel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.totalActions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.lastActivity 
                        ? new Date(employee.lastActivity.seconds * 1000).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600">
                  {securityOverview.filter(emp => emp.activityLevel === 'ACTIVE').length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                <p className="text-2xl font-bold text-red-600">
                  {securityOverview.filter(emp => emp.activityLevel === 'INACTIVE').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total System Actions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {securityOverview.reduce((sum, emp) => sum + emp.totalActions, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 