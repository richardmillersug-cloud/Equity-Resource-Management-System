'use client';

import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  Clock,
  CalendarCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FilePlus2,
  Send,
  Moon,
  Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';
import {
  formatStaffDate,
  formatStaffTime,
  useStaffPortalData,
  resolveShiftForDay,
  toShiftDateKey,
  LEAVE_TYPES,
  type LeaveType,
} from '@/components/staff/useStaffPortalData';
import { STAFF_PORTAL_PATH } from '@/lib/firebase/staff-portal-roles';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { StaffAttendanceCharts } from '@/components/staff/StaffAttendanceCharts';
import { getShiftDefinition } from '@/lib/firebase/staff-shifts';
import { EQUITY_BRAND } from '@/components/staff/brand';

export function StaffMessages({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  return (
    <>
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </>
  );
}

export function StaffAttendancePanel() {
  const {
    loading,
    actionLoading,
    error,
    success,
    todayAttendance,
    todayShift,
    setTodayShift,
    attendanceHistory,
    shiftByDate,
    defaultShift,
    employeeId,
    loadData,
    handleCheckIn,
    handleCheckOut,
    checkedIn,
    checkedOut,
    user,
  } = useStaffPortalData();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading attendance…</p>
        </div>
      </div>
    );
  }

  const shiftDef = getShiftDefinition(todayAttendance?.shift || todayShift);

  return (
    <div className="w-full space-y-4 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Today&apos;s Attendance</h1>
        </div>
        <button
          type="button"
          onClick={() => employeeId && loadData(employeeId, user?.employee?.assignedShift)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <StaffMessages error={error} success={success} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Today&apos;s shift (can change day to day)
          </p>
          {checkedIn ? (
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {shiftDef.label} · {shiftDef.hoursLabel} ({shiftDef.durationHours.toFixed(1)} h)
            </p>
          ) : (
            <select
              value={todayShift}
              onChange={(e) => setTodayShift(e.target.value as 'day' | 'night')}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              <option value="day">Day · 7:50 AM – 10:00 PM</option>
              <option value="night">Night · 7:00 PM – 8:30 AM</option>
            </select>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Check in</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {formatStaffTime(todayAttendance?.checkInTime)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Check out</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {formatStaffTime(todayAttendance?.checkOutTime)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Hours worked</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {todayAttendance?.hoursWorked != null ? `${todayAttendance.hoursWorked} h` : '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleCheckIn(todayShift)}
            disabled={actionLoading || checkedIn}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            style={{ backgroundColor: '#45B04A' }}
          >
            <LogIn className="h-4 w-4" />
            {checkedIn ? 'Already checked in' : 'Record check in'}
          </button>
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={actionLoading || !checkedIn || checkedOut}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            style={{ backgroundColor: '#F49121' }}
          >
            <LogOut className="h-4 w-4" />
            {checkedOut ? 'Already checked out' : 'Record check out'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Days attended</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each day keeps its own shift — Day today does not change tomorrow
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {attendanceHistory.length} record{attendanceHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {attendanceHistory.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            No attendance recorded yet. Check in to start tracking days and shifts.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Shift</th>
                  <th className="pb-2 pr-3 font-medium">Check in</th>
                  <th className="pb-2 pr-3 font-medium">Check out</th>
                  <th className="pb-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {attendanceHistory.map((record) => {
                  const ms = record.attendanceDate?.toMillis?.();
                  const key = ms ? toShiftDateKey(new Date(ms)) : '';
                  const shiftId = resolveShiftForDay({
                    dateKey: key,
                    attendanceShift: record.shift,
                    shiftMap: shiftByDate,
                    defaultShift,
                  });
                  const shift = getShiftDefinition(shiftId);
                  const isExplicit = Boolean(record.shift || (key && shiftByDate.get(key)));
                  return (
                    <tr key={record.id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-100">
                        {formatStaffDate(record.attendanceDate)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{
                            borderColor:
                              shift.id === 'night' ? EQUITY_BRAND.purple : EQUITY_BRAND.orange,
                            color: shift.id === 'night' ? EQUITY_BRAND.purple : EQUITY_BRAND.orange,
                          }}
                        >
                          {shift.id === 'night' ? (
                            <Moon className="h-3 w-3" />
                          ) : (
                            <Sun className="h-3 w-3" />
                          )}
                          {shift.label}
                        </span>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {shift.hoursLabel}
                          {!isExplicit ? ' · default' : ' · this day only'}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                        {formatStaffTime(record.checkInTime)}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                        {formatStaffTime(record.checkOutTime)}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {record.hoursWorked != null
                          ? `${record.hoursWorked} h`
                          : `${shift.durationHours.toFixed(1)} h`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function StaffLeavePanel() {
  const {
    loading,
    actionLoading,
    error,
    success,
    leaveRequests,
    employeeId,
    loadData,
    applyForLeave,
    cancelLeaveRequest,
  } = useStaffPortalData();

  const [leaveType, setLeaveType] = useState<LeaveType>('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading leave…</p>
        </div>
      </div>
    );
  }

  const statusStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
      case 'Rejected':
        return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyForLeave({ leaveType, startDate, endDate, reason });
    setStartDate('');
    setEndDate('');
    setReason('');
    setLeaveType('Annual');
  };

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full space-y-6 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Leave</h1>
        </div>
        <button
          type="button"
          onClick={() => employeeId && loadData(employeeId)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <StaffMessages error={error} success={success} />

      {/* Apply for leave */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
          <FilePlus2 className="h-5 w-5" style={{ color: '#6A2B81' }} />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Apply for leave</h2>
        </div>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Submit a request for HR to review. Approved leave will appear in your records below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Leave type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:block" />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                min={todayIso}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || todayIso}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Briefly explain why you need leave"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#6A2B81' }}
          >
            <Send className="h-4 w-4" />
            {actionLoading ? 'Submitting…' : 'Submit leave application'}
          </button>
        </form>
      </section>

      {/* Leave history */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Your leave requests</h2>

        {leaveRequests.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            No leave applications yet. Submit one above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {leaveRequests.map((leave) => (
              <li
                key={leave.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{leave.leaveType} leave</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formatStaffDate(leave.startDate)} → {formatStaffDate(leave.endDate)}
                  </p>
                  {leave.reason && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{leave.reason}</p>
                  )}
                  {leave.comments && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      HR note: {leave.comments}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(leave.status)}`}
                  >
                    {leave.status}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {leave.daysRequested} day(s)
                  </p>
                  {leave.status === 'Pending' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => cancelLeaveRequest(leave.id)}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function StaffHomePanel() {
  const router = useRouter();
  const {
    loading,
    employeeName,
    jobTitle,
    todayAttendance,
    monthlyStats,
    approvedLeave,
    pendingLeave,
    checkedIn,
    checkedOut,
    user,
  } = useStaffPortalData();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 pb-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <StaffAvatar
            photoUrl={user?.employee?.passportPhoto}
            name={employeeName}
            size="lg"
            previewable
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
              Welcome, {employeeName}
            </h1>
            <p className="text-sm font-medium" style={{ color: '#F49121' }}>{jobTitle}</p>
            {(() => {
              const shift = getShiftDefinition(user?.employee?.assignedShift);
              return (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Default shift · {shift.label} ({shift.hoursLabel}) — PM can assign day or night per date
                </p>
              );
            })()}
            <p className="mt-1 text-xs text-slate-400">
              Record attendance, apply for leave, and check your leave status.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push(`${STAFF_PORTAL_PATH}/attendance`)}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
        >
          <div className="mb-3 flex items-center justify-between">
            <Clock className="h-5 w-5" style={{ color: '#45B04A' }} />
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Attendance</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {checkedOut
              ? `Checked out at ${formatStaffTime(todayAttendance?.checkOutTime)}`
              : checkedIn
                ? `Checked in at ${formatStaffTime(todayAttendance?.checkInTime)}`
                : 'Not checked in yet today'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push(`${STAFF_PORTAL_PATH}/leave`)}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
        >
          <div className="mb-3 flex items-center justify-between">
            <CalendarCheck className="h-5 w-5" style={{ color: '#6A2B81' }} />
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Leave</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {pendingLeave.length > 0
              ? `${pendingLeave.length} pending application${pendingLeave.length === 1 ? '' : 's'}`
              : approvedLeave.length === 0
                ? 'Apply for leave or view approvals'
                : `${approvedLeave.length} approved leave record${approvedLeave.length === 1 ? '' : 's'}`}
          </p>
        </button>
      </div>

      <div className="min-w-0 w-full flex-1">
        <StaffAttendanceCharts
          stats={monthlyStats}
          shift={user?.employee?.assignedShift}
        />
      </div>
    </div>
  );
}
