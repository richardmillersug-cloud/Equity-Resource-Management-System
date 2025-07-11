'use client';

import React, { useState, useEffect } from 'react';
import { HRQueries } from '../../../../lib/firebase/role-based-queries';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { hrService } from '../../../../lib/services/hr-service';
import { scanTrackingService } from '../../../../lib/services/scan-tracking-service';
import { 
  Clock, 
  UserCheck, 
  Calendar, 
  Users, 
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  QrCode,
  Eye,
  BarChart3,
  TrendingUp,
  ClockIcon,
  Play,
  Pause,
  MapPin,
  Wifi,
  Activity,
  Timer,
  Target,
  Award,
  Search,
  RefreshCw,
  Plus,
  Edit,
  X,
  Scan
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: any;
  checkInTime?: any;
  checkOutTime?: any;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';
  hoursWorked?: number;
  overtimeHours?: number;
  shiftStartTotalScans?: number;
  shiftEndTotalScans?: number;
  totalScansDuringShift?: number;
  location?: string;
  ipAddress?: string;
  notes?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: Array<{ jobTitle: string }>;
}

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  averageHours: number;
  totalOvertimeHours: number;
  attendanceRate: number;
}

export default function AttendanceTrackingPage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [showScanTracker, setShowScanTracker] = useState(false);
  const [selectedEmployeeForScan, setSelectedEmployeeForScan] = useState<string>('');

  // Manual entry form state
  const [manualEntry, setManualEntry] = useState({
    employeeId: '',
    date: selectedDate,
    checkInTime: '',
    checkOutTime: '',
    status: 'Present' as AttendanceRecord['status'],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (realTimeMode) {
      interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realTimeMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const employeesData = await HRQueries.getEmployeeOverview();
      
      // Ensure employeesData is valid
      if (!employeesData || !Array.isArray(employeesData)) {
        console.warn('Invalid employees data received:', employeesData);
        setEmployees([]);
        setAttendanceRecords([]);
        return;
      }
      
      setEmployees(employeesData);
      
      // Generate comprehensive mock attendance data
      const mockAttendance = generateMockAttendance(employeesData, selectedDate);
      setAttendanceRecords(mockAttendance);
      
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setError('Failed to load attendance data');
      setEmployees([]);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAttendance = (employees: Employee[], date: string): AttendanceRecord[] => {
    // Safety check to ensure employees is an array
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      console.warn('No employees data available for attendance generation');
      return [];
    }

    const locations = ['Office', 'Home', 'Client Site', 'Remote'];
    const ipAddresses = ['192.168.1.', '10.0.0.', '172.16.0.'];
    
    return employees.map(emp => {
      const random = Math.random();
      let status: AttendanceRecord['status'];
      let checkInTime = null;
      let checkOutTime = null;
      let hoursWorked = 0;
      let overtimeHours = 0;
      let location = locations[Math.floor(Math.random() * locations.length)];
      let ipAddress = ipAddresses[Math.floor(Math.random() * ipAddresses.length)] + Math.floor(Math.random() * 255);

      if (random > 0.95) {
        status = 'On Leave';
      } else if (random > 0.9) {
        status = 'Absent';
      } else if (random > 0.75) {
        status = 'Late';
        checkInTime = new Date(`${date}T09:${Math.floor(Math.random() * 45) + 15}:00`);
        checkOutTime = new Date(`${date}T17:${Math.floor(Math.random() * 30) + 30}:00`);
        hoursWorked = Math.random() * 2 + 7;
        overtimeHours = Math.max(0, hoursWorked - 8);
      } else if (random > 0.85) {
        status = 'Half Day';
        checkInTime = new Date(`${date}T08:${Math.floor(Math.random() * 30)}:00`);
        checkOutTime = new Date(`${date}T13:${Math.floor(Math.random() * 30)}:00`);
        hoursWorked = Math.random() * 1 + 4;
      } else {
        status = 'Present';
        checkInTime = new Date(`${date}T08:${Math.floor(Math.random() * 30)}:00`);
        checkOutTime = new Date(`${date}T17:${Math.floor(Math.random() * 60) + 30}:00`);
        hoursWorked = Math.random() * 2 + 8;
        overtimeHours = Math.max(0, hoursWorked - 8);
      }

      const shiftStartTotalScans = status !== 'Absent' && status !== 'On Leave' ? 0 : undefined;
      const shiftEndTotalScans = status !== 'Absent' && status !== 'On Leave' && checkOutTime ? Math.floor(Math.random() * 50) + 20 : undefined;
      const totalScansDuringShift = shiftEndTotalScans ? shiftEndTotalScans - (shiftStartTotalScans || 0) : undefined;

      return {
        id: `${emp.id}_${date}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        attendanceDate: { seconds: new Date(date).getTime() / 1000 },
        checkInTime: checkInTime ? { seconds: checkInTime.getTime() / 1000 } : null,
        checkOutTime: checkOutTime ? { seconds: checkOutTime.getTime() / 1000 } : null,
        status,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        shiftStartTotalScans,
        shiftEndTotalScans,
        totalScansDuringShift,
        location,
        ipAddress,
        notes: status === 'Late' ? 'Traffic delay' : status === 'Half Day' ? 'Medical appointment' : ''
      };
    });
  };

  const handleCheckIn = async (employeeId: string, location: string = 'Office') => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const now = new Date();
      const checkInTime = { seconds: now.getTime() / 1000 };
      const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30);
      
      const newRecord: AttendanceRecord = {
        id: `${employeeId}_${selectedDate}`,
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        attendanceDate: { seconds: new Date(selectedDate).getTime() / 1000 },
        checkInTime,
        status: isLate ? 'Late' : 'Present',
        location,
        ipAddress: '192.168.1.100', // Mock IP
        notes: isLate ? 'Late arrival' : 'On time'
      };
      
      setAttendanceRecords(records => {
        const existingIndex = records.findIndex(r => r.employeeId === employeeId);
        if (existingIndex >= 0) {
          const updated = [...records];
          updated[existingIndex] = { ...updated[existingIndex], ...newRecord };
          return updated;
        } else {
          return [newRecord, ...records];
        }
      });
      
      setSuccess(`${employee.firstName} ${employee.lastName} checked in successfully`);
      setShowCheckInModal(false);
      setCurrentEmployee(null);
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error checking in:', err);
      setError('Failed to check in employee');
    }
  };

  const handleCheckOut = async (employeeId: string) => {
    try {
      const employee = employees.find(emp => emp.id === employeeId);
      const existingRecord = attendanceRecords.find(r => r.employeeId === employeeId);
      
      if (!employee || !existingRecord || !existingRecord.checkInTime) {
        setError('No check-in record found');
        return;
      }
      
      const now = new Date();
      const checkOutTime = { seconds: now.getTime() / 1000 };
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
      
      setSuccess(`${employee.firstName} ${employee.lastName} checked out successfully`);
      setShowCheckOutModal(false);
      setCurrentEmployee(null);
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error checking out:', err);
      setError('Failed to check out employee');
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const employee = employees.find(emp => emp.id === manualEntry.employeeId);
      if (!employee) return;
      
      const checkInTime = manualEntry.checkInTime ? { seconds: new Date(`${manualEntry.date}T${manualEntry.checkInTime}`).getTime() / 1000 } : null;
      const checkOutTime = manualEntry.checkOutTime ? { seconds: new Date(`${manualEntry.date}T${manualEntry.checkOutTime}`).getTime() / 1000 } : null;
      
      let hoursWorked = 0;
      let overtimeHours = 0;
      
      if (checkInTime && checkOutTime) {
        hoursWorked = (checkOutTime.seconds - checkInTime.seconds) / 3600;
        overtimeHours = Math.max(0, hoursWorked - 8);
      }
      
      const newRecord: AttendanceRecord = {
        id: `${manualEntry.employeeId}_${manualEntry.date}`,
        employeeId: manualEntry.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        attendanceDate: { seconds: new Date(manualEntry.date).getTime() / 1000 },
        checkInTime,
        checkOutTime,
        status: manualEntry.status,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        location: 'Manual Entry',
        notes: manualEntry.notes || 'Manual entry by HR'
      };
      
      setAttendanceRecords(records => {
        const existingIndex = records.findIndex(r => r.employeeId === manualEntry.employeeId);
        if (existingIndex >= 0) {
          const updated = [...records];
          updated[existingIndex] = newRecord;
          return updated;
        } else {
          return [newRecord, ...records];
        }
      });
      
      setSuccess('Manual attendance entry added successfully');
      setShowManualEntryModal(false);
      setManualEntry({
        employeeId: '',
        date: selectedDate,
        checkInTime: '',
        checkOutTime: '',
        status: 'Present',
        notes: ''
      });
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error adding manual entry:', err);
      setError('Failed to add manual entry');
    }
  };

  const filteredRecords = (attendanceRecords || []).filter(record => {
    if (!record) return false;
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;
    if (selectedEmployee && record.employeeId !== selectedEmployee) return false;
    if (searchTerm && record.employeeName && !record.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const calculateStats = (): AttendanceStats => {
    const totalEmployees = employees.length;
    const presentToday = attendanceRecords.filter(r => r.status === 'Present').length;
    const absentToday = attendanceRecords.filter(r => r.status === 'Absent').length;
    const lateToday = attendanceRecords.filter(r => r.status === 'Late').length;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const averageHours = totalEmployees > 0 ? totalHours / totalEmployees : 0;
    const totalOvertimeHours = attendanceRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const attendanceRate = totalEmployees > 0 ? ((presentToday + lateToday) / totalEmployees) * 100 : 0;

    return {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      averageHours,
      totalOvertimeHours,
      attendanceRate
    };
  };

  const stats = calculateStats();

  const handleRecordScan = (employeeId: string) => {
    try {
      const result = hrService.recordShiftScan(employeeId);
      setSuccess(`Scan recorded! Current count: ${result.currentScanCount}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      console.error('Error recording scan:', error);
      setError('Failed to record scan');
    }
  };

  const getScanStatsForEmployee = (employeeId: string) => {
    return hrService.getScanStats(employeeId);
  };

  const renderScanTracker = () => {
    if (!showScanTracker || !selectedEmployeeForScan) return null;

    const employee = employees.find(emp => emp.id === selectedEmployeeForScan);
    const scanStats = getScanStatsForEmployee(selectedEmployeeForScan);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Scan Tracker</h3>
            <button
              onClick={() => setShowScanTracker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium text-gray-900">
                {employee?.firstName} {employee?.lastName}
              </h4>
              <p className="text-sm text-gray-500">Employee Scan Tracking</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Current Shift Scans:</span>
                <span className="font-semibold text-blue-600">{scanStats.currentShiftScans}</span>
              </div>
              
              {scanStats.lastScanTime && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Scan:</span>
                  <span className="text-sm">{scanStats.lastScanTime.toLocaleTimeString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Shift Status:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  scanStats.isShiftActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {scanStats.isShiftActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {scanStats.shiftStartTime && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Shift Started:</span>
                  <span className="text-sm">{scanStats.shiftStartTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleRecordScan(selectedEmployeeForScan)}
              disabled={!scanStats.isShiftActive}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Scan className="w-4 h-4" />
              <span>Record Scan</span>
            </button>

            <p className="text-xs text-gray-500 text-center">
              Employee must check in first to activate shift tracking
            </p>
          </div>
        </div>
      </div>
    );
  };

  const exportAttendance = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      alert('No attendance records to export');
      return;
    }
    
    const csvContent = [
      ['Employee Name', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Overtime Hours', 'Shift Start Scans', 'Shift End Scans', 'Total Scans', 'Location', 'Notes'],
      ...filteredRecords.map(record => [
        record.employeeName,
        record.status,
        record.checkInTime ? new Date(record.checkInTime.seconds * 1000).toLocaleTimeString() : '',
        record.checkOutTime ? new Date(record.checkOutTime.seconds * 1000).toLocaleTimeString() : '',
        record.hoursWorked?.toString() || '',
        record.overtimeHours?.toString() || '',
        record.shiftStartTotalScans?.toString() || '',
        record.shiftEndTotalScans?.toString() || '',
        record.totalScansDuringShift?.toString() || '',
        record.location || '',
        record.notes || ''
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
          <p className="text-gray-500">Monitor employee attendance and working hours</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setRealTimeMode(!realTimeMode)}
            className={`${realTimeMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white px-4 py-2 rounded-lg flex items-center gap-2`}
          >
            <Activity className="h-4 w-4" />
            {realTimeMode ? 'Live Mode' : 'Manual Mode'}
          </button>
          <button
            onClick={exportAttendance}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowCheckInModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Check In
          </button>
          <button
            onClick={() => setShowCheckOutModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Check Out
          </button>
          <button
            onClick={() => setShowManualEntryModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Manual Entry
          </button>
          <button
            onClick={() => setShowScanTracker(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Scan className="h-4 w-4" />
            Scan Tracker
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.presentToday}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.absentToday}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lateToday}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Hours</p>
              <p className="text-2xl font-bold text-blue-600">{stats.averageHours.toFixed(1)}</p>
            </div>
            <Timer className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Overtime</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalOvertimeHours.toFixed(1)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-bold text-green-600">{stats.attendanceRate.toFixed(1)}%</p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Search className="absolute left-3 top-9 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees && employees.length > 0 ? employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              )) : (
                <option value="" disabled>No employees available</option>
              )}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Attendance Records - {new Date(selectedDate).toLocaleDateString()}
          </h2>
        </div>
        
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
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
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
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                        <div className="text-sm text-gray-500">{record.ipAddress}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'Present' ? 'bg-green-100 text-green-800' :
                      record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                      record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'Half Day' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkInTime ? new Date(record.checkInTime.seconds * 1000).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkOutTime ? new Date(record.checkOutTime.seconds * 1000).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.overtimeHours ? `${record.overtimeHours.toFixed(1)}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      {record.location || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setCurrentEmployee(employees.find(emp => emp.id === record.employeeId) || null);
                          setShowCheckInModal(true);
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Check In"
                        disabled={!!record.checkInTime}
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCurrentEmployee(employees.find(emp => emp.id === record.employeeId) || null);
                          setShowCheckOutModal(true);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Check Out"
                        disabled={!record.checkInTime || !!record.checkOutTime}
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setManualEntry({
                            ...manualEntry,
                            employeeId: record.employeeId
                          });
                          setShowManualEntryModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Check In Employee</h3>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={currentEmployee?.id || ''}
                  onChange={(e) => setCurrentEmployee(employees.find(emp => emp.id === e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Employee</option>
                  {employees && employees.length > 0 ? employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  )) : (
                    <option value="" disabled>No employees available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue="Office"
                >
                  <option value="Office">Office</option>
                  <option value="Home">Home</option>
                  <option value="Client Site">Client Site</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => currentEmployee && handleCheckIn(currentEmployee.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                  disabled={!currentEmployee}
                >
                  <Play className="h-4 w-4" />
                  Check In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Check Out Employee</h3>
              <button
                onClick={() => setShowCheckOutModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={currentEmployee?.id || ''}
                  onChange={(e) => setCurrentEmployee(employees.find(emp => emp.id === e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Employee</option>
                  {employees && employees.length > 0 ? employees.filter(emp => {
                    const record = attendanceRecords.find(r => r.employeeId === emp.id);
                    return record && record.checkInTime && !record.checkOutTime;
                  }).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  )) : (
                    <option value="" disabled>No employees available for checkout</option>
                  )}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCheckOutModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => currentEmployee && handleCheckOut(currentEmployee.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                  disabled={!currentEmployee}
                >
                  <Pause className="h-4 w-4" />
                  Check Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Manual Attendance Entry</h3>
              <button
                onClick={() => setShowManualEntryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={manualEntry.employeeId}
                  onChange={(e) => setManualEntry({...manualEntry, employeeId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees && employees.length > 0 ? employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  )) : (
                    <option value="" disabled>No employees available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={manualEntry.date}
                  onChange={(e) => setManualEntry({...manualEntry, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={manualEntry.status}
                  onChange={(e) => setManualEntry({...manualEntry, status: e.target.value as AttendanceRecord['status']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check In Time</label>
                  <input
                    type="time"
                    value={manualEntry.checkInTime}
                    onChange={(e) => setManualEntry({...manualEntry, checkInTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check Out Time</label>
                  <input
                    type="time"
                    value={manualEntry.checkOutTime}
                    onChange={(e) => setManualEntry({...manualEntry, checkOutTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={manualEntry.notes}
                  onChange={(e) => setManualEntry({...manualEntry, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional notes about this attendance record..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualEntryModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Tracker Modal */}
      {showScanTracker && !selectedEmployeeForScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Employee for Scan Tracking</h3>
              <button
                onClick={() => setShowScanTracker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={selectedEmployeeForScan}
                  onChange={(e) => setSelectedEmployeeForScan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Employee</option>
                  {employees && employees.length > 0 ? employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  )) : (
                    <option value="" disabled>No employees available</option>
                  )}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowScanTracker(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedEmployeeForScan && setShowScanTracker(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
                  disabled={!selectedEmployeeForScan}
                >
                  <Scan className="h-4 w-4" />
                  Open Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render the actual scan tracker when employee is selected */}
      {renderScanTracker()}
    </div>
  );
} 