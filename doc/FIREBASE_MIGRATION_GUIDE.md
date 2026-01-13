# Firebase Firestore Migration Guide

## Overview

This guide outlines the complete migration from PostgreSQL to Firebase Firestore for the multi-branch retail/supply chain management system. The migration maintains all business rules, data relationships, and security controls while leveraging Firestore's real-time capabilities and scalability.

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Data Model Transformation](#data-model-transformation)
3. [Business Rules Implementation](#business-rules-implementation)
4. [Security Rules](#security-rules)
5. [Service Layer](#service-layer)
6. [Migration Steps](#migration-steps)
7. [Testing Strategy](#testing-strategy)
8. [Performance Considerations](#performance-considerations)
9. [Backup and Recovery](#backup-and-recovery)

## Migration Strategy

### Key Principles

1. **Zero Downtime Migration**: Implement dual-write strategy during transition
2. **Data Integrity**: Maintain all business rules and constraints
3. **Security First**: Implement comprehensive Firestore security rules
4. **Performance Optimization**: Leverage Firestore's real-time capabilities
5. **Audit Trail**: Preserve complete audit history during migration

### Migration Phases

#### Phase 1: Infrastructure Setup
- Firebase project configuration
- Firestore database setup
- Security rules deployment
- Service layer implementation

#### Phase 2: Data Migration
- Schema transformation
- Historical data migration
- Data validation and verification

#### Phase 3: Application Migration
- Service layer integration
- Frontend updates
- Real-time features implementation

#### Phase 4: Cutover and Optimization
- Traffic routing to Firestore
- PostgreSQL decommissioning
- Performance monitoring and optimization

## Data Model Transformation

### PostgreSQL to Firestore Mapping

#### Relational to Document Structure

**PostgreSQL Approach:**
```sql
-- Normalized tables with foreign keys
Employee -> JobRole (1:N)
Branch -> Employee (1:N)
Invoice -> Payment (1:N)
```

**Firestore Approach:**
```typescript
// Embedded relationships for better performance
interface Employee {
  id: string;
  roles: JobRole[]; // Embedded array
  branchId: string; // Reference
}

// Subcollections for 1:N relationships
employees/{employeeId}/attendance/{attendanceId}
invoices/{invoiceId}/payments/{paymentId}
```

### Collection Structure

#### Core Collections

```
/branches/{branchId}
/employees/{employeeId}
  /attendance/{attendanceId}
  /payroll/{payrollId}
  /leaves/{leaveId}

/suppliers/{supplierId}
  /invoices/{invoiceId}
    /payments/{paymentId}

/cashAllocations/{allocationId}
/fundAcknowledgments/{acknowledgmentId}
/expenses/{expenseId}
/auditLogs/{logId}
```

#### Data Type Transformations

| PostgreSQL Type | Firestore Type | Notes |
|----------------|----------------|-------|
| SERIAL | Auto-generated ID | Firestore generates unique IDs |
| TIMESTAMP | Timestamp | Firebase Timestamp object |
| DECIMAL(15,2) | number | JavaScript number (64-bit float) |
| VARCHAR | string | UTF-8 strings |
| BOOLEAN | boolean | Native boolean type |
| JSONB | object | Native object/map support |
| ENUM | string | String with validation rules |

### Unique Constraints Implementation

Since Firestore doesn't support unique constraints natively, we implement them through:

1. **Application-level validation** in business rules
2. **Composite indexes** for query optimization
3. **Transaction-based checks** for critical uniqueness

```typescript
// Example: Ensuring unique employee NIN
async validateUniqueNIN(nin: string): Promise<boolean> {
  const existing = await firestoreServices.employee.getByNIN(nin);
  return existing === null;
}
```

## Business Rules Implementation

### Rule Categories

#### 1. Financial Management Rules

```typescript
// Cash Allocation Rules
- Only accountants can create allocations
- 12% savings mandatory
- Total allocation ≤ cash close total
- Purchasing manager validation

// Payment Rules  
- Amount ≤ invoice remaining balance
- Valid transaction ID required
- Approved payment methods only
- Automatic invoice status updates
```

#### 2. Supply Chain Rules

```typescript
// Supplier Rules
- Unique TIN number validation
- Bank details requirement
- Managing employee assignment

// Invoice Rules
- Unique FDN validation
- Due date > invoice date
- Positive amounts only
- Status workflow management
```

#### 3. Human Resources Rules

```typescript
// Employee Rules
- Unique NIN and email
- Valid branch assignment
- Positive salary requirement
- Role-based permissions

// Attendance Rules
- Single check-in per day
- Check-out requires check-in
- Overtime calculation
- Barcode validation
```

### Business Rules Engine

The `FirebaseBusinessRules` class provides:

```typescript
// Validation methods
validateCashAllocation(allocation, user): Promise<ValidationResult>
validatePayment(payment, user): Promise<ValidationResult>
validateEmployee(employee, user): Promise<ValidationResult>

// Authorization methods
canCreateCashAllocation(user): boolean
canProcessPayment(user): boolean
canManageEmployees(user): boolean

// Business logic helpers
calculateInvoiceStatus(invoice, totalPaid): InvoiceStatus
calculateCashAllocationDefaults(total): AllocationBreakdown
```

## Security Rules

### Role-Based Access Control

#### User Roles Hierarchy

```
Admin > Managing Director > HR/Accountant > Purchasing Manager > 
Stock Manager > Supervisor > Receiver > User
```

#### Permission Matrix

| Role | Cash Mgmt | Invoices | Suppliers | Employees | Payroll | Reports | Admin |
|------|-----------|----------|-----------|-----------|---------|---------|-------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Managing Director | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Accountant | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Purchasing Manager | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |

### Firestore Security Rules

Key security implementations:

```javascript
// Employee access control
match /employees/{employeeId} {
  allow read: if isOwner(employeeId) || 
                 hasAnyRole(['admin', 'hr']) ||
                 isSameBranch(resource.data.branchId);
}

// Financial data protection
match /cashAllocations/{allocationId} {
  allow create: if hasAnyRole(['accountant', 'accountant_operations']) &&
                   validateCashAllocation();
}

// Audit log immutability
match /auditLogs/{logId} {
  allow create: if isAuthenticated();
  // No update or delete - audit logs are immutable
}
```

## Service Layer

### Firestore Services Architecture

#### Base Service Class

```typescript
class FirestoreService<T> {
  // CRUD operations
  async create(data): Promise<string>
  async getById(id): Promise<T | null>
  async update(id, data): Promise<void>
  async delete(id): Promise<void>
  async getAll(filters?, pagination?): Promise<T[]>
  
  // Real-time subscriptions
  onSnapshot(callback, filters?): () => void
}
```

#### Specialized Services

```typescript
// Financial services
CashAllocationService
PaymentService
ExpenseService
CashCloseService

// Supply chain services
SupplierService
InvoiceService

// HR services
EmployeeService
AttendanceService

// Audit service
AuditService
```

### Real-time Features

Firestore enables real-time updates for:

```typescript
// Live dashboard updates
firestoreServices.cashClose.onSnapshot((cashCloses) => {
  updateDashboardMetrics(cashCloses);
});

// Real-time notifications
firestoreServices.expense.onSnapshot((expenses) => {
  const pending = expenses.filter(e => e.status === 'pending');
  notifyPendingApprovals(pending);
});
```

## Migration Steps

### Step 1: Environment Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

### Step 2: Data Export from PostgreSQL

```sql
-- Export employees
COPY (
  SELECT row_to_json(t) FROM (
    SELECT * FROM Employee e
    LEFT JOIN JobRole jr ON e.EmployeeID = jr.AssignedEmployeeID
  ) t
) TO '/tmp/employees.json';

-- Export financial data
COPY (
  SELECT row_to_json(t) FROM (
    SELECT * FROM CashAllocation
  ) t
) TO '/tmp/cash_allocations.json';
```

### Step 3: Data Transformation Script

```typescript
// migration/transform-data.ts
import { readFileSync } from 'fs';
import { Timestamp } from 'firebase/firestore';

interface PostgreSQLEmployee {
  employeeid: number;
  firstname: string;
  lastname: string;
  // ... other fields
}

interface FirestoreEmployee {
  id: string;
  firstName: string;
  lastName: string;
  // ... transformed fields
}

function transformEmployee(pgEmployee: PostgreSQLEmployee): FirestoreEmployee {
  return {
    id: pgEmployee.employeeid.toString(),
    firstName: pgEmployee.firstname,
    lastName: pgEmployee.lastname,
    employeeNIN: pgEmployee.employeenin,
    email: pgEmployee.email,
    hireDate: Timestamp.fromDate(new Date(pgEmployee.hiredate)),
    employeeSalary: pgEmployee.employeesalary,
    employmentStatus: pgEmployee.employmentstatus as 'Active' | 'Inactive' | 'Terminated',
    branchId: pgEmployee.branchid.toString(),
    roles: [], // Will be populated from JobRole data
    createdAt: Timestamp.fromDate(new Date(pgEmployee.createdat)),
    updatedAt: Timestamp.fromDate(new Date(pgEmployee.updatedat))
  };
}
```

### Step 4: Data Import to Firestore

```typescript
// migration/import-data.ts
import { firestoreServices } from '../src/lib/firebase/firestore-service';

async function importEmployees() {
  const employees = JSON.parse(readFileSync('/tmp/employees.json', 'utf8'));
  
  for (const pgEmployee of employees) {
    const firestoreEmployee = transformEmployee(pgEmployee);
    
    try {
      await firestoreServices.employee.create(firestoreEmployee);
      console.log(`Imported employee: ${firestoreEmployee.id}`);
    } catch (error) {
      console.error(`Failed to import employee ${firestoreEmployee.id}:`, error);
    }
  }
}
```

### Step 5: Data Validation

```typescript
// migration/validate-data.ts
async function validateMigration() {
  // Count records
  const pgEmployeeCount = await queryPostgreSQL('SELECT COUNT(*) FROM Employee');
  const fsEmployees = await firestoreServices.employee.getAll();
  
  console.log(`PostgreSQL employees: ${pgEmployeeCount}`);
  console.log(`Firestore employees: ${fsEmployees.length}`);
  
  // Validate business rules
  for (const employee of fsEmployees) {
    const validation = await businessRules.validateEmployee(employee, employee);
    if (!validation.isValid) {
      console.error(`Invalid employee ${employee.id}:`, validation.errors);
    }
  }
}
```

### Step 6: Application Updates

```typescript
// Update service imports
import { firestoreServices } from '../lib/firebase/firestore-service';

// Replace database calls
// Before: await db.query('SELECT * FROM Employee WHERE BranchID = ?', [branchId])
// After: await firestoreServices.employee.getAll([
//   { field: 'branchId', operator: '==', value: branchId }
// ]);
```

## Testing Strategy

### Unit Tests

```typescript
// tests/services/employee.test.ts
describe('EmployeeService', () => {
  beforeEach(async () => {
    // Setup test Firestore emulator
    await setupFirestoreEmulator();
  });

  test('should create employee with valid data', async () => {
    const employeeData = createValidEmployeeData();
    const employeeId = await firestoreServices.employee.create(employeeData);
    
    expect(employeeId).toBeDefined();
    
    const employee = await firestoreServices.employee.getById(employeeId);
    expect(employee).toMatchObject(employeeData);
  });

  test('should enforce unique NIN constraint', async () => {
    const employeeData = createValidEmployeeData();
    await firestoreServices.employee.create(employeeData);
    
    // Attempt to create duplicate
    await expect(
      firestoreServices.employee.create(employeeData)
    ).rejects.toThrow('Employee NIN must be unique');
  });
});
```

### Integration Tests

```typescript
// tests/integration/cash-allocation.test.ts
describe('Cash Allocation Workflow', () => {
  test('should complete full allocation and acknowledgment flow', async () => {
    // Create test data
    const accountant = await createTestEmployee('accountant');
    const purchasingManager = await createTestEmployee('purchasing_manager');
    
    // Create allocation
    const allocationId = await firestoreServices.cashAllocation.createAllocation(
      10000, accountant.id, purchasingManager.id
    );
    
    // Acknowledge funds
    const acknowledgment = {
      allocationId,
      actualAmountReceived: 7000,
      discrepancyAmount: 0,
      isShortage: false,
      fundType: 'purchasing' as const,
      purchasingManagerId: purchasingManager.id
    };
    
    await firestoreServices.fundAcknowledgment.create(acknowledgment);
    
    // Verify allocation status
    const allocation = await firestoreServices.cashAllocation.getById(allocationId);
    expect(allocation?.status).toBe('acknowledged');
  });
});
```

### Performance Tests

```typescript
// tests/performance/query-performance.test.ts
describe('Query Performance', () => {
  test('should handle large dataset queries efficiently', async () => {
    // Create 10,000 test employees
    await createTestEmployees(10000);
    
    const startTime = Date.now();
    
    // Query with filters and pagination
    const employees = await firestoreServices.employee.getAll(
      [{ field: 'employmentStatus', operator: '==', value: 'Active' }],
      { limit: 100, orderBy: 'lastName' }
    );
    
    const queryTime = Date.now() - startTime;
    
    expect(employees.length).toBe(100);
    expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
  });
});
```

## Performance Considerations

### Query Optimization

#### Composite Indexes

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "employees",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "employmentStatus", "order": "ASCENDING" },
        { "fieldPath": "lastName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "invoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

#### Query Patterns

```typescript
// Efficient: Use indexed fields
const activeEmployees = await firestoreServices.employee.getAll([
  { field: 'employmentStatus', operator: '==', value: 'Active' },
  { field: 'branchId', operator: '==', value: branchId }
]);

// Avoid: Complex queries requiring multiple indexes
// Instead, use client-side filtering for complex conditions
```

### Data Denormalization

```typescript
// Store frequently accessed data together
interface Invoice {
  id: string;
  amount: number;
  // Denormalized supplier info for quick access
  supplierName: string;
  supplierTIN: string;
  // Reference for detailed supplier data
  supplierId: string;
}
```

### Caching Strategy

```typescript
// Implement client-side caching for reference data
class CachedEmployeeService extends EmployeeService {
  private cache = new Map<string, Employee>();
  
  async getById(id: string): Promise<Employee | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    
    const employee = await super.getById(id);
    if (employee) {
      this.cache.set(id, employee);
    }
    
    return employee;
  }
}
```

## Backup and Recovery

### Automated Backups

```typescript
// backup/firestore-backup.ts
import { firestore } from 'firebase-admin';

async function createBackup() {
  const timestamp = new Date().toISOString();
  const bucketName = 'your-backup-bucket';
  
  const operation = await firestore().exportDocuments({
    collectionIds: [
      'employees', 'branches', 'suppliers', 'invoices', 
      'payments', 'cashAllocations', 'expenses'
    ],
    outputUriPrefix: `gs://${bucketName}/backups/${timestamp}`
  });
  
  console.log(`Backup started: ${operation.name}`);
  return operation;
}

// Schedule daily backups
export const scheduledBackup = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2 AM
  .timeZone('UTC')
  .onRun(createBackup);
```

### Point-in-Time Recovery

```typescript
// recovery/restore-firestore.ts
async function restoreFromBackup(backupPath: string) {
  const operation = await firestore().importDocuments({
    inputUriPrefix: backupPath,
    collectionIds: ['employees', 'branches'] // Specify collections to restore
  });
  
  console.log(`Restore started: ${operation.name}`);
  return operation;
}
```

### Data Export for Analytics

```typescript
// analytics/export-data.ts
async function exportToAnalytics() {
  // Export aggregated data for business intelligence
  const employees = await firestoreServices.employee.getAll();
  const invoices = await firestoreServices.invoice.getAll();
  
  const analyticsData = {
    employeeCount: employees.length,
    activeEmployees: employees.filter(e => e.employmentStatus === 'Active').length,
    totalInvoiceValue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    overdueInvoices: invoices.filter(inv => inv.status === 'Overdue').length
  };
  
  // Send to analytics platform
  await sendToAnalytics(analyticsData);
}
```

## Monitoring and Alerting

### Performance Monitoring

```typescript
// monitoring/performance.ts
import { getPerformance } from 'firebase/performance';

const perf = getPerformance();

// Monitor query performance
function monitorQuery(queryName: string) {
  const trace = perf.trace(queryName);
  trace.start();
  
  return {
    stop: () => trace.stop(),
    incrementMetric: (metric: string, value: number) => 
      trace.incrementMetric(metric, value)
  };
}

// Usage
const monitor = monitorQuery('employee_search');
const employees = await firestoreServices.employee.getAll(filters);
monitor.incrementMetric('results_count', employees.length);
monitor.stop();
```

### Error Tracking

```typescript
// monitoring/errors.ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const logError = httpsCallable(functions, 'logError');

export async function trackError(error: Error, context: any) {
  await logError({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}
```

## Migration Checklist

### Pre-Migration

- [ ] Firebase project setup complete
- [ ] Firestore security rules deployed
- [ ] Service layer implemented and tested
- [ ] Data transformation scripts ready
- [ ] Backup strategy implemented
- [ ] Performance benchmarks established

### During Migration

- [ ] PostgreSQL data exported
- [ ] Data transformed to Firestore format
- [ ] Data imported to Firestore
- [ ] Data validation completed
- [ ] Business rules validation passed
- [ ] Performance tests passed

### Post-Migration

- [ ] Application updated to use Firestore
- [ ] Real-time features implemented
- [ ] Monitoring and alerting configured
- [ ] User acceptance testing completed
- [ ] PostgreSQL database archived
- [ ] Documentation updated

## Conclusion

This migration guide provides a comprehensive approach to transitioning from PostgreSQL to Firebase Firestore while maintaining all business logic, security controls, and data integrity. The new Firestore-based system offers improved scalability, real-time capabilities, and simplified infrastructure management.

Key benefits of the migration:

1. **Real-time Updates**: Instant synchronization across all clients
2. **Scalability**: Automatic scaling based on demand
3. **Security**: Comprehensive role-based access control
4. **Performance**: Optimized queries and caching
5. **Reliability**: Built-in backup and recovery
6. **Cost Efficiency**: Pay-per-use pricing model

The migration maintains all existing business rules while enabling new capabilities for enhanced user experience and operational efficiency. 