/**
 * @deprecated Import from admin-access.ts instead.
 */
export {
  ADMIN_ROLE as SYSTEM_ADMIN_ROLE,
  ADMIN_BASE_PATH as SYSTEM_ADMIN_BASE_PATH,
  isAdminUser as isSystemAdminUser,
  isAdminUser,
  ADMIN_ROLE,
  ADMIN_BASE_PATH,
  ADMIN_PLATFORM_PATH,
  LEGACY_SYSTEM_ADMIN_ROLE,
  getPrimaryRole,
} from './admin-access';

export function isSystemAdminAllowedPath(_pathname: string): boolean {
  return true;
}

export function isBlockedBusinessPath(_pathname: string): boolean {
  return false;
}

export function shouldSystemAdminSeeOnlyPlatform(_pathname: string): boolean {
  return false;
}
