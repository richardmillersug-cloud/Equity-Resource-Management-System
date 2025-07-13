import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { FirestoreService, COLLECTIONS } from './firestore-service';
import {
  PerformanceTarget,
  PerformanceEvaluation,
  PerformanceMetrics,
  PerformanceDevelopmentPlan,
  PerformanceReport,
  TargetType,
  TargetStatus,
  PerformanceRating,
  EvaluationStatus,
  DevelopmentStatus,
  ReportType,
  QueryFilters,
  PaginationOptions
} from './models';

// ==================== PERFORMANCE TARGET SERVICE ====================

export class PerformanceTargetService extends FirestoreService<PerformanceTarget> {
  constructor() {
    super(COLLECTIONS.PERFORMANCE_TARGETS);
  }

  async createTarget(targetData: Omit<PerformanceTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const targetWithTimestamps = {
      ...targetData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(this.collectionRef, targetWithTimestamps);
    return docRef.id;
  }

  async getEmployeeTargets(
    employeeId: string,
    status?: TargetStatus,
    targetType?: TargetType
  ): Promise<PerformanceTarget[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId }
    ];

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

    if (targetType) {
      filters.push({ field: 'targetType', operator: '==', value: targetType });
    }

    return this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  async getActiveTargets(employeeId: string): Promise<PerformanceTarget[]> {
    return this.getEmployeeTargets(employeeId, TargetStatus.ACTIVE);
  }

  async updateTargetStatus(targetId: string, status: TargetStatus): Promise<void> {
    await this.update(targetId, { 
      status,
      updatedAt: Timestamp.now()
    });
  }

  async getTargetsForPeriod(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceTarget[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'startDate', operator: '>=', value: Timestamp.fromDate(startDate) },
      { field: 'endDate', operator: '<=', value: Timestamp.fromDate(endDate) }
    ];

    return this.getAll(filters, { orderBy: 'startDate', orderDirection: 'asc' });
  }
}

// ==================== PERFORMANCE EVALUATION SERVICE ====================

export class PerformanceEvaluationService extends FirestoreService<PerformanceEvaluation> {
  constructor() {
    super(COLLECTIONS.PERFORMANCE_EVALUATIONS);
  }

  async createEvaluation(evaluationData: Omit<PerformanceEvaluation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const evaluationWithTimestamps = {
      ...evaluationData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(this.collectionRef, evaluationWithTimestamps);
    return docRef.id;
  }

  async getEmployeeEvaluations(
    employeeId: string,
    status?: EvaluationStatus
  ): Promise<PerformanceEvaluation[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId }
    ];

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

    return this.getAll(filters, { orderBy: 'evaluationPeriodStart', orderDirection: 'desc' });
  }

  async getEvaluationsByEvaluator(evaluatorId: string): Promise<PerformanceEvaluation[]> {
    const filters: QueryFilters[] = [
      { field: 'evaluatorEmployeeId', operator: '==', value: evaluatorId }
    ];

    return this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  async getPendingEvaluations(): Promise<PerformanceEvaluation[]> {
    const filters: QueryFilters[] = [
      { field: 'status', operator: 'in', value: [
        EvaluationStatus.DRAFT,
        EvaluationStatus.PENDING_EMPLOYEE_REVIEW,
        EvaluationStatus.PENDING_HR_REVIEW
      ]}
    ];

    return this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'asc' });
  }

  async updateEvaluationStatus(
    evaluationId: string, 
    status: EvaluationStatus,
    additionalData?: Partial<PerformanceEvaluation>
  ): Promise<void> {
    await this.update(evaluationId, {
      status,
      ...additionalData,
      updatedAt: Timestamp.now()
    });
  }

  async submitForEmployeeReview(evaluationId: string): Promise<void> {
    await this.updateEvaluationStatus(evaluationId, EvaluationStatus.PENDING_EMPLOYEE_REVIEW);
  }

  async submitEmployeeComments(
    evaluationId: string,
    employeeComments: string
  ): Promise<void> {
    await this.updateEvaluationStatus(
      evaluationId,
      EvaluationStatus.PENDING_HR_REVIEW,
      {
        employeeComments,
        reviewedByEmployeeDate: Timestamp.now()
      }
    );
  }

  async approveEvaluation(
    evaluationId: string,
    hrComments: string
  ): Promise<void> {
    await this.updateEvaluationStatus(
      evaluationId,
      EvaluationStatus.APPROVED,
      {
        hrComments,
        reviewedByHrDate: Timestamp.now(),
        finalApprovalDate: Timestamp.now()
      }
    );
  }
}

// ==================== PERFORMANCE METRICS SERVICE ====================

export class PerformanceMetricsService extends FirestoreService<PerformanceMetrics> {
  constructor() {
    super(COLLECTIONS.PERFORMANCE_METRICS);
  }

