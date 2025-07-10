'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  CalendarDays,
  FileText,
  Users,
  TrendingUp
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Annual' | 'Sick' | 'Maternity' | 'Paternity' | 'Emergency' | 'Unpaid';
  startDate: any;
  endDate: any;
  daysRequested: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reason: string;
  approvedBy?: string;
  approvalDate?: any;
  comments?: string;
  createdAt: any;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{ jobTitle: string }>;
}

interface LeaveBalance {
  annual: { allocated: number; used: number; remaining: number };
  sick: { allocated: number; used: number; remaining: number };
  maternity: { allocated: number; used: number; remaining: number };
  paternity: { allocated: number; used: number; remaining: number };
  emergency: { allocated: number; used: number; remaining: number };
}

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<LeaveRequest | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvalComments, setApprovalComments] = useState('');
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState<LeaveBalance | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData, leaveData] = await Promise.all([
        HRQueries.getEmployeeOverview(),
        HRQueries.getLeaveRequests()
      ]);
      
      setEmployees(employeesData);
      
      // Generate mock leave requests for demonstration
      const mockLeaveRequests = generateMockLeaveRequests(employeesData);
      setLeaveRequests(mockLeaveRequests);
      
    } catch (err) {
      console.error('Error loading leave requests:', err);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const generateMockLeaveRequests = (employees: Employee[]): LeaveRequest[] => {
    const leaveTypes: LeaveRequest['leaveType'][] = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid'];
    const statuses: LeaveRequest['status'][] = ['Pending', 'Approved', 'Rejected'];
    
    const requests: LeaveRequest[] = [];
    
    employees.forEach((emp, index) => {
      // Generate 1-3 requests per employee
      const numRequests = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numRequests; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) - 30);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 10) + 1);
        const daysRequested = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        requests.push({
          id: `leave_${emp.id}_${i}`,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          leaveType: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
          startDate: { seconds: startDate.getTime() / 1000 },
          endDate: { seconds: endDate.getTime() / 1000 },
          daysRequested,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          reason: `Leave request for ${leaveTypes[Math.floor(Math.random() * leaveTypes.length)].toLowerCase()}`,
          createdAt: { seconds: (new Date().getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000) / 1000 }
        });
      }
    });
    
    return requests.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  };

  const handleApprovalSubmit = async () => {
    if (!currentRequest) return;
    
    try {
      // Update leave request status
      const updatedRequest = {
        ...currentRequest,
        status: approvalDecision,
        approvedBy: 'current-hr-user', // Replace with actual current user ID
        approvalDate: { seconds: new Date().getTime() / 1000 },
        comments: approvalComments
      };
      
      setLeaveRequests(requests => 
        requests.map(req => req.id === currentRequest.id ? updatedRequest : req)
      );
      
      setShowApprovalModal(false);
      setCurrentRequest(null);
      setApprovalComments('');
    } catch (err) {
      console.error('Error updating leave request:', err);
      setError('Failed to update leave request');
    }
  };

  const generateLeaveBalance = (employeeId: string): LeaveBalance => {
    // Mock leave balance calculation
    return {
      annual: { allocated: 21, used: Math.floor(Math.random() * 15), remaining: 0 },
      sick: { allocated: 10, used: Math.floor(Math.random() * 8), remaining: 0 },
      maternity: { allocated: 90, used: 0, remaining: 90 },
      paternity: { allocated: 7, used: 0, remaining: 7 },
      emergency: { allocated: 5, used: Math.floor(Math.random() * 3), remaining: 0 }
    };
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (typeFilter !== 'all' && request.leaveType !== typeFilter) return false;
    if (selectedEmployee && request.employeeId !== selectedEmployee) return false;
    return true;
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'Pending').length,
    approved: leaveRequests.filter(r => r.status === 'Approved').length,
    rejected: leaveRequests.filter(r => r.status === 'Rejected').length
  };

  const exportLeaveRequests = () => {
    const csvContent = [
      ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
      ...filteredRequests.map(request => [
        request.employeeName,
        request.leaveType,
        new Date(request.startDate.seconds * 1000).toLocaleDateString(),
        new Date(request.endDate.seconds * 1000).toLocaleDateString(),
        request.daysRequested.toString(),
        request.status,
        request.reason
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_requests.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewBalance = (employeeId: string) => {
    const balance = generateLeaveBalance(employeeId);
    // Calculate remaining days
    Object.keys(balance).forEach(key => {
      const balanceKey = key as keyof LeaveBalance;
      balance[balanceKey].remaining = balance[balanceKey].allocated - balance[balanceKey].used;
    });
    setSelectedEmployeeBalance(balance);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Request Management</h1>
          <p className="text-gray-500">Manage employee leave requests and approval workflow</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportLeaveRequests}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Approved</p>
            <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="Annual">Annual</option>
              <option value="Sick">Sick</option>
              <option value="Maternity">Maternity</option>
              <option value="Paternity">Paternity</option>
              <option value="Emergency">Emergency</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-sm text-gray-500">
              Showing {filteredRequests.length} of {leaveRequests.length} requests
            </span>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.employeeName}
                        </div>
                        <button
                          onClick={() => handleViewBalance(request.employeeId)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Leave Balance
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.leaveType === 'Annual' ? 'text-blue-800 bg-blue-100' :
                      request.leaveType === 'Sick' ? 'text-red-800 bg-red-100' :
                      request.leaveType === 'Maternity' ? 'text-purple-800 bg-purple-100' :
                      request.leaveType === 'Paternity' ? 'text-indigo-800 bg-indigo-100' :
                      request.leaveType === 'Emergency' ? 'text-orange-800 bg-orange-100' :
                      'text-gray-800 bg-gray-100'
                    }`}>
                      {request.leaveType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{new Date(request.startDate.seconds * 1000).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">
                        to {new Date(request.endDate.seconds * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.daysRequested} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'Pending' ? 'text-yellow-800 bg-yellow-100' :
                      request.status === 'Approved' ? 'text-green-800 bg-green-100' :
                      request.status === 'Rejected' ? 'text-red-800 bg-red-100' :
                      'text-gray-800 bg-gray-100'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.createdAt.seconds * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {request.status === 'Pending' && (
                        <button
                          onClick={() => {
                            setCurrentRequest(request);
                            setShowApprovalModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && currentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Leave Request</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">Employee: {currentRequest.employeeName}</p>
              <p className="text-sm text-gray-600">Leave Type: {currentRequest.leaveType}</p>
              <p className="text-sm text-gray-600">
                Dates: {new Date(currentRequest.startDate.seconds * 1000).toLocaleDateString()} - {new Date(currentRequest.endDate.seconds * 1000).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">Days: {currentRequest.daysRequested}</p>
              <p className="text-sm text-gray-600">Reason: {currentRequest.reason}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Approved"
                    checked={approvalDecision === 'Approved'}
                    onChange={(e) => setApprovalDecision(e.target.value as 'Approved' | 'Rejected')}
                    className="mr-2"
                  />
                  Approve
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Rejected"
                    checked={approvalDecision === 'Rejected'}
                    onChange={(e) => setApprovalDecision(e.target.value as 'Approved' | 'Rejected')}
                    className="mr-2"
                  />
                  Reject
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Add comments (optional)"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                className={`px-4 py-2 text-white rounded-lg ${
                  approvalDecision === 'Approved' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {approvalDecision === 'Approved' ? 'Approve' : 'Reject'} Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balance Modal */}
      {selectedEmployeeBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h3>
            
            <div className="space-y-4">
              {Object.entries(selectedEmployeeBalance).map(([type, balance]) => (
                <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{type}</p>
                    <p className="text-sm text-gray-500">
                      {balance.used} used of {balance.allocated} allocated
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{balance.remaining}</p>
                    <p className="text-xs text-gray-500">remaining</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedEmployeeBalance(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 