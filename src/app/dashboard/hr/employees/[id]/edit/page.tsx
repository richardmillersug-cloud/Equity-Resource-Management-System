'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmployeeService } from '../../../../../../lib/firebase/firestore-service';
import { firestoreServices } from '../../../../../../lib/firebase/firestore-service';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Mail, 
  Phone, 
  Badge, 
  Building, 
  Calendar, 
  DollarSign, 
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { EmployeeDocumentsService } from '../../../../../../lib/firebase/employee-documents-service';

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
  roles: Array<{
    jobTitle: string;
    baseSalary: number;
  }>;
  createdAt: any;
  updatedAt?: any;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNIN: string;
  employmentStatus: 'Active' | 'Inactive' | 'Terminated';
  hireDate: string;
  employeeSalary: number;
  branchId: string;
  roles: Array<{
    jobTitle: string;
    baseSalary: number;
  }>;
}

const jobTitles = [
  'Admin', 'Manager', 'Assistant Manager', 'Attendant', 'Team Lead',
  'HR Manager', 'HR Assistant', 'Recruiter',
  'Accountant', 'Financial Analyst', 'Bookkeeper',
  'Purchasing Manager', 'Stock Manager', 'Receiver',
  'Sales Manager', 'Sales Representative',
  'Marketing Manager', 'Marketing Coordinator',
  'Operations Manager', 'Operations Coordinator',
  'Senior Developer', 'Developer', 'Junior Developer',
  'Quality Assurance', 'Data Analyst', 'Administrative Assistant'
];

export default function EmployeeEditPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeNIN: '',
    employmentStatus: 'Active',
    hireDate: '',
    employeeSalary: 0,
    branchId: '',
    roles: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id) {
      loadEmployee(params.id as string);
    }
  }, [params.id]);

  const loadEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      const employeeService = new EmployeeService();
      const employees = await employeeService.getAll();
      const foundEmployee = employees.find(emp => emp.id === employeeId);
      
      if (!foundEmployee) {
        setError('Employee not found');
        return;
      }
      
      setEmployee(foundEmployee);
      
      // Convert employee data to form data
      const hireDate = foundEmployee.hireDate 
        ? (foundEmployee.hireDate.seconds 
            ? new Date(foundEmployee.hireDate.seconds * 1000).toISOString().split('T')[0]
            : new Date(foundEmployee.hireDate).toISOString().split('T')[0])
        : '';
      
      setFormData({
        firstName: foundEmployee.firstName || '',
        lastName: foundEmployee.lastName || '',
        email: foundEmployee.email || '',
        phone: foundEmployee.phone || '',
        employeeNIN: foundEmployee.employeeNIN || '',
        employmentStatus: foundEmployee.employmentStatus || 'Active',
        hireDate,
        employeeSalary: foundEmployee.employeeSalary || 0,
        branchId: foundEmployee.branchId || '',
        roles: foundEmployee.roles || []
      });
      
      setError(null);
    } catch (err) {
      console.error('Error loading employee:', err);
      setError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.employeeNIN.trim()) errors.employeeNIN = 'Employee NIN is required';
    if (!formData.branchId.trim()) errors.branchId = 'Branch ID is required';
    if (!formData.hireDate) errors.hireDate = 'Hire date is required';
    if (formData.employeeSalary < 0) errors.employeeSalary = 'Salary cannot be negative';
    
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // NIN validation (basic format check)
    if (formData.employeeNIN && formData.employeeNIN.length < 8) {
      errors.employeeNIN = 'Employee NIN must be at least 8 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !employee) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Convert form data to employee update format
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        employeeNIN: formData.employeeNIN,
        employmentStatus: formData.employmentStatus,
        hireDate: new Date(formData.hireDate),
        employeeSalary: formData.employeeSalary,
        branchId: formData.branchId,
        roles: formData.roles,
        updatedAt: new Date()
      };
      
      await firestoreServices.employee.update(employee.id, updateData);
      
      setSuccess('Employee updated successfully');
      
      // Redirect after a brief delay
      setTimeout(() => {
        router.push(`/dashboard/hr/employees/${employee.id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addRole = () => {
    setFormData(prev => ({
      ...prev,
      roles: [...prev.roles, { jobTitle: '', baseSalary: 0 }]
    }));
  };

  const removeRole = (index: number) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index)
    }));
  };

  const updateRole = (index: number, field: 'jobTitle' | 'baseSalary', value: any) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.map((role, i) => 
        i === index ? { ...role, [field]: value } : role
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !employee) {
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
        <div className="mt-4">
          <Link 
            href="/dashboard/hr/employees"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href={`/dashboard/hr/employees/${employee?.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Employee
            </h1>
            <p className="text-gray-500">
              {employee ? `${employee.firstName} ${employee.lastName}` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {validationErrors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {validationErrors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Reset Password */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={async () => {
                    if(!formData.email) return alert('Employee email missing');
                    try {
                      await EmployeeDocumentsService // placeholder to import auth
                    } catch(e){ alert('Feature coming'); }
                  }}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Send Password Reset
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee NIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employeeNIN}
                  onChange={(e) => handleInputChange('employeeNIN', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.employeeNIN ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter employee NIN"
                />
                {validationErrors.employeeNIN && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.employeeNIN}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.branchId}
                  onChange={(e) => handleInputChange('branchId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.branchId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter branch ID"
                />
                {validationErrors.branchId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.branchId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Employment Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hire Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => handleInputChange('hireDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.hireDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.hireDate && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.hireDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Salary (UGX) <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.employeeSalary || ''}
                    onChange={(e) => handleInputChange('employeeSalary', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.employeeSalary ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Leave blank if not set"
                    min="0"
                  />
                  {validationErrors.employeeSalary && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.employeeSalary}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Roles & Responsibilities</h2>
            <button
              type="button"
              onClick={addRole}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Role
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.roles.map((role, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <select
                    value={role.jobTitle}
                    onChange={(e) => updateRole(index, 'jobTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select job title</option>
                    {jobTitles.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
                <div className="w-48">
                  <input
                    type="number"
                    value={role.baseSalary}
                    onChange={(e) => updateRole(index, 'baseSalary', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Base salary"
                    min="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRole(index)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {formData.roles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No roles assigned. Click "Add Role" to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/dashboard/hr/employees/${employee?.id}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 