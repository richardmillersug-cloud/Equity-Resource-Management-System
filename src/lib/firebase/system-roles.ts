/**
 * Canonical system roles and permission matrix for Equi.
 */

export interface SystemRoleDefinition {
  id: string;
  jobTitle: string;
  description: string;
  permissions: string[];
  dashboardPath: string;
  category: 'executive' | 'operations' | 'finance' | 'supply_chain' | 'hr' | 'system';
}

export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    id: 'admin',
    jobTitle: 'Admin',
    description:
      'Full administrator: business operations, user management, security, sessions, roles, and accountability',
    permissions: ['*'],
    dashboardPath: '/dashboard/admin',
    category: 'system',
  },
  {
    id: 'managing-director',
    jobTitle: 'Managing Director',
    description: 'Executive dashboards, analytics, and strategic forecasting',
    permissions: ['VIEW_ALL_DATA', 'VIEW_PERFORMANCE', 'VIEW_FINANCIAL_DATA'],
    dashboardPath: '/dashboard/managing-director',
    category: 'executive',
  },
  {
    id: 'manager',
    jobTitle: 'Manager',
    description: 'Staff portal only: record attendance in/out and view approved leave',
    permissions: ['RECORD_ATTENDANCE', 'VIEW_APPROVED_LEAVE'],
    dashboardPath: '/dashboard/staff',
    category: 'operations',
  },
  {
    id: 'assistant-manager',
    jobTitle: 'Assistant Manager',
    description: 'Staff portal only: record attendance in/out and view approved leave',
    permissions: ['RECORD_ATTENDANCE', 'VIEW_APPROVED_LEAVE'],
    dashboardPath: '/dashboard/staff',
    category: 'operations',
  },
  {
    id: 'attendant',
    jobTitle: 'Attendant',
    description: 'Staff portal only: record attendance in/out and view approved leave',
    permissions: ['RECORD_ATTENDANCE', 'VIEW_APPROVED_LEAVE'],
    dashboardPath: '/dashboard/staff',
    category: 'operations',
  },
  {
    id: 'accountant',
    jobTitle: 'Accountant',
    description: 'Cash close, allocations, expenses, and financial reporting',
    permissions: ['CREATE_CASH_ALLOCATION', 'MANAGE_EXPENSES', 'VIEW_FINANCIAL_DATA'],
    dashboardPath: '/dashboard/analytics',
    category: 'finance',
  },
  {
    id: 'purchasing-manager',
    jobTitle: 'Purchasing Manager',
    description: 'Suppliers, invoices, payments, fund acknowledgments, and staff account creation',
    permissions: ['ACKNOWLEDGE_FUNDS', 'MANAGE_SUPPLIERS', 'MANAGE_RESTOCK', 'CREATE_STAFF_ACCOUNTS'],
    dashboardPath: '/dashboard/purchase-manager',
    category: 'supply_chain',
  },
  {
    id: 'receiver',
    jobTitle: 'Receiver',
    description: 'Deliveries, returns, and goods receipt',
    permissions: ['MANAGE_DELIVERIES', 'PROCESS_RETURNS'],
    dashboardPath: '/dashboard/receiver',
    category: 'supply_chain',
  },
  {
    id: 'stock-manager',
    jobTitle: 'Stock Manager',
    description: 'Staff portal only: record attendance in/out and view approved leave',
    permissions: ['RECORD_ATTENDANCE', 'VIEW_APPROVED_LEAVE'],
    dashboardPath: '/dashboard/staff',
    category: 'operations',
  },
  {
    id: 'hr',
    jobTitle: 'HR',
    description: 'Employees, attendance, leave, and payroll',
    permissions: ['MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_LEAVE'],
    dashboardPath: '/dashboard/hr',
    category: 'hr',
  },
  {
    id: 'hr-manager',
    jobTitle: 'HR Manager',
    description: 'HR operations with extended management access',
    permissions: ['MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_LEAVE'],
    dashboardPath: '/dashboard/hr',
    category: 'hr',
  },
  {
    id: 'auditor',
    jobTitle: 'Auditor',
    description: 'Read-only audit trail and compliance review',
    permissions: ['VIEW_AUDIT_TRAIL', 'VIEW_ALL_DATA'],
    dashboardPath: '/dashboard/auditor',
    category: 'finance',
  },
  {
    id: 'supervisor',
    jobTitle: 'Supervisor',
    description: 'Staff portal only: record attendance in/out and view approved leave',
    permissions: ['RECORD_ATTENDANCE', 'VIEW_APPROVED_LEAVE'],
    dashboardPath: '/dashboard/staff',
    category: 'operations',
  },
  {
    id: 'cashier',
    jobTitle: 'Cashier',
    description: 'Point-of-sale and till operations',
    permissions: ['basic_access'],
    dashboardPath: '/dashboard',
    category: 'operations',
  },
  {
    id: 'customer-service',
    jobTitle: 'Customer Service',
    description: 'Customer-facing support within assigned section',
    permissions: ['basic_access'],
    dashboardPath: '/dashboard',
    category: 'operations',
  },
];

export function getRoleByTitle(jobTitle: string): SystemRoleDefinition | undefined {
  return SYSTEM_ROLES.find((r) => r.jobTitle.toLowerCase() === jobTitle.toLowerCase());
}
