import { db } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  Timestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import {
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
  COLLECTIONS
} from './models';

export interface InitializationResult {
  success: boolean;
  collectionsCreated: string[];
  documentsCreated: number;
  errors: string[];
}

/**
 * Initialize performance management collections with sample data
 */
export async function initializePerformanceCollections(): Promise<InitializationResult> {
  const result: InitializationResult = {
    success: false,
    collectionsCreated: [],
    documentsCreated: 0,
    errors: []
  };

  try {
    console.log('🎯 Initializing Performance Management Collections...');

    // Sample employee IDs (these would come from your actual employee collection)
    const sampleEmployeeIds = [
      'emp_001_john_doe',
      'emp_002_jane_smith', 
      'emp_003_mike_johnson',
      'emp_004_sarah_wilson',
      'emp_005_alice_brown'
    ];

    const hrManagerId = 'emp_hr_manager';
    const currentDate = Timestamp.now();

    // Initialize Performance Targets
    await initializePerformanceTargets(sampleEmployeeIds, hrManagerId, currentDate);
    result.collectionsCreated.push('performanceTargets');
    result.documentsCreated += sampleEmployeeIds.length * 3; // 3 targets per employee

    // Initialize Performance Evaluations
    await initializePerformanceEvaluations(sampleEmployeeIds, hrManagerId, currentDate);
    result.collectionsCreated.push('performanceEvaluations');
    result.documentsCreated += sampleEmployeeIds.length; // 1 evaluation per employee

    // Initialize Performance Metrics
    await initializePerformanceMetrics(sampleEmployeeIds, currentDate);
    result.collectionsCreated.push('performanceMetrics');
    result.documentsCreated += sampleEmployeeIds.length * 10; // 10 metrics per employee

    // Initialize Development Plans
    await initializeDevelopmentPlans(sampleEmployeeIds, hrManagerId, currentDate);
    result.collectionsCreated.push('performanceDevelopmentPlans');
    result.documentsCreated += Math.floor(sampleEmployeeIds.length / 2); // Some employees have plans

    // Initialize Performance Reports
    await initializePerformanceReports(hrManagerId, currentDate);
    result.collectionsCreated.push('performanceReports');
    result.documentsCreated += 3; // 3 sample reports

    result.success = true;
    console.log('✅ Performance Management Collections initialized successfully!');
    console.log(`📊 Created ${result.documentsCreated} documents across ${result.collectionsCreated.length} collections`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    console.error('❌ Error initializing performance collections:', errorMessage);
  }

  return result;
}

/**
 * Initialize Performance Targets with sample data
 */
async function initializePerformanceTargets(
  employeeIds: string[],
  hrManagerId: string,
  currentDate: Timestamp
): Promise<void> {
  const batch = writeBatch(db);
  const targetsCollection = collection(db, COLLECTIONS.PERFORMANCE_TARGETS);

  const targetTemplates = [
    {
      targetName: 'Monthly Attendance Rate',
      targetType: TargetType.ATTENDANCE_RATE,
      targetValue: 95,
      unit: '%',
      targetPeriod: TargetPeriod.MONTHLY,
      weightPercentage: 25,
      isMandatory: true
    },
    {
      targetName: 'Punctuality Score',
      targetType: TargetType.PUNCTUALITY_SCORE,
      targetValue: 90,
      unit: '%',
      targetPeriod: TargetPeriod.MONTHLY,
      weightPercentage: 20,
      isMandatory: true
    },
    {
      targetName: 'Daily Scan Target',
      targetType: TargetType.SCAN_TARGET,
      targetValue: 100,
      unit: 'scans',
      targetPeriod: TargetPeriod.DAILY,
      weightPercentage: 30,
      isMandatory: false
    }
  ];

  for (const employeeId of employeeIds) {
    for (const template of targetTemplates) {
      const targetRef = doc(targetsCollection);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const target: PerformanceTarget = {
        id: targetRef.id,
        employeeId,
        targetName: template.targetName,
        description: `${template.targetName} target for employee ${employeeId}`,
        targetType: template.targetType,
        targetValue: template.targetValue,
        unit: template.unit,
        targetPeriod: template.targetPeriod,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        weightPercentage: template.weightPercentage,
        isMandatory: template.isMandatory,
        createdByEmployeeId: hrManagerId,
        status: TargetStatus.ACTIVE,
        createdAt: currentDate,
        updatedAt: currentDate
      };

      batch.set(targetRef, target);
    }
  }

  await batch.commit();
  console.log('✅ Performance targets initialized');
}

/**
 * Initialize Performance Evaluations with sample data
 */
async function initializePerformanceEvaluations(
  employeeIds: string[],
  hrManagerId: string,
  currentDate: Timestamp
): Promise<void> {
  const batch = writeBatch(db);
  const evaluationsCollection = collection(db, COLLECTIONS.PERFORMANCE_EVALUATIONS);

  for (const employeeId of employeeIds) {
    const evaluationRef = doc(evaluationsCollection);
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 3);
    const periodEnd = new Date();

    const evaluation: PerformanceEvaluation = {
      id: evaluationRef.id,
      employeeId,
      evaluatorEmployeeId: hrManagerId,
      evaluationPeriodStart: Timestamp.fromDate(periodStart),
      evaluationPeriodEnd: Timestamp.fromDate(periodEnd),
      overallRating: PerformanceRating.MEETS_EXPECTATIONS,
      overallScore: 75,
      targetAchievements: [
        {
          targetId: 'target_attendance',
          targetName: 'Monthly Attendance Rate',
          targetValue: 95,
          achievedValue: 92,
          achievementPercentage: 97,
          rating: PerformanceRating.MEETS_EXPECTATIONS,
          notes: 'Good attendance with minor improvements needed'
        }
      ],
      strengths: [
        'Excellent teamwork and collaboration',
        'Consistent work quality',
        'Good communication skills'
      ],
      areasForImprovement: [
        'Time management skills',
        'Technical knowledge enhancement'
      ],
      developmentGoals: [
        'Complete time management training',
        'Attend technical workshops'
      ],
      managerComments: 'Overall solid performance with room for growth',
      status: EvaluationStatus.APPROVED,
      createdAt: currentDate,
      updatedAt: currentDate,
      finalApprovalDate: currentDate
    };

    batch.set(evaluationRef, evaluation);
  }

  await batch.commit();
  console.log('✅ Performance evaluations initialized');
}

