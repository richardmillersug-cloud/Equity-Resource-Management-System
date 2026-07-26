import type { Employee } from './models';

export type EmploymentBlockReason = 'Terminated' | 'Inactive' | 'Other';

export const EMPLOYMENT_AUTH_CODES = {
  terminated: 'auth/account-terminated',
  inactive: 'auth/account-inactive',
  notActive: 'auth/account-not-active',
} as const;

/** Only Active employees may use the portal */
export function isEmployeeAllowedToLogin(
  employee?: Pick<Employee, 'employmentStatus'> | null
): boolean {
  return employee?.employmentStatus === 'Active';
}

export function getEmploymentBlockReason(
  status?: Employee['employmentStatus'] | string | null
): EmploymentBlockReason {
  if (status === 'Terminated') return 'Terminated';
  if (status === 'Inactive') return 'Inactive';
  return 'Other';
}

export function getEmploymentAuthErrorCode(
  status?: Employee['employmentStatus'] | string | null
): string {
  if (status === 'Terminated') return EMPLOYMENT_AUTH_CODES.terminated;
  if (status === 'Inactive') return EMPLOYMENT_AUTH_CODES.inactive;
  return EMPLOYMENT_AUTH_CODES.notActive;
}

export function getEmploymentLoginBlockTitle(
  status?: Employee['employmentStatus'] | string | null
): string {
  if (status === 'Terminated') return 'Account terminated';
  if (status === 'Inactive') return 'Account inactive';
  return 'Access denied';
}

export function getEmploymentLoginBlockMessage(
  status?: Employee['employmentStatus'] | string | null
): string {
  if (status === 'Terminated') {
    return 'Your employment has been terminated. You are no longer able to log in to the portal. Please contact your Purchase Manager or HR if you believe this is a mistake.';
  }
  if (status === 'Inactive') {
    return 'Your account is inactive. You are no longer able to log in to the portal. Please contact your Purchase Manager or HR to reactivate your access.';
  }
  return 'Your account is not active. You are no longer able to log in. Please contact your administrator.';
}

export function isEmploymentAccessErrorCode(code?: string | null): boolean {
  if (!code) return false;
  return (
    code === EMPLOYMENT_AUTH_CODES.terminated ||
    code === EMPLOYMENT_AUTH_CODES.inactive ||
    code === EMPLOYMENT_AUTH_CODES.notActive
  );
}

export function employmentStatusFromAuthCode(
  code?: string | null
): Employee['employmentStatus'] | null {
  if (code === EMPLOYMENT_AUTH_CODES.terminated) return 'Terminated';
  if (code === EMPLOYMENT_AUTH_CODES.inactive) return 'Inactive';
  return null;
}

/** Detect blocked login from error code or message text */
export function resolveEmploymentBlockFromError(err: {
  code?: string;
  message?: string;
}): Employee['employmentStatus'] | 'Other' | null {
  if (err.code === EMPLOYMENT_AUTH_CODES.terminated) return 'Terminated';
  if (err.code === EMPLOYMENT_AUTH_CODES.inactive) return 'Inactive';
  if (err.code === EMPLOYMENT_AUTH_CODES.notActive) return 'Other';

  const msg = (err.message || '').toLowerCase();
  if (msg.includes('terminated')) return 'Terminated';
  if (msg.includes('inactive')) return 'Inactive';
  if (msg.includes('not active') || msg.includes('no longer able to log')) return 'Other';
  return null;
}
