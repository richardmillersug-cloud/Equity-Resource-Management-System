'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  CheckCircle2,
  Camera,
  Moon,
  Sun,
  Settings2,
  X,
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Trash2,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { authService } from '@/lib/firebase/auth';
import { firestoreServices } from '@/lib/firebase/firestore-service';
import { STAFF_PORTAL_ROLES, userHasStaffPortalRole } from '@/lib/firebase/staff-portal-roles';
import {
  canCreateSystemAccounts,
  canViewAllRegisteredStaff,
  isAdminUser,
  isManagingDirectorUser,
  isPurchaseManagerUser,
} from '@/lib/firebase/admin-access';
import {
  SHIFT_DEFINITIONS,
  STAFF_SHIFTS,
  normalizeStaffShift,
  type StaffShift,
} from '@/lib/firebase/staff-shifts';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { SUPERMARKET_SECTIONS } from '@/lib/constants/supermarket-sections';
import type { Attendance, Employee, LeaveRequest } from '@/lib/firebase/models';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';
import {
  evaluatePremisesPresence,
  formatCoords,
  PREMISES_LOCATION,
  PREMISES_RADIUS_METERS,
} from '@/lib/premises-location';

type PageView = 'employees' | 'leave' | 'attendance';
type AttendancePeriod = 'daily' | 'monthly';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toMonthInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const BRANCH_NAMES: Record<string, string> = {
  kyengera: 'Kyengera Branch',
  main: 'Main Branch',
  ntinda: 'Ntinda Branch',
  entebbe: 'Entebbe Branch',
  jinja: 'Jinja Branch',
};

function formatDate(value?: Timestamp | Date | { seconds?: number } | null): string {
  if (!value) return '—';
  try {
    if (value instanceof Timestamp) return value.toDate().toLocaleDateString();
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object' && typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000).toLocaleDateString();
    }
  } catch {
    /* ignore */
  }
  return '—';
}

function statusBadge(status: Employee['employmentStatus']) {
  const styles: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-amber-50 text-amber-700 border-amber-200',
    Terminated: 'bg-red-50 text-red-700 border-red-200',
  };
  return styles[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function formatTime(value?: Timestamp | null): string {
  if (!value) return '—';
  try {
    return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function leaveStatusBadge(status: LeaveRequest['status']) {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return styles[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function RegisteredEmployeesPage() {
  const router = useRouter();
  const [view, setView] = useState<PageView>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [leaveActionId, setLeaveActionId] = useState<string | null>(null);
  const [attendancePeriod, setAttendancePeriod] = useState<AttendancePeriod>('daily');
  const [attendanceDate, setAttendanceDate] = useState(() => toDateInputValue(new Date()));
  const [attendanceMonth, setAttendanceMonth] = useState(() => toMonthInputValue(new Date()));

  const [managing, setManaging] = useState<Employee | null>(null);
  const [editShift, setEditShift] = useState<StaffShift>('day');
  const [editSection, setEditSection] = useState('');
  const [editStatus, setEditStatus] = useState<Employee['employmentStatus']>('Active');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      let list: Employee[] = [];

      // Super Admin / System Admin, MD, and PM all see every registered staff
      if (canViewAllRegisteredStaff(user)) {
        const all = await firestoreServices.employee.getAll();
        list = all.filter(
          (emp) => Boolean(emp.registeredBy) || userHasStaffPortalRole(emp.roles)
        );
      } else {
        // Other roles: only staff they personally registered (if any)
        try {
          list = await firestoreServices.employee.getRegisteredBy(user.uid);
        } catch (err) {
          console.warn('registeredBy query failed, scanning employees locally:', err);
          const all = await firestoreServices.employee.getAll();
          list = all.filter((emp) => emp.registeredBy === user.uid);
        }
        list = list.filter(
          (emp) => Boolean(emp.registeredBy) || userHasStaffPortalRole(emp.roles)
        );
      }

      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

      setEmployees(list);

      const staffIds = new Set(list.map((e) => e.id));
      try {
        const leaves = await firestoreServices.leaveRequest.getAll();
        const forStaff = leaves
          .filter((leave) => staffIds.has(leave.employeeId))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? a.startDate?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? b.startDate?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        setLeaveRequests(forStaff);
      } catch (leaveErr) {
        console.warn('Failed to load leave requests:', leaveErr);
        setLeaveRequests([]);
      }

      try {
        const rangeStart = new Date();
        rangeStart.setMonth(rangeStart.getMonth() - 2);
        rangeStart.setDate(1);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date();
        rangeEnd.setHours(23, 59, 59, 999);

        const attendanceBatches = await Promise.all(
          list.map((emp) =>
            firestoreServices.attendance
              .getEmployeeAttendance(emp.id, rangeStart, rangeEnd)
              .catch(() => [] as Attendance[])
          )
        );
        setAttendanceRecords(
          attendanceBatches.flat().sort((a, b) => {
            const aTime = a.attendanceDate?.toMillis?.() ?? 0;
            const bTime = b.attendanceDate?.toMillis?.() ?? 0;
            return bTime - aTime;
          })
        );
      } catch (attendanceErr) {
        console.warn('Failed to load attendance:', attendanceErr);
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error('Failed to load registered employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to load registered employees');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openManage = (emp: Employee) => {
    setManaging(emp);
    setEditShift(normalizeStaffShift(emp.assignedShift));
    setEditSection(emp.workingSection || '');
    setEditStatus(emp.employmentStatus || 'Active');
    setError(null);
    setSuccess(null);
  };

  const closeManage = () => {
    if (saving) return;
    setManaging(null);
  };

  const switchView = (next: PageView) => {
    setView(next);
    setSearchTerm('');
    setError(null);
    setSuccess(null);
  };

  const handleLeaveDecision = async (
    leave: LeaveRequest,
    decision: 'Approved' | 'Rejected'
  ) => {
    const user = authService.getCurrentUser();
    if (!user || leave.status !== 'Pending') return;

    const emp = employees.find((e) => e.id === leave.employeeId);
    const name = emp ? `${emp.firstName} ${emp.lastName}` : 'this employee';
    if (decision === 'Rejected') {
      const confirmed = window.confirm(
        `Not approve ${leave.leaveType} leave for ${name} (${formatDate(leave.startDate)} → ${formatDate(leave.endDate)})?`
      );
      if (!confirmed) return;
    }

    setLeaveActionId(leave.id);
    setError(null);
    setSuccess(null);
    try {
      if (decision === 'Approved') {
        await firestoreServices.leaveRequest.approveLeaveRequest(leave.id, user.uid);
        setSuccess(`Approved ${leave.leaveType} leave for ${name}`);
      } else {
        await firestoreServices.leaveRequest.rejectLeaveRequest(
          leave.id,
          user.uid,
          'Not approved by Purchase Manager'
        );
        setSuccess(`Did not approve ${leave.leaveType} leave for ${name}`);
      }

      setLeaveRequests((prev) =>
        prev.map((row) =>
          row.id === leave.id
            ? {
                ...row,
                status: decision,
                approvedBy: user.uid,
                approvalDate: Timestamp.now(),
                comments:
                  decision === 'Rejected' ? 'Not approved by Purchase Manager' : row.comments,
              }
            : row
        )
      );
    } catch (err) {
      console.error('Failed to update leave request:', err);
      setError(err instanceof Error ? err.message : 'Failed to update leave request');
    } finally {
      setLeaveActionId(null);
    }
  };

  const handleSaveAssignment = async () => {
    if (!managing) return;
    const user = authService.getCurrentUser();
    if (!user) return;

    if (
      editStatus === 'Terminated' &&
      managing.employmentStatus !== 'Terminated' &&
      !window.confirm(
        `Terminate ${managing.firstName} ${managing.lastName}? They will no longer be able to sign in.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await firestoreServices.employee.updateStaffAssignment(
        managing.id,
        {
          assignedShift: editShift,
          workingSection: editSection,
          employmentStatus: editStatus,
        },
        user.uid
      );

      const updated: Employee = {
        ...managing,
        assignedShift: editShift,
        workingSection: editSection,
        employmentStatus: editStatus,
        shiftAssignedAt: Timestamp.now(),
        shiftAssignedBy: user.uid,
      };

      setEmployees((prev) => prev.map((e) => (e.id === managing.id ? updated : e)));
      setManaging(updated);

      const def = SHIFT_DEFINITIONS[editShift];
      setSuccess(
        `Updated ${managing.firstName}: ${def.label} shift` +
          (editSection ? `, ${editSection}` : ', no section') +
          `, ${editStatus}`
      );
    } catch (err) {
      console.error('Failed to update staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to update staff');
    } finally {
      setSaving(false);
    }
  };

  const canDeleteStaff = (emp: Employee): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    // Super Admin / MD can delete any; PM deletes staff they registered
    if (isAdminUser(user) || isManagingDirectorUser(user)) return true;
    if (isPurchaseManagerUser(user) && emp.registeredBy === user.uid) return true;
    return false;
  };

  const handleDeleteStaff = async () => {
    if (!managing) return;
    if (!canDeleteStaff(managing)) {
      setError('You can only delete staff you registered.');
      return;
    }

    const name = `${managing.firstName} ${managing.lastName}`.trim();
    const confirmed = window.confirm(
      `Delete ${name} permanently?\n\nTheir employee record will be removed and they will no longer be able to sign in. This cannot be undone.`
    );
    if (!confirmed) return;

    const typed = window.prompt(`Type DELETE to confirm removing ${name}:`);
    if (typed !== 'DELETE') {
      setError('Deletion cancelled — you must type DELETE to confirm.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await firestoreServices.employee.delete(managing.id);
      setEmployees((prev) => prev.filter((e) => e.id !== managing.id));
      setLeaveRequests((prev) => prev.filter((l) => l.employeeId !== managing.id));
      setAttendanceRecords((prev) => prev.filter((a) => a.employeeId !== managing.id));
      setManaging(null);
      setSuccess(`${name} has been deleted.`);
    } catch (err) {
      console.error('Failed to delete staff:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete staff. Deploy latest Firestore rules if permission was denied.'
      );
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      const role = emp.roles?.[0]?.jobTitle || '';
      const matchesSearch =
        !q ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.phone?.toLowerCase().includes(q) ||
        emp.employeeNIN?.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        (emp.workingSection || '').toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' || role === roleFilter;
      const matchesStatus = statusFilter === 'all' || emp.employmentStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchTerm, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.employmentStatus === 'Active').length;
    const terminated = employees.filter((e) => e.employmentStatus === 'Terminated').length;
    return {
      total: employees.length,
      active,
      terminated,
      other: employees.length - active - terminated,
    };
  }, [employees]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) {
      map.set(emp.id, `${emp.firstName} ${emp.lastName}`);
    }
    return map;
  }, [employees]);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((leave) => {
      if (leaveStatusFilter !== 'all' && leave.status !== leaveStatusFilter) return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      const name = (employeeNameById.get(leave.employeeId) || '').toLowerCase();
      return (
        name.includes(q) ||
        leave.leaveType.toLowerCase().includes(q) ||
        leave.reason?.toLowerCase().includes(q) ||
        leave.status.toLowerCase().includes(q)
      );
    });
  }, [leaveRequests, leaveStatusFilter, searchTerm, employeeNameById]);

  const leaveStats = useMemo(() => {
    const pending = leaveRequests.filter((l) => l.status === 'Pending').length;
    const approved = leaveRequests.filter((l) => l.status === 'Approved').length;
    const rejected = leaveRequests.filter((l) => l.status === 'Rejected').length;
    return { total: leaveRequests.length, pending, approved, rejected };
  }, [leaveRequests]);

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const ms = record.attendanceDate?.toMillis?.();
      if (!ms) return false;
      const d = new Date(ms);

      if (attendancePeriod === 'daily') {
        if (toDateInputValue(d) !== attendanceDate) return false;
      } else {
        if (toMonthInputValue(d) !== attendanceMonth) return false;
      }

      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      const name = (employeeNameById.get(record.employeeId) || '').toLowerCase();
      const shift = normalizeStaffShift(record.shift).toLowerCase();
      return (
        name.includes(q) ||
        record.status.toLowerCase().includes(q) ||
        shift.includes(q)
      );
    });
  }, [
    attendanceRecords,
    attendancePeriod,
    attendanceDate,
    attendanceMonth,
    searchTerm,
    employeeNameById,
  ]);

  const attendanceStats = useMemo(() => {
    const checkedOut = filteredAttendance.filter((r) => r.checkOutTime).length;
    const hours = filteredAttendance.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const uniqueStaff = new Set(filteredAttendance.map((r) => r.employeeId)).size;
    return {
      records: filteredAttendance.length,
      checkedOut,
      hours: Math.round(hours * 10) / 10,
      uniqueStaff,
    };
  }, [filteredAttendance]);

  const monthlySummary = useMemo(() => {
    if (attendancePeriod !== 'monthly') return [];
    const byEmployee = new Map<
      string,
      { employeeId: string; days: number; hours: number; late: number }
    >();
    for (const record of filteredAttendance) {
      const row = byEmployee.get(record.employeeId) || {
        employeeId: record.employeeId,
        days: 0,
        hours: 0,
        late: 0,
      };
      row.days += 1;
      row.hours += record.hoursWorked || 0;
      if (record.status === 'Late') row.late += 1;
      byEmployee.set(record.employeeId, row);
    }
    return Array.from(byEmployee.values())
      .map((row) => ({
        ...row,
        hours: Math.round(row.hours * 10) / 10,
        name: employeeNameById.get(row.employeeId) || row.employeeId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attendancePeriod, filteredAttendance, employeeNameById]);

  const exportPayload = useMemo(() => {
    if (view === 'leave') {
      return {
        filename: 'leave-requests',
        title: 'Leave Requests',
        data: filteredLeaves.map((leave) => ({
          Employee: employeeNameById.get(leave.employeeId) || leave.employeeId,
          Type: leave.leaveType,
          From: formatDate(leave.startDate),
          To: formatDate(leave.endDate),
          Days: leave.daysRequested ?? '',
          Status: leave.status,
          Reason: leave.reason || '',
          Comments: leave.comments || '',
        })),
      };
    }
    if (view === 'attendance') {
      return {
        filename: `attendance-${attendancePeriod}`,
        title: 'Staff Attendance',
        data: filteredAttendance.map((record) => ({
          Employee: employeeNameById.get(record.employeeId) || record.employeeId,
          Date: formatDate(record.attendanceDate),
          Shift: record.shift || '',
          'Check In': formatTime(record.checkInTime),
          'Check Out': formatTime(record.checkOutTime),
          Hours: record.hoursWorked ?? '',
          IP: record.checkInIp || '',
          GPS:
            record.checkInLatitude != null && record.checkInLongitude != null
              ? formatCoords(record.checkInLatitude, record.checkInLongitude)
              : '',
          Premises:
            record.checkInOnPremises == null
              ? ''
              : record.checkInOnPremises
                ? 'On premises'
                : 'Off premises',
        })),
      };
    }
    return {
      filename: 'registered-employees',
      title: 'Registered Employees',
      data: filtered.map((emp) => ({
        Name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        Role: emp.roles?.[0]?.jobTitle || '',
        Email: emp.email || '',
        Phone: emp.phoneNumber || '',
        Section: emp.workingSection || '',
        'Default Shift': normalizeStaffShift(emp.assignedShift),
        Status: emp.employmentStatus || '',
        Branch: BRANCH_NAMES[emp.branchId || ''] || emp.branchId || '',
      })),
    };
  }, [
    view,
    filtered,
    filteredLeaves,
    filteredAttendance,
    employeeNameById,
    attendancePeriod,
  ]);

  const currentAuthUser = authService.getCurrentUser();
  const isExecUser = canCreateSystemAccounts(currentAuthUser);
  const backPath = isAdminUser(currentAuthUser)
    ? '/dashboard/admin'
    : isManagingDirectorUser(currentAuthUser)
      ? authService.getDefaultDashboardPath(currentAuthUser)
      : '/dashboard/purchase-manager';
  const backLabel = isAdminUser(currentAuthUser)
    ? 'Back to Admin'
    : isManagingDirectorUser(currentAuthUser)
      ? 'Back to Dashboard'
      : 'Back to PM Dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="mb-4 flex items-center text-purple-600 transition-colors hover:text-purple-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                {view === 'leave' ? (
                  <CalendarDays className="h-6 w-6 text-purple-600" />
                ) : view === 'attendance' ? (
                  <Clock className="h-6 w-6 text-purple-600" />
                ) : (
                  <Users className="h-6 w-6 text-purple-600" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {view === 'leave'
                    ? 'Leave Requests'
                    : view === 'attendance'
                      ? 'Attendance'
                      : 'Registered Employees'}
                </h1>
                <p className="text-gray-600">
                  {view === 'leave'
                    ? 'Review and approve leave from your registered staff'
                    : view === 'attendance'
                      ? 'View staff attendance by day or by month'
                      : 'Manage default shift, section, and employment status'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ExportButtons
                data={exportPayload.data}
                filename={exportPayload.filename}
                title={exportPayload.title}
                subtitle={`${exportPayload.data.length} row(s)`}
              />
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {view === 'employees' && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      isExecUser
                        ? '/dashboard/admin/create-account'
                        : '/dashboard/purchase-manager/register-employee'
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  <UserPlus className="h-4 w-4" />
                  {isExecUser ? 'Create Account' : 'Register Staff'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 inline-flex rounded-xl border border-purple-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => switchView('employees')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'employees'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Registered Employees
          </button>
          <button
            type="button"
            onClick={() => switchView('leave')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'leave'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Leave Requests
            {leaveStats.pending > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  view === 'leave' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {leaveStats.pending}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => switchView('attendance')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'attendance'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            Attendance
          </button>
        </div>

        {view === 'employees' ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total staff
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.active}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Terminated
                </p>
                <p className="mt-1 text-2xl font-semibold text-red-700">{stats.terminated}</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, email, section…"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All roles</option>
                  {STAFF_PORTAL_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>
          </>
        ) : view === 'leave' ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{leaveStats.total}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending</p>
                <p className="mt-1 text-2xl font-semibold text-amber-700">{leaveStats.pending}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Approved</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{leaveStats.approved}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Not approved
                </p>
                <p className="mt-1 text-2xl font-semibold text-red-700">{leaveStats.rejected}</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee, type, reason…"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <select
                  value={leaveStatusFilter}
                  onChange={(e) => setLeaveStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All leave statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {attendancePeriod === 'daily' ? 'Records today' : 'Records this month'}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{attendanceStats.records}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Staff present
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">
                  {attendanceStats.uniqueStaff}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Checked out
                </p>
                <p className="mt-1 text-2xl font-semibold text-indigo-700">
                  {attendanceStats.checkedOut}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hours logged
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-700">{attendanceStats.hours}</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={attendancePeriod}
                  onChange={(e) => setAttendancePeriod(e.target.value as AttendancePeriod)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                </select>
                {attendancePeriod === 'daily' ? (
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <input
                    type="month"
                    value={attendanceMonth}
                    onChange={(e) => setAttendanceMonth(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  />
                )}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search employee, status, shift…"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {error && !managing && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && !managing && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-700">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-gray-200 bg-white">
            <div className="text-center">
              <HydrationSafeLoader />
              <p className="mt-3 text-gray-600">
                {view === 'leave'
                  ? 'Loading leave requests…'
                  : view === 'attendance'
                    ? 'Loading attendance…'
                    : 'Loading registered employees…'}
              </p>
            </div>
          </div>
        ) : view === 'employees' ? (
          filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-purple-200 bg-white p-12 text-center shadow-sm">
              <Users className="mx-auto h-10 w-10 text-purple-300" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">No registered employees found</h2>
              <p className="mt-2 text-sm text-gray-600">
                Register staff so they can use the attendance & approved-leave portal.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    isExecUser
                      ? '/dashboard/admin/create-account'
                      : '/dashboard/purchase-manager/register-employee'
                  )
                }
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                <UserPlus className="h-4 w-4" />
                {isExecUser ? 'Create Account' : 'Register Staff'}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Shift / Section
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Branch
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((emp) => {
                      const role = emp.roles?.[0]?.jobTitle || '—';
                      const branch = BRANCH_NAMES[emp.branchId] || emp.branchId || '—';
                      const shift = normalizeStaffShift(emp.assignedShift);
                      const def = SHIFT_DEFINITIONS[shift];
                      return (
                        <tr key={emp.id} className="hover:bg-purple-50/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100">
                                {emp.passportPhoto ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={emp.passportPhoto}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Camera className="h-4 w-4 text-purple-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  <Mail className="h-3 w-3" />
                                  {emp.email}
                                </p>
                                {emp.phone && (
                                  <p className="inline-flex items-center gap-1 text-xs text-slate-400">
                                    <Phone className="h-3 w-3" />
                                    {emp.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                              {role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <p className="inline-flex items-center gap-1.5 font-medium">
                              {shift === 'night' ? (
                                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                              ) : (
                                <Sun className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              Default: {def.label}
                            </p>
                            <p className="text-xs text-slate-500">{def.hoursLabel}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {emp.workingSection || 'No section assigned'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {branch}
                            </span>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Hired {formatDate(emp.hireDate)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge(emp.employmentStatus)}`}
                            >
                              {emp.employmentStatus === 'Active' && <CheckCircle2 className="h-3 w-3" />}
                              {emp.employmentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openManage(emp)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-3 text-xs text-slate-500">
                Showing {filtered.length} of {employees.length} registered employee
                {employees.length === 1 ? '' : 's'}
              </div>
            </div>
          )
        ) : view === 'leave' ? (
          filteredLeaves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-white p-12 text-center shadow-sm">
            <CalendarDays className="mx-auto h-10 w-10 text-indigo-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">No leave requests found</h2>
            <p className="mt-2 text-sm text-gray-600">
              When registered staff apply for leave, their requests appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Dates
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Days
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-indigo-50/40">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {employeeNameById.get(leave.employeeId) || leave.employeeId}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{leave.leaveType}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{leave.daysRequested}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${leaveStatusBadge(leave.status)}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                        <p className="truncate" title={leave.reason}>
                          {leave.reason || '—'}
                        </p>
                        {leave.comments && (
                          <p className="mt-0.5 truncate text-xs text-slate-400" title={leave.comments}>
                            Note: {leave.comments}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {leave.status === 'Pending' ? (
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={leaveActionId === leave.id}
                              onClick={() => handleLeaveDecision(leave, 'Approved')}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {leaveActionId === leave.id ? '…' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={leaveActionId === leave.id}
                              onClick={() => handleLeaveDecision(leave, 'Rejected')}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Not approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-xs text-slate-500">
              Showing {filteredLeaves.length} of {leaveRequests.length} leave request
              {leaveRequests.length === 1 ? '' : 's'}
            </div>
          </div>
        )
        ) : filteredAttendance.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sky-200 bg-white p-12 text-center shadow-sm">
            <Clock className="mx-auto h-10 w-10 text-sky-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">No attendance found</h2>
            <p className="mt-2 text-sm text-gray-600">
              {attendancePeriod === 'daily'
                ? 'No check-ins for the selected day.'
                : 'No attendance records for the selected month.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {attendancePeriod === 'monthly' && monthlySummary.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">Monthly summary</h2>
                  <p className="text-xs text-slate-500">Days and hours per employee for {attendanceMonth}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Days attended
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Hours
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Late
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthlySummary.map((row) => (
                        <tr key={row.employeeId} className="hover:bg-sky-50/40">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.days}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.hours} h</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.late}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  {attendancePeriod === 'daily' ? 'Daily attendance' : 'Daily records in month'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Premises GPS {PREMISES_LOCATION.latitude.toFixed(6)},{' '}
                  {PREMISES_LOCATION.longitude.toFixed(6)} · within {PREMISES_RADIUS_METERS} m =
                  on site
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Shift
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Check in
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Check out
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hours
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        IP address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        GPS
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Premises
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAttendance.map((record) => {
                      const shift = normalizeStaffShift(record.shift);
                      const def = SHIFT_DEFINITIONS[shift];
                      const presence =
                        record.checkInOnPremises != null && record.checkInDistanceMeters != null
                          ? {
                              hasLocation: true as const,
                              onPremises: record.checkInOnPremises,
                              distanceMeters: record.checkInDistanceMeters,
                            }
                          : evaluatePremisesPresence(
                              record.checkInLatitude,
                              record.checkInLongitude
                            );
                      return (
                        <tr key={record.id} className="hover:bg-sky-50/40">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {employeeNameById.get(record.employeeId) || record.employeeId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatDate(record.attendanceDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              {shift === 'night' ? (
                                <Moon className="h-3.5 w-3.5 text-indigo-500" />
                              ) : (
                                <Sun className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              {def.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatTime(record.checkInTime)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatTime(record.checkOutTime)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {record.hoursWorked != null ? `${record.hoursWorked} h` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">
                            {record.checkInIp || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">
                            <p>
                              {formatCoords(record.checkInLatitude, record.checkInLongitude)}
                            </p>
                            {record.checkInAccuracyMeters != null && (
                              <p className="text-[10px] text-slate-400">
                                ±{record.checkInAccuracyMeters} m
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!presence.hasLocation ? (
                              <span className="text-xs text-slate-400">No GPS</span>
                            ) : presence.onPremises ? (
                              <div>
                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                  On premises
                                </span>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {presence.distanceMeters} m from site
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                  Off premises
                                </span>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {presence.distanceMeters} m from site
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 px-4 py-3 text-xs text-slate-500">
                Showing {filteredAttendance.length} attendance record
                {filteredAttendance.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        )}
      </div>

      {managing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Manage {managing.firstName} {managing.lastName}
                </h2>
                <p className="text-sm text-slate-500">
                  {managing.roles?.[0]?.jobTitle || 'Staff'} · {managing.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeManage}
                disabled={saving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Default shift (fallback)
                </label>
                <div className="relative">
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value as StaffShift)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  >
                    {STAFF_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {SHIFT_DEFINITIONS[s].label} · {SHIFT_DEFINITIONS[s].hoursLabel}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    {editShift === 'night' ? (
                      <Moon className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <Sun className="h-4 w-4 text-amber-500" />
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used when staff check in without a different shift for that day
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Working section
                </label>
                <select
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No section assigned</option>
                  {SUPERMARKET_SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Employment status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as Employee['employmentStatus'])
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-4">
              {canDeleteStaff(managing) ? (
                <button
                  type="button"
                  onClick={handleDeleteStaff}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {saving ? 'Working…' : 'Delete staff'}
                </button>
              ) : (
                <span className="text-xs text-slate-400">
                  PM can delete only staff they registered
                </span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeManage}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  disabled={saving}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
