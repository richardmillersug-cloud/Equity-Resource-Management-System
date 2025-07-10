'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { 
  DollarSign, 
  Calculator, 
  FileText, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Eye,
  Edit,
  Calendar,
  TrendingUp,
  CreditCard,
  Minus
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriodStart: any;
  payPeriodEnd: any;
  grossSalary: number;
  deductions: {
    tax: number;
    nssf: number;
    other: number;
    total: number;
  };
  allowances: {
    transport: number;
    housing: number;
    medical: number;
    other: number;
    total: number;
  };
  netSalary: number;
  paymentDate?: any;
  status: 'Draft' | 'Processed' | 'Paid' | 'Cancelled';
  processedBy?: string;
  createdAt: any;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeSalary: number;
  roles: Array<{ jobTitle: string; baseSalary: number }>;
}

export default function PayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentMonthPeriod());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [bulkPayrollData, setBulkPayrollData] = useState<PayrollRecord[]>([]);

  function getCurrentMonthPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return {
      start: new Date(year, month, 1).toISOString().split('T')[0],
      end: new Date(year, month + 1, 0).toISOString().split('T')[0]
    };
  }

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const employeesData = await HRQueries.getEmployeeOverview();
      setEmployees(employeesData);
      
      // Generate mock payroll records for demonstration
      const mockPayrollRecords = generateMockPayrollRecords(employeesData, selectedPeriod);
      setPayrollRecords(mockPayrollRecords);
      
    } catch (err) {
      console.error('Error loading payroll data:', err);
      setError('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockPayrollRecords = (employees: Employee[], period: any): PayrollRecord[] => {
    const statuses: PayrollRecord['status'][] = ['Draft', 'Processed', 'Paid'];
    
    return employees.map(emp => {
      const grossSalary = emp.employeeSalary || emp.roles?.[0]?.baseSalary || 1000000;
      const tax = grossSalary * 0.1; // 10% tax
      const nssf = Math.min(grossSalary * 0.05, 200000); // 5% NSSF, max 200k
      const otherDeductions = Math.random() * 50000; // Random other deductions
      const totalDeductions = tax + nssf + otherDeductions;
      
      const transport = 100000; // Fixed transport allowance
      const housing = grossSalary * 0.15; // 15% housing allowance
      const medical = 50000; // Fixed medical allowance
      const otherAllowances = Math.random() * 30000; // Random other allowances
      const totalAllowances = transport + housing + medical + otherAllowances;
      
      const netSalary = grossSalary - totalDeductions + totalAllowances;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        id: `payroll_${emp.id}_${period.start}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        payPeriodStart: { seconds: new Date(period.start).getTime() / 1000 },
        payPeriodEnd: { seconds: new Date(period.end).getTime() / 1000 },
        grossSalary,
        deductions: {
          tax: Math.round(tax),
          nssf: Math.round(nssf),
          other: Math.round(otherDeductions),
          total: Math.round(totalDeductions)
        },
        allowances: {
          transport: Math.round(transport),
          housing: Math.round(housing),
          medical: Math.round(medical),
          other: Math.round(otherAllowances),
          total: Math.round(totalAllowances)
        },
        netSalary: Math.round(netSalary),
        status,
        paymentDate: status === 'Paid' ? { seconds: new Date().getTime() / 1000 } : undefined,
        processedBy: status !== 'Draft' ? 'hr-user' : undefined,
        createdAt: { seconds: new Date().getTime() / 1000 }
      };
    });
  };

  const handleProcessPayroll = async (recordId: string) => {
    try {
      const updatedRecord = payrollRecords.find(r => r.id === recordId);
      if (updatedRecord) {
        updatedRecord.status = 'Processed';
        updatedRecord.processedBy = 'current-hr-user';
        
        setPayrollRecords(records => 
          records.map(r => r.id === recordId ? updatedRecord : r)
        );
      }
    } catch (err) {
      console.error('Error processing payroll:', err);
      setError('Failed to process payroll');
    }
  };

  const handlePaySalary = async (recordId: string) => {
    try {
      const updatedRecord = payrollRecords.find(r => r.id === recordId);
      if (updatedRecord) {
        updatedRecord.status = 'Paid';
        updatedRecord.paymentDate = { seconds: new Date().getTime() / 1000 };
        
        setPayrollRecords(records => 
          records.map(r => r.id === recordId ? updatedRecord : r)
        );
      }
    } catch (err) {
      console.error('Error paying salary:', err);
      setError('Failed to pay salary');
    }
  };

  const handleBulkProcess = async () => {
    try {
      setProcessingAll(true);
      
      // Generate payroll for all active employees
      const activeEmployees = employees.filter(emp => emp.employeeSalary > 0);
      const bulkRecords = generateMockPayrollRecords(activeEmployees, selectedPeriod);
      
      setBulkPayrollData(bulkRecords);
      setShowProcessModal(true);
      
    } catch (err) {
      console.error('Error generating bulk payroll:', err);
      setError('Failed to generate bulk payroll');
    } finally {
      setProcessingAll(false);
    }
  };

  const confirmBulkProcess = async () => {
    try {
      // Update payroll records
      setPayrollRecords(bulkPayrollData);
      setShowProcessModal(false);
      setBulkPayrollData([]);
    } catch (err) {
      console.error('Error confirming bulk payroll:', err);
      setError('Failed to confirm bulk payroll');
    }
  };

  const filteredRecords = payrollRecords.filter(record => {
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (selectedEmployee && record.employeeId !== selectedEmployee) return false;
    return true;
  });

  const stats = {
    total: payrollRecords.length,
    draft: payrollRecords.filter(r => r.status === 'Draft').length,
    processed: payrollRecords.filter(r => r.status === 'Processed').length,
    paid: payrollRecords.filter(r => r.status === 'Paid').length,
    totalGross: payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0),
    totalNet: payrollRecords.reduce((sum, r) => sum + r.netSalary, 0),
    totalDeductions: payrollRecords.reduce((sum, r) => sum + r.deductions.total, 0)
  };

  const exportPayroll = () => {
    const csvContent = [
      ['Employee Name', 'Gross Salary', 'Tax', 'NSSF', 'Other Deductions', 'Total Deductions', 'Transport', 'Housing', 'Medical', 'Other Allowances', 'Total Allowances', 'Net Salary', 'Status'],
      ...filteredRecords.map(record => [
        record.employeeName,
        record.grossSalary.toLocaleString(),
        record.deductions.tax.toLocaleString(),
        record.deductions.nssf.toLocaleString(),
        record.deductions.other.toLocaleString(),
        record.deductions.total.toLocaleString(),
        record.allowances.transport.toLocaleString(),
        record.allowances.housing.toLocaleString(),
        record.allowances.medical.toLocaleString(),
        record.allowances.other.toLocaleString(),
        record.allowances.total.toLocaleString(),
        record.netSalary.toLocaleString(),
        record.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedPeriod.start}_${selectedPeriod.end}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Payroll Processing</h1>
          <p className="text-gray-500">Manage employee salaries and payroll processing</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportPayroll}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Payroll
          </button>
          <button 
            onClick={handleBulkProcess}
            disabled={processingAll}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            {processingAll ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            {processingAll ? 'Processing...' : 'Process All'}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Gross</p>
            <p className="text-2xl font-bold text-gray-900">UGX {stats.totalGross.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Minus className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
            <p className="text-2xl font-bold text-gray-900">UGX {stats.totalDeductions.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Net</p>
            <p className="text-2xl font-bold text-gray-900">UGX {stats.totalNet.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period Start</label>
            <input
              type="date"
              value={selectedPeriod.start}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, start: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period End</label>
            <input
              type="date"
              value={selectedPeriod.end}
              onChange={(e) => setSelectedPeriod({...selectedPeriod, end: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Processed">Processed</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
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
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allowances
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(record.payPeriodStart.seconds * 1000).toLocaleDateString()} - {new Date(record.payPeriodEnd.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    UGX {record.grossSalary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="text-red-600 font-medium">-UGX {record.deductions.total.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        Tax: {record.deductions.tax.toLocaleString()} | NSSF: {record.deductions.nssf.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="text-green-600 font-medium">+UGX {record.allowances.total.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        Housing: {record.allowances.housing.toLocaleString()} | Transport: {record.allowances.transport.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    UGX {record.netSalary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'Draft' ? 'text-yellow-800 bg-yellow-100' :
                      record.status === 'Processed' ? 'text-blue-800 bg-blue-100' :
                      record.status === 'Paid' ? 'text-green-800 bg-green-100' :
                      'text-gray-800 bg-gray-100'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {record.status === 'Draft' && (
                        <button
                          onClick={() => handleProcessPayroll(record.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Process
                        </button>
                      )}
                      {record.status === 'Processed' && (
                        <button
                          onClick={() => handlePaySalary(record.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Pay
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

      {/* Bulk Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Payroll Processing</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Review the payroll calculations for {bulkPayrollData.length} employees:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Gross</p>
                    <p className="text-lg font-bold text-gray-900">
                      UGX {bulkPayrollData.reduce((sum, r) => sum + r.grossSalary, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Deductions</p>
                    <p className="text-lg font-bold text-red-600">
                      UGX {bulkPayrollData.reduce((sum, r) => sum + r.deductions.total, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Net</p>
                    <p className="text-lg font-bold text-green-600">
                      UGX {bulkPayrollData.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkProcess}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Confirm & Process All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 