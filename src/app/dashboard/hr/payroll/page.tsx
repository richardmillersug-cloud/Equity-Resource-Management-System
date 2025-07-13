'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { PayrollService, PayrollRecord } from '../../../../lib/services/payroll-service';
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
  Minus,
  Printer,
  BarChart3,
  DollarSign as Salary,
  Target,
  Award,
  Activity
} from 'lucide-react';

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
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
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
      
      // Generate payroll using the enhanced PayrollService
      const payPeriod = {
        start: new Date(selectedPeriod.start),
        end: new Date(selectedPeriod.end)
      };
      
      const generatedPayroll = await PayrollService.generateBulkPayroll(payPeriod);
      setPayrollRecords(generatedPayroll);
      
    } catch (err) {
      console.error('Error loading payroll data:', err);
      setError('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async (recordId: string) => {
    try {
      const updatedRecords = payrollRecords.map(record => 
        record.id === recordId 
          ? { ...record, status: 'Processed' as const, processedBy: 'current-hr-user', updatedAt: new Date() }
          : record
      );
      setPayrollRecords(updatedRecords);
    } catch (err) {
      console.error('Error processing payroll:', err);
      setError('Failed to process payroll');
    }
  };

  const handleApprovePayroll = async (recordId: string) => {
    try {
      const updatedRecords = payrollRecords.map(record => 
        record.id === recordId 
          ? { ...record, status: 'Approved' as const, approvedBy: 'current-manager', updatedAt: new Date() }
          : record
      );
      setPayrollRecords(updatedRecords);
    } catch (err) {
      console.error('Error approving payroll:', err);
      setError('Failed to approve payroll');
    }
  };

  const handlePaySalary = async (recordId: string) => {
    try {
      const updatedRecords = payrollRecords.map(record => 
        record.id === recordId 
          ? { ...record, status: 'Paid' as const, paymentDate: new Date(), updatedAt: new Date() }
          : record
      );
      setPayrollRecords(updatedRecords);
    } catch (err) {
      console.error('Error paying salary:', err);
      setError('Failed to pay salary');
    }
  };

  const handleBulkProcess = async () => {
    try {
      setProcessingAll(true);
      
      // Generate fresh payroll data
      const payPeriod = {
        start: new Date(selectedPeriod.start),
        end: new Date(selectedPeriod.end)
      };
      
      const bulkRecords = await PayrollService.generateBulkPayroll(payPeriod);
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
      // Update payroll records with processed status
      const processedRecords = bulkPayrollData.map(record => ({
        ...record,
        status: 'Processed' as const,
        processedBy: 'current-hr-user',
        updatedAt: new Date()
      }));
      
      setPayrollRecords(processedRecords);
      setShowProcessModal(false);
      setBulkPayrollData([]);
    } catch (err) {
      console.error('Error confirming bulk payroll:', err);
      setError('Failed to confirm bulk payroll');
    }
  };

  const handleViewPayslip = (record: PayrollRecord) => {
    setSelectedPayslip(record);
    setShowPayslipModal(true);
  };

  const handlePrintPayslip = (record: PayrollRecord) => {
    const html = PayrollService.generatePayslipHTML(record);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const filteredRecords = payrollRecords.filter(record => {
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (selectedEmployee && record.employeeId !== selectedEmployee) return false;
    return true;
  });

  const summary = PayrollService.calculatePayrollSummary(payrollRecords);

  const exportPayroll = () => {
    const csvContent = PayrollService.exportToCSV(filteredRecords);
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
          <p className="text-gray-500">Manage employee salaries, allowances, and deductions</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportPayroll}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Salary className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Gross</p>
            <p className="text-2xl font-bold text-gray-900">UGX {summary.totalGrossSalary.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Minus className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Deductions</p>
            <p className="text-2xl font-bold text-gray-900">UGX {summary.totalDeductions.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Allowances</p>
            <p className="text-2xl font-bold text-gray-900">UGX {summary.totalAllowances.toLocaleString()}</p>
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
            <p className="text-2xl font-bold text-gray-900">UGX {summary.totalNetSalary.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.statusBreakdown.draft}</div>
            <div className="text-sm text-gray-600">Draft</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.statusBreakdown.processed}</div>
            <div className="text-sm text-gray-600">Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.statusBreakdown.approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.statusBreakdown.paid}</div>
            <div className="text-sm text-gray-600">Paid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.statusBreakdown.cancelled}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
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
              <option value="Approved">Approved</option>
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

      {/* Enhanced Payroll Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
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
                          {record.payPeriodStart.toLocaleDateString()} - {record.payPeriodEnd.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="text-sm font-medium">{record.attendance.actualDays}/{record.attendance.workingDays} days</div>
                      <div className="text-xs text-gray-500">
                        OT: {record.attendance.overtimeHours}h | Leave: {record.attendance.leaveDays}d
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                      record.status === 'Approved' ? 'text-purple-800 bg-purple-100' :
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
                          title="Process Payroll"
                        >
                          Process
                        </button>
                      )}
                      {record.status === 'Processed' && (
                        <button
                          onClick={() => handleApprovePayroll(record.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Approve Payroll"
                        >
                          Approve
                        </button>
                      )}
                      {record.status === 'Approved' && (
                        <button
                          onClick={() => handlePaySalary(record.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Paid"
                        >
                          Pay
                        </button>
                      )}
                      <button 
                        onClick={() => handleViewPayslip(record)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Payslip"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handlePrintPayslip(record)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Print Payslip"
                      >
                        <Printer className="h-4 w-4" />
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
                <div className="grid grid-cols-4 gap-4 text-center">
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
                    <p className="text-sm text-gray-500">Total Allowances</p>
                    <p className="text-lg font-bold text-green-600">
                      UGX {bulkPayrollData.reduce((sum, r) => sum + r.allowances.total, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Net</p>
                    <p className="text-lg font-bold text-blue-600">
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

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payslip - {selectedPayslip.employeeName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedPayslip.payPeriodStart.toLocaleDateString()} - {selectedPayslip.payPeriodEnd.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintPayslip(selectedPayslip)}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPayslipModal(false)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: PayrollService.generatePayslipHTML(selectedPayslip)
                }} 
                className="payslip-content"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 