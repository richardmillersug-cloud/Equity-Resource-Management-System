import { firestoreServices } from '../firebase/firestore-service';
import { HRQueries } from '../firebase/role-based-queries';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  grossSalary: number;
  deductions: {
    tax: number;
    nssf: number;
    healthInsurance: number;
    professionalTax: number;
    loanDeductions: number;
    other: number;
    total: number;
  };
  allowances: {
    transport: number;
    housing: number;
    medical: number;
    meal: number;
    communication: number;
    performance: number;
    overtime: number;
    other: number;
    total: number;
  };
  attendance: {
    workingDays: number;
    actualDays: number;
    overtimeHours: number;
    leaveDays: number;
  };
  netSalary: number;
  paymentDate?: Date;
  status: 'Draft' | 'Processed' | 'Approved' | 'Paid' | 'Cancelled';
  processedBy?: string;
  approvedBy?: string;
  paymentMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash' | 'Cheque';
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    branch: string;
  };
  mobileMoneyDetails?: {
    phoneNumber: string;
    provider: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollConfiguration {
  taxRates: {
    brackets: Array<{
      min: number;
      max: number;
      rate: number;
    }>;
  };
  nssfRate: number;
  nssfMaxAmount: number;
  healthInsuranceRate: number;
  allowances: {
    transport: number;
    housing: number;
    medical: number;
    meal: number;
    communication: number;
  };
  overtimeRate: number; // multiplier for hourly rate
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
}

export interface PayrollSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalAllowances: number;
  totalNetSalary: number;
  statusBreakdown: {
    draft: number;
    processed: number;
    approved: number;
    paid: number;
    cancelled: number;
  };
  departmentBreakdown: Array<{
    department: string;
    employeeCount: number;
    totalGross: number;
    totalNet: number;
  }>;
}

export class PayrollService {
  private static defaultConfiguration: PayrollConfiguration = {
    taxRates: {
      brackets: [
        { min: 0, max: 235000, rate: 0 },
        { min: 235001, max: 335000, rate: 0.1 },
        { min: 335001, max: 410000, rate: 0.2 },
        { min: 410001, max: 10000000, rate: 0.3 },
        { min: 10000001, max: Infinity, rate: 0.4 }
      ]
    },
    nssfRate: 0.05,
    nssfMaxAmount: 200000,
    healthInsuranceRate: 0.04,
    allowances: {
      transport: 100000,
      housing: 0.15, // 15% of gross salary
      medical: 50000,
      meal: 30000,
      communication: 25000
    },
    overtimeRate: 1.5,
    workingDaysPerMonth: 22,
    workingHoursPerDay: 8
  };

  /**
   * Calculate income tax based on Uganda tax brackets
   */
  static calculateIncomeTax(grossSalary: number, config: PayrollConfiguration = this.defaultConfiguration): number {
    let tax = 0;
    let remainingSalary = grossSalary;

    for (const bracket of config.taxRates.brackets) {
      if (remainingSalary <= 0) break;

      const taxableAmount = Math.min(remainingSalary, bracket.max - bracket.min + 1);
      tax += taxableAmount * bracket.rate;
      remainingSalary -= taxableAmount;
    }

    return Math.round(tax);
  }

  /**
   * Calculate NSSF contribution
   */
  static calculateNSSF(grossSalary: number, config: PayrollConfiguration = this.defaultConfiguration): number {
    const nssfContribution = grossSalary * config.nssfRate;
    return Math.round(Math.min(nssfContribution, config.nssfMaxAmount));
  }

  /**
   * Calculate health insurance
   */
  static calculateHealthInsurance(grossSalary: number, config: PayrollConfiguration = this.defaultConfiguration): number {
    return Math.round(grossSalary * config.healthInsuranceRate);
  }

