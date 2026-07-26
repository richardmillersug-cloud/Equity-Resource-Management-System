'use client';

import React, { useState, useEffect } from 'react';
import { authService, SignUpData, AuthError } from '@/lib/firebase/auth';
import { firestoreServices } from '@/lib/firebase/firestore-service';
import { JobRole, Branch } from '@/lib/firebase/models';
import { 
  Eye, EyeOff, Mail, Lock, User, Phone, MapPin, 
  Building, Shield, AlertCircle, Loader2, CheckCircle 
} from 'lucide-react';

interface SignupFormProps {
  onSuccess?: (user?: import('@/lib/firebase/auth').AuthUser) => void;
  onSwitchToLogin?: () => void;
  /** When true, only Admin/MD create accounts and stay signed in */
  managedCreation?: boolean;
  createdBy?: { uid: string; name?: string } | null;
}

export default function SignupForm({
  onSuccess,
  onSwitchToLogin,
  managedCreation = false,
  createdBy = null,
}: SignupFormProps) {
  const [formData, setFormData] = useState<SignUpData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    employeeNIN: '',
    phone: '',
    branchId: 'kyengera', // Default to Kyengera branch
    roles: []
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Data for dropdowns
  const [branches, setBranches] = useState<Branch[]>([]);
  const [defaultBranches] = useState([
    { id: 'kyengera', branchName: 'Kyengera Branch', address: 'Kyengera Town' },
    { id: 'main', branchName: 'Main Branch', address: 'Kampala Central' },
    { id: 'ntinda', branchName: 'Ntinda Branch', address: 'Ntinda Shopping Center' },
    { id: 'entebbe', branchName: 'Entebbe Branch', address: 'Entebbe Road' },
    { id: 'jinja', branchName: 'Jinja Branch', address: 'Jinja Main Street' }
  ]);
  const [availableRoles] = useState<JobRole[]>([
    { 
      jobRoleId: 'managing-director',
      jobTitle: 'Managing Director', 
      baseSalary: 8000000,
      description: 'Executive leadership with comprehensive analytics access and strategic oversight across all business operations',
      assignedDate: new Date() as any
    },
    { 
      jobRoleId: 'admin',
      jobTitle: 'Admin', 
      baseSalary: 1500000,
      description: 'System administrator with full access to all features',
      assignedDate: new Date() as any
    },
    { 
      jobRoleId: 'hr',
      jobTitle: 'HR Manager', 
      baseSalary: 1300000,
      description: 'Manages human resources, employee relations, and payroll',
      assignedDate: new Date() as any
    },
    { 
      jobRoleId: 'accountant',
      jobTitle: 'Accountant', 
      baseSalary: 1200000,
      description: 'Handles all accounting and financial operations',
      assignedDate: new Date() as any
    },
    { 
      jobRoleId: 'purchasing-manager',
      jobTitle: 'Purchasing Manager', 
      baseSalary: 1100000,
      description: 'Manages purchasing operations and supplier relationships',
      assignedDate: new Date() as any
    },
    { 
      jobRoleId: 'stock-manager',
      jobTitle: 'Stock Manager', 
      baseSalary: 800000,
      description: 'Manages inventory and stock levels',
      assignedDate: new Date() as any
    },
    { 
      jobRoleId: 'receiver',
      jobTitle: 'Receiver', 
      baseSalary: 600000,
      description: 'Receives and processes incoming goods',
      assignedDate: new Date() as any
    }
  ]);

  // Load branches on component mount
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branchList = await firestoreServices.branch.getAll();
        if (branchList.length > 0) {
          setBranches(branchList);
        } else {
          // Use default branches if no branches found in Firestore
          setBranches(defaultBranches as any);
        }
      } catch (error) {
        console.error('Error loading branches:', error);
        // Fallback to default branches on error
        setBranches(defaultBranches as any);
      }
    };
    loadBranches();
  }, [defaultBranches]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleRoleChange = (role: JobRole, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r.jobTitle !== role.jobTitle)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== confirmPassword) return 'Passwords do not match';
    if (!formData.employeeNIN.trim()) return 'Employee NIN is required';
    if (formData.employeeNIN.length !== 14) return 'Employee NIN must be 14 characters';
    if (!formData.branchId) return 'Please select a branch';
    if (formData.roles.length === 0) return 'Please select at least one role';
    
    // Validate that roles have proper structure
    for (const role of formData.roles) {
      if (!role.jobRoleId || !role.jobTitle || role.baseSalary == null || role.baseSalary < 0) {
        return 'Invalid role data. Please refresh and try again.';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (managedCreation) {
        if (!createdBy?.uid) {
          throw { message: 'You must be signed in as Admin or Managing Director to create accounts.' };
        }
        await authService.createManagedAccount(formData, createdBy);
      } else {
        await authService.signUp(formData);
      }
      setSuccess(true);
      if (managedCreation) {
        onSuccess?.();
      }
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Account Created!</h2>
            <p className="text-gray-600 mt-2">
              {managedCreation
                ? 'The account was created successfully. They can sign in with the email and password you set.'
                : 'Your account has been created successfully. Please check your email to verify your account.'}
            </p>
          </div>

          {managedCreation ? (
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setConfirmPassword('');
                setFormData({
                  email: '',
                  password: '',
                  firstName: '',
                  lastName: '',
                  employeeNIN: '',
                  phone: '',
                  branchId: 'kyengera',
                  roles: [],
                });
              }}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create another account
            </button>
          ) : (
            <button
              onClick={onSwitchToLogin}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {!managedCreation && (
          <div className="flex justify-center mb-6">
            <img src="/equity-logo.png" alt="Equity Logo" className="h-16 w-auto object-contain" />
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">
            {managedCreation
              ? 'Register a user for the retail management system'
              : 'Join the retail management system'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter first name"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter last name"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter phone number"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Employee Information */}
          <div>
            <label htmlFor="employeeNIN" className="block text-sm font-medium text-gray-700 mb-2">
              Employee NIN
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="employeeNIN"
                name="employeeNIN"
                value={formData.employeeNIN}
                onChange={handleInputChange}
                required
                maxLength={14}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter 14-digit NIN"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">National Identification Number (14 digits)</p>
          </div>

          {/* Branch Selection */}
          <div>
            <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                id="branchId"
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none"
                disabled={isLoading}
              >
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName} - {branch.address}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Job Roles
            </label>
            <div className="space-y-2">
              {availableRoles.map(role => (
                <label key={role.jobTitle} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.roles.some(r => r.jobTitle === role.jobTitle)}
                    onChange={(e) => handleRoleChange(role, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{role.jobTitle}</div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Select the roles that apply to your position</p>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Confirm password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={isLoading}
              >
                Sign in here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 