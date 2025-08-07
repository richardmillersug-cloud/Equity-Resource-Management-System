'use client';

import React, { useState, useEffect } from 'react';
import { EmployeeService } from '../../../../lib/firebase/firestore-service';
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
  TrendingUp,
  Search,
  X,
  Send,
  BookOpen,
  Activity
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
  urgency: 'Low' | 'Medium' | 'High';
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

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<LeaveRequest | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvalComments, setApprovalComments] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState<LeaveBalance | null>(null);

  // New request form state
  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    leaveType: 'Annual' as LeaveRequest['leaveType'],
    startDate: '',
    endDate: '',
    reason: '',
    urgency: 'Medium' as LeaveRequest['urgency']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading employees from Firestore...');
      const employeeService = new EmployeeService();
      const employeesData = await employeeService.getAll();
      console.log('✅ Employees loaded from Firestore:', employeesData?.length || 0);
      setEmployees(employeesData);
      
      // Generate comprehensive mock data
      const mockRequests = generateMockLeaveRequests(employeesData);
      setLeaveRequests(mockRequests);
      
    } catch (err) {
      console.error('Error loading leave data:', err);
      setError('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockLeaveRequests = (employees: Employee[]): LeaveRequest[] => {
    const leaveTypes: LeaveRequest['leaveType'][] = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid'];
    const statuses: LeaveRequest['status'][] = ['Pending', 'Approved', 'Rejected'];
    const urgencies: LeaveRequest['urgency'][] = ['Low', 'Medium', 'High'];
    
    const requests: LeaveRequest[] = [];
    
    employees.forEach((emp, index) => {
      const numRequests = Math.floor(Math.random() * 4) + 1;
      
      for (let i = 0; i < numRequests; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 180) - 90);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 1);
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
          reason: `Request for ${leaveTypes[Math.floor(Math.random() * leaveTypes.length)].toLowerCase()} leave`,
          urgency: urgencies[Math.floor(Math.random() * urgencies.length)],
          createdAt: { seconds: (new Date().getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000) / 1000 }
        });
      }
    });
    
    return requests.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  };

  const handleNewRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.employeeId || !newRequest.startDate || !newRequest.endDate) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      const employee = employees.find(emp => emp.id === newRequest.employeeId);
      if (!employee) return;
      
      const startDate = new Date(newRequest.startDate);
      const endDate = new Date(newRequest.endDate);
      const daysRequested = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const request: LeaveRequest = {
        id: `leave_${newRequest.employeeId}_${Date.now()}`,
        employeeId: newRequest.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        leaveType: newRequest.leaveType,
        startDate: { seconds: startDate.getTime() / 1000 },
        endDate: { seconds: endDate.getTime() / 1000 },
        daysRequested,
        status: 'Pending',
        reason: newRequest.reason,
        urgency: newRequest.urgency,
        createdAt: { seconds: new Date().getTime() / 1000 }
      };
      
      setLeaveRequests([request, ...leaveRequests]);
      setSuccess('Leave request submitted successfully');
      setShowNewRequestModal(false);
      setNewRequest({
        employeeId: '',
        leaveType: 'Annual',
        startDate: '',
        endDate: '',
        reason: '',
        urgency: 'Medium'
      });
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error submitting leave request:', err);
      setError('Failed to submit leave request');
    }
  };

  const handleApprovalSubmit = async () => {
    if (!currentRequest) return;
    
    try {
      const updatedRequest = {
        ...currentRequest,
        status: approvalDecision,
        approvedBy: 'current-hr-user',
        approvalDate: { seconds: new Date().getTime() / 1000 },
        comments: approvalComments
      };
      
      setLeaveRequests(requests => 
        requests.map(req => req.id === currentRequest.id ? updatedRequest : req)
      );
      
      setSuccess(`Leave request ${approvalDecision.toLowerCase()} successfully`);
      setShowApprovalModal(false);
      setCurrentRequest(null);
      setApprovalComments('');
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error updating leave request:', err);
      setError('Failed to update leave request');
    }
  };

  const generateLeaveBalance = (employeeId: string): LeaveBalance => {
    const annual = { allocated: 21, used: Math.floor(Math.random() * 15), remaining: 0 };
    annual.remaining = annual.allocated - annual.used;
    
    const sick = { allocated: 10, used: Math.floor(Math.random() * 8), remaining: 0 };
    sick.remaining = sick.allocated - sick.used;
    
    return {
      annual,
      sick,
      maternity: { allocated: 90, used: 0, remaining: 90 },
      paternity: { allocated: 7, used: 0, remaining: 7 },
      emergency: { allocated: 5, used: Math.floor(Math.random() * 3), remaining: 2 }
    };
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (typeFilter !== 'all' && request.leaveType !== typeFilter) return false;
    if (selectedEmployee && request.employeeId !== selectedEmployee) return false;
    if (searchTerm && !request.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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
      ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Urgency', 'Reason'],
      ...filteredRequests.map(request => [
        request.employeeName,
        request.leaveType,
        new Date(request.startDate.seconds * 1000).toLocaleDateString(),
        new Date(request.endDate.seconds * 1000).toLocaleDateString(),
        request.daysRequested.toString(),
        request.status,
        request.urgency,
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
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-500">Manage employee leave requests and balances</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            {viewMode === 'list' ? <Calendar className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {viewMode === 'list' ? 'Calendar View' : 'List View'}
          </button>
          <button
            onClick={exportLeaveRequests}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Annual">Annual</option>
            <option value="Sick">Sick</option>
            <option value="Maternity">Maternity</option>
            <option value="Paternity">Paternity</option>
            <option value="Emergency">Emergency</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {filteredRequests.length} of {leaveRequests.length} requests
            </span>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
        </div>
        
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
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urgency
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
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{request.employeeName}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(request.createdAt.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {request.leaveType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {new Date(request.startDate.seconds * 1000).toLocaleDateString()} - 
                      {new Date(request.endDate.seconds * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">{request.daysRequested} days</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.urgency === 'High' ? 'bg-red-100 text-red-800' :
                      request.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {request.urgency}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const employee = employees.find(emp => emp.id === request.employeeId);
                          if (employee) {
                            setSelectedEmployeeBalance(generateLeaveBalance(request.employeeId));
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Balance"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {request.status === 'Pending' && (
                        <button
                          onClick={() => {
                            setCurrentRequest(request);
                            setShowApprovalModal(true);
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Review Request"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Leave Request</h3>
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleNewRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={newRequest.employeeId}
                  onChange={(e) => setNewRequest({...newRequest, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select
                  value={newRequest.leaveType}
                  onChange={(e) => setNewRequest({...newRequest, leaveType: e.target.value as LeaveRequest['leaveType']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Paternity">Paternity</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  value={newRequest.urgency}
                  onChange={(e) => setNewRequest({...newRequest, urgency: e.target.value as LeaveRequest['urgency']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Please provide a reason for this leave request..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && currentRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Review Leave Request</h3>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{currentRequest.employeeName}</h4>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Type:</strong> {currentRequest.leaveType}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Duration:</strong> {new Date(currentRequest.startDate.seconds * 1000).toLocaleDateString()} - 
                  {new Date(currentRequest.endDate.seconds * 1000).toLocaleDateString()} ({currentRequest.daysRequested} days)
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Urgency:</strong> {currentRequest.urgency}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Reason:</strong> {currentRequest.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="decision"
                      value="Approved"
                      checked={approvalDecision === 'Approved'}
                      onChange={(e) => setApprovalDecision(e.target.value as 'Approved' | 'Rejected')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="decision"
                      value="Rejected"
                      checked={approvalDecision === 'Rejected'}
                      onChange={(e) => setApprovalDecision(e.target.value as 'Approved' | 'Rejected')}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Reject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add any comments or feedback..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  className={`px-4 py-2 rounded-lg text-white ${
                    approvalDecision === 'Approved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalDecision === 'Approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balance Modal */}
      {selectedEmployeeBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Leave Balance</h3>
              <button
                onClick={() => setSelectedEmployeeBalance(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(selectedEmployeeBalance).map(([type, balance]) => (
                <div key={type} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 capitalize">{type}</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500">Allocated</p>
                      <p className="font-semibold text-blue-600">{balance.allocated}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Used</p>
                      <p className="font-semibold text-red-600">{balance.used}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Remaining</p>
                      <p className="font-semibold text-green-600">{balance.remaining}</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(balance.used / balance.allocated) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 