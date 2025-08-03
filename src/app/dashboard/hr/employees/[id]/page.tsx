'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmployeeService } from '../../../../../lib/firebase/firestore-service';
import { EmployeeDocumentsService, EmployeeDocument } from '../../../../../lib/firebase/employee-documents-service';
import PDFViewer, { PDFViewerModal, PDFPreview } from '../../../../../components/ui/PDFViewer';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building, 
  User,
  Badge,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Upload,
  Download,
  Eye,
  Plus,
  Folder,
  Calendar as CalendarIcon,
  Tag,
  Lock,
  Globe,
  Shield
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
  updatedAt?: any;
}

export default function EmployeeViewPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Document management state
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');

  useEffect(() => {
    if (params.id) {
      loadEmployee(params.id as string);
      loadDocuments(params.id as string);
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
      setError(null);
    } catch (err) {
      console.error('Error loading employee:', err);
      setError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (employeeId: string) => {
    try {
      setDocumentsLoading(true);
      const employeeDocuments = await EmployeeDocumentsService.getEmployeeDocuments(employeeId);
      setDocuments(employeeDocuments);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employee) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.firstName} ${employee.lastName}?\n\n` +
      `This will permanently remove:\n` +
      `- Employee record and personal information\n` +
      `- Employment history and documents\n` +
      `- All associated HR data\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    // Additional confirmation for critical action
    const employeeFullName = `${employee.firstName} ${employee.lastName}`;
    const userInput = prompt(`Please type "${employeeFullName}" to confirm deletion:`);
    
    if (userInput !== employeeFullName) {
      if (userInput !== null) {
        alert('Deletion cancelled. The name entered did not match.');
      }
      return;
    }
    
    try {
      const { firestoreServices } = await import('../../../../../lib/firebase/firestore-service');
      await firestoreServices.employee.delete(employee.id);
      router.push('/dashboard/hr/employees');
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(salary);
  };

  const handleDocumentUpload = async (file: File, documentType: EmployeeDocument['documentType'], metadata: any) => {
    if (!employee) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const uploadedDocument = await EmployeeDocumentsService.uploadDocument(
        employee.id,
        `${employee.firstName} ${employee.lastName}`,
        file,
        documentType,
        'HR Manager', // In a real app, this would be the current user
        metadata,
        (progress) => {
          setUploadProgress(progress.progress);
        }
      );
      
      // Refresh documents
      await loadDocuments(employee.id);
      setShowUploadModal(false);
      setUploadProgress(0);
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await EmployeeDocumentsService.deleteDocument(documentId);
      await loadDocuments(employee!.id);
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (type: EmployeeDocument['documentType']) => {
    const labels = {
      employment_contract: 'Employment Contract',
      operations_manual: 'Operations Manual',
      employment_form: 'Employment Form',
      policy_document: 'Policy Document',
      training_certificate: 'Training Certificate',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getDocumentTypeIcon = (type: EmployeeDocument['documentType']) => {
    const icons = {
      employment_contract: FileText,
      operations_manual: Folder,
      employment_form: FileText,
      policy_document: Shield,
      training_certificate: Badge,
      other: FileText
    };
    return icons[type] || FileText;
  };

  const getAccessLevelIcon = (level: EmployeeDocument['accessLevel']) => {
    const icons = {
      public: Globe,
      confidential: Lock,
      restricted: Shield
    };
    return icons[level] || Lock;
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

  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Employee not found</h3>
          <p className="text-gray-500 mb-4">The employee you're looking for doesn't exist.</p>
          <Link 
            href="/dashboard/hr/employees"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
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
            href="/dashboard/hr/employees"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-500">{employee.roles?.[0]?.jobTitle || 'Employee'}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
            employee.employmentStatus === 'Active' 
              ? 'text-green-800 bg-green-100' 
              : employee.employmentStatus === 'Inactive'
              ? 'text-yellow-800 bg-yellow-100'
              : 'text-red-800 bg-red-100'
          }`}>
            {employee.employmentStatus}
          </span>
          
          <Link
            href={`/dashboard/hr/employees/${employee.id}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
              {documents.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {documents.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <p className="text-gray-900">{employee.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <p className="text-gray-900">{employee.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{employee.email}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{employee.phone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee NIN</label>
                  <div className="flex items-center space-x-2">
                    <Badge className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{employee.employeeNIN}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch ID</label>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{employee.branchId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(employee.hireDate)}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatSalary(employee.employeeSalary)}</p>
                  </div>
                </div>
                {employee.workingSection && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Working Section</label>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <p className="text-gray-900">{employee.workingSection}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(employee.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Roles & Summary */}
          <div className="space-y-6">
            {/* Employee Photo */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Photo</h2>
              <div className="flex justify-center">
                <div className="w-32 h-40 bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                  {employee.passportPhoto ? (
                    <img
                      src={employee.passportPhoto}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No photo</p>
                    </div>
                  )}
                </div>
              </div>
              {employee.passportPhoto && employee.passportPhotoFilename && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-600">
                    {employee.passportPhotoFilename}
                  </p>
                  {employee.passportPhotoUploadedAt && (
                    <p className="text-xs text-gray-500">
                      Uploaded: {formatDate(employee.passportPhotoUploadedAt)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Roles */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles & Responsibilities</h2>
              <div className="space-y-3">
                {employee.roles && employee.roles.length > 0 ? (
                  employee.roles.map((role, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900">{role.jobTitle}</h3>
                      <p className="text-sm text-gray-600">{formatSalary(role.baseSalary)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No roles assigned</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('documents')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
                >
                  <FileText className="h-4 w-4" />
                  View Documents
                </button>
                <Link
                  href={`/dashboard/hr/employees/${employee.id}/edit`}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
                >
                  <Edit className="h-4 w-4" />
                  Edit Employee
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Documents Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Employee Documents</h2>
                <p className="text-gray-500 mt-1">
                  Manage employment contracts, operations manuals, and employment forms
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Upload Document
              </button>
            </div>

            {/* Document Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Employment Contracts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {documents.filter(d => d.documentType === 'employment_contract').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Folder className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Operations Manuals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {documents.filter(d => d.documentType === 'operations_manual').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Employment Forms</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {documents.filter(d => d.documentType === 'employment_form').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Documents</h3>
              
              {documentsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
                  <p className="text-gray-500 mb-4">
                    Upload employment contracts, operations manuals, and other documents for this employee.
                  </p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Upload First Document
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((document) => {
                    const TypeIcon = getDocumentTypeIcon(document.documentType);
                    const AccessIcon = getAccessLevelIcon(document.accessLevel);
                    
                    return (
                      <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <TypeIcon className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {document.documentName}
                                </h4>
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {getDocumentTypeLabel(document.documentType)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  {formatDate(document.uploadDate)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <AccessIcon className="h-4 w-4" />
                                  {document.accessLevel}
                                </div>
                                <span>{formatFileSize(document.fileSize)}</span>
                              </div>
                              {document.description && (
                                <p className="text-sm text-gray-600 mt-2">{document.description}</p>
                              )}
                              {document.tags.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Tag className="h-4 w-4 text-gray-400" />
                                  <div className="flex gap-1">
                                    {document.tags.map((tag, index) => (
                                      <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedDocument(document);
                                setShowPDFModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Document"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <a
                              href={document.downloadUrl}
                              download={document.documentName}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Download Document"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDocumentDelete(document.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete Document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          employee={employee}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleDocumentUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* PDF Viewer Modal */}
      {showPDFModal && selectedDocument && (
        <PDFViewerModal
          isOpen={showPDFModal}
          onClose={() => {
            setShowPDFModal(false);
            setSelectedDocument(null);
          }}
          documentUrl={selectedDocument.downloadUrl}
          documentName={selectedDocument.documentName}
        />
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
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{employee.email}</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. All employee data, including:
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>Personal information</li>
                  <li>Employment history</li>
                  <li>Salary records</li>
                  <li>Role assignments</li>
                </ul>
                <p className="text-sm text-red-800 mt-2">will be permanently deleted.</p>
              </div>
              
              <p className="text-sm text-gray-600">
                Are you absolutely sure you want to delete this employee?
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
                onClick={handleDeleteEmployee}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Document Upload Modal Component
interface DocumentUploadModalProps {
  employee: Employee | null;
  onClose: () => void;
  onUpload: (file: File, documentType: EmployeeDocument['documentType'], metadata: any) => void;
  isUploading: boolean;
  uploadProgress: number;
}

function DocumentUploadModal({ employee, onClose, onUpload, isUploading, uploadProgress }: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<EmployeeDocument['documentType']>('employment_contract');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [accessLevel, setAccessLevel] = useState<EmployeeDocument['accessLevel']>('confidential');
  const [expiryDate, setExpiryDate] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !employee) return;

    const metadata = {
      description,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      accessLevel,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined
    };

    onUpload(selectedFile, documentType, metadata);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isUploading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select PDF Document
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center space-x-4">
                    <FileText className="h-12 w-12 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop a PDF file here, or click to select
                    </p>
                    <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                >
                  Choose File
                </label>
              </div>
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as EmployeeDocument['documentType'])}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="employment_contract">Employment Contract</option>
                <option value="operations_manual">Operations Manual</option>
                <option value="employment_form">Employment Form</option>
                <option value="policy_document">Policy Document</option>
                <option value="training_certificate">Training Certificate</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Access Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as EmployeeDocument['accessLevel'])}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="confidential">Confidential</option>
                <option value="public">Public</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the document..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Comma-separated tags (e.g., contract, 2024, permanent)"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uploading...</span>
                  <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 