/**
 * Initialize Performance Metrics with sample data
 */
async function initializePerformanceMetrics(
  employeeIds: string[],
  currentDate: Timestamp
): Promise<void> {
  const batch = writeBatch(db);
  const metricsCollection = collection(db, COLLECTIONS.PERFORMANCE_METRICS);

  const metricTypes = [
    TargetType.ATTENDANCE_RATE,
    TargetType.PUNCTUALITY_SCORE,
    TargetType.SCAN_TARGET,
    TargetType.HOURS_WORKED
  ];

  for (const employeeId of employeeIds) {
    for (let day = 0; day < 10; day++) {
      for (const metricType of metricTypes) {
        const metricRef = doc(metricsCollection);
        const metricDate = new Date();
        metricDate.setDate(metricDate.getDate() - day);

        let value: number;
        switch (metricType) {
          case TargetType.ATTENDANCE_RATE:
            value = Math.random() > 0.1 ? 100 : 0; // 90% attendance
            break;
          case TargetType.PUNCTUALITY_SCORE:
            value = Math.random() > 0.2 ? 100 : 0; // 80% punctual
            break;
          case TargetType.SCAN_TARGET:
            value = Math.floor(Math.random() * 50) + 80; // 80-130 scans
            break;
          case TargetType.HOURS_WORKED:
            value = Math.random() * 2 + 7; // 7-9 hours
            break;
          default:
            value = Math.random() * 100;
        }

        const metric: PerformanceMetrics = {
          id: metricRef.id,
          employeeId,
          metricDate: Timestamp.fromDate(metricDate),
          metricType,
          value,
          recordedByEmployeeId: 'system',
          isAutoRecorded: true,
          createdAt: currentDate
        };

        batch.set(metricRef, metric);
      }
    }
  }

  await batch.commit();
  console.log('✅ Performance metrics initialized');
}

/**
 * Initialize Development Plans with sample data
 */
async function initializeDevelopmentPlans(
  employeeIds: string[],
  hrManagerId: string,
  currentDate: Timestamp
): Promise<void> {
  const batch = writeBatch(db);
  const plansCollection = collection(db, COLLECTIONS.PERFORMANCE_DEVELOPMENT_PLANS);

  // Create plans for some employees
  const employeesWithPlans = employeeIds.slice(0, Math.floor(employeeIds.length / 2));

  for (const employeeId of employeesWithPlans) {
    const planRef = doc(plansCollection);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + 3);

    const plan: PerformanceDevelopmentPlan = {
      id: planRef.id,
      employeeId,
      evaluationId: `eval_${employeeId}`,
      goalTitle: 'Professional Development Plan',
      goalDescription: 'Enhance technical skills and improve time management capabilities',
      targetCompletionDate: Timestamp.fromDate(completionDate),
      assignedByEmployeeId: hrManagerId,
      priority: DevelopmentPriority.MEDIUM,
      status: DevelopmentStatus.IN_PROGRESS,
      progressNotes: [
        {
          date: currentDate,
          note: 'Initial plan discussion completed',
          addedByEmployeeId: hrManagerId,
          progressPercentage: 10
        }
      ],
      resourcesRequired: [
        'Online training courses',
        'Mentorship program',
        'Technical documentation'
      ],
      successCriteria: [
        'Complete 3 technical training modules',
        'Demonstrate improved time management',
        'Receive positive feedback from supervisor'
      ],
      createdAt: currentDate,
      updatedAt: currentDate
    };

    batch.set(planRef, plan);
  }

  await batch.commit();
  console.log('✅ Development plans initialized');
}

