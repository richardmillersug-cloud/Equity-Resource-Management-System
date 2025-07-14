import {
  PerformanceTarget,
  PerformanceEvaluation,
  PerformanceMetrics,
  PerformanceRating,
  TargetType,
  TargetStatus,
  Employee,
  Attendance
} from '../database/schema';

export interface PerformanceAnalytics {
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  overallScore: number;
  attendanceRate: number;
  punctualityScore: number;
  targetAchievementRate: number;
  lastEvaluationRating: PerformanceRating;
  improvementTrend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TeamPerformanceAnalytics {
  teamName: string;
  totalEmployees: number;
  averageScore: number;
  topPerformers: PerformanceAnalytics[];
  underPerformers: PerformanceAnalytics[];
  targetCompletionRate: number;
  attendanceRate: number;
  evaluationsCompleted: number;
  evaluationsPending: number;
}

export interface PerformanceTrend {
  period: string;
  score: number;
  targetsMet: number;
  totalTargets: number;
  attendanceRate: number;
}

export interface PerformanceBenchmark {
  metric: string;
  employeeValue: number;
  departmentAverage: number;
  companyAverage: number;
  percentile: number;
}

export class PerformanceAnalyticsService {
  
  /**
   * Calculates comprehensive performance analytics for an employee
   */
  async calculateEmployeeAnalytics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceAnalytics> {
    const employee = await this.getEmployee(employeeId);
    const targets = await this.getTargetsForPeriod(employeeId, startDate, endDate);
    const evaluations = await this.getEvaluationsForPeriod(employeeId, startDate, endDate);
    const attendance = await this.getAttendanceForPeriod(employeeId, startDate, endDate);

    // Calculate overall score from evaluations
    const overallScore = evaluations.length > 0 
      ? evaluations.reduce((sum, eval) => sum + eval.overall_score, 0) / evaluations.length 
      : 0;

    // Calculate attendance and punctuality rates
    const attendanceStats = this.calculateAttendanceStats(attendance, startDate, endDate);

    // Calculate target achievement rate
    const targetAchievementRate = this.calculateTargetAchievementRate(targets);

    // Determine improvement trend
    const improvementTrend = await this.calculateImprovementTrend(employeeId, endDate);

    // Assess risk level
    const riskLevel = this.assessRiskLevel(overallScore, attendanceStats.attendanceRate, targetAchievementRate);

    return {
      employeeId: employee.id,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      role: employee.role,
      department: 'General', // Would come from employee data
      overallScore,
      attendanceRate: attendanceStats.attendanceRate,
      punctualityScore: attendanceStats.punctualityScore,
      targetAchievementRate,
      lastEvaluationRating: evaluations.length > 0 
        ? evaluations[evaluations.length - 1].overall_rating 
        : PerformanceRating.MEETS_EXPECTATIONS,
      improvementTrend,
      riskLevel
    };
  }

  /**
   * Calculates team performance analytics
   */
  async calculateTeamAnalytics(
    employeeIds: string[],
    teamName: string,
    startDate: Date,
    endDate: Date
  ): Promise<TeamPerformanceAnalytics> {
    const employeeAnalytics = await Promise.all(
      employeeIds.map(id => this.calculateEmployeeAnalytics(id, startDate, endDate))
    );

    const averageScore = employeeAnalytics.length > 0 
      ? employeeAnalytics.reduce((sum, emp) => sum + emp.overallScore, 0) / employeeAnalytics.length 
      : 0;

    const totalTargets = await this.getTotalTargetsForTeam(employeeIds, startDate, endDate);
    const completedTargets = await this.getCompletedTargetsForTeam(employeeIds, startDate, endDate);
    const targetCompletionRate = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 0;

    const averageAttendanceRate = employeeAnalytics.length > 0 
      ? employeeAnalytics.reduce((sum, emp) => sum + emp.attendanceRate, 0) / employeeAnalytics.length 
      : 0;

    const evaluationsStats = await this.getTeamEvaluationStats(employeeIds, startDate, endDate);

    // Identify top and under performers
    const sortedEmployees = employeeAnalytics.sort((a, b) => b.overallScore - a.overallScore);
    const topPerformers = sortedEmployees.slice(0, Math.min(3, sortedEmployees.length));
    const underPerformers = sortedEmployees.slice(-Math.min(3, sortedEmployees.length)).reverse();

    return {
      teamName,
      totalEmployees: employeeAnalytics.length,
      averageScore,
      topPerformers,
      underPerformers,
      targetCompletionRate,
      attendanceRate: averageAttendanceRate,
      evaluationsCompleted: evaluationsStats.completed,
      evaluationsPending: evaluationsStats.pending
    };
  }

  /**
   * Generates performance trends over time
   */
  async generatePerformanceTrends(
    employeeId: string,
    periodsBack: number = 6
  ): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];
    const currentDate = new Date();

