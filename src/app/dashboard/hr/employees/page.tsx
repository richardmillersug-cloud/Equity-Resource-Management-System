'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmployeeService } from '../../../../lib/firebase/firestore-service';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employeeNIN: string;
  employmentStatus: 'Active' | 'Inactive' | 'Terminated';
  hireDate: any;
  employeeSalary: number;
  branchId: string;
  workingSection?: string;
  passportPhoto?: string;
  passportPhotoFilename?: string;
  passportPhotoUploadedAt?: any;
  roles: Array<{
    jobTitle: string;
    baseSalary: number;
  }>;
  createdAt: any;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, statusFilter, roleFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC key closes modal
      if (event.key === 'Escape' && showDeleteModal) {
        setShowDeleteModal(false);
        setEmployeeToDelete(null);
      }
      // Ctrl+N to add new employee
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        window.location.href = '/dashboard/hr/employees/add';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading employees from Firestore...');
      const employeeService = new EmployeeService();
      const employeesData = await employeeService.getAll();
      console.log('✅ Employees loaded from Firestore:', employeesData?.length || 0);
      setEmployees(employeesData);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading employees from Firestore:', err);
      setError('Failed to load employees from database');
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeNIN.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.employmentStatus === statusFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(emp => 
        emp.roles && emp.roles.some(role => role.jobTitle === roleFilter)
      );
    }

    setFilteredEmployees(filtered);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      setDeleting(true);
      setError(null);
      
      const employeeToDeleteData = employees.find(emp => emp.id === employeeId);
      
      await firestoreServices.employee.delete(employeeId);
      
      // Update local state
      setEmployees(employees.filter(emp => emp.id !== employeeId));
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      
      // Show success message
      setSuccess(`Employee ${employeeToDeleteData?.firstName} ${employeeToDeleteData?.lastName} has been successfully deleted.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (employeeId: string, newStatus: string) => {
    try {
      setError(null);
      
      const employeeToUpdate = employees.find(emp => emp.id === employeeId);
      
      await firestoreServices.employee.update(employeeId, { 
        employmentStatus: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === employeeId ? { ...emp, employmentStatus: newStatus as any } : emp
      ));
      
      // Show success message
      setSuccess(`Employee ${employeeToUpdate?.firstName} ${employeeToUpdate?.lastName} status updated to ${newStatus}.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error updating employee status:', err);
      setError('Failed to update employee status. Please try again.');
    }
  };

  const exportEmployees = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'NIN', 'Status', 'Role', 'Salary', 'Hire Date'],
      ...filteredEmployees.map(emp => [
        `${emp.firstName} ${emp.lastName}`,
        emp.email,
        emp.phone || '',
        emp.employeeNIN,
        emp.employmentStatus,
        emp.roles?.[0]?.jobTitle || '',
        emp.employeeSalary?.toString() || '',
        emp.hireDate ? new Date(emp.hireDate.seconds * 1000).toLocaleDateString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueRoles = [...new Set(employees.flatMap(emp => emp.roles?.map(role => role.jobTitle) || []))];

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
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-500">Manage your workforce and employee records</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportEmployees}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            title="Export employee data to CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button 
            onClick={loadEmployees}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            title="Refresh employee data"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link 
            href="/dashboard/hr/employees/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            title="Add new employee (Ctrl+N)"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Terminated">Terminated</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {filteredEmployees.length} of {employees.length} employees
            </span>
            {selectedEmployees.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">
                  {selectedEmployees.length} selected
                </span>
                <button
                  onClick={() => setSelectedEmployees([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${selectedEmployees.includes(employee.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees([...selectedEmployees, employee.id]);
                      } else {
                        setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {employee.passportPhoto ? (
                      <img
                        src={employee.passportPhoto}
                        alt={`${employee.firstName} ${employee.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{employee.roles?.[0]?.jobTitle || 'N/A'}</p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                employee.employmentStatus === 'Active' 
                  ? 'text-green-800 bg-green-100' 
                  : employee.employmentStatus === 'Inactive'
                  ? 'text-yellow-800 bg-yellow-100'
                  : 'text-red-800 bg-red-100'
              }`}>
                {employee.employmentStatus}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Hired: {employee.hireDate ? new Date(employee.hireDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>UGX {employee.employeeSalary?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Link
                  href={`/dashboard/hr/employees/${employee.id}`}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors relative group"
                  title="View Employee Details"
                >
                  <Eye className="h-4 w-4" />
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    View Details
                  </span>
                </Link>
                <Link
                  href={`/dashboard/hr/employees/${employee.id}/edit`}
                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors relative group"
                  title="Edit Employee Information"
                >
                  <Edit className="h-4 w-4" />
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Edit Employee
                  </span>
                </Link>
                <button
                  onClick={() => {
                    setEmployeeToDelete(employee.id);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors relative group"
                  title="Delete Employee"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Delete Employee
                  </span>
                </button>
              </div>
              
              <select
                className="text-sm border border-gray-300 rounded px-2 py-1"
                value={employee.employmentStatus}
                onChange={(e) => handleStatusChange(employee.id, e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by adding your first employee'}
          </p>
          <Link 
            href="/dashboard/hr/employees/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              {employeeToDelete && (
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    {(() => {
                      const employee = employees.find(emp => emp.id === employeeToDelete);
                      return employee ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                          <p className="text-xs text-gray-500">{employee.roles?.[0]?.jobTitle || 'Employee'}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. Deleting this employee will permanently remove:
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>Personal information and contact details</li>
                  <li>Employment history and records</li>
                  <li>Salary and payment information</li>
                  <li>Role assignments and permissions</li>
                  <li>All related HR data</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Recommendation:</strong> Consider changing the employee status to "Inactive" or "Terminated" instead of deleting if you need to maintain historical records.
                </p>
              </div>
              
              <p className="text-sm text-gray-600 font-medium">
                Are you absolutely sure you want to permanently delete this employee?
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (employeeToDelete && !deleting) {
                    const employee = employees.find(emp => emp.id === employeeToDelete);
                    if (employee) {
                      const userInput = prompt(`Please type "${employee.firstName} ${employee.lastName}" to confirm deletion:`);
                      if (userInput === `${employee.firstName} ${employee.lastName}`) {
                        handleDeleteEmployee(employeeToDelete);
                      } else if (userInput !== null) {
                        alert('Deletion cancelled. The name entered did not match.');
                      }
                    }
                  }
                }}
                disabled={deleting}
                className={`px-4 py-2 ${deleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white rounded-lg font-medium flex items-center gap-2`}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 