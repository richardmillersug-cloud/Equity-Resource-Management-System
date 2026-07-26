import { getRoleByTitle } from './system-roles';
import { isStaffPortalRole, STAFF_PORTAL_PATH } from './staff-portal-roles';

/** Normalize job titles for reliable route matching. */
export function normalizeJobTitle(jobTitle: string | undefined | null): string {
  return (jobTitle || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const ROLE_ROUTE_ALIASES: Record<string, string> = {
  'system admin': '/dashboard/admin',
  admin: '/dashboard/admin',
  'managing director': '/dashboard/managing-director',
  accountant: '/dashboard/analytics',
  'purchase manager': '/dashboard/purchase-manager',
  'purchasing manager': '/dashboard/purchase-manager',
  'hr manager': '/dashboard/hr',
  hr: '/dashboard/hr',
  receiver: '/dashboard/receiver',
  auditor: '/dashboard/auditor',
  cashier: '/dashboard',
  'customer service': '/dashboard',
};

/**
 * Resolve post-login destination from primary job title.
 * Staff portal roles always go to /dashboard/staff.
 */
export function resolveDashboardPath(jobTitle: string | undefined | null): string {
  const normalized = normalizeJobTitle(jobTitle);
  if (!normalized) return '/dashboard';

  if (isStaffPortalRole(jobTitle)) {
    return STAFF_PORTAL_PATH;
  }

  const systemRole = getRoleByTitle(jobTitle || '');
  if (systemRole?.dashboardPath) {
    // Guard: never send staff-portal roles to a full dashboard via stale system config
    if (isStaffPortalRole(systemRole.jobTitle)) {
      return STAFF_PORTAL_PATH;
    }
    return systemRole.dashboardPath;
  }

  return ROLE_ROUTE_ALIASES[normalized] || '/dashboard';
}

export function resolveDashboardPathFromRoles(
  roles: Array<{ jobTitle: string }> | undefined | null
): string {
  return resolveDashboardPath(roles?.[0]?.jobTitle);
}