  async recordMetric(metricData: Omit<PerformanceMetrics, 'id' | 'createdAt'>): Promise<string> {
    const metricWithTimestamp = {
      ...metricData,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(this.collectionRef, metricWithTimestamp);
    return docRef.id;
  }

  async getEmployeeMetrics(
    employeeId: string,
    metricType?: TargetType,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId }
    ];

    if (metricType) {
      filters.push({ field: 'metricType', operator: '==', value: metricType });
    }

    if (startDate) {
      filters.push({ field: 'metricDate', operator: '>=', value: Timestamp.fromDate(startDate) });
    }

    if (endDate) {
      filters.push({ field: 'metricDate', operator: '<=', value: Timestamp.fromDate(endDate) });
    }

    return this.getAll(filters, { orderBy: 'metricDate', orderDirection: 'desc' });
  }

  async getMetricsForTarget(
    employeeId: string,
    targetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'targetId', operator: '==', value: targetId },
      { field: 'metricDate', operator: '>=', value: Timestamp.fromDate(startDate) },
      { field: 'metricDate', operator: '<=', value: Timestamp.fromDate(endDate) }
    ];

    return this.getAll(filters, { orderBy: 'metricDate', orderDirection: 'asc' });
  }

  async getLatestMetric(
    employeeId: string,
    metricType: TargetType
  ): Promise<PerformanceMetrics | null> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId },
      { field: 'metricType', operator: '==', value: metricType }
    ];

    const metrics = await this.getAll(filters, { 
      orderBy: 'metricDate', 
      orderDirection: 'desc',
      limit: 1
    });

    return metrics.length > 0 ? metrics[0] : null;
  }
}

// ==================== PERFORMANCE DEVELOPMENT PLAN SERVICE ====================

export class PerformanceDevelopmentPlanService extends FirestoreService<PerformanceDevelopmentPlan> {
  constructor() {
    super(COLLECTIONS.PERFORMANCE_DEVELOPMENT_PLANS);
  }

  async createPlan(planData: Omit<PerformanceDevelopmentPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const planWithTimestamps = {
      ...planData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(this.collectionRef, planWithTimestamps);
    return docRef.id;
  }

  async getEmployeePlans(
    employeeId: string,
    status?: DevelopmentStatus
  ): Promise<PerformanceDevelopmentPlan[]> {
    const filters: QueryFilters[] = [
      { field: 'employeeId', operator: '==', value: employeeId }
    ];

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

    return this.getAll(filters, { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  async updatePlanProgress(
    planId: string,
    progressNote: string,
    progressPercentage: number,
    addedByEmployeeId: string
  ): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan) {
      throw new Error('Development plan not found');
    }

    const newProgressNote = {
      date: Timestamp.now(),
      note: progressNote,
      addedByEmployeeId,
      progressPercentage
    };

    const updatedProgressNotes = [...plan.progressNotes, newProgressNote];

    await this.update(planId, {
      progressNotes: updatedProgressNotes,
      updatedAt: Timestamp.now()
    });
  }

  async completePlan(planId: string): Promise<void> {
    await this.update(planId, {
      status: DevelopmentStatus.COMPLETED,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
}

// ==================== PERFORMANCE REPORT SERVICE ====================

export class PerformanceReportService extends FirestoreService<PerformanceReport> {
  constructor() {
    super(COLLECTIONS.PERFORMANCE_REPORTS);
  }

  async createReport(reportData: Omit<PerformanceReport, 'id' | 'createdAt'>): Promise<string> {
    const reportWithTimestamp = {
      ...reportData,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(this.collectionRef, reportWithTimestamp);
    return docRef.id;
  }

  async getReportsByType(reportType: ReportType): Promise<PerformanceReport[]> {
    const filters: QueryFilters[] = [
      { field: 'reportType', operator: '==', value: reportType }
    ];

    return this.getAll(filters, { orderBy: 'generationDate', orderDirection: 'desc' });
  }

  async getReportsByEmployee(employeeId: string): Promise<PerformanceReport[]> {
    const filters: QueryFilters[] = [
      { field: 'includedEmployees', operator: 'array-contains', value: employeeId }
    ];

    return this.getAll(filters, { orderBy: 'generationDate', orderDirection: 'desc' });
  }

  async getReportsByGenerator(generatorId: string): Promise<PerformanceReport[]> {
    const filters: QueryFilters[] = [
      { field: 'generatedByEmployeeId', operator: '==', value: generatorId }
    ];

    return this.getAll(filters, { orderBy: 'generationDate', orderDirection: 'desc' });
  }
}

// ==================== EXPORT SERVICES ====================

export const performanceTargetService = new PerformanceTargetService();
export const performanceEvaluationService = new PerformanceEvaluationService();
export const performanceMetricsService = new PerformanceMetricsService();
export const performanceDevelopmentPlanService = new PerformanceDevelopmentPlanService();
export const performanceReportService = new PerformanceReportService(); 
 
 
 
 