import type { Attendance } from '@/lib/firebase/models';
import {
  formatHours,
  getShiftDefinition,
  normalizeStaffShift,
  toShiftDateKey,
  type StaffShift,
} from '@/lib/firebase/staff-shifts';

export const MONTHS_AHEAD = 6;

export interface MonthlyAttendanceStat {
  key: string;
  label: string;
  year: number;
  month: number; // 0-11
  /** Expected hours for full month from per-day shift assignments */
  required: number;
  /** Gained hours from attendance using each day's shift */
  gained: number;
  gainedPercent: number;
  expectedPercent: number;
  /** Default/fallback shift label for UI */
  shift: StaffShift;
  hoursPerShift: number;
  daysInMonth: number;
  expectedDays: number;
  daysAttended: number;
  /** Days with an explicit Day assignment (not painted from default) */
  dayShiftDays: number;
  /** Days with an explicit Night assignment */
  nightShiftDays: number;
}

export function countDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateKey(year: number, month: number, day: number): string {
  return toShiftDateKey(new Date(year, month, day));
}

/**
 * Resolve shift for ONE calendar day only.
 * Order: attendance.shift (locked that day) → PM assignment that day → default fallback.
 * Never copies today's shift onto other days.
 */
export function resolveShiftForDay(options: {
  dateKey: string;
  attendanceShift?: string | null;
  shiftMap?: Map<string, StaffShift>;
  defaultShift?: string | null;
}): StaffShift {
  if (options.attendanceShift) {
    return normalizeStaffShift(options.attendanceShift);
  }
  const fromMap = options.shiftMap?.get(options.dateKey);
  if (fromMap) return fromMap;
  return normalizeStaffShift(options.defaultShift);
}

function attendanceDayKey(record: Attendance): string | null {
  const ms = record.attendanceDate?.toMillis?.();
  if (!ms) return null;
  return toShiftDateKey(new Date(ms));
}

/** Merge each attendance record's shift into the map — one day at a time, no bleed */
export function mergeAttendanceShiftsIntoMap(
  records: Attendance[],
  shiftMap: Map<string, StaffShift>
): Map<string, StaffShift> {
  const merged = new Map(shiftMap);
  for (const record of records) {
    if (!record.shift) continue;
    const key = attendanceDayKey(record);
    if (!key) continue;
    merged.set(key, normalizeStaffShift(record.shift));
  }
  return merged;
}

function isAttended(record: Attendance): boolean {
  if (record.status === 'Absent') return false;
  if (record.status === 'Half Day') return true;
  return Boolean(record.checkInTime || record.status === 'Present' || record.status === 'Late');
}

function creditForRecord(
  record: Attendance,
  shiftMap: Map<string, StaffShift>,
  defaultShift: StaffShift
): number {
  if (!isAttended(record)) return 0;
  const key = attendanceDayKey(record);
  if (!key) return 0;
  const resolved = resolveShiftForDay({
    dateKey: key,
    attendanceShift: record.shift,
    shiftMap,
    defaultShift,
  });
  const hours = getShiftDefinition(resolved).durationHours;
  if (record.status === 'Half Day') return hours / 2;
  return hours;
}

function toPercent(gained: number, required: number): number {
  if (required <= 0) return 0;
  return Math.round((gained / required) * 1000) / 10;
}

/** Build expected hours day-by-day; each date uses only that date's shift */
export function computeMonthExpected(
  year: number,
  month: number,
  shiftMap: Map<string, StaffShift>,
  defaultShift: StaffShift
): { required: number; expectedDays: number; dayShiftDays: number; nightShiftDays: number } {
  const daysInMonth = countDaysInMonth(year, month);
  let required = 0;
  let dayShiftDays = 0;
  let nightShiftDays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dateKey(year, month, day);
    const explicit = shiftMap.get(key);
    const shift = explicit || defaultShift;
    required += getShiftDefinition(shift).durationHours;

    // Counts only explicit per-day entries (Day on the 1st never marks the 2nd)
    if (explicit === 'day') dayShiftDays += 1;
    if (explicit === 'night') nightShiftDays += 1;
  }

  return {
    required: Math.round(required * 10) / 10,
    expectedDays: daysInMonth,
    dayShiftDays,
    nightShiftDays,
  };
}

export function computeMonthlyAttendanceStats(
  records: Attendance[],
  options?: {
    shiftMap?: Map<string, StaffShift>;
    defaultShift?: string | null;
    from?: Date;
    count?: number;
  }
): MonthlyAttendanceStat[] {
  const from = options?.from ?? new Date();
  const count = options?.count ?? MONTHS_AHEAD;
  const defaultShift = normalizeStaffShift(options?.defaultShift);
  const baseMap = options?.shiftMap ?? new Map<string, StaffShift>();
  const shiftMap = mergeAttendanceShiftsIntoMap(records, baseMap);

  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const months: MonthlyAttendanceStat[] = [];
  const creditByMonth = new Map<string, number>();
  const daysByMonth = new Map<string, Set<string>>();

  for (let i = 0; i < count; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const y = date.getFullYear();
    const m = date.getMonth();
    const key = `${y}-${m}`;
    const expected = computeMonthExpected(y, m, shiftMap, defaultShift);
    const def = getShiftDefinition(defaultShift);

    months.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      year: y,
      month: m,
      required: expected.required,
      gained: 0,
      gainedPercent: 0,
      expectedPercent: 100,
      shift: def.id,
      hoursPerShift: def.durationHours,
      daysInMonth: expected.expectedDays,
      expectedDays: expected.expectedDays,
      daysAttended: 0,
      dayShiftDays: expected.dayShiftDays,
      nightShiftDays: expected.nightShiftDays,
    });
    creditByMonth.set(key, 0);
    daysByMonth.set(key, new Set());
  }

  for (const record of records) {
    const dayKey = attendanceDayKey(record);
    if (!dayKey) continue;
    const ms = record.attendanceDate!.toMillis();
    const d = new Date(ms);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const daySet = daysByMonth.get(monthKey);
    if (!daySet || daySet.has(dayKey)) continue;

    const credit = creditForRecord(record, shiftMap, defaultShift);
    if (credit <= 0) continue;

    daySet.add(dayKey);
    creditByMonth.set(monthKey, (creditByMonth.get(monthKey) || 0) + credit);
  }

  return months.map((month) => {
    const gained = Math.round((creditByMonth.get(month.key) || 0) * 10) / 10;
    return {
      ...month,
      gained,
      gainedPercent: toPercent(gained, month.required),
      daysAttended: daysByMonth.get(month.key)?.size ?? 0,
    };
  });
}

export function getAttendanceRangeForCharts(from: Date = new Date(), count = MONTHS_AHEAD) {
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(from.getFullYear(), from.getMonth() + count, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export {
  formatHours,
  getShiftDefinition,
  normalizeStaffShift,
  toPercent as hoursToPercent,
  toShiftDateKey,
};