    for (let i = 0; i < periodsBack; i++) {
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 0);
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      const targets = await this.getTargetsForPeriod(employeeId, startDate, endDate);
      const evaluations = await this.getEvaluationsForPeriod(employeeId, startDate, endDate);
      const attendance = await this.getAttendanceForPeriod(employeeId, startDate, endDate);

      const score = evaluations.length > 0 
        ? evaluations.reduce((sum, eval) => sum + eval.overall_score, 0) / evaluations.length 
        : 0;

      const targetsMet = targets.filter(t => t.status === TargetStatus.COMPLETED).length;
      const attendanceStats = this.calculateAttendanceStats(attendance, startDate, endDate);

      trends.unshift({
        period: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        score,
        targetsMet,
        totalTargets: targets.length,
        attendanceRate: attendanceStats.attendanceRate
      });
    }

    return trends;
  }

  /**
   * Generates performance benchmarks comparing employee to department and company averages
   */
  async generatePerformanceBenchmarks(
    employeeId: string,
    departmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceBenchmark[]> {
    const employeeAnalytics = await this.calculateEmployeeAnalytics(employeeId, startDate, endDate);
    const departmentAnalytics = await this.calculateDepartmentAverages(departmentId, startDate, endDate);
    const companyAnalytics = await this.calculateCompanyAverages(startDate, endDate);

    const benchmarks: PerformanceBenchmark[] = [
      {
        metric: 'Overall Performance Score',
        employeeValue: employeeAnalytics.overallScore,
        departmentAverage: departmentAnalytics.averageScore,
        companyAverage: companyAnalytics.averageScore,
        percentile: this.calculatePercentile(employeeAnalytics.overallScore, companyAnalytics.allScores)
      },
      {
        metric: 'Attendance Rate',
        employeeValue: employeeAnalytics.attendanceRate,
        departmentAverage: departmentAnalytics.averageAttendance,
        companyAverage: companyAnalytics.averageAttendance,
        percentile: this.calculatePercentile(employeeAnalytics.attendanceRate, companyAnalytics.allAttendanceRates)
      },
      {
        metric: 'Target Achievement Rate',
        employeeValue: employeeAnalytics.targetAchievementRate,
        departmentAverage: departmentAnalytics.averageTargetAchievement,
        companyAverage: companyAnalytics.averageTargetAchievement,
        percentile: this.calculatePercentile(employeeAnalytics.targetAchievementRate, companyAnalytics.allTargetRates)
      },
      {
        metric: 'Punctuality Score',
        employeeValue: employeeAnalytics.punctualityScore,
        departmentAverage: departmentAnalytics.averagePunctuality,
        companyAverage: companyAnalytics.averagePunctuality,
        percentile: this.calculatePercentile(employeeAnalytics.punctualityScore, companyAnalytics.allPunctualityScores)
      }
    ];

    return benchmarks;
  }

  /**
   * Generates automated performance insights and recommendations
   */
  async generatePerformanceInsights(employeeId: string): Promise<{
    insights: string[];
    recommendations: string[];
    strengths: string[];
    riskFactors: string[];
  }> {
    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, currentDate.getDate());
    
    const analytics = await this.calculateEmployeeAnalytics(employeeId, sixMonthsAgo, currentDate);
    const trends = await this.generatePerformanceTrends(employeeId, 6);

    const insights: string[] = [];
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const riskFactors: string[] = [];

    // Analyze performance trends
    if (trends.length >= 3) {
      const recentTrend = trends.slice(-3);
      const scoreTrend = recentTrend.map(t => t.score);
      
      if (scoreTrend.every((score, i) => i === 0 || score >= scoreTrend[i - 1])) {
        insights.push('Performance has been consistently improving over the last 3 months');
        strengths.push('Consistent performance improvement');
      } else if (scoreTrend.every((score, i) => i === 0 || score <= scoreTrend[i - 1])) {
        insights.push('Performance has been declining over the last 3 months');
        riskFactors.push('Declining performance trend');
        recommendations.push('Schedule performance coaching sessions to address declining trend');
      }
    }

    // Analyze attendance
    if (analytics.attendanceRate >= 95) {
      strengths.push('Excellent attendance record');
    } else if (analytics.attendanceRate < 85) {
      riskFactors.push('Poor attendance record');
      recommendations.push('Address attendance issues through HR intervention');
    }

    // Analyze punctuality
    if (analytics.punctualityScore >= 90) {
      strengths.push('Consistently punctual');
    } else if (analytics.punctualityScore < 70) {
      riskFactors.push('Punctuality concerns');
      recommendations.push('Implement punctuality improvement plan');
    }

    // Analyze target achievement
    if (analytics.targetAchievementRate >= 90) {
      strengths.push('Consistently exceeds targets');
    } else if (analytics.targetAchievementRate < 60) {
      riskFactors.push('Poor target achievement');
      recommendations.push('Review and adjust performance targets, provide additional training');
    }

    // Overall performance analysis
    if (analytics.overallScore >= 85) {
      insights.push('Employee is a high performer and potential candidate for advancement');
      recommendations.push('Consider for leadership development programs or increased responsibilities');
    } else if (analytics.overallScore < 60) {
      insights.push('Employee requires immediate performance intervention');
      recommendations.push('Implement performance improvement plan with clear milestones and support');
    }

    // Risk assessment
    if (analytics.riskLevel === 'high') {
      insights.push('Employee is at high risk for performance issues or turnover');
      recommendations.push('Schedule immediate one-on-one meetings to address concerns');
    }

    return {
      insights,
      recommendations,
      strengths,
      riskFactors
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private calculateAttendanceStats(
    attendance: Attendance[],
    startDate: Date,
    endDate: Date
  ): { attendanceRate: number; punctualityScore: number } {
    const totalWorkingDays = this.getWorkingDays(startDate, endDate);
    const presentDays = attendance.filter(a => a.check_in_time).length;
    const attendanceRate = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;

    // Calculate punctuality (on-time check-ins)
    const onTimeCheckIns = attendance.filter(record => {
      if (!record.check_in_time) return false;
      const checkInHour = record.check_in_time.getHours();
      const checkInMinute = record.check_in_time.getMinutes();
      return checkInHour < 9 || (checkInHour === 9 && checkInMinute <= 0); // On time if before 9:00 AM
    }).length;

    const punctualityScore = presentDays > 0 ? (onTimeCheckIns / presentDays) * 100 : 0;

    return { attendanceRate, punctualityScore };
  }

  private calculateTargetAchievementRate(targets: PerformanceTarget[]): number {
    if (targets.length === 0) return 0;
    const completedTargets = targets.filter(t => t.status === TargetStatus.COMPLETED).length;
    return (completedTargets / targets.length) * 100;
  }

  private async calculateImprovementTrend(
    employeeId: string,
    currentDate: Date
  ): Promise<'improving' | 'declining' | 'stable'> {
    const trends = await this.generatePerformanceTrends(employeeId, 3);
    if (trends.length < 2) return 'stable';

    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];

    const scoreDiff = latest.score - previous.score;
    
    if (scoreDiff > 5) return 'improving';
    if (scoreDiff < -5) return 'declining';
    return 'stable';
  }

  private assessRiskLevel(
    overallScore: number,
    attendanceRate: number,
    targetAchievementRate: number
  ): 'low' | 'medium' | 'high' {
    const riskFactors = [
      overallScore < 60,
      attendanceRate < 85,
      targetAchievementRate < 60
    ].filter(Boolean).length;

    if (riskFactors >= 2) return 'high';
    if (riskFactors === 1) return 'medium';
    return 'low';
  }

  private calculatePercentile(value: number, allValues: number[]): number {
    const sorted = allValues.sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return (rank / sorted.length) * 100;
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

  // Database interaction placeholder methods
  private async getEmployee(id: string): Promise<Employee> {
    return {} as Employee;
  }

  private async getTargetsForPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<PerformanceTarget[]> {
    return [];
  }

  private async getEvaluationsForPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<PerformanceEvaluation[]> {
    return [];
  }

  private async getAttendanceForPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return [];
  }

  private async getTotalTargetsForTeam(employeeIds: string[], startDate: Date, endDate: Date): Promise<number> {
    return 0;
  }

  private async getCompletedTargetsForTeam(employeeIds: string[], startDate: Date, endDate: Date): Promise<number> {
    return 0;
  }

  private async getTeamEvaluationStats(employeeIds: string[], startDate: Date, endDate: Date): Promise<{completed: number; pending: number}> {
    return {completed: 0, pending: 0};
  }

  private async calculateDepartmentAverages(departmentId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      averageScore: 75,
      averageAttendance: 90,
      averageTargetAchievement: 80,
      averagePunctuality: 85
    };
  }

  private async calculateCompanyAverages(startDate: Date, endDate: Date): Promise<any> {
    return {
      averageScore: 72,
      averageAttendance: 88,
      averageTargetAchievement: 78,
      averagePunctuality: 82,
      allScores: [60, 65, 70, 75, 80, 85, 90],
      allAttendanceRates: [80, 85, 88, 90, 92, 95, 98],
      allTargetRates: [65, 70, 75, 78, 82, 85, 90],
      allPunctualityScores: [70, 75, 80, 82, 85, 88, 92]
    };
  }
}

// Export singleton instance
export const performanceAnalyticsService = new PerformanceAnalyticsService(); 
 
 
 
 