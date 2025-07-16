'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { 
  Clock, 
  UserCheck, 
  Calendar, 
  Users, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  QrCode,
  Eye,
  BarChart3,
  TrendingUp,
  ClockIcon
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: any;
  checkInTime?: any;
  checkOutTime?: any;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  hoursWorked?: number;
  overtimeHours?: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{ jobTitle: string }>;
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesData] = await Promise.all([
        HRQueries.getEmployeeOverview()
      ]);
      
      setEmployees(employeesData);
      
      // Generate mock attendance data for demonstration
      const mockAttendance = generateMockAttendance(employeesData, selectedDate);
      setAttendanceRecords(mockAttendance);
      
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockAttendance = (employees: Employee[], date: string): AttendanceRecord[] => {
    return employees.map(emp => {
      const random = Math.random();
      let status: 'Present' | 'Absent' | 'Late' | 'Half Day';
      let checkInTime = null;
      let checkOutTime = null;
      let hoursWorked = 0;
      let overtimeHours = 0;

      if (random > 0.9) {
        status = 'Absent';
      } else if (random > 0.7) {
        status = 'Late';
        checkInTime = new Date(`${date}T09:30:00`);
        checkOutTime = new Date(`${date}T17:30:00`);
        hoursWorked = 8;
      } else if (random > 0.85) {
        status = 'Half Day';
        checkInTime = new Date(`${date}T08:00:00`);
        checkOutTime = new Date(`${date}T13:00:00`);
        hoursWorked = 5;
      } else {
        status = 'Present';
        checkInTime = new Date(`${date}T08:00:00`);
        checkOutTime = new Date(`${date}T17:00:00`);
        hoursWorked = 9;
        overtimeHours = 1;
      }

      return {
        id: `${emp.id}_${date}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        attendanceDate: { seconds: new Date(date).getTime() / 1000 },
        checkInTime: checkInTime ? { seconds: checkInTime.getTime() / 1000 } : null,
        checkOutTime: checkOutTime ? { seconds: checkOutTime.getTime() / 1000 } : null,
        status,
        hoursWorked,
        overtimeHours
      };
    });
  };

  const handleCheckIn = async (employeeId: string) => {
    try {
      const now = new Date();
      const checkInTime = { seconds: now.getTime() / 1000 };
      
      // Update or create attendance record
      const existingRecord = attendanceRecords.find(r => r.employeeId === employeeId);
      if (existingRecord) {
        const updatedRecord = { ...existingRecord, checkInTime, status: 'Present' as const };
        setAttendanceRecords(records => 
          records.map(r => r.employeeId === employeeId ? updatedRecord : r)
        );
      }
      
      setShowCheckInModal(false);
      setCurrentEmployee(null);
    } catch (err) {
      console.error('Error checking in:', err);
      setError('Failed to check in employee');
    }
  };

  const handleCheckOut = async (employeeId: string) => {
    try {
      const now = new Date();
      const checkOutTime = { seconds: now.getTime() / 1000 };
      
      // Update attendance record
      const existingRecord = attendanceRecords.find(r => r.employeeId === employeeId);
      if (existingRecord && existingRecord.checkInTime) {
        const checkInDate = new Date(existingRecord.checkInTime.seconds * 1000);
        const hoursWorked = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
        const overtimeHours = Math.max(0, hoursWorked - 8);
        
        const updatedRecord = { 
          ...existingRecord, 
          checkOutTime, 
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100
        };
        
        setAttendanceRecords(records => 
          records.map(r => r.employeeId === employeeId ? updatedRecord : r)
        );
      }
      
      setShowCheckOutModal(false);
      setCurrentEmployee(null);
    } catch (err) {
      console.error('Error checking out:', err);
      setError('Failed to check out employee');
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (selectedEmployee && record.employeeId !== selectedEmployee) return false;
    return true;
  });

  const stats = {
    present: attendanceRecords.filter(r => r.status === 'Present').length,
    absent: attendanceRecords.filter(r => r.status === 'Absent').length,
    late: attendanceRecords.filter(r => r.status === 'Late').length,
    halfDay: attendanceRecords.filter(r => r.status === 'Half Day').length,
    total: attendanceRecords.length
  };

  const exportAttendance = () => {
    const csvContent = [
      ['Employee Name', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Overtime Hours'],
      ...filteredRecords.map(record => [
        record.employeeName,
        record.status,
        record.checkInTime ? new Date(record.checkInTime.seconds * 1000).toLocaleTimeString() : '',
        record.checkOutTime ? new Date(record.checkOutTime.seconds * 1000).toLocaleTimeString() : '',
        record.hoursWorked?.toString() || '',
        record.overtimeHours?.toString() || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-500">Monitor daily attendance and working hours</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={exportAttendance}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button 
            onClick={() => setShowCheckInModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            Quick Check-In
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Present</p>
            <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Absent</p>
            <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Late</p>
            <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Half Day</p>
            <p className="text-2xl font-bold text-gray-900">{stats.halfDay}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
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

          <div className="flex items-end">
            <span className="text-sm text-gray-500">
              Showing {filteredRecords.length} of {attendanceRecords.length} records
            </span>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
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
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'Present' ? 'text-green-800 bg-green-100' :
                      record.status === 'Absent' ? 'text-red-800 bg-red-100' :
                      record.status === 'Late' ? 'text-yellow-800 bg-yellow-100' :
                      'text-purple-800 bg-purple-100'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkInTime ? 
                      new Date(record.checkInTime.seconds * 1000).toLocaleTimeString() : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkOutTime ? 
                      new Date(record.checkOutTime.seconds * 1000).toLocaleTimeString() : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.overtimeHours ? `${record.overtimeHours}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {!record.checkInTime && (
                        <button
                          onClick={() => {
                            const emp = employees.find(e => e.id === record.employeeId);
                            setCurrentEmployee(emp || null);
                            setShowCheckInModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Check In
                        </button>
                      )}
                      {record.checkInTime && !record.checkOutTime && (
                        <button
                          onClick={() => {
                            const emp = employees.find(e => e.id === record.employeeId);
                            setCurrentEmployee(emp || null);
                            setShowCheckOutModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-In Employee</h3>
            {currentEmployee ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Check-in {currentEmployee.firstName} {currentEmployee.lastName} for today?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCheckIn(currentEmployee.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Check In
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">Select an employee to check in:</p>
                <select
                  onChange={(e) => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setCurrentEmployee(emp || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => currentEmployee && handleCheckIn(currentEmployee.id)}
                    disabled={!currentEmployee}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg"
                  >
                    Check In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-Out Modal */}
      {showCheckOutModal && currentEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-Out Employee</h3>
            <p className="text-gray-600 mb-4">
              Check-out {currentEmployee.firstName} {currentEmployee.lastName} for today?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckOut(currentEmployee.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Check Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 