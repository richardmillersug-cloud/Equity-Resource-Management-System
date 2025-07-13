import {
  Employee,
  EmployeeRole,
  Attendance,
  Payroll,
  LeaveRequest,
  Branch,
  PayrollStatus,
  LeaveStatus,
  LeaveType,
  PerformanceTarget,
  PerformanceEvaluation,
  PerformanceMetrics,
  PerformanceDevelopmentPlan,
  PerformanceReport,
  TargetType,
  TargetPeriod,
  TargetStatus,
  PerformanceRating,
  EvaluationStatus,
  DevelopmentStatus,
  DevelopmentPriority,
  ReportType,
  TargetAchievement
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

    // Auto-record performance metrics
    await this.recordPerformanceMetric(employeeId, TargetType.HOURS_WORKED, hoursWorked, 'system');
    if (shiftScanData.totalScansDuringShift > 0) {
      await this.recordPerformanceMetric(employeeId, TargetType.SCAN_TARGET, shiftScanData.totalScansDuringShift, 'system');
    }

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
    attendanceRate: number;
    punctualityScore: number;
  }> {
    const attendanceRecords = await this.getAttendanceByPeriod(employeeId, startDate, endDate);
    
    const totalDays = this.getWorkingDays(startDate, endDate);
    const presentDays = attendanceRecords.length;
    const absentDays = totalDays - presentDays;
    const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.hours_worked || 0), 0);
    const overtimeHours = attendanceRecords.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);
    const averageHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    
    // Calculate punctuality score (on-time check-ins)
    const onTimeCheckIns = attendanceRecords.filter(record => {
      if (!record.check_in_time) return false;
      const checkInHour = record.check_in_time.getHours();
      const checkInMinute = record.check_in_time.getMinutes();
      return checkInHour < 9 || (checkInHour === 9 && checkInMinute <= 0); // On time if before 9:00 AM
    }).length;
    const punctualityScore = presentDays > 0 ? (onTimeCheckIns / presentDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      overtimeHours,
      averageHoursPerDay,
      attendanceRate,
      punctualityScore
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

  // ==================== PERFORMANCE MANAGEMENT ====================

  /**
   * Creates a performance target for an employee
   */
  async createPerformanceTarget(
    target: Omit<PerformanceTarget, 'id' | 'created_at' | 'updated_at'>,
    createdBy: Employee
  ): Promise<PerformanceTarget> {
    // Validate permissions
    if (!businessRules.canCreatePerformanceTarget(createdBy)) {
      throw new Error('Insufficient permissions to create performance targets');
    }

    // Validate employee exists
    const employee = await this.getEmployee(target.employee_id);
    if (!employee || !employee.is_active) {
      throw new Error('Invalid or inactive employee');
    }

    // Validate target period
    if (target.start_date >= target.end_date) {
      throw new Error('Start date must be before end date');
    }

    // Validate weight percentage
    if (target.weight_percentage < 0 || target.weight_percentage > 100) {
      throw new Error('Weight percentage must be between 0 and 100');
    }

    const performanceTarget: PerformanceTarget = {
      ...target,
      id: this.generateId(),
      status: TargetStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.savePerformanceTarget(performanceTarget);
  }

  /**
   * Gets active performance targets for an employee
   */
  async getEmployeeTargets(
    employeeId: string,
    period?: TargetPeriod
  ): Promise<PerformanceTarget[]> {
    return await this.getTargetsByEmployee(employeeId, period);
  }

  /**
   * Records a performance metric for an employee
   */
  async recordPerformanceMetric(
    employeeId: string,
    metricType: TargetType,
    value: number,
    recordedByEmployeeId: string,
    targetId?: string,
    notes?: string
  ): Promise<PerformanceMetrics> {
    const metric: PerformanceMetrics = {
      id: this.generateId(),
      employee_id: employeeId,
      metric_date: new Date(),
      target_id: targetId,
      metric_type: metricType,
      value,
      notes,
      recorded_by_employee_id: recordedByEmployeeId,
      is_auto_recorded: recordedByEmployeeId === 'system',
      created_at: new Date()
    };

    return await this.savePerformanceMetric(metric);
  }

  /**
   * Creates a performance evaluation
   */
  async createPerformanceEvaluation(
    evaluation: Omit<PerformanceEvaluation, 'id' | 'created_at' | 'updated_at' | 'overall_score' | 'target_achievements'>,
    evaluatedBy: Employee
  ): Promise<PerformanceEvaluation> {
    // Validate permissions
    if (!businessRules.canEvaluateEmployee(evaluatedBy, await this.getEmployee(evaluation.employee_id) as Employee)) {
      throw new Error('Insufficient permissions to evaluate this employee');
    }

    // Get employee targets for the evaluation period
    const targets = await this.getTargetsForPeriod(
      evaluation.employee_id,
      evaluation.evaluation_period_start,
      evaluation.evaluation_period_end
    );

    // Calculate target achievements
    const targetAchievements = await this.calculateTargetAchievements(
      evaluation.employee_id,
      targets,
      evaluation.evaluation_period_start,
      evaluation.evaluation_period_end
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(targetAchievements);
    const overallRating = this.scoreToRating(overallScore);

    const performanceEvaluation: PerformanceEvaluation = {
      ...evaluation,
      id: this.generateId(),
      overall_score: overallScore,
      overall_rating: overallRating,
      target_achievements: targetAchievements,
      status: EvaluationStatus.DRAFT,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.savePerformanceEvaluation(performanceEvaluation);
  }

  /**
   * Submits evaluation for employee review
   */
  async submitEvaluationForReview(
    evaluationId: string,
    submittedBy: Employee
  ): Promise<PerformanceEvaluation> {
    const evaluation = await this.getPerformanceEvaluation(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    if (evaluation.status !== EvaluationStatus.DRAFT) {
      throw new Error('Only draft evaluations can be submitted for review');
    }

    return await this.updatePerformanceEvaluation(evaluationId, {
      status: EvaluationStatus.PENDING_EMPLOYEE_REVIEW,
      updated_at: new Date()
    });
  }

  /**
   * Employee reviews and comments on evaluation
   */
  async reviewEvaluationAsEmployee(
    evaluationId: string,
    employeeComments: string,
    reviewedBy: Employee
  ): Promise<PerformanceEvaluation> {
    const evaluation = await this.getPerformanceEvaluation(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    if (evaluation.employee_id !== reviewedBy.id) {
      throw new Error('Only the evaluated employee can review their evaluation');
    }

    if (evaluation.status !== EvaluationStatus.PENDING_EMPLOYEE_REVIEW) {
      throw new Error('Evaluation is not pending employee review');
    }

    return await this.updatePerformanceEvaluation(evaluationId, {
      employee_comments: employeeComments,
      reviewed_by_employee_date: new Date(),
      status: EvaluationStatus.PENDING_HR_REVIEW,
      updated_at: new Date()
    });
  }

  /**
   * HR reviews and approves evaluation
   */
  async approveEvaluation(
    evaluationId: string,
    hrComments: string,
    approvedBy: Employee
  ): Promise<PerformanceEvaluation> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN].includes(approvedBy.role)) {
      throw new Error('Only HR personnel or admins can approve evaluations');
    }

    const evaluation = await this.getPerformanceEvaluation(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    if (evaluation.status !== EvaluationStatus.PENDING_HR_REVIEW) {
      throw new Error('Evaluation is not pending HR review');
    }

    return await this.updatePerformanceEvaluation(evaluationId, {
      hr_comments: hrComments,
      reviewed_by_hr_date: new Date(),
      final_approval_date: new Date(),
      status: EvaluationStatus.APPROVED,
      updated_at: new Date()
    });
  }

  /**
   * Creates a development plan from evaluation
   */
  async createDevelopmentPlan(
    plan: Omit<PerformanceDevelopmentPlan, 'id' | 'created_at' | 'updated_at' | 'progress_notes'>,
    createdBy: Employee
  ): Promise<PerformanceDevelopmentPlan> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN, EmployeeRole.SUPERVISOR].includes(createdBy.role)) {
      throw new Error('Insufficient permissions to create development plans');
    }

    const developmentPlan: PerformanceDevelopmentPlan = {
      ...plan,
      id: this.generateId(),
      progress_notes: [],
      status: DevelopmentStatus.NOT_STARTED,
      created_at: new Date(),
      updated_at: new Date()
    };

    return await this.saveDevelopmentPlan(developmentPlan);
  }

  /**
   * Generates performance report
   */
  async generatePerformanceReport(
    reportConfig: {
      reportType: ReportType;
      reportName: string;
      periodStart: Date;
      periodEnd: Date;
      employeeIds?: string[];
      branchIds?: string[];
    },
    generatedBy: Employee
  ): Promise<PerformanceReport> {
    // Validate permissions
    if (![EmployeeRole.HR, EmployeeRole.ADMIN, EmployeeRole.SUPERVISOR].includes(generatedBy.role)) {
      throw new Error('Insufficient permissions to generate performance reports');
    }

    let reportData: any = {};

    switch (reportConfig.reportType) {
      case ReportType.INDIVIDUAL_PERFORMANCE:
        reportData = await this.generateIndividualPerformanceData(
          reportConfig.employeeIds || [],
          reportConfig.periodStart,
          reportConfig.periodEnd
        );
        break;
      case ReportType.TEAM_PERFORMANCE:
        reportData = await this.generateTeamPerformanceData(
          reportConfig.employeeIds || [],
          reportConfig.periodStart,
          reportConfig.periodEnd
        );
        break;
      case ReportType.BRANCH_PERFORMANCE:
        reportData = await this.generateBranchPerformanceData(
          reportConfig.branchIds || [],
          reportConfig.periodStart,
          reportConfig.periodEnd
        );
        break;
      case ReportType.TARGET_ACHIEVEMENT_SUMMARY:
        reportData = await this.generateTargetAchievementData(
          reportConfig.employeeIds || [],
          reportConfig.periodStart,
          reportConfig.periodEnd
        );
        break;
      default:
        throw new Error('Unsupported report type');
    }

    const report: PerformanceReport = {
      id: this.generateId(),
      report_name: reportConfig.reportName,
      report_type: reportConfig.reportType,
      generated_by_employee_id: generatedBy.id,
      generation_date: new Date(),
      period_start: reportConfig.periodStart,
      period_end: reportConfig.periodEnd,
      included_employees: reportConfig.employeeIds || [],
      included_branches: reportConfig.branchIds || [],
      report_data: reportData,
      created_at: new Date()
    };

    return await this.savePerformanceReport(report);
  }

  // ==================== PERFORMANCE CALCULATION HELPERS ====================

  /**
   * Calculates target achievements for an employee
   */
  private async calculateTargetAchievements(
    employeeId: string,
    targets: PerformanceTarget[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<TargetAchievement[]> {
    const achievements: TargetAchievement[] = [];

    for (const target of targets) {
      const metrics = await this.getMetricsForTarget(employeeId, target.id, periodStart, periodEnd);
      let achievedValue = 0;

      // Calculate achieved value based on target type
      switch (target.target_type) {
        case TargetType.ATTENDANCE_RATE:
          const attendanceSummary = await this.getAttendanceSummary(employeeId, periodStart, periodEnd);
          achievedValue = attendanceSummary.attendanceRate;
          break;
        case TargetType.PUNCTUALITY_SCORE:
          const punctualitySummary = await this.getAttendanceSummary(employeeId, periodStart, periodEnd);
          achievedValue = punctualitySummary.punctualityScore;
          break;
        case TargetType.SCAN_TARGET:
        case TargetType.HOURS_WORKED:
        case TargetType.SALES_TARGET:
          achievedValue = metrics.reduce((sum, metric) => sum + metric.value, 0);
          break;
        default:
          // For other target types, use the average of recorded metrics
          achievedValue = metrics.length > 0 
            ? metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length 
            : 0;
      }

      const achievementPercentage = target.target_value > 0 
        ? (achievedValue / target.target_value) * 100 
        : 0;

      const rating = this.scoreToRating(achievementPercentage);

      achievements.push({
        target_id: target.id,
        target_name: target.target_name,
        target_value: target.target_value,
        achieved_value: achievedValue,
        achievement_percentage: achievementPercentage,
        rating,
        notes: `Target: ${target.target_value} ${target.unit}, Achieved: ${achievedValue.toFixed(2)} ${target.unit}`
      });
    }

    return achievements;
  }

  /**
   * Calculates overall score from target achievements
   */
  private calculateOverallScore(achievements: TargetAchievement[]): number {
    if (achievements.length === 0) return 0;
    
    const totalWeightedScore = achievements.reduce((sum, achievement) => {
      return sum + achievement.achievement_percentage;
    }, 0);

    return totalWeightedScore / achievements.length;
  }

  /**
   * Converts numerical score to performance rating
   */
  private scoreToRating(score: number): PerformanceRating {
    if (score >= 90) return PerformanceRating.OUTSTANDING;
    if (score >= 80) return PerformanceRating.EXCEEDS_EXPECTATIONS;
    if (score >= 70) return PerformanceRating.MEETS_EXPECTATIONS;
    if (score >= 60) return PerformanceRating.BELOW_EXPECTATIONS;
    return PerformanceRating.UNSATISFACTORY;
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
    const targets = await this.getTargetsForPeriod(employeeId, startDate, endDate);
    const evaluations = await this.getEvaluationsForPeriod(employeeId, startDate, endDate);

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
        attendanceRate: attendanceSummary.attendanceRate,
        punctualityScore: attendanceSummary.punctualityScore,
        activeTargets: targets.filter(t => t.status === TargetStatus.ACTIVE).length,
        completedTargets: targets.filter(t => t.status === TargetStatus.COMPLETED).length,
        totalEvaluations: evaluations.length,
        averageRating: evaluations.length > 0 
          ? evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length 
          : 0,
        latestEvaluation: evaluations.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null
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

  private async savePerformanceTarget(target: PerformanceTarget): Promise<PerformanceTarget> {
    return target;
  }

  private async getTargetsByEmployee(employeeId: string, period?: TargetPeriod): Promise<PerformanceTarget[]> {
    return [];
  }

  private async getTargetsForPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<PerformanceTarget[]> {
    return [];
  }

  private async savePerformanceMetric(metric: PerformanceMetrics): Promise<PerformanceMetrics> {
    return metric;
  }

  private async getMetricsForTarget(employeeId: string, targetId: string, startDate: Date, endDate: Date): Promise<PerformanceMetrics[]> {
    return [];
  }

  private async savePerformanceEvaluation(evaluation: PerformanceEvaluation): Promise<PerformanceEvaluation> {
    return evaluation;
  }

  private async getPerformanceEvaluation(id: string): Promise<PerformanceEvaluation | null> {
    return null;
  }

  private async updatePerformanceEvaluation(id: string, updates: Partial<PerformanceEvaluation>): Promise<PerformanceEvaluation> {
    return {} as PerformanceEvaluation;
  }

  private async getEvaluationsForPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<PerformanceEvaluation[]> {
    return [];
  }

  private async saveDevelopmentPlan(plan: PerformanceDevelopmentPlan): Promise<PerformanceDevelopmentPlan> {
    return plan;
  }

  private async getDevelopmentPlan(id: string): Promise<PerformanceDevelopmentPlan | null> {
    return null;
  }

  private async updateDevelopmentPlan(id: string, updates: Partial<PerformanceDevelopmentPlan>): Promise<PerformanceDevelopmentPlan> {
    return {} as PerformanceDevelopmentPlan;
  }

  private async savePerformanceReport(report: PerformanceReport): Promise<PerformanceReport> {
    return report;
  }

  private async getPerformanceReport(id: string): Promise<PerformanceReport | null> {
    return null;
  }

  private async generateIndividualPerformanceData(employeeIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    const individualData: any = {};
    for (const employeeId of employeeIds) {
      const metrics = await this.getAllMetricsForPeriod(employeeId, periodStart, periodEnd); // Get all metrics for the period
      const evaluations = await this.getEvaluationsForPeriod(employeeId, periodStart, periodEnd);
      const targets = await this.getTargetsForPeriod(employeeId, periodStart, periodEnd);

      individualData[employeeId] = {
        attendance: await this.getAttendanceSummary(employeeId, periodStart, periodEnd),
        payroll: await this.getPayrollByPeriod(employeeId, periodStart, periodEnd),
        leaves: await this.getLeaveRequestsByPeriod(employeeId, periodStart, periodEnd),
        performance: {
          activeTargets: targets.filter(t => t.status === TargetStatus.ACTIVE).length,
          completedTargets: targets.filter(t => t.status === TargetStatus.COMPLETED).length,
          totalEvaluations: evaluations.length,
          averageRating: evaluations.length > 0 
            ? evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length 
            : 0,
          latestEvaluation: evaluations.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null
        }
      };
    }
    return individualData;
  }

  private async generateTeamPerformanceData(employeeIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    const teamData: any = {};
    for (const employeeId of employeeIds) {
      const metrics = await this.getAllMetricsForPeriod(employeeId, periodStart, periodEnd);
      const evaluations = await this.getEvaluationsForPeriod(employeeId, periodStart, periodEnd);
      const targets = await this.getTargetsForPeriod(employeeId, periodStart, periodEnd);

      teamData[employeeId] = {
        attendance: await this.getAttendanceSummary(employeeId, periodStart, periodEnd),
        payroll: await this.getPayrollByPeriod(employeeId, periodStart, periodEnd),
        leaves: await this.getLeaveRequestsByPeriod(employeeId, periodStart, periodEnd),
        performance: {
          activeTargets: targets.filter(t => t.status === TargetStatus.ACTIVE).length,
          completedTargets: targets.filter(t => t.status === TargetStatus.COMPLETED).length,
          totalEvaluations: evaluations.length,
          averageRating: evaluations.length > 0 
            ? evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length 
            : 0,
          latestEvaluation: evaluations.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null
        }
      };
    }
    return teamData;
  }

  private async generateBranchPerformanceData(branchIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    const branchData: any = {};
    for (const branchId of branchIds) {
      const employees = await this.getEmployeesByBranch(branchId); // Assuming getEmployeesByBranch exists
      const employeeIds = employees.map(e => e.id);
      branchData[branchId] = {
        totalEmployees: employees.length,
        performance: await this.generateTeamPerformanceData(employeeIds, periodStart, periodEnd)
      };
    }
    return branchData;
  }

  private async generateTargetAchievementData(employeeIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    const targetAchievementData: any = {};
    for (const employeeId of employeeIds) {
      const targets = await this.getTargetsForPeriod(employeeId, periodStart, periodEnd);
      const evaluations = await this.getEvaluationsForPeriod(employeeId, periodStart, periodEnd);

      targetAchievementData[employeeId] = {
        activeTargets: targets.filter(t => t.status === TargetStatus.ACTIVE).length,
        completedTargets: targets.filter(t => t.status === TargetStatus.COMPLETED).length,
        totalEvaluations: evaluations.length,
        averageRating: evaluations.length > 0 
          ? evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length 
          : 0,
        latestEvaluation: evaluations.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null
      };
    }
    return targetAchievementData;
  }

  private async getAllMetricsForPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<PerformanceMetrics[]> {
    return [];
  }

  private async getEmployeesByBranch(branchId: string): Promise<Employee[]> {
    return [];
  }
}

// Export singleton instance
export const hrService = new HRService(); 