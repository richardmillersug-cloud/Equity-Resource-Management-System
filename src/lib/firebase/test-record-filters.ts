/** IDs used by dev/sample seed helpers — never show in production UI. */
export const SYSTEM_TEST_BRANCH_ID = 'test_branch';
export const SYSTEM_TEST_EMPLOYEE_ID = 'test_emp_001';

export function isSystemTestCashClose(record: {
  branchId?: string | null;
  employeeId?: string | null;
}): boolean {
  return (
    record.branchId === SYSTEM_TEST_BRANCH_ID ||
    record.employeeId === SYSTEM_TEST_EMPLOYEE_ID
  );
}
