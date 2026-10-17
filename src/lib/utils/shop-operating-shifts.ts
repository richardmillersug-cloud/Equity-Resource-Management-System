/**
 * Shop operating shifts (tills), not HR staff shifts.
 *
 * Shop1 runs overnight: opens ~9:00 PM and closes ~9:00 AM the next calendar day.
 * When Shop1 closes, Server starts the same morning and runs until Shop1 opens again.
 *
 * The shift date is always the date the shift started, so 2:00 AM sales belong
 * to yesterday's Shop1 night, not to the new calendar day.
 */

export type OperatingShiftId = 'shop1' | 'server';

export interface OperatingShift {
  id: OperatingShiftId;
  label: string;
  hoursLabel: string;
  shiftDate: Date | null;
  shiftDateKey: string;
}

/** Shop1 opening time (same calendar evening). */
export const SHOP1_OPEN_MINUTES = 21 * 60;
/** Shop1 closing / Server starting time (next calendar morning). */
export const SHOP1_CLOSE_MINUTES = 9 * 60;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toShiftDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatShiftDateKey(key: string): string {
  if (!key || key === 'undated') return '—';
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString('en-UG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Map a sale timestamp onto Shop1 night or Server day.
 * 08:59 → Shop1 of the previous evening; 09:00 → Server of that morning.
 */
export function resolveOperatingShift(at: Date | null): OperatingShift {
  if (!at) {
    return {
      id: 'server',
      label: 'Server',
      hoursLabel: '9:00 AM – 9:00 PM',
      shiftDate: null,
      shiftDateKey: 'undated',
    };
  }

  const minutes = minutesOfDay(at);
  const shop1Open = minutes >= SHOP1_OPEN_MINUTES || minutes < SHOP1_CLOSE_MINUTES;

  if (shop1Open) {
    const shiftDate = minutes < SHOP1_CLOSE_MINUTES ? addLocalDays(at, -1) : startOfLocalDay(at);
    return {
      id: 'shop1',
      label: 'Shop1',
      hoursLabel: '9:00 PM – 9:00 AM',
      shiftDate,
      shiftDateKey: toShiftDateKey(shiftDate),
    };
  }

  const shiftDate = startOfLocalDay(at);
  return {
    id: 'server',
    label: 'Server',
    hoursLabel: '9:00 AM – 9:00 PM',
    shiftDate,
    shiftDateKey: toShiftDateKey(shiftDate),
  };
}
