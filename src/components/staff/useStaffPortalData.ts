'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { authService, AuthUser } from '@/lib/firebase/auth';
import { firestoreServices } from '@/lib/firebase/firestore-service';
import { isStaffPortalUser } from '@/lib/firebase/staff-portal-roles';
import {
  getEmploymentLoginBlockMessage,
  isEmployeeAllowedToLogin,
} from '@/lib/firebase/employment-access';
import type { Attendance, LeaveRequest } from '@/lib/firebase/models';
import {
  computeMonthlyAttendanceStats,
  getAttendanceRangeForCharts,
  mergeAttendanceShiftsIntoMap,
  resolveShiftForDay,
  toShiftDateKey,
  type MonthlyAttendanceStat,
} from './monthly-attendance-stats';
import {
  getShiftDefinition,
  normalizeStaffShift,
  type StaffShift,
} from '@/lib/firebase/staff-shifts';
import { captureCheckInLocation } from '@/lib/premises-location';

export type LeaveType = LeaveRequest['leaveType'];
export type { MonthlyAttendanceStat };
export type { StaffShift };
export { resolveShiftForDay, toShiftDateKey };

export const LEAVE_TYPES: LeaveType[] = [
  'Annual',
  'Sick',
  'Maternity',
  'Paternity',
  'Emergency',
  'Unpaid',
];