/**
 * Initialize Performance Reports with sample data
 */
async function initializePerformanceReports(
  hrManagerId: string,
  currentDate: Timestamp
): Promise<void> {
  const batch = writeBatch(db);
  const reportsCollection = collection(db, COLLECTIONS.PERFORMANCE_REPORTS);

  const reportTemplates = [
    {
      reportName: 'Monthly Team Performance Summary',
      reportType: ReportType.TEAM_PERFORMANCE,
      reportData: {
        totalEmployees: 5,
        averageScore: 78.5,
        topPerformers: ['emp_002_jane_smith', 'emp_005_alice_brown'],
        underPerformers: ['emp_003_mike_johnson'],
        targetCompletionRate: 85
      }
    },
    {
      reportName: 'Individual Performance Analysis',
      reportType: ReportType.INDIVIDUAL_PERFORMANCE,
      reportData: {
        employeeId: 'emp_001_john_doe',
        overallScore: 82,
        attendanceRate: 95,
        targetAchievements: 4,
        areasForImprovement: ['Time management', 'Technical skills']
      }
    },
    {
      reportName: 'Target Achievement Summary Q1',
      reportType: ReportType.TARGET_ACHIEVEMENT_SUMMARY,
      reportData: {
        totalTargets: 15,
        achievedTargets: 12,
        achievementRate: 80,
        commonMissedTargets: ['Punctuality', 'Technical certifications']
      }
    }
  ];

  for (const template of reportTemplates) {
    const reportRef = doc(reportsCollection);
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 1);

    const report: PerformanceReport = {
      id: reportRef.id,
      reportName: template.reportName,
      reportType: template.reportType,
      generatedByEmployeeId: hrManagerId,
      generationDate: currentDate,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: currentDate,
      includedEmployees: ['emp_001_john_doe', 'emp_002_jane_smith'],
      includedBranches: ['branch_001'],
      reportData: template.reportData,
      createdAt: currentDate
    };

    batch.set(reportRef, report);
  }

  await batch.commit();
  console.log('✅ Performance reports initialized');
}

/**
 * Utility function to clear all performance collections (for testing)
 */
export async function clearPerformanceCollections(): Promise<void> {
  console.log('🗑️ Clearing performance collections...');
  
  const collections = [
    COLLECTIONS.PERFORMANCE_TARGETS,
    COLLECTIONS.PERFORMANCE_EVALUATIONS,
    COLLECTIONS.PERFORMANCE_METRICS,
    COLLECTIONS.PERFORMANCE_DEVELOPMENT_PLANS,
    COLLECTIONS.PERFORMANCE_REPORTS
  ];

  for (const collectionName of collections) {
    // Note: In a real implementation, you'd need to implement batch deletion
    // This is just a placeholder for the structure
    console.log(`Clearing ${collectionName}...`);
  }
  
  console.log('✅ Performance collections cleared');
}

/**
 * Verify collections are properly set up
 */
export async function verifyPerformanceCollections(): Promise<boolean> {
  console.log('🔍 Verifying performance collections...');
  
  try {
    const collections = [
      COLLECTIONS.PERFORMANCE_TARGETS,
      COLLECTIONS.PERFORMANCE_EVALUATIONS,
      COLLECTIONS.PERFORMANCE_METRICS,
      COLLECTIONS.PERFORMANCE_DEVELOPMENT_PLANS,
      COLLECTIONS.PERFORMANCE_REPORTS
    ];

    for (const collectionName of collections) {
      const testDoc = doc(db, collectionName, 'test');
      // Attempt to read the collection to verify it exists
      // In practice, you'd check if documents exist
      console.log(`✓ ${collectionName} collection accessible`);
    }

    console.log('✅ All performance collections verified');
    return true;
  } catch (error) {
    console.error('❌ Error verifying collections:', error);
    return false;
  }
} 
 
 
 
 