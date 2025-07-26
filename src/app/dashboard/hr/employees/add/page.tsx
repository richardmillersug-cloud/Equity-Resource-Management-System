'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../../../../lib/firebase/auth';
import { firestoreServices } from '../../../../../lib/firebase/firestore-service';
import { photoService } from '../../../../../lib/services/photo-service';
import { EmployeeDocumentsService } from '../../../../../lib/firebase/employee-documents-service';
import { DocumentType } from '../../../../../lib/constants/document-types';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building,
  CreditCard,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Camera,
  Upload,
  X
} from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  employeeNIN: string;
  address: string;
  dateOfBirth: string;
  hireDate: string;
  employeeSalary: string;
  branchId: string;
  jobTitle: string;
  baseSalary: string;
  workingSection?: string;
  nextOfKinName: string;
  nextOfKinNIN: string;
  nextOfKinPhoneNumber: string;
  passportPhoto?: string;
  passportPhotoFilename?: string;
}

interface Branch {
  id: string;
  branchName: string;
}

const jobRoles = [
  { id: 'admin', title: 'Admin', defaultSalary: 1500000 },
  { id: 'hr', title: 'HR Manager', defaultSalary: 1300000 },
  { id: 'accountant', title: 'Accountant', defaultSalary: 1200000 },
  { id: 'purchasing-manager', title: 'Purchasing Manager', defaultSalary: 1100000 },
  { id: 'stock-manager', title: 'Stock Manager', defaultSalary: 1000000 },
  { id: 'receiver', title: 'Receiver', defaultSalary: 800000 },
  { id: 'supervisor', title: 'Supervisor', defaultSalary: 900000 },
  { id: 'managing-director', title: 'Managing Director', defaultSalary: 5000000 },
  { id: 'cashier', title: 'Cashier', defaultSalary: 220000 },
  { id: 'customer-service', title: 'Customer Service', defaultSalary: 150000 }
];

const supermarketSections = [
  'Fresh Produce',
  'Dairy & Chilled',
  'Meat & Poultry', 
  'Bakery',
  'Frozen Foods',
  'Beverages',
  'Snacks & Confectionery',
  'Personal Care',
  'Household Items',
  'Electronics',
  'Clothing & Accessories',
  'Pharmacy',
  'Customer Service Desk',
  'Returns & Exchanges',
  'General Floor'
];

export default function AddEmployeePage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Photo upload state
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // optional docs state
  const [chairmanLetter, setChairmanLetter] = useState<File|null>(null);
  const [employeeIdPdf, setEmployeeIdPdf] = useState<File|null>(null);
  const [nextOfKinIdPdf, setNextOfKinIdPdf] = useState<File|null>(null);
  const [applicationLetter, setApplicationLetter] = useState<File|null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    employeeNIN: '',
    address: '',
    dateOfBirth: '',
    hireDate: new Date().toISOString().split('T')[0],
    employeeSalary: '',
    branchId: '',
    jobTitle: '',
    baseSalary: '',
    workingSection: '',
    nextOfKinName: '',
    nextOfKinNIN: '',
    nextOfKinPhoneNumber: '',
    passportPhoto: '',
    passportPhotoFilename: ''
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    loadBranches();
  }, []);

  // Cleanup photo preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) {
        photoService.revokePreviewUrl(photoPreview);
      }
    };
  }, [photoPreview]);

  const loadBranches = async () => {
    try {
      // Default branches - you can load from Firestore if available
      setBranches([
        { id: 'kyengera', branchName: 'Kyengera Branch' },
        { id: 'main', branchName: 'Main Branch' },
        { id: 'ntinda', branchName: 'Ntinda Branch' },
        { id: 'entebbe', branchName: 'Entebbe Branch' },
        { id: 'jinja', branchName: 'Jinja Branch' }
      ]);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-fill salary when job role changes
    if (name === 'jobTitle') {
      const selectedRole = jobRoles.find(role => role.title === value);
      if (selectedRole) {
        setFormData(prev => ({ 
          ...prev, 
          baseSalary: selectedRole.defaultSalary.toString(),
          employeeSalary: selectedRole.defaultSalary.toString(),
          // Clear working section if not Customer Service
          workingSection: value === 'Customer Service' ? prev.workingSection : ''
        }));
      }
    }

    // Sync base salary with employee salary
    if (name === 'baseSalary') {
      setFormData(prev => ({ ...prev, employeeSalary: value }));
    }
  };

  // Photo upload handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);

    // Validate file
    const validation = photoService.validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error || 'Invalid file');
      return;
    }

    setSelectedPhoto(file);
    
    // Create preview
    const previewUrl = photoService.createPreviewUrl(file);
    setPhotoPreview(previewUrl);
  };

  const handlePhotoRemove = () => {
    if (photoPreview) {
      photoService.revokePreviewUrl(photoPreview);
    }
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setFormData(prev => ({ 
      ...prev, 
      passportPhoto: '', 
      passportPhotoFilename: '' 
    }));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDocSelect = (setter: React.Dispatch<React.SetStateAction<File|null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) setter(file);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.employeeNIN.trim()) newErrors.employeeNIN = 'Employee NIN is required';
    if (!formData.hireDate) newErrors.hireDate = 'Hire date is required';
    if (!formData.branchId) newErrors.branchId = 'Branch is required';
    if (!formData.jobTitle) newErrors.jobTitle = 'Job title is required';
    if (!formData.baseSalary) newErrors.baseSalary = 'Base salary is required';
    else if (isNaN(Number(formData.baseSalary)) || Number(formData.baseSalary) <= 0) {
      newErrors.baseSalary = 'Base salary must be a valid positive number';
    }
    
    // Validate working section for Customer Service employees
    if (formData.jobTitle === 'Customer Service' && !formData.workingSection) {
      newErrors.workingSection = 'Working section is required for Customer Service employees';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the form errors before submitting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Process photo upload if photo is selected
      let photoData = {};
      if (selectedPhoto) {
        setPhotoUploading(true);
        const photoResult = await photoService.handlePassportPhotoUpload(
          selectedPhoto,
          'temp_' + Date.now() // Temporary ID, will be replaced with actual employee ID
        );
        
        if (photoResult.success) {
          photoData = {
            passportPhoto: photoResult.photoUrl,
            passportPhotoFilename: photoResult.filename,
            passportPhotoUploadedAt: new Date()
          };
        } else {
          setPhotoUploading(false);
          throw new Error(`Photo upload failed: ${photoResult.error}`);
        }
        setPhotoUploading(false);
      }

      const signUpData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        employeeNIN: formData.employeeNIN,
        phone: formData.phone,
        branchId: formData.branchId,
        roles: [{
          jobRoleId: formData.jobTitle.toLowerCase().replace(/\s+/g, '-'),
          jobTitle: formData.jobTitle,
          baseSalary: Number(formData.baseSalary),
          description: `${formData.jobTitle} role`,
          assignedDate: new Date()
        }]
      };

      const result = await authService.signUp(signUpData);
      
      // Update employee with additional details
      const additionalData: any = {};
      if (formData.address) additionalData.address = formData.address;
      if (formData.dateOfBirth) additionalData.dateOfBirth = new Date(formData.dateOfBirth);
      if (formData.nextOfKinName) additionalData.nextOfKinName = formData.nextOfKinName;
      if (formData.nextOfKinNIN) additionalData.nextOfKinNIN = formData.nextOfKinNIN;
      if (formData.nextOfKinPhoneNumber) additionalData.nextOfKinPhoneNumber = formData.nextOfKinPhoneNumber;
      if (formData.workingSection) additionalData.workingSection = formData.workingSection;
      
      // Add photo data if available
      if (Object.keys(photoData).length > 0) {
        Object.assign(additionalData, photoData);
      }

      if (Object.keys(additionalData).length > 0) {
        await firestoreServices.employee.update(result.user.uid, additionalData);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/hr/employees');
      }, 2000);

    } catch (err: any) {
      console.error('Error creating employee:', err);
      setError(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">Employee Created Successfully!</h3>
            <p className="text-green-700">Redirecting to employee list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/hr/employees"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Employee</h1>
            <p className="text-gray-500">Create a new employee account and profile</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter password"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee NIN *
              </label>
              <input
                type="text"
                name="employeeNIN"
                value={formData.employeeNIN}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.employeeNIN ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter NIN"
              />
              {errors.employeeNIN && <p className="text-red-500 text-xs mt-1">{errors.employeeNIN}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hire Date *
              </label>
              <input
                type="date"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.hireDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.hireDate && <p className="text-red-500 text-xs mt-1">{errors.hireDate}</p>}
            </div>
          </div>

          {/* Passport Photo Upload Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Passport Photo
            </h3>
            
            <div className="flex items-start space-x-6">
              {/* Photo Preview */}
              <div className="flex-shrink-0">
                <div className="w-32 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={photoPreview}
                        alt="Passport photo preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handlePhotoRemove}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No photo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Photo
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Upload a passport-sized photo. Recommended size: 3.5cm × 4.5cm (JPEG/PNG, max 5MB)
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      onClick={triggerPhotoUpload}
                      disabled={photoUploading}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      {photoUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {photoUploading ? 'Processing...' : 'Choose Photo'}
                    </button>
                  </div>

                  {/* Photo Error */}
                  {photoError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="ml-2">
                          <p className="text-sm text-red-700">{photoError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Photo Success */}
                  {selectedPhoto && !photoError && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex">
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="ml-2">
                          <p className="text-sm text-green-700">
                            Photo selected: {selectedPhoto.name}
                          </p>
                          <p className="text-xs text-green-600">
                            {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Documents */}
        <h2 className="text-md font-semibold text-gray-900 mt-8 mb-4">Optional Documents (PDF)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chairman Letter (PDF)</label>
            <input type="file" accept="application/pdf" onChange={handleDocSelect(setChairmanLetter)} />
            {chairmanLetter && <p className="text-xs text-gray-600 mt-1">{chairmanLetter.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee National ID (PDF)</label>
            <input type="file" accept="application/pdf" onChange={handleDocSelect(setEmployeeIdPdf)} />
            {employeeIdPdf && <p className="text-xs text-gray-600 mt-1">{employeeIdPdf.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Next-of-Kin National ID (PDF)</label>
            <input type="file" accept="application/pdf" onChange={handleDocSelect(setNextOfKinIdPdf)} />
            {nextOfKinIdPdf && <p className="text-xs text-gray-600 mt-1">{nextOfKinIdPdf.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application Letter (PDF)</label>
            <input type="file" accept="application/pdf" onChange={handleDocSelect(setApplicationLetter)} />
            {applicationLetter && <p className="text-xs text-gray-600 mt-1">{applicationLetter.name}</p>}
          </div>
        </div>

        {/* Employment Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="h-5 w-5" />
            Employment Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
              </label>
              <select
                name="branchId"
                value={formData.branchId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.branchId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                ))}
              </select>
              {errors.branchId && <p className="text-red-500 text-xs mt-1">{errors.branchId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <select
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.jobTitle ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a job title</option>
                {jobRoles.map(role => (
                  <option key={role.id} value={role.title}>{role.title}</option>
                ))}
              </select>
              {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Salary (UGX) *
              </label>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.baseSalary ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter base salary"
                min="0"
              />
              {errors.baseSalary && <p className="text-red-500 text-xs mt-1">{errors.baseSalary}</p>}
            </div>

            {/* Working Section - Only shown for Customer Service */}
            {formData.jobTitle === 'Customer Service' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Section *
                </label>
                <select
                  name="workingSection"
                  value={formData.workingSection}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.workingSection ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select working section</option>
                  {supermarketSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
                {errors.workingSection && <p className="text-red-500 text-xs mt-1">{errors.workingSection}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Select the supermarket section where this employee will primarily work
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Next of Kin Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Next of Kin Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next of Kin Name
              </label>
              <input
                type="text"
                name="nextOfKinName"
                value={formData.nextOfKinName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter next of kin name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next of Kin NIN
              </label>
              <input
                type="text"
                name="nextOfKinNIN"
                value={formData.nextOfKinNIN}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter next of kin NIN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next of Kin Phone
              </label>
              <input
                type="tel"
                name="nextOfKinPhoneNumber"
                value={formData.nextOfKinPhoneNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter next of kin phone"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/dashboard/hr/employees"
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || photoUploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {(loading || photoUploading) ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {photoUploading ? 'Processing Photo...' : loading ? 'Creating...' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
} 