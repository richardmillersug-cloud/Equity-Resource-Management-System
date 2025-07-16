import {
  Employee,
  EmployeeRole,
  Attendance,
  Payroll,
  LeaveRequest,
  Branch,
  PayrollStatus,
  LeaveStatus,
  LeaveType
} from '../database/schema';
import { businessRules } from '../business-rules';
import { scanTrackingService } from './scan-tracking-service';

export class HRService {
  
  // ==================== EMPLOYEE MANAGEMENT ====================
  
  /**
   * Creates a new employee with NIN and email validation
   * Only HR personnel can create employees
   */
  async createEmployee(
    employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>,
    createdBy: Employee
  ): Promise<Employee> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN].includes(createdBy.role)) {
      throw new Error('Only HR personnel or admins can create employees');
    }

    // Validate NIN uniqueness
    if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Employee' } }, 'nin', employee.nin)) {
      throw new Error('Employee NIN must be unique');
    }

    // Validate email uniqueness
    if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Employee' } }, 'email', employee.email)) {
      throw new Error('Employee email must be unique');
    }

    // Validate branch exists
    const branch = await this.getBranch(employee.branch_id);
    if (!branch) {
      throw new Error('Invalid branch specified');
    }

    const fullEmployee: Employee = {
      ...employee,
      id: this.generateId(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveEmployee(fullEmployee);
  }

  /**
   * Updates employee information with validation
   */
  async updateEmployee(
    employeeId: string,
    updates: Partial<Employee>,
    updatedBy: Employee
  ): Promise<Employee> {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN].includes(updatedBy.role)) {
      throw new Error('Only HR personnel or admins can update employee information');
    }

    // Validate unique constraints if being updated
    if (updates.nin && updates.nin !== employee.nin) {
      if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Employee' } }, 'nin', updates.nin)) {
        throw new Error('Employee NIN must be unique');
      }
    }

    if (updates.email && updates.email !== employee.email) {
      if (!businessRules.validateUniqueConstraints({ constructor: { name: 'Employee' } }, 'email', updates.email)) {
        throw new Error('Employee email must be unique');
      }
    }

    return await this.updateEmployeeRecord(employeeId, {
      ...updates,
      updated_at: new Date()
    });
  }

  /**
   * Deactivates an employee (soft delete)
   */
  async deactivateEmployee(
    employeeId: string,
    deactivatedBy: Employee
  ): Promise<Employee> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN].includes(deactivatedBy.role)) {
      throw new Error('Only HR personnel or admins can deactivate employees');
    }

    return await this.updateEmployeeRecord(employeeId, {
      is_active: false,
      updated_at: new Date()
    });
  }

  // ==================== ATTENDANCE TRACKING ====================

  /**
   * Records a scan during the shift (e.g., barcode/QR code scan)
   */
  recordShiftScan(employeeId: string): {
    currentScanCount: number;
    scanStats: any;
  } {
    // Record the scan
    scanTrackingService.recordScan(employeeId);
    
    // Get updated scan statistics
    const scanStats = scanTrackingService.getScanStats(employeeId);
    const currentScanCount = scanTrackingService.getCurrentScanCount(employeeId);
    
    return {
      currentScanCount,
      scanStats
    };
  }

  /**
   * Gets current scan statistics for an employee
   */
  getScanStats(employeeId: string): {
    currentShiftScans: number;
    lastScanTime?: Date;
    shiftStartTime?: Date;
    isShiftActive: boolean;
  } {
    return scanTrackingService.getScanStats(employeeId);
  }

  /**
   * Records employee check-in
   */
  async checkIn(
    employeeId: string,
    barcodeScanned?: string
  ): Promise<Attendance> {
    const employee = await this.getEmployee(employeeId);
    if (!employee || !employee.is_active) {
      throw new Error('Invalid or inactive employee');
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await this.getTodayAttendance(employeeId, today);
    if (existingAttendance && existingAttendance.check_in_time) {
      throw new Error('Employee already checked in today');
    }

    // Record shift start and get current scan count
    const shiftStartTotalScans = scanTrackingService.recordShiftStart(employeeId);

    const attendance: Attendance = {
      id: this.generateId(),
      employee_id: employeeId,
      check_in_time: new Date(),
      date: today,
      barcode_scan: barcodeScanned,
      shift_start_total_scans: shiftStartTotalScans,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveAttendance(attendance);
  }

  /**
   * Records employee check-out and calculates hours worked
   */
  async checkOut(
    employeeId: string,
    barcodeScanned?: string
  ): Promise<Attendance> {
    const employee = await this.getEmployee(employeeId);
    if (!employee || !employee.is_active) {
      throw new Error('Invalid or inactive employee');
    }

    // Get today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await this.getTodayAttendance(employeeId, today);
    if (!attendance || !attendance.check_in_time) {
      throw new Error('Employee must check in before checking out');
    }

    if (attendance.check_out_time) {
      throw new Error('Employee already checked out today');
    }

    // Record shift end and get scan totals
    const shiftScanData = scanTrackingService.recordShiftEnd(employeeId);

    const checkOutTime = new Date();
    const hoursWorked = this.calculateHoursWorked(attendance.check_in_time, checkOutTime);
    const overtimeHours = Math.max(0, hoursWorked - 8); // Assuming 8-hour standard workday

    return await this.updateAttendanceRecord(attendance.id, {
      check_out_time: checkOutTime,
      hours_worked: hoursWorked,
      overtime_hours: overtimeHours,
      shift_end_total_scans: shiftScanData.shiftEndTotalScans,
      total_scans_during_shift: shiftScanData.totalScansDuringShift,
      updated_at: new Date()
    });
  }

  /**
   * Gets attendance summary for an employee
   */
  async getAttendanceSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    totalHours: number;
    overtimeHours: number;
    averageHoursPerDay: number;
  }> {
    const attendanceRecords = await this.getAttendanceByPeriod(employeeId, startDate, endDate);
    
    const totalDays = this.getWorkingDays(startDate, endDate);
    const presentDays = attendanceRecords.length;
    const absentDays = totalDays - presentDays;
    const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.hours_worked || 0), 0);
    const overtimeHours = attendanceRecords.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);
    const averageHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      overtimeHours,
      averageHoursPerDay
    };
  }

  // ==================== PAYROLL PROCESSING ====================

  /**
   * Processes payroll for an employee
   */
  async processPayroll(
    employeeId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    processedBy: Employee
  ): Promise<Payroll> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN].includes(processedBy.role)) {
      throw new Error('Only HR personnel or admins can process payroll');
    }

    const employee = await this.getEmployee(employeeId);
    if (!employee || !employee.is_active) {
      throw new Error('Invalid or inactive employee');
    }

    if (!employee.salary) {
      throw new Error('Employee salary not set');
    }

    // Get attendance summary for the pay period
    const attendanceSummary = await this.getAttendanceSummary(employeeId, payPeriodStart, payPeriodEnd);
    
    // Calculate pay components
    const baseSalary = employee.salary;
    const overtimePay = this.calculateOvertimePay(attendanceSummary.overtimeHours, baseSalary);
    const deductions = this.calculateDeductions(baseSalary);
    const netPay = baseSalary + overtimePay - deductions;

    const payroll: Payroll = {
      id: this.generateId(),
      employee_id: employeeId,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      base_salary: baseSalary,
      overtime_pay: overtimePay,
      deductions,
      net_pay: netPay,
      processed_date: new Date(),
      processed_by_employee_id: processedBy.id,
      status: PayrollStatus.PROCESSED,
      created_at: new Date()
    };

    return await this.savePayroll(payroll);
  }

  /**
   * Marks payroll as paid
   */
  async markPayrollAsPaid(
    payrollId: string,
    paidBy: Employee
  ): Promise<Payroll> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN, EmployeeRole.ACCOUNTANT].includes(paidBy.role)) {
      throw new Error('Only HR, admin, or accounting personnel can mark payroll as paid');
    }

    const payroll = await this.getPayroll(payrollId);
    if (!payroll) {
      throw new Error('Payroll record not found');
    }

    if (payroll.status !== PayrollStatus.PROCESSED) {
      throw new Error('Only processed payroll can be marked as paid');
    }

    return await this.updatePayrollStatus(payrollId, PayrollStatus.PAID);
  }

  // ==================== LEAVE MANAGEMENT ====================

  /**
   * Creates a leave request
   */
  async createLeaveRequest(
    leaveRequest: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at' | 'status'>,
    requestedBy: Employee
  ): Promise<LeaveRequest> {
    const employee = await this.getEmployee(leaveRequest.employee_id);
    if (!employee || !employee.is_active) {
      throw new Error('Invalid or inactive employee');
    }

    // Validate that the employee is requesting leave for themselves or HR is creating it
    if (leaveRequest.employee_id !== requestedBy.id && 
        ![EmployeeRole.HR, EmployeeRole.ADMIN].includes(requestedBy.role)) {
      throw new Error('Employees can only request leave for themselves');
    }

    // Calculate days requested
    const daysRequested = this.calculateLeaveDays(leaveRequest.start_date, leaveRequest.end_date);

    const fullLeaveRequest: LeaveRequest = {
      ...leaveRequest,
      id: this.generateId(),
      days_requested: daysRequested,
      status: LeaveStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveLeaveRequest(fullLeaveRequest);
  }

  /**
   * Approves or rejects a leave request
   */
  async processLeaveRequest(
    leaveRequestId: string,
    decision: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
    approvedBy: Employee,
    comments?: string
  ): Promise<LeaveRequest> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN, EmployeeRole.SUPERVISOR].includes(approvedBy.role)) {
      throw new Error('Only HR, admin, or supervisors can approve leave requests');
    }

    const leaveRequest = await this.getLeaveRequest(leaveRequestId);
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending leave requests can be processed');
    }

    return await this.updateLeaveRequest(leaveRequestId, {
      status: decision,
      approved_by_employee_id: approvedBy.id,
      approval_date: new Date(),
      comments,
      updated_at: new Date()
    });
  }

  /**
   * Gets leave balance for an employee
   */
  async getLeaveBalance(
    employeeId: string,
    year: number
  ): Promise<Record<LeaveType, { allocated: number; used: number; remaining: number }>> {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get approved leave requests for the year
    const approvedLeaves = await this.getApprovedLeavesByYear(employeeId, year);
    
    // Calculate used days by leave type
    const usedDays: Record<LeaveType, number> = {
      [LeaveType.ANNUAL]: 0,
      [LeaveType.SICK]: 0,
      [LeaveType.MATERNITY]: 0,
      [LeaveType.PATERNITY]: 0,
      [LeaveType.EMERGENCY]: 0,
      [LeaveType.UNPAID]: 0
    };

    approvedLeaves.forEach(leave => {
      usedDays[leave.leave_type] += leave.days_requested;
    });

    // Standard allocations (these could be configurable)
    const allocations: Record<LeaveType, number> = {
      [LeaveType.ANNUAL]: 21,
      [LeaveType.SICK]: 10,
      [LeaveType.MATERNITY]: 90,
      [LeaveType.PATERNITY]: 7,
      [LeaveType.EMERGENCY]: 5,
      [LeaveType.UNPAID]: 0 // No limit
    };

    const balance: Record<LeaveType, { allocated: number; used: number; remaining: number }> = {} as any;

    Object.keys(allocations).forEach(leaveType => {
      const type = leaveType as LeaveType;
      balance[type] = {
        allocated: allocations[type],
        used: usedDays[type],
        remaining: Math.max(0, allocations[type] - usedDays[type])
      };
    });

    return balance;
  }

  // ==================== ANALYTICS & REPORTING ====================

  /**
   * Gets employee performance metrics
   */
  async getEmployeeMetrics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    attendance: any;
    payroll: any;
    leaves: any;
    performance: any;
  }> {
    const attendanceSummary = await this.getAttendanceSummary(employeeId, startDate, endDate);
    const payrollRecords = await this.getPayrollByPeriod(employeeId, startDate, endDate);
    const leaveRequests = await this.getLeaveRequestsByPeriod(employeeId, startDate, endDate);

    return {
      attendance: attendanceSummary,
      payroll: {
        totalPaid: payrollRecords.reduce((sum, p) => sum + p.net_pay, 0),
        averagePay: payrollRecords.length > 0 ? payrollRecords.reduce((sum, p) => sum + p.net_pay, 0) / payrollRecords.length : 0,
        totalOvertime: payrollRecords.reduce((sum, p) => sum + p.overtime_pay, 0)
      },
      leaves: {
        totalRequests: leaveRequests.length,
        approvedRequests: leaveRequests.filter(l => l.status === LeaveStatus.APPROVED).length,
        totalDaysTaken: leaveRequests
          .filter(l => l.status === LeaveStatus.APPROVED)
          .reduce((sum, l) => sum + l.days_requested, 0)
      },
      performance: {
        attendanceRate: attendanceSummary.totalDays > 0 ? (attendanceSummary.presentDays / attendanceSummary.totalDays) * 100 : 0,
        punctualityScore: 0, // Would require check-in time analysis
        productivityScore: 0 // Would require additional metrics
      }
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private calculateHoursWorked(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }

  private calculateOvertimePay(overtimeHours: number, baseSalary: number): number {
    // Assuming overtime is paid at 1.5x hourly rate
    const hourlyRate = baseSalary / (30 * 8); // Assuming 30 working days, 8 hours per day
    return overtimeHours * hourlyRate * 1.5;
  }

  private calculateDeductions(baseSalary: number): number {
    // Standard deductions (tax, insurance, etc.)
    // This would be configurable based on local regulations
    const taxRate = 0.1; // 10% tax
    const insuranceRate = 0.05; // 5% insurance
    return baseSalary * (taxRate + insuranceRate);
  }

  private calculateLeaveDays(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
  }

  private getWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  // Database interaction methods (would be implemented with actual database)
  private async saveEmployee(employee: Employee): Promise<Employee> {
    return employee;
  }

  private async getEmployee(id: string): Promise<Employee | null> {
    return null;
  }

  private async updateEmployeeRecord(id: string, updates: Partial<Employee>): Promise<Employee> {
    return {} as Employee;
  }

  private async getBranch(id: string): Promise<Branch | null> {
    return null;
  }

  private async saveAttendance(attendance: Attendance): Promise<Attendance> {
    return attendance;
  }

  private async getTodayAttendance(employeeId: string, date: Date): Promise<Attendance | null> {
    return null;
  }

  private async updateAttendanceRecord(id: string, updates: Partial<Attendance>): Promise<Attendance> {
    return {} as Attendance;
  }

  private async getAttendanceByPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return [];
  }

  private async savePayroll(payroll: Payroll): Promise<Payroll> {
    return payroll;
  }

  private async getPayroll(id: string): Promise<Payroll | null> {
    return null;
  }

  private async updatePayrollStatus(id: string, status: PayrollStatus): Promise<Payroll> {
    return {} as Payroll;
  }

  private async getPayrollByPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<Payroll[]> {
    return [];
  }

  private async saveLeaveRequest(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
    return leaveRequest;
  }

  private async getLeaveRequest(id: string): Promise<LeaveRequest | null> {
    return null;
  }

  private async updateLeaveRequest(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest> {
    return {} as LeaveRequest;
  }

  private async getApprovedLeavesByYear(employeeId: string, year: number): Promise<LeaveRequest[]> {
    return [];
  }

  private async getLeaveRequestsByPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveRequest[]> {
    return [];
  }
}

// Export singleton instance
export const hrService = new HRService(); 