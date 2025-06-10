'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../lib/firebase/role-based-queries';
import { 
  Users, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function HRDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHRData = async () => {
      try {
        setLoading(true);
        
        const employeesData = await HRQueries.getEmployeeOverview();
        setEmployees(employeesData);

        const leaveData = await HRQueries.getLeaveRequests();
        setLeaveRequests(leaveData);

        setLoading(false);
      } catch (err) {
        console.error('Error loading HR data:', err);
        setError('Failed to load HR dashboard data');
        setLoading(false);
      }
    };

    loadHRData();
  }, []);

  const activeEmployees = employees.filter(emp => emp.employmentStatus === 'Active').length;
  const pendingLeaves = leaveRequests.filter(req => req.status === 'Pending').length;

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
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">HR Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Employees</p>
              <p className="text-2xl font-bold text-gray-900">{activeEmployees}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending Leave Requests</p>
              <p className="text-2xl font-bold text-gray-900">{pendingLeaves}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Manage Employees</h3>
                <p className="text-sm text-gray-500">Add or update employee records</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Process Leave Requests</h3>
                <p className="text-sm text-gray-500">Approve or reject leave applications</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Generate Reports</h3>
                <p className="text-sm text-gray-500">Create HR analytics reports</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.slice(0, 9).map((employee) => (
            <div key={employee.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  employee.employmentStatus === 'Active' 
                    ? 'text-green-800 bg-green-100' 
                    : 'text-red-800 bg-red-100'
                }`}>
                  {employee.employmentStatus}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {employee.firstName} {employee.lastName}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Role:</span> {employee.roles?.[0]?.jobTitle || 'N/A'}</p>
                  <p><span className="font-medium">Email:</span> {employee.email}</p>
                  <p><span className="font-medium">Years of Service:</span> {employee.yearsOfService}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 