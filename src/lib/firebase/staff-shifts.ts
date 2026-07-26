/** Staff shift schedules assigned by Purchase Manager */

export type StaffShift = 'day' | 'night';

export interface ShiftDefinition {
  id: StaffShift;
  label: string;
  /** Display range, e.g. "7:50 AM – 10:00 PM" */
  hoursLabel: string;
  startMinutes: number; // minutes from midnight
  endMinutes: number; // minutes from midnight (may be next day for night)
  /** Scheduled length in hours */
  durationHours: number;
}

function minutesBetween(start: number, end: number): number {
  if (end > start) return end - start;
  // overnight
  return 24 * 60 - start + end;
}

const DAY_START = 7 * 60 + 50; // 7:50 AM
const DAY_END = 22 * 60; // 10:00 PM
const NIGHT_START = 19 * 60; // 7:00 PM
const NIGHT_END = 8 * 60 + 30; // 8:30 AM

export const SHIFT_DEFINITIONS: Record<StaffShift, ShiftDefinition> = {
  day: {
    id: 'day',
    label: 'Day',
    hoursLabel: '7:50 AM – 10:00 PM',
    startMinutes: DAY_START,
    endMinutes: DAY_END,
    durationHours: minutesBetween(DAY_START, DAY_END) / 60, // 14h 10m
  },
  night: {
    id: 'night',
    label: 'Night',
    hoursLabel: '7:00 PM – 8:30 AM',
    startMinutes: NIGHT_START,
    endMinutes: NIGHT_END,
    durationHours: minutesBetween(NIGHT_START, NIGHT_END) / 60, // 13h 30m
  },
};

export const STAFF_SHIFTS: StaffShift[] = ['day', 'night'];

export function normalizeStaffShift(value?: string | null): StaffShift {
  return value === 'night' ? 'night' : 'day';
}

export function getShiftDefinition(shift?: string | null): ShiftDefinition {
  return SHIFT_DEFINITIONS[normalizeStaffShift(shift)];
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

/** Local calendar key yyyy-mm-dd */
export function toShiftDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