  /**
   * Calculate allowances
   */
  static calculateAllowances(
    grossSalary: number, 
    attendanceData: PayrollRecord['attendance'],
    performanceRating?: number,
    config: PayrollConfiguration = this.defaultConfiguration
  ): PayrollRecord['allowances'] {
    const transport = config.allowances.transport;
    const housing = typeof config.allowances.housing === 'number' 
      ? config.allowances.housing 
      : grossSalary * config.allowances.housing;
    const medical = config.allowances.medical;
    const meal = config.allowances.meal;
    const communication = config.allowances.communication;

    // Performance allowance based on rating (0-5 scale)
    const performanceAllowance = performanceRating 
      ? Math.round(grossSalary * 0.05 * (performanceRating / 5)) 
      : 0;

    // Overtime calculation
    const hourlyRate = grossSalary / (config.workingDaysPerMonth * config.workingHoursPerDay);
    const overtimeAllowance = Math.round(
      attendanceData.overtimeHours * hourlyRate * config.overtimeRate
    );

    const allowances = {
      transport: Math.round(transport),
      housing: Math.round(housing),
      medical: Math.round(medical),
      meal: Math.round(meal),
      communication: Math.round(communication),
      performance: performanceAllowance,
      overtime: overtimeAllowance,
      other: 0,
      total: 0
    };

    allowances.total = Object.values(allowances).reduce((sum, val) => sum + val, 0) - allowances.total;
    return allowances;
  }

  /**
   * Calculate pro-rated salary based on attendance
   */
  static calculateProRatedSalary(
    grossSalary: number,
    attendanceData: PayrollRecord['attendance'],
    config: PayrollConfiguration = this.defaultConfiguration
  ): number {
    const attendanceRatio = attendanceData.actualDays / config.workingDaysPerMonth;
    return Math.round(grossSalary * attendanceRatio);
  }