export function formatStaffTime(ts?: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatStaffDate(ts?: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function useStaffPortalData() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [todayShift, setTodayShift] = useState<StaffShift>('day');
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [shiftByDate, setShiftByDate] = useState<Map<string, StaffShift>>(new Map());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyAttendanceStat[]>([]);

  const employeeId = user?.uid || user?.employee?.id || '';
  const employeeName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.displayName || 'Staff';
  const jobTitle = user?.employee?.roles?.[0]?.jobTitle || 'Staff';
  const defaultShift = normalizeStaffShift(user?.employee?.assignedShift);

  const approvedLeave = leaveRequests.filter((l) => l.status === 'Approved');
  const pendingLeave = leaveRequests.filter((l) => l.status === 'Pending');

  const loadData = useCallback(async (uid: string, fallbackShift?: string | null) => {
    setError(null);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEndMs = new Date();
      todayEndMs.setHours(23, 59, 59, 999);
      const { start: chartStart, end: chartEnd } = getAttendanceRangeForCharts();
      const defShift = normalizeStaffShift(fallbackShift);

      const [chartRecords, leaveRecords, shiftMap] = await Promise.all([
        firestoreServices.attendance.getEmployeeAttendance(uid, chartStart, chartEnd),
        firestoreServices.leaveRequest.getEmployeeLeaveRequests(uid),
        firestoreServices.staffShiftAssignment.getShiftMapForRange(uid, chartStart, chartEnd),
      ]);

      const todayRecord =
        chartRecords.find((r) => {
          const ms = r.attendanceDate?.toMillis?.() ?? 0;
          return ms >= todayStart.getTime() && ms <= todayEndMs.getTime();
        }) || null;

      const resolvedToday: StaffShift = resolveShiftForDay({
        dateKey: toShiftDateKey(todayStart),
        attendanceShift: todayRecord?.shift,
        shiftMap,
        defaultShift: defShift,
      });

      // Merge attended days into map so each day keeps its own shift forever
      const lockedMap = mergeAttendanceShiftsIntoMap(chartRecords, shiftMap);

      setTodayAttendance(todayRecord);
      setTodayShift(resolvedToday);
      setShiftByDate(lockedMap);
      setAttendanceHistory(
        [...chartRecords].sort((a, b) => {
          const aTime = a.attendanceDate?.toMillis?.() ?? 0;
          const bTime = b.attendanceDate?.toMillis?.() ?? 0;
          return bTime - aTime;
        })
      );
      setMonthlyStats(
        computeMonthlyAttendanceStats(chartRecords, {
          shiftMap: lockedMap,
          defaultShift: defShift,
        })
      );
      setLeaveRequests(leaveRecords);
    } catch (err) {
      console.error('Failed to load staff portal data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  }, []);

  const bootstrapUser = useCallback(
    async (authUser: AuthUser | null) => {
      if (!authUser) {
        router.replace('/auth/login');
        return;
      }

      if (authUser.employee && !isEmployeeAllowedToLogin(authUser.employee)) {
        const status = authUser.employee.employmentStatus;
        const message = getEmploymentLoginBlockMessage(status);
        await authService.signOut();
        router.replace(
          `/auth/login?status=${encodeURIComponent(status || 'Inactive')}&blocked=${encodeURIComponent(message)}`
        );
        return;
      }

      if (!isStaffPortalUser(authUser.employee?.roles)) {
        router.replace('/dashboard');
        return;
      }

      setUser(authUser);
      try {
        await loadData(authUser.uid, authUser.employee?.assignedShift);
      } finally {
        setLoading(false);
      }
    },
    [router, loadData]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async (authUser: AuthUser | null) => {
      if (cancelled) return;
      await bootstrapUser(authUser);
    };

    const existing = authService.getCurrentUser();
    if (existing) {
      void run(existing);
    }

    const unsubscribe = authService.onAuthStateChange((authUser) => {
      void run(authUser);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [bootstrapUser]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCheckIn = async (shift?: StaffShift) => {
    if (!employeeId) return;
    clearMessages();
    setActionLoading(true);
    try {
      const useShift = shift || todayShift || defaultShift;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Capture GPS + IP for premises verification (PM attendance view)
      const location = await captureCheckInLocation();
      const {
        latitude,
        longitude,
        accuracyMeters,
        distanceMeters,
        onPremises,
        ipAddress,
        gpsError,
        ipError,
      } = location;

      if (gpsError) {
        console.warn('Check-in GPS capture failed:', gpsError);
      }
      if (ipError) {
        console.warn('Check-in IP capture failed:', ipError);
      }

      // Persist THIS day only — does not change other days' shifts
      try {
        await firestoreServices.staffShiftAssignment.assignForDate({
          employeeId,
          date: today,
          shift: useShift,
          assignedBy: employeeId,
          assignedByName: employeeName,
          notes: 'Recorded at check-in',
        });
      } catch (assignErr) {
        console.warn('Could not save daily shift assignment (check-in still continues):', assignErr);
      }

      await firestoreServices.attendance.checkIn(employeeId, {
        shift: useShift,
        ipAddress,
        latitude,
        longitude,
        accuracyMeters,
        distanceMeters,
        onPremises,
      });

      const locationNote =
        onPremises === true
          ? ' · On premises'
          : onPremises === false
            ? ' · Off premises'
            : latitude == null
              ? gpsError
                ? ` · GPS unavailable (${gpsError})`
                : ' · GPS unavailable — enable location for this site'
              : '';

      const ipNote =
        !ipAddress && ipError ? ` · IP not captured (${ipError})` : '';

      setSuccess(
        `Checked in on ${getShiftDefinition(useShift).label} shift for today only (${getShiftDefinition(useShift).hoursLabel})${locationNote}${ipNote}`
      );
      await loadData(employeeId, user?.employee?.assignedShift);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) return;
    clearMessages();
    setActionLoading(true);
    try {
      await firestoreServices.attendance.checkOut(employeeId);
      setSuccess('Checked out successfully');
      await loadData(employeeId, user?.employee?.assignedShift);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const applyForLeave = async (input: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    if (!employeeId) return;
    clearMessages();

    if (!input.startDate || !input.endDate) {
      setError('Start and end dates are required');
      return;
    }
    if (!input.reason.trim()) {
      setError('Please provide a reason for leave');
      return;
    }

    const start = new Date(input.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(input.endDate);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      setError('End date cannot be before start date');
      return;
    }

    setActionLoading(true);
    try {
      await firestoreServices.leaveRequest.createLeaveRequest({
        employeeId,
        leaveType: input.leaveType,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        daysRequested: 0, // recalculated in service
        reason: input.reason.trim(),
      });
      setSuccess('Leave application submitted. Waiting for HR approval.');
      await loadData(employeeId, user?.employee?.assignedShift);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave application');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelLeaveRequest = async (leaveRequestId: string) => {
    if (!employeeId) return;
    clearMessages();
    setActionLoading(true);
    try {
      await firestoreServices.leaveRequest.update(leaveRequestId, {
        status: 'Cancelled',
      });
      setSuccess('Leave application cancelled');
      await loadData(employeeId, user?.employee?.assignedShift);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel leave application');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    user,
    loading,
    actionLoading,
    error,
    success,
    todayAttendance,
    todayShift,
    setTodayShift,
    defaultShift,
    attendanceHistory,
    shiftByDate,
    monthlyStats,
    leaveRequests,
    approvedLeave,
    pendingLeave,
    employeeId,
    employeeName,
    jobTitle,
    loadData,
    handleCheckIn,
    handleCheckOut,
    applyForLeave,
    cancelLeaveRequest,
    checkedIn: Boolean(todayAttendance?.checkInTime),
    checkedOut: Boolean(todayAttendance?.checkOutTime),
  };
}
