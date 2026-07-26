import { AuthUser } from './auth';

/** Unified administrator role (business + platform). */
export const ADMIN_ROLE = 'Admin';

/** Legacy title — treated as Admin for backward compatibility. */
export const LEGACY_SYSTEM_ADMIN_ROLE = 'System Admin';

export const ADMIN_BASE_PATH = '/dashboard/admin';
export const ADMIN_PLATFORM_PATH = '/dashboard/system-admin';

/** Sidebar entries shown for Admin accounts (platform oversight only). */
export const ADMIN_NAV_ITEM_IDS = [
  'admin-home',
  'admin-roles',
  'admin-accountability',
  'admin-sessions',
  'admin-users',
  'admin-create-account',
  'admin-registered-employees',
  'admin-security',
] as const;

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user?.employee?.roles?.length) return false;
  return user.employee.roles.some((r) => {
    const title = r.jobTitle.toLowerCase();
    return title === ADMIN_ROLE.toLowerCase() || title === LEGACY_SYSTEM_ADMIN_ROLE.toLowerCase();
  });
}

export function isManagingDirectorUser(user: AuthUser | null | undefined): boolean {
  if (!user?.employee?.roles?.length) return false;
  return user.employee.roles.some(
    (r) => r.jobTitle.toLowerCase() === 'managing director'
  );
}

/** Only Admin (super admin) and Managing Director may create system accounts. */
export function canCreateSystemAccounts(user: AuthUser | null | undefined): boolean {
  return isAdminUser(user) || isManagingDirectorUser(user);
}

/** @deprecated Use isAdminUser */
export const isSystemAdminUser = isAdminUser;

/** Only these dashboard paths are reachable by Admin. */
export const ADMIN_ALLOWED_PATH_PREFIXES = [
  ADMIN_BASE_PATH,
  ADMIN_PLATFORM_PATH,
  '/dashboard/purchase-manager/registered-employees',
] as const;

export function isAdminAllowedPath(pathname: string): boolean {
  return ADMIN_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAdminBlockedPath(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false;
  if (pathname === '/dashboard' || pathname === '/dashboard/') return true;
  return !isAdminAllowedPath(pathname);
}

export function getPrimaryRole(user: AuthUser | null | undefined): string | null {
  if (!user?.employee?.roles?.length) return null;
  const roles = user.employee.roles.map((r) => r.jobTitle);
  if (roles.some((t) => t.toLowerCase() === ADMIN_ROLE.toLowerCase())) return ADMIN_ROLE;
  if (roles.some((t) => t.toLowerCase() === LEGACY_SYSTEM_ADMIN_ROLE.toLowerCase())) return ADMIN_ROLE;
  return roles[0] ?? null;
}