  /**
   * Generate payroll record for a single employee
   */
  static async generatePayrollRecord(
    employeeId: string,
    payPeriod: { start: Date; end: Date },
    config: PayrollConfiguration = this.defaultConfiguration
  ): Promise<PayrollRecord | null> {
    try {
      // Get employee data
      const employees = await HRQueries.getEmployeeOverview();
      const employee = employees.find(emp => emp.id === employeeId);
      
      if (!employee) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      const grossSalary = employee.employeeSalary || employee.roles?.[0]?.baseSalary || 0;
      
      // Mock attendance data (in real implementation, this would come from attendance system)
      const attendanceData: PayrollRecord['attendance'] = {
        workingDays: config.workingDaysPerMonth,
        actualDays: Math.floor(Math.random() * 3) + config.workingDaysPerMonth - 2, // Random actual days
        overtimeHours: Math.floor(Math.random() * 20), // Random overtime
        leaveDays: Math.floor(Math.random() * 3) // Random leave days
      };

      // Calculate pro-rated salary if needed
      const adjustedGrossSalary = this.calculateProRatedSalary(grossSalary, attendanceData, config);

      // Calculate deductions
      const tax = this.calculateIncomeTax(adjustedGrossSalary, config);
      const nssf = this.calculateNSSF(adjustedGrossSalary, config);
      const healthInsurance = this.calculateHealthInsurance(adjustedGrossSalary, config);
      
      const deductions: PayrollRecord['deductions'] = {
        tax,
        nssf,
        healthInsurance,
        professionalTax: 0,
        loanDeductions: 0,
        other: 0,
        total: tax + nssf + healthInsurance
      };

      // Calculate allowances (with mock performance rating)
      const performanceRating = Math.random() * 2 + 3; // Random rating 3-5
      const allowances = this.calculateAllowances(adjustedGrossSalary, attendanceData, performanceRating, config);

      // Calculate net salary
      const netSalary = adjustedGrossSalary - deductions.total + allowances.total;

      const payrollRecord: PayrollRecord = {
        id: `payroll_${employeeId}_${payPeriod.start.getTime()}`,
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        payPeriodStart: payPeriod.start,
        payPeriodEnd: payPeriod.end,
        grossSalary: adjustedGrossSalary,
        deductions,
        allowances,
        attendance: attendanceData,
        netSalary,
        status: 'Draft',
        paymentMethod: 'Bank Transfer',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return payrollRecord;
    } catch (error) {
      console.error('Error generating payroll record:', error);
      return null;
    }
  }

  /**
   * Generate payroll for all employees in a period
   */
  static async generateBulkPayroll(
    payPeriod: { start: Date; end: Date },
    config: PayrollConfiguration = this.defaultConfiguration
  ): Promise<PayrollRecord[]> {
    try {
      const employees = await HRQueries.getEmployeeOverview();
      const payrollRecords: PayrollRecord[] = [];

      for (const employee of employees) {
        if (employee.employeeSalary > 0) { // Only process employees with salary
          const record = await this.generatePayrollRecord(employee.id, payPeriod, config);
          if (record) {
            payrollRecords.push(record);
          }
        }
      }

      return payrollRecords;
    } catch (error) {
      console.error('Error generating bulk payroll:', error);
      return [];
    }
  }

  /**
   * Calculate payroll summary
   */
  static calculatePayrollSummary(payrollRecords: PayrollRecord[]): PayrollSummary {
    const summary: PayrollSummary = {
      period: {
        start: new Date(),
        end: new Date()
      },
      totalEmployees: payrollRecords.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalAllowances: 0,
      totalNetSalary: 0,
      statusBreakdown: {
        draft: 0,
        processed: 0,
        approved: 0,
        paid: 0,
        cancelled: 0
      },
      departmentBreakdown: []
    };

    if (payrollRecords.length === 0) return summary;

    // Set period from first record
    summary.period.start = payrollRecords[0].payPeriodStart;
    summary.period.end = payrollRecords[0].payPeriodEnd;

    // Calculate totals
    payrollRecords.forEach(record => {
      summary.totalGrossSalary += record.grossSalary;
      summary.totalDeductions += record.deductions.total;
      summary.totalAllowances += record.allowances.total;
      summary.totalNetSalary += record.netSalary;

      // Status breakdown
      const status = record.status.toLowerCase() as keyof typeof summary.statusBreakdown;
      if (status in summary.statusBreakdown) {
        summary.statusBreakdown[status]++;
      }
    });

    return summary;
  }

  /**
   * Export payroll to CSV
   */
  static exportToCSV(payrollRecords: PayrollRecord[]): string {
    const headers = [
      'Employee Name',
      'Employee ID',
      'Pay Period',
      'Working Days',
      'Actual Days',
      'Overtime Hours',
      'Gross Salary',
      'Income Tax',
      'NSSF',
      'Health Insurance',
      'Total Deductions',
      'Transport Allowance',
      'Housing Allowance',
      'Medical Allowance',
      'Performance Allowance',
      'Overtime Allowance',
      'Total Allowances',
      'Net Salary',
      'Status',
      'Payment Method'
    ];

    const rows = payrollRecords.map(record => [
      record.employeeName,
      record.employeeId,
      `${record.payPeriodStart.toLocaleDateString()} - ${record.payPeriodEnd.toLocaleDateString()}`,
      record.attendance.workingDays.toString(),
      record.attendance.actualDays.toString(),
      record.attendance.overtimeHours.toString(),
      record.grossSalary.toLocaleString(),
      record.deductions.tax.toLocaleString(),
      record.deductions.nssf.toLocaleString(),
      record.deductions.healthInsurance.toLocaleString(),
      record.deductions.total.toLocaleString(),
      record.allowances.transport.toLocaleString(),
      record.allowances.housing.toLocaleString(),
      record.allowances.medical.toLocaleString(),
      record.allowances.performance.toLocaleString(),
      record.allowances.overtime.toLocaleString(),
      record.allowances.total.toLocaleString(),
      record.netSalary.toLocaleString(),
      record.status,
      record.paymentMethod
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Generate payslip HTML for printing
   */
  static generatePayslipHTML(record: PayrollRecord): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payslip - ${record.employeeName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
        }
        .payslip-title {
            font-size: 16px;
            margin-top: 10px;
        }
        .employee-info, .period-info {
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-weight: bold;
            font-size: 14px;
            color: #2563eb;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .amount-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dotted #ccc;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            padding: 10px 0;
            border-top: 2px solid #333;
            margin-top: 10px;
        }
        .net-salary {
            font-size: 18px;
            font-weight: bold;
            color: #059669;
            text-align: center;
            padding: 15px;
            border: 2px solid #059669;
            margin: 20px 0;
        }
        @media print {
            body { margin: 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">EQUITY SHOPPER'S SUPERMARKET</div>
        <div class="payslip-title">EMPLOYEE PAYSLIP</div>
    </div>
    
    <div class="employee-info">
        <div class="info-row">
            <span><strong>Employee Name:</strong> ${record.employeeName}</span>
            <span><strong>Employee ID:</strong> ${record.employeeId}</span>
        </div>
        <div class="info-row">
            <span><strong>Pay Period:</strong> ${record.payPeriodStart.toLocaleDateString()} - ${record.payPeriodEnd.toLocaleDateString()}</span>
            <span><strong>Payment Date:</strong> ${record.paymentDate ? record.paymentDate.toLocaleDateString() : 'Pending'}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">ATTENDANCE</div>
        <div class="amount-row">
            <span>Working Days:</span>
            <span>${record.attendance.workingDays}</span>
        </div>
        <div class="amount-row">
            <span>Days Worked:</span>
            <span>${record.attendance.actualDays}</span>
        </div>
        <div class="amount-row">
            <span>Overtime Hours:</span>
            <span>${record.attendance.overtimeHours}</span>
        </div>
        <div class="amount-row">
            <span>Leave Days:</span>
            <span>${record.attendance.leaveDays}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">EARNINGS</div>
        <div class="amount-row">
            <span>Gross Salary:</span>
            <span>UGX ${record.grossSalary.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>Transport Allowance:</span>
            <span>UGX ${record.allowances.transport.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>Housing Allowance:</span>
            <span>UGX ${record.allowances.housing.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>Medical Allowance:</span>
            <span>UGX ${record.allowances.medical.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>Performance Allowance:</span>
            <span>UGX ${record.allowances.performance.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>Overtime Allowance:</span>
            <span>UGX ${record.allowances.overtime.toLocaleString()}</span>
        </div>
        <div class="total-row">
            <span>Total Allowances:</span>
            <span>UGX ${record.allowances.total.toLocaleString()}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DEDUCTIONS</div>
        <div class="amount-row">
            <span>Income Tax:</span>
            <span>UGX ${record.deductions.tax.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>NSSF:</span>
            <span>UGX ${record.deductions.nssf.toLocaleString()}</span>
        </div>
        <div class="amount-row">
            <span>Health Insurance:</span>
            <span>UGX ${record.deductions.healthInsurance.toLocaleString()}</span>
        </div>
        <div class="total-row">
            <span>Total Deductions:</span>
            <span>UGX ${record.deductions.total.toLocaleString()}</span>
        </div>
    </div>

    <div class="net-salary">
        NET SALARY: UGX ${record.netSalary.toLocaleString()}
    </div>

    <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
        <p>This is a computer-generated payslip. No signature required.</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Validate payroll record
   */
  static validatePayrollRecord(record: PayrollRecord): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.employeeId) errors.push('Employee ID is required');
    if (!record.employeeName) errors.push('Employee name is required');
    if (record.grossSalary <= 0) errors.push('Gross salary must be positive');
    if (record.netSalary < 0) errors.push('Net salary cannot be negative');
    if (record.attendance.actualDays > record.attendance.workingDays) {
      errors.push('Actual days cannot exceed working days');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 