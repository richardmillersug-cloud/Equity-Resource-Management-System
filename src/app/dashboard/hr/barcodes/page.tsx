'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { generateQRCode } from '../../../../lib/utils/qr-code';
import { formatCompanyNameForId } from '../../../../config/company';
import { hrService } from '../../../../lib/services/hr-service';
import { authService } from '../../../../lib/firebase/auth';
import { 
  QrCode, 
  User, 
  Download, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Calendar,
  CreditCard,
  Camera,
  Printer,
  RefreshCw
} from 'lucide-react';

interface BarcodeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  name: string;
  barcodeNumber: string;
  barcodeDate: any;
  barcodeTime: any;
  isActive: boolean;
  lastUsed?: any;
  usageCount: number;
  createdAt: any;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNIN: string;
  roles: Array<{ jobTitle: string }>;
  branchId: string;
}

export default function BarcodesPage() {
  const [barcodeRecords, setBarcodeRecords] = useState<BarcodeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showIDCardModal, setShowIDCardModal] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<BarcodeRecord | null>(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  // Get company information
  const companyInfo = formatCompanyNameForId();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeesData = await HRQueries.getEmployeeOverview();
      setEmployees(employeesData);
      
      // Generate mock barcode records for demonstration
      const mockBarcodeRecords = generateMockBarcodeRecords(employeesData);
      setBarcodeRecords(mockBarcodeRecords);
      
    } catch (err) {
      console.error('Error loading barcode data:', err);
      setError('Failed to load barcode data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockBarcodeRecords = (employees: Employee[]): BarcodeRecord[] => {
    return employees.map(emp => {
      const barcodeNumber = `EMP${emp.id.slice(-6).toUpperCase()}${Date.now().toString().slice(-4)}`;
      const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      return {
        id: `barcode_${emp.id}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        name: `${emp.firstName} ${emp.lastName} - Employee ID`,
        barcodeNumber,
        barcodeDate: { seconds: createdDate.getTime() / 1000 },
        barcodeTime: { seconds: createdDate.getTime() / 1000 },
        isActive: Math.random() > 0.1, // 90% active
        lastUsed: Math.random() > 0.3 ? { seconds: (Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) / 1000 } : undefined,
        usageCount: Math.floor(Math.random() * 100),
        createdAt: { seconds: createdDate.getTime() / 1000 }
      };
    });
  };

  const generateBarcode = async (employeeId: string) => {
    try {
      setGeneratingBarcode(true);
      
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      const barcodeNumber = `EMP${employeeId.slice(-6).toUpperCase()}${Date.now().toString().slice(-4)}`;
      const now = new Date();
      
      const newBarcode: BarcodeRecord = {
        id: `barcode_${employeeId}_${Date.now()}`,
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        name: `${employee.firstName} ${employee.lastName} - Employee ID`,
        barcodeNumber,
        barcodeDate: { seconds: now.getTime() / 1000 },
        barcodeTime: { seconds: now.getTime() / 1000 },
        isActive: true,
        usageCount: 0,
        createdAt: { seconds: now.getTime() / 1000 }
      };

      // Deactivate existing barcodes for this employee
      setBarcodeRecords(records => [
        ...records.map(record => 
          record.employeeId === employeeId 
            ? { ...record, isActive: false }
            : record
        ),
        newBarcode
      ]);

      // Generate QR code for the new barcode
      const qrData = JSON.stringify({
        employeeId,
        barcodeNumber,
        employeeName: newBarcode.employeeName,
        generatedAt: now.toISOString()
      });
      
      const qrCodeURL = await generateQRCode(qrData);
      setQrCodeDataURL(qrCodeURL);
      setSelectedBarcode(newBarcode);
      
      // Record scan for shift tracking
      const currentUser = authService.getCurrentUser();
      if (currentUser?.employee?.id) {
        try {
          const scanResult = hrService.recordShiftScan(currentUser.employee.id);
          console.log('Employee barcode generation scan recorded:', scanResult);
        } catch (scanError) {
          console.log('Scan tracking not active for this user:', scanError);
        }
      }
      
      setShowGenerateModal(false);
      setShowIDCardModal(true);
      
    } catch (err) {
      console.error('Error generating barcode:', err);
      setError('Failed to generate barcode');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const handleDeactivateBarcode = async (barcodeId: string) => {
    try {
      setBarcodeRecords(records => 
        records.map(record => 
          record.id === barcodeId 
            ? { ...record, isActive: false }
            : record
        )
      );
    } catch (err) {
      console.error('Error deactivating barcode:', err);
      setError('Failed to deactivate barcode');
    }
  };

  const handleDeleteBarcode = async (barcodeId: string) => {
    const record = barcodeRecords.find(r => r.id === barcodeId);
    if (!record) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the barcode for ${record.employeeName}?\n\n` +
      `Barcode Number: ${record.barcodeNumber}\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setBarcodeRecords(records => records.filter(record => record.id !== barcodeId));
    } catch (err) {
      console.error('Error deleting barcode:', err);
      setError('Failed to delete barcode');
    }
  };

  const printIDCard = () => {
    if (!selectedBarcode) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const employee = employees.find(emp => emp.id === selectedBarcode.employeeId);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Employee ID Card - ${selectedBarcode.employeeName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f0f0f0;
            }
            .id-card {
              width: 350px;
              height: 220px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 15px;
              padding: 20px;
              color: white;
              position: relative;
              margin: 0 auto;
              box-shadow: 0 8px 25px rgba(0,0,0,0.3);
              display: flex;
              flex-direction: column;
            }
            .company-name {
              font-size: 11px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 10px;
              opacity: 0.9;
              line-height: 1.2;
            }
            .company-subtitle {
              font-size: 10px;
              text-align: center;
              margin-bottom: 15px;
              opacity: 0.8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .main-content {
              display: flex;
              flex: 1;
              gap: 15px;
              align-items: flex-start;
            }
            .photo-section {
              width: 70px;
              height: 85px;
              background: rgba(255, 255, 255, 0.2);
              border: 2px dashed rgba(255, 255, 255, 0.5);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .photo-placeholder {
              font-size: 10px;
              text-align: center;
              opacity: 0.7;
              line-height: 1.2;
            }
            .employee-info {
              flex: 1;
              margin-bottom: 0;
            }
            .employee-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .employee-role {
              font-size: 12px;
              opacity: 0.8;
            }
            .barcode-section {
              position: absolute;
              bottom: 15px;
              right: 15px;
              background: white;
              padding: 5px;
              border-radius: 5px;
            }
            .barcode-number {
              font-size: 8px;
              color: black;
              text-align: center;
              margin-top: 2px;
            }
            @media print {
              body { background: white; }
              .id-card { 
                box-shadow: none; 
                border: 2px solid #333;
              }
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="company-name">${companyInfo.name}</div>
            <div class="company-subtitle">${companyInfo.subtitle}</div>
            <div class="main-content">
              <div class="photo-section">
                <div class="photo-placeholder">PHOTO</div>
              </div>
            <div class="employee-info">
              <div class="employee-name">${selectedBarcode.employeeName}</div>
              <div class="employee-role">${employee?.roles?.[0]?.jobTitle || 'Employee'}</div>
              <div class="employee-role">ID: ${selectedBarcode.barcodeNumber}</div>
              </div>
            </div>
            <div class="barcode-section">
              <img src="${qrCodeDataURL}" alt="QR Code" width="60" height="60">
              <div class="barcode-number">${selectedBarcode.barcodeNumber}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportBarcodes = () => {
    const csvContent = [
      ['Employee Name', 'Barcode Number', 'Status', 'Created Date', 'Last Used', 'Usage Count'],
      ...barcodeRecords.map(record => [
        record.employeeName,
        record.barcodeNumber,
        record.isActive ? 'Active' : 'Inactive',
        new Date(record.createdAt.seconds * 1000).toLocaleDateString(),
        record.lastUsed ? new Date(record.lastUsed.seconds * 1000).toLocaleDateString() : 'Never',
        record.usageCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_barcodes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredRecords = barcodeRecords.filter(record => {
    if (selectedEmployee && record.employeeId !== selectedEmployee) return false;
    return true;
  });

  const stats = {
    total: barcodeRecords.length,
    active: barcodeRecords.filter(r => r.isActive).length,
    inactive: barcodeRecords.filter(r => !r.isActive).length,
    totalUsage: barcodeRecords.reduce((sum, r) => sum + r.usageCount, 0)
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
          <h1 className="text-2xl font-bold text-gray-900">Barcode Management</h1>
          <p className="text-gray-500">Generate and manage employee ID cards and barcodes</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportBarcodes}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button 
            onClick={() => setShowGenerateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Generate Barcode
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
              <QrCode className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Barcodes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Scans</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsage}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Showing {filteredRecords.length} of {barcodeRecords.length} barcodes
            </span>
          </div>
        </div>
      </div>

      {/* Barcode Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRecords.map((record) => (
          <div key={record.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{record.employeeName}</h3>
                  <p className="text-sm text-gray-500">{record.barcodeNumber}</p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                record.isActive 
                  ? 'text-green-800 bg-green-100' 
                  : 'text-red-800 bg-red-100'
              }`}>
                {record.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(record.createdAt.seconds * 1000).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Camera className="h-4 w-4" />
                <span>Scans: {record.usageCount}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Last used: {record.lastUsed 
                    ? new Date(record.lastUsed.seconds * 1000).toLocaleDateString() 
                    : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    const employee = employees.find(emp => emp.id === record.employeeId);
                    if (employee) {
                      const qrData = JSON.stringify({
                        employeeId: record.employeeId,
                        barcodeNumber: record.barcodeNumber,
                        employeeName: record.employeeName,
                        generatedAt: new Date().toISOString()
                      });
                      const qrCodeURL = await generateQRCode(qrData);
                      setQrCodeDataURL(qrCodeURL);
                      setSelectedBarcode(record);
                      setShowIDCardModal(true);
                    }
                  }}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    const employee = employees.find(emp => emp.id === record.employeeId);
                    if (employee) {
                      const qrData = JSON.stringify({
                        employeeId: record.employeeId,
                        barcodeNumber: record.barcodeNumber,
                        employeeName: record.employeeName,
                        generatedAt: new Date().toISOString()
                      });
                      const qrCodeURL = await generateQRCode(qrData);
                      setQrCodeDataURL(qrCodeURL);
                      setSelectedBarcode(record);
                      printIDCard();
                    }
                  }}
                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Printer className="h-4 w-4" />
                </button>
                {record.isActive && (
                  <button
                    onClick={() => handleDeactivateBarcode(record.id)}
                    className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteBarcode(record.id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Barcode Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Barcode</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    generateBarcode(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose an employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Card Preview Modal */}
      {showIDCardModal && selectedBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee ID Card Preview</h3>
            
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg p-6 text-white mb-4 relative flex flex-col">
              <div className="text-center text-xs font-bold mb-2 opacity-90 leading-tight">
                {companyInfo.name}
              </div>
              <div className="text-center text-xs mb-4 opacity-80 uppercase tracking-wide">
                {companyInfo.subtitle}
              </div>
              
              <div className="flex flex-1 gap-4 items-start">
                <div className="w-16 h-20 bg-white bg-opacity-20 border-2 border-dashed border-white border-opacity-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="text-xs text-center opacity-70">
                    PHOTO
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="text-lg font-bold mb-1">{selectedBarcode.employeeName}</div>
                <div className="text-sm opacity-80">
                  {employees.find(emp => emp.id === selectedBarcode.employeeId)?.roles?.[0]?.jobTitle || 'Employee'}
                </div>
                <div className="text-xs opacity-70 mt-1">ID: {selectedBarcode.barcodeNumber}</div>
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 bg-white p-2 rounded">
                {qrCodeDataURL && (
                  <img src={qrCodeDataURL} alt="QR Code" className="w-16 h-16" />
                )}
                <div className="text-xs text-black text-center mt-1">{selectedBarcode.barcodeNumber}</div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowIDCardModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <button
                onClick={printIDCard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print ID Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 