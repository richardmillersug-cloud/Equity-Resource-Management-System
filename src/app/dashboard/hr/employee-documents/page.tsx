'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { EmployeeDocumentsService, EmployeeDocument } from '../../../../lib/firebase/employee-documents-service';
import { PDFViewerModal } from '../../../../components/ui/PDFViewer';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  Users, 
  Calendar, 
  AlertCircle,
  TrendingUp,
  Archive,
  Shield,
  Globe,
  Lock,
  Folder,
  Badge,
  Plus,
  RefreshCw,
  ChevronDown,
  User,
  Clock,
  Tag,
  Grid3x3,
  List,
  BarChart3
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employmentStatus: string;
  roles: Array<{
    jobTitle: string;
    baseSalary: number;
  }>;
}

interface DocumentStats {
  totalDocuments: number;
  documentsByType: Record<EmployeeDocument['documentType'], number>;
  documentsByAccessLevel: Record<EmployeeDocument['accessLevel'], number>;
  documentsUploadedThisMonth: number;
  averageFileSize: number;
  expiringDocuments: number;
}

export default function EmployeeDocumentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<EmployeeDocument[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<EmployeeDocument['documentType'] | 'all'>('all');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<EmployeeDocument['accessLevel'] | 'all'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type' | 'employee'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [expiringDocuments, setExpiringDocuments] = useState<EmployeeDocument[]>([]);

  const templates = [
    {
      title: 'Employment Contract',
      description: 'Standard contract for new hires to sign',
      href: '/dashboard/hr/contracts/employee-contract',
      icon: FileText,
      bg: 'bg-purple-50',
      color: 'text-purple-600'
    },
    {
      title: 'Employee Rules & Regulations',
      description: 'Company policies employees must acknowledge',
      href: '/dashboard/hr/docs/employee-rules',
      icon: List,
      bg: 'bg-yellow-50',
      color: 'text-yellow-700'
    },
    {
      title: 'Employee Information Form',
      description: 'Personal & employment details form for new hires',
      href: '/dashboard/hr/forms/employee-information',
      icon: Users,
      bg: 'bg-green-50',
      color: 'text-green-700'
    },
    {
      title: 'Mode of Operation',
      description: 'Daily duties and non-negotiables for staff',
      href: '/dashboard/hr/docs/mode-of-operation',
      icon: BarChart3,
      bg: 'bg-blue-50',
      color: 'text-blue-700'
    },
    // Future templates can be added here
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, selectedDocumentType, selectedAccessLevel, selectedEmployee, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeeData, documentsData, statsData, expiringData] = await Promise.all([
        HRQueries.getEmployeeOverview(),
        EmployeeDocumentsService.searchDocuments(''),
        EmployeeDocumentsService.getDocumentStatistics(),
        EmployeeDocumentsService.getExpiringDocuments(30)
      ]);

      setEmployees(employeeData);
      setDocuments(documentsData);
      setStats(statsData);
      setExpiringDocuments(expiringData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.employeeName.toLowerCase().includes(searchLower) ||
        doc.documentName.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Document type filter
    if (selectedDocumentType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === selectedDocumentType);
    }

    // Access level filter
    if (selectedAccessLevel !== 'all') {
      filtered = filtered.filter(doc => doc.accessLevel === selectedAccessLevel);
    }

    // Employee filter
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(doc => doc.employeeId === selectedEmployee);
    }

    // Sort documents
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = a.uploadDate.seconds;
          bValue = b.uploadDate.seconds;
          break;
        case 'name':
          aValue = a.documentName.toLowerCase();
          bValue = b.documentName.toLowerCase();
          break;
        case 'type':
          aValue = a.documentType;
          bValue = b.documentType;
          break;
        case 'employee':
          aValue = a.employeeName.toLowerCase();
          bValue = b.employeeName.toLowerCase();
          break;
        default:
          aValue = a.uploadDate.seconds;
          bValue = b.uploadDate.seconds;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredDocuments(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDocumentType('all');
    setSelectedAccessLevel('all');
    setSelectedEmployee('all');
    setSortBy('date');
    setSortOrder('desc');
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getAccessLevelColor = (level: EmployeeDocument['accessLevel']) => {
    const colors = {
      public: 'text-green-600 bg-green-50',
      confidential: 'text-yellow-600 bg-yellow-50',
      restricted: 'text-red-600 bg-red-50'
    };
    return colors[level] || 'text-gray-600 bg-gray-50';
  };

  const handleDocumentView = (document: EmployeeDocument) => {
    setSelectedDocument(document);
    setShowPDFModal(true);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await EmployeeDocumentsService.deleteDocument(documentId);
      await loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Documents</h1>
          <p className="text-gray-600">
            Manage all employee documents, contracts, and operational materials
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Printable Templates */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Printable HR Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <a
              key={t.title}
              href={t.href}
              className={`flex items-start gap-4 p-6 rounded-lg border border-gray-200 hover:shadow-md transition ${t.bg}`}
            >
              <t.icon className={`w-8 h-8 ${t.color}`} />
              <div>
                <p className="font-medium text-gray-900">{t.title}</p>
                <p className="text-sm text-gray-600">{t.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.documentsUploadedThisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{expiringDocuments.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. File Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(stats.averageFileSize)}
                </p>
              </div>
              <Archive className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents, employees, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="employment_contract">Employment Contract</option>
                  <option value="operations_manual">Operations Manual</option>
                  <option value="employment_form">Employment Form</option>
                  <option value="policy_document">Policy Document</option>
                  <option value="training_certificate">Training Certificate</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Level
                </label>
                <select
                  value={selectedAccessLevel}
                  onChange={(e) => setSelectedAccessLevel(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="public">Public</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="employee">Employee</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents List/Grid */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Documents ({filteredDocuments.length})
            </h2>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedDocumentType !== 'all' || selectedAccessLevel !== 'all' || selectedEmployee !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No documents have been uploaded yet'
                }
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredDocuments.map((document) => {
                const TypeIcon = getDocumentTypeIcon(document.documentType);
                const AccessIcon = getAccessLevelIcon(document.accessLevel);
                const employee = employees.find(emp => emp.id === document.employeeId);
                
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
                              <User className="h-4 w-4" />
                              {document.employeeName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(document.uploadDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <AccessIcon className="h-4 w-4" />
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAccessLevelColor(document.accessLevel)}`}>
                                {document.accessLevel}
                              </span>
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
                          onClick={() => handleDocumentView(document)}
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((document) => {
                const TypeIcon = getDocumentTypeIcon(document.documentType);
                const AccessIcon = getAccessLevelIcon(document.accessLevel);
                
                return (
                  <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <TypeIcon className="h-8 w-8 text-blue-600" />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleDocumentView(document)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={document.downloadUrl}
                          download={document.documentName}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-1 truncate" title={document.documentName}>
                      {document.documentName}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">{document.employeeName}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatDate(document.uploadDate)}
                      </span>
                      <div className="flex items-center gap-1">
                        <AccessIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{document.accessLevel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
} 