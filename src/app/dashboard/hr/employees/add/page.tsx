'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../../../../lib/firebase/auth';
import { firestoreServices } from '../../../../../lib/firebase/firestore-service';
import { Timestamp } from 'firebase/firestore';
import { photoService } from '../../../../../lib/services/photo-service';
import { CompanyDocumentsService, CompanyDocument } from '../../../../../lib/services/company-documents';
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
  X,
  FileText,
  Download,
  Eye,
  Printer,
  Banknote,
  Smartphone,
  Landmark,
  Receipt,
  ClipboardList,
  Shield,
  Settings,
  File
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
  // Payment Information
  paymentMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash' | 'Cheque';
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  mobileMoneyProvider?: string;
  mobileMoneyNumber?: string;
  // Allowances
  transportAllowance: string;
  housingAllowance: string;
  medicalAllowance: string;
  mealAllowance: string;
  communicationAllowance: string;
  // Deductions
  taxExempt: boolean;
  nssfOptOut: boolean;
  healthInsuranceOptOut: boolean;
}

interface DocumentUpload {
  id: string;
  name: string;
  file: File | null;
  signed: boolean;
  uploadDate?: Date;
  status: 'pending' | 'uploaded' | 'signed';
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  uploadProgress?: number;
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

const mobileMoneyProviders = [
  'MTN Mobile Money',
  'Airtel Money',
  'Africell Money',
  'Telesom ZAAD'
];

const ugandanBanks = [
  'Stanbic Bank Uganda',
  'Centenary Bank',
  'DFCU Bank',
  'Bank of Africa Uganda',
  'Standard Chartered Bank',
  'Absa Bank Uganda',
  'Equity Bank Uganda',
  'KCB Bank Uganda',
  'Housing Finance Bank',
  'Orient Bank',
  'GT Bank Uganda',
  'United Bank for Africa',
  'Tropical Bank',
  'Bank of Baroda Uganda',
  'Citibank Uganda',
  'Development Bank of Uganda',
  'Post Bank Uganda',
  'NC Bank Uganda',
  'Finance Trust Bank',
  'Opportunity Bank Uganda'
];

export default function AddEmployeePage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Photo upload state
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document management state
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [documentUploads, setDocumentUploads] = useState<DocumentUpload[]>([]);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<CompanyDocument | null>(null);
  
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
    passportPhotoFilename: '',
    // Payment Information
    paymentMethod: 'Bank Transfer',
    bankAccountNumber: '',
    bankName: '',
    bankBranch: '',
    mobileMoneyProvider: '',
    mobileMoneyNumber: '',
    // Allowances
    transportAllowance: '100000',
    housingAllowance: '',
    medicalAllowance: '50000',
    mealAllowance: '30000',
    communicationAllowance: '25000',
    // Deductions
    taxExempt: false,
    nssfOptOut: false,
    healthInsuranceOptOut: false
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    loadBranches();
    loadCompanyDocuments();
  }, []);

  // Cleanup photo preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) {
        photoService.revokePreviewUrl(photoPreview);
      }
    };
  }, [photoPreview]);

  // Calculate housing allowance when salary changes
  useEffect(() => {
    if (formData.baseSalary) {
      const salary = Number(formData.baseSalary);
      const housingAllowance = Math.round(salary * 0.15); // 15% of base salary
      setFormData(prev => ({ ...prev, housingAllowance: housingAllowance.toString() }));
    }
  }, [formData.baseSalary]);

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

  const loadCompanyDocuments = () => {
    try {
      const docs = CompanyDocumentsService.getDocuments();
      setCompanyDocuments(docs);
      
      // Initialize document upload state
      const uploads: DocumentUpload[] = docs.map(doc => ({
        id: doc.id,
        name: doc.title,
        file: null,
        signed: false,
        status: 'pending'
      }));
      setDocumentUploads(uploads);
    } catch (err) {
      console.error('Error loading company documents:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
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

  // Document handlers
  const handleDocumentView = (document: CompanyDocument) => {
    setSelectedDocument(document);
    setShowDocumentPreview(true);
  };

  const handleDocumentPrint = (document: CompanyDocument) => {
    const html = CompanyDocumentsService.generatePrintableHTML(document);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDocumentSigned = (documentId: string) => {
    setDocumentUploads(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, signed: true, status: 'signed' as const, uploadDate: new Date() }
          : doc
      )
    );
  };

  const handleDocumentFileSelect = (documentId: string, file: File) => {
    if (!file) return;

    // Validate file type (PDF, images, or documents)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload PDF, Word document, or image files only');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Update document upload state
    setDocumentUploads(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              file: file,
              status: 'uploaded' as const,
              uploadDate: new Date(),
              uploadedFileName: file.name,
              uploadProgress: 0
            }
          : doc
      )
    );

    // Simulate upload progress
    simulateUploadProgress(documentId);
  };

  const simulateUploadProgress = (documentId: string) => {
    const interval = setInterval(() => {
      setDocumentUploads(prev => 
        prev.map(doc => {
          if (doc.id === documentId) {
            const newProgress = (doc.uploadProgress || 0) + 10;
            if (newProgress >= 100) {
              clearInterval(interval);
              return { ...doc, uploadProgress: 100 };
            }
            return { ...doc, uploadProgress: newProgress };
          }
          return doc;
        })
      );
    }, 200);
  };

  const handleDocumentRemove = (documentId: string) => {
    setDocumentUploads(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              file: null,
              status: 'pending' as const,
              uploadDate: undefined,
              uploadedFileName: undefined,
              uploadedFileUrl: undefined,
              uploadProgress: undefined,
              signed: false
            }
          : doc
      )
    );
  };

  const getDocumentIcon = (categoryId: string) => {
    const icons = {
      'employee-rules-regulations': Shield,
      'employment-contract': File,
      'employee-information-form': ClipboardList,
      'supermarket-operations-mode': Settings
    };
    return icons[categoryId as keyof typeof icons] || FileText;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Step 1: Personal Information
    if (currentStep === 1) {
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.employeeNIN.trim()) newErrors.employeeNIN = 'Employee NIN is required';
    if (!formData.hireDate) newErrors.hireDate = 'Hire date is required';
    }

    // Step 2: Employment Information
    if (currentStep === 2) {
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
    }

    // Step 3: Payment Information
    if (currentStep === 3) {
      if (formData.paymentMethod === 'Bank Transfer') {
        if (!formData.bankAccountNumber) newErrors.bankAccountNumber = 'Bank account number is required';
        if (!formData.bankName) newErrors.bankName = 'Bank name is required';
        if (!formData.bankBranch) newErrors.bankBranch = 'Bank branch is required';
      }
      if (formData.paymentMethod === 'Mobile Money') {
        if (!formData.mobileMoneyProvider) newErrors.mobileMoneyProvider = 'Mobile money provider is required';
        if (!formData.mobileMoneyNumber) newErrors.mobileMoneyNumber = 'Mobile money number is required';
      }
    }

    // Step 4: Documents Validation
    if (currentStep === 4) {
      const requiredDocs = companyDocuments.filter(doc => doc.isRequired);
      const missingRequiredDocs = requiredDocs.filter(doc => {
        const upload = documentUploads.find(u => u.id === doc.id);
        return !upload?.signed && !upload?.file;
      });

      if (missingRequiredDocs.length > 0) {
        setError(`Please upload or mark as signed the following required documents: ${missingRequiredDocs.map(d => d.title).join(', ')}`);
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
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
          assignedDate: Timestamp.fromDate(new Date())
        }]
      };

      const result = await authService.signUp(signUpData);
      
      // Update employee with additional details
      const additionalData: any = {
        // Personal Information
        address: formData.address,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
        nextOfKinName: formData.nextOfKinName,
        nextOfKinNIN: formData.nextOfKinNIN,
        nextOfKinPhoneNumber: formData.nextOfKinPhoneNumber,
        workingSection: formData.workingSection || null,
        
        // Payment Information
        paymentMethod: formData.paymentMethod,
        bankDetails: formData.paymentMethod === 'Bank Transfer' ? {
          accountNumber: formData.bankAccountNumber,
          bankName: formData.bankName,
          branch: formData.bankBranch
        } : null,
        mobileMoneyDetails: formData.paymentMethod === 'Mobile Money' ? {
          provider: formData.mobileMoneyProvider,
          phoneNumber: formData.mobileMoneyNumber
        } : null,
        
        // Allowances
        allowances: {
          transport: Number(formData.transportAllowance) || 0,
          housing: Number(formData.housingAllowance) || 0,
          medical: Number(formData.medicalAllowance) || 0,
          meal: Number(formData.mealAllowance) || 0,
          communication: Number(formData.communicationAllowance) || 0
        },
        
        // Deduction preferences
        deductionPreferences: {
          taxExempt: formData.taxExempt,
          nssfOptOut: formData.nssfOptOut,
          healthInsuranceOptOut: formData.healthInsuranceOptOut
        },
        
        // Document completion status
        documentsStatus: documentUploads.reduce((acc, doc) => {
          acc[doc.id] = {
            status: doc.status,
            signed: doc.signed,
            signedDate: doc.uploadDate || null,
            fileUploaded: !!doc.file,
            uploadedFileName: doc.uploadedFileName || null,
            uploadedFileUrl: doc.uploadedFileUrl || null,
            uploadDate: doc.uploadDate || null
          };
          return acc;
        }, {} as any),

        // Uploaded documents summary
        uploadedDocuments: documentUploads
          .filter(doc => doc.file)
          .map(doc => ({
            documentId: doc.id,
            documentName: doc.name,
            fileName: doc.uploadedFileName,
            fileUrl: doc.uploadedFileUrl,
            uploadDate: doc.uploadDate,
            signed: doc.signed
          })),
        
        // Onboarding completion
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingCompletedBy: 'hr-admin' // This would be the current user
      };
      
      // Add photo data if available
      if (Object.keys(photoData).length > 0) {
        Object.assign(additionalData, photoData);
      }

      await firestoreServices.employee.update(result.user.uid, additionalData);

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
            <h3 className="text-lg font-semibold text-green-900 mb-2">Employee Onboarding Complete!</h3>
            <p className="text-green-700 mb-2">Employee account created successfully with all documents and payment details.</p>
            <p className="text-green-600 text-sm">Redirecting to employee list...</p>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, name: 'Personal Info', icon: User },
    { id: 2, name: 'Employment', icon: Building },
    { id: 3, name: 'Payment & Salary', icon: CreditCard },
    { id: 4, name: 'Documents', icon: FileText }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
            <h1 className="text-2xl font-bold text-gray-900">Employee Onboarding</h1>
            <p className="text-gray-500">Complete employee registration with documents and payment setup</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isActive ? 'bg-blue-500 border-blue-500 text-white' :
                  'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
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
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
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

              {/* Next of Kin Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Next of Kin Information
                </h3>
                
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
            </div>
          </div>
        )}

        {/* Step 2: Employment Information */}
        {currentStep === 2 && (
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
                <div>
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
        )}

        {/* Step 3: Payment & Salary Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Payment Method */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
          </h2>
          
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                  { value: 'Bank Transfer', icon: Landmark, label: 'Bank Transfer' },
                  { value: 'Mobile Money', icon: Smartphone, label: 'Mobile Money' },
                  { value: 'Cash', icon: Banknote, label: 'Cash' },
                  { value: 'Cheque', icon: Receipt, label: 'Cheque' }
                ].map(({ value, icon: Icon, label }) => (
                  <label key={value} className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-colors ${
                    formData.paymentMethod === value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <Icon className={`h-6 w-6 ${formData.paymentMethod === value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${formData.paymentMethod === value ? 'text-blue-900' : 'text-gray-700'}`}>
                      {label}
                    </span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={value}
                      checked={formData.paymentMethod === value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>

              {/* Bank Transfer Details */}
              {formData.paymentMethod === 'Bank Transfer' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <select
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.bankName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select bank</option>
                      {ugandanBanks.map(bank => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                    {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
              </label>
              <input
                type="text"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.bankAccountNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter account number"
                    />
                    {errors.bankAccountNumber && <p className="text-red-500 text-xs mt-1">{errors.bankAccountNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch *
              </label>
              <input
                type="text"
                      name="bankBranch"
                      value={formData.bankBranch}
                onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.bankBranch ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter bank branch"
                    />
                    {errors.bankBranch && <p className="text-red-500 text-xs mt-1">{errors.bankBranch}</p>}
            </div>
                </div>
              )}

              {/* Mobile Money Details */}
              {formData.paymentMethod === 'Mobile Money' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider *
                    </label>
                    <select
                      name="mobileMoneyProvider"
                      value={formData.mobileMoneyProvider}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.mobileMoneyProvider ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select provider</option>
                      {mobileMoneyProviders.map(provider => (
                        <option key={provider} value={provider}>{provider}</option>
                      ))}
                    </select>
                    {errors.mobileMoneyProvider && <p className="text-red-500 text-xs mt-1">{errors.mobileMoneyProvider}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
              </label>
              <input
                type="tel"
                      name="mobileMoneyNumber"
                      value={formData.mobileMoneyNumber}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.mobileMoneyNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.mobileMoneyNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileMoneyNumber}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Allowances Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Allowances Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport Allowance (UGX)
                  </label>
                  <input
                    type="number"
                    name="transportAllowance"
                    value={formData.transportAllowance}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
              />
            </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Housing Allowance (UGX)
                  </label>
                  <input
                    type="number"
                    name="housingAllowance"
                    value={formData.housingAllowance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated as 15% of base salary</p>
          </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Allowance (UGX)
                  </label>
                  <input
                    type="number"
                    name="medicalAllowance"
                    value={formData.medicalAllowance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
        </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Allowance (UGX)
                  </label>
                  <input
                    type="number"
                    name="mealAllowance"
                    value={formData.mealAllowance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Communication Allowance (UGX)
                  </label>
                  <input
                    type="number"
                    name="communicationAllowance"
                    value={formData.communicationAllowance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Total Allowances Display */}
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Total Monthly Allowances:</span>
                  <span className="text-lg font-bold text-green-700">
                    UGX {(
                      Number(formData.transportAllowance || 0) +
                      Number(formData.housingAllowance || 0) +
                      Number(formData.medicalAllowance || 0) +
                      Number(formData.mealAllowance || 0) +
                      Number(formData.communicationAllowance || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Deduction Preferences */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Deduction Preferences
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="taxExempt"
                    checked={formData.taxExempt}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Tax Exempt</span>
                    <p className="text-sm text-gray-500">Employee is exempt from income tax deductions</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="nssfOptOut"
                    checked={formData.nssfOptOut}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">NSSF Opt-Out</span>
                    <p className="text-sm text-gray-500">Employee opts out of NSSF contributions</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="healthInsuranceOptOut"
                    checked={formData.healthInsuranceOptOut}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Health Insurance Opt-Out</span>
                    <p className="text-sm text-gray-500">Employee opts out of health insurance deductions</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Company Documents & Onboarding
            </h2>
            
            <p className="text-gray-600 mb-6">
              Upload signed documents and confirm completion of required company documents for this employee. 
              You can view and print document templates, upload actual signed files, or mark documents as signed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {companyDocuments.map((document) => {
                const upload = documentUploads.find(u => u.id === document.id);
                const IconComponent = getDocumentIcon(document.id);
                
                return (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{document.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{document.description}</p>
                        
                        {/* Document Actions */}
                        <div className="flex items-center gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() => handleDocumentView(document)}
                            className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDocumentPrint(document)}
                            className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:bg-gray-50 rounded text-sm transition-colors"
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </button>
                        </div>

                        {/* File Upload Section */}
                        <div className="mb-4">
                          {upload?.file ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-900">{upload.uploadedFileName}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDocumentRemove(document.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              
                              {upload.uploadProgress !== undefined && upload.uploadProgress < 100 && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${upload.uploadProgress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 mb-2">Upload signed document</p>
                              <input
                                type="file"
                                id={`file-${document.id}`}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocumentFileSelect(document.id, file);
                                }}
                                className="hidden"
                              />
                              <label
                                htmlFor={`file-${document.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                              >
                                <Upload className="h-4 w-4" />
                                Choose File
                              </label>
                              <p className="text-xs text-gray-500 mt-1">PDF, Word, or Image files (max 10MB)</p>
                            </div>
                          )}
                        </div>

                        {/* Signing Status */}
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={upload?.signed || false}
                              onChange={() => handleDocumentSigned(document.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Document Signed
                            </span>
                          </label>
                          
                          <div className="flex items-center gap-2">
                            {upload?.file && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                File Uploaded
                              </span>
                            )}
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              upload?.signed || upload?.file
                                ? 'bg-green-100 text-green-800' 
                                : document.isRequired
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {upload?.signed && upload?.file 
                                ? 'Complete' 
                                : upload?.signed 
                                  ? 'Signed' 
                                  : upload?.file 
                                    ? 'Uploaded'
                                    : document.isRequired 
                                      ? 'Required' 
                                      : 'Optional'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Document Completion Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Document Summary</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  <strong>Files Uploaded:</strong> {documentUploads.filter(d => d.file).length} of {companyDocuments.length} documents
                </p>
                <p>
                  <strong>Documents Signed:</strong> {documentUploads.filter(d => d.signed).length} of {companyDocuments.length} documents
                </p>
                <p>
                  <strong>Required Documents Complete:</strong> {documentUploads.filter(d => {
                    const doc = companyDocuments.find(c => c.id === d.id);
                    return doc?.isRequired && (d.signed || d.file);
                  }).length} of {companyDocuments.filter(d => d.isRequired).length}
                </p>
                <p>
                  <strong>Total Completion:</strong> {documentUploads.filter(d => d.signed || d.file).length} of {companyDocuments.length} documents
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="flex items-center gap-2 px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr/employees"
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </Link>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                Next
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            ) : (
          <button
            type="submit"
                disabled={loading || photoUploading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
                {(loading || photoUploading) ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
                {photoUploading ? 'Processing...' : loading ? 'Creating...' : 'Complete Onboarding'}
          </button>
            )}
          </div>
        </div>
      </form>

      {/* Document Preview Modal */}
      {showDocumentPreview && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.title}</h3>
                  <p className="text-sm text-gray-600">Company Document Preview</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDocumentPrint(selectedDocument)}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowDocumentPreview(false)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedDocument.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 