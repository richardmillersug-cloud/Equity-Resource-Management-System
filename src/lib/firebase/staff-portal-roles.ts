/**
 * Roles that only use the staff portal (attendance in/out + approved leave).
 * Accounts for these roles are created by the Purchase Manager.
 */

export const STAFF_PORTAL_PATH = '/dashboard/staff';

export const STAFF_PORTAL_ROLES = [
  'Manager',
  'Assistant Manager',
  'Stock Manager',
  'Attendant',
  'Supervisor',
] as const;

export type StaffPortalRole = (typeof STAFF_PORTAL_ROLES)[number];

export function isStaffPortalRole(jobTitle: string | undefined | null): boolean {
  if (!jobTitle) return false;
  const normalized = jobTitle.trim().toLowerCase();
  return STAFF_PORTAL_ROLES.some((role) => role.toLowerCase() === normalized);
}

export function userHasStaffPortalRole(roles: Array<{ jobTitle: string }> | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => isStaffPortalRole(r.jobTitle));
}

/** Primary role is a staff-portal-only role (no full dashboard). */
export function isStaffPortalUser(roles: Array<{ jobTitle: string }> | undefined): boolean {
  if (!roles?.length) return false;
  return isStaffPortalRole(roles[0]?.jobTitle);
}
