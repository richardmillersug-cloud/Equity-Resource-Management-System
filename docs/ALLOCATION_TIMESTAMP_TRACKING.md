# Allocation Timestamp Tracking System

## Overview

This document describes the comprehensive timestamp tracking system for cash allocations in the EquitySYS application. The system captures multiple timestamps throughout the allocation lifecycle to ensure accurate reporting, filtering, and audit trails.

---

## Allocation Lifecycle & Timestamps

### 1. **Allocation Creation** (by Accountant)

When an accountant creates an allocation from a cash close:

| Field | Type | Description | Set By |
|-------|------|-------------|--------|
| `createdAt` | Timestamp | Record creation time in database | Firebase `serverTimestamp()` |
| `allocationDate` | Timestamp | When accountant allocated the funds | Firebase `serverTimestamp()` |
| `allocatedBy` | String (UID) | Accountant user ID | Current user |
| `allocatedTo` | String (UID) | Purchase Manager user ID | Selected PM |
| `allocatorName` | String | Accountant's display name | Current user name |
| `recipientName` | String | Purchase Manager's name | Selected PM name |
| `status` | String | Initial status | `"pending"` |

**Location**: `src/app/dashboard/accountant/allocations/page.tsx` (lines 384-401)

```typescript
const cashAllocationData = {
  allocatedBy: currentUser.uid,
  allocatedTo: selectedPM,
  allocationDate: serverTimestamp(),
  allocatorName: accountantName,
  amount: allocationAmount,
  branchId: "kyengera",
  createdAt: serverTimestamp(),
  recipientName: selectedPMUser.name,
  status: "pending",
  cashCloseId: cashClose.id,
  businessDate: businessDate,
  shiftType: 'day',
  description: `Overview allocation...`,
  monthlyExpenseFund: monthlyExpenseFund,
  profitDeduction: profitDeduction,
  totalDeductions: totalDeductions
};
```

---

### 2. **Allocation Acceptance** (by Purchase Manager)

When a PM accepts an allocation:

| Field | Type | Description | Set By |
|-------|------|-------------|--------|
| `status` | String | Updated to accepted | `"accepted"` |
| `actionDate` | Timestamp | Generic action timestamp | Firebase `serverTimestamp()` |
| `actionBy` | String (UID) | Who took the action | Current PM UID |
| `acceptedAt` | Timestamp | **Specific acceptance timestamp** | Firebase `serverTimestamp()` |
| `acceptedBy` | String (UID) | Who accepted | Current PM UID |
| `acceptedByName` | String | Name of acceptor | PM display name |

**Location**: `src/app/dashboard/purchase-manager/daily-allocation/page.tsx` (lines 215-243)

```typescript
const updateData = {
  status: 'accepted',
  actionDate: serverTimestamp(),
  actionBy: currentUser?.uid,
  acceptedAt: serverTimestamp(),      // ✅ NEW
  acceptedBy: currentUser?.uid,       // ✅ NEW
  acceptedByName: currentUser?.displayName || currentUser?.email
};
```

---

### 3. **Allocation Rejection** (by Purchase Manager)

When a PM rejects an allocation:

| Field | Type | Description | Set By |
|-------|------|-------------|--------|
| `status` | String | Updated to rejected | `"rejected"` |
| `actionDate` | Timestamp | Generic action timestamp | Firebase `serverTimestamp()` |
| `actionBy` | String (UID) | Who took the action | Current PM UID |
| `rejectedAt` | Timestamp | **Specific rejection timestamp** | Firebase `serverTimestamp()` |
| `rejectedBy` | String (UID) | Who rejected | Current PM UID |
| `rejectedByName` | String | Name of rejector | PM display name |

```typescript
const updateData = {
  status: 'rejected',
  actionDate: serverTimestamp(),
  actionBy: currentUser?.uid,
  rejectedAt: serverTimestamp(),      // ✅ NEW
  rejectedBy: currentUser?.uid,       // ✅ NEW
  rejectedByName: currentUser?.displayName || currentUser?.email
};
```

---

## Database Collections

### Primary Collection: `cashAllocations`

**Note**: The system uses `cashAllocations` (camelCase), not `cash_allocations` (underscore).

**Full Document Structure**:

```typescript
interface CashAllocation {
  // Identity
  id: string;
  
  // Parties Involved
  allocatedBy: string;        // Accountant UID
  allocatedTo: string;        // PM UID
  allocatorName: string;      // Accountant name
  recipientName: string;      // PM name
  
  // Financial Details
  amount: number;
  monthlyExpenseFund: number;
  profitDeduction: number;
  totalDeductions: number;
  
  // Business Context
  branchId: string;
  cashCloseId: string;
  businessDate: string;       // Format: YYYY-MM-DD
  shiftType: 'day' | 'night';
  description: string;
  
  // Lifecycle Status
  status: 'pending' | 'accepted' | 'rejected';
  
  // Creation Timestamps
  createdAt: Timestamp;       // Record creation
  allocationDate: Timestamp;  // When accountant allocated
  
  // Action Timestamps
  actionDate?: Timestamp;     // Generic action time
  actionBy?: string;          // Who took action
  
  // Acceptance Timestamps (NEW)
  acceptedAt?: Timestamp;     // When PM accepted
  acceptedBy?: string;        // PM UID who accepted
  acceptedByName?: string;    // PM name who accepted
  
  // Rejection Timestamps (NEW)
  rejectedAt?: Timestamp;     // When PM rejected
  rejectedBy?: string;        // PM UID who rejected
  rejectedByName?: string;    // PM name who rejected
  
  // Related Data (fetched separately)
  cashCloseData?: {
    variance: number;
    note: string;
    totalRevenue: number;
    createdBy: string;
  };
}
```

---

## Timestamp Priority Logic

### Purpose

The system needs to determine which timestamp to use when filtering allocations by date. Different timestamps represent different stages in the allocation lifecycle.

### Implementation: `getAllocationDate()` Function

**Location**: 
- `src/app/dashboard/purchase-manager/page.tsx` (line 857 - for metrics)
- `src/app/dashboard/purchase-manager/page.tsx` (line 1662 - for 7-day chart)

### Priority Order for ACCEPTED Allocations

```typescript
const getAllocationDate = (allocation: any): Date | null => {
  // For ACCEPTED allocations only:
  
  // 1️⃣ PRIORITY 1: acceptedAt
  //    When PM accepted the allocation
  //    ✅ Most accurate for "when money became available"
  if (allocation.status === 'accepted' && allocation.acceptedAt) {
    return parseTimestamp(allocation.acceptedAt);
  }
  
  // 2️⃣ PRIORITY 2: actionDate
  //    Generic action timestamp (fallback)
  if (allocation.status === 'accepted' && allocation.actionDate) {
    return parseTimestamp(allocation.actionDate);
  }
  
  // 3️⃣ PRIORITY 3: allocationDate
  //    When accountant allocated (original)
  if (allocation.allocationDate) {
    return parseTimestamp(allocation.allocationDate);
  }
  
  // 4️⃣ PRIORITY 4: createdAt
  //    Record creation time
  if (allocation.createdAt) {
    return parseTimestamp(allocation.createdAt);
  }
  
  // 5️⃣ PRIORITY 5: businessDate
  //    Cash close business date (YYYY-MM-DD string)
  if (allocation.businessDate) {
    return new Date(allocation.businessDate);
  }
  
  return null;
};
```

### Why This Order?

| Priority | Field | Reason |
|----------|-------|--------|
| 1 | `acceptedAt` | **Most accurate**: Represents when PM actually received/accepted the money |
| 2 | `actionDate` | **Fallback**: For existing records before `acceptedAt` was added |
| 3 | `allocationDate` | **Original**: When accountant sent the allocation |
| 4 | `createdAt` | **Record creation**: Fallback for legacy data |
| 5 | `businessDate` | **Business context**: The actual cash close date (last resort) |

---

## Affected Features

### 1. **Daily Allocation Page** (`/dashboard/purchase-manager/daily-allocation`)

**Purpose**: PM reviews and accepts/rejects pending allocations

**Timestamp Usage**:
- Lists allocations with `status: 'pending'`
- Ordered by `createdAt` (newest first)
- On accept/reject: Sets `acceptedAt` or `rejectedAt`

**Query**:
```typescript
query(
  collection(db, 'cashAllocations'),
  where('allocatedTo', '==', currentUser.uid),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
)
```

---

### 2. **Allocation Period Analysis** (`/dashboard/purchase-manager`)

**Purpose**: Shows allocation metrics by period (daily, weekly, monthly, yearly)

**Timestamp Usage**: Uses `acceptedAt` for filtering accepted allocations

**Filter Logic**:
```typescript
const dailyAllocations = cashAllocations.filter(alloc => {
  // Only accepted allocations
  if (alloc.status !== 'accepted') return false;
  
  // Use acceptedAt timestamp
  const allocDate = getAllocationDate(alloc);
  return allocDate && allocDate >= startOfToday && allocDate <= endOfToday;
});
```

**Metrics Calculated**:
- Daily allocations (count & amount)
- Weekly allocations (count & amount)
- Monthly allocations (count & amount)
- Yearly allocations (count & amount)
- Total cash flow (allocated vs used)

**Visual Display**: Pie chart showing breakdown by period

---

### 3. **Cash Flow Analysis - Last 7 Days** (`/dashboard/purchase-manager`)

**Purpose**: Line chart showing daily allocated vs used vs remaining cash

**Timestamp Usage**: Uses `acceptedAt` to determine which day to count the allocation

**Logic**:
```typescript
for (let i = 6; i >= 0; i--) {
  const date = startOfDay(i days ago);
  
  // Get allocations accepted on this day
  const dayAllocations = cashAllocations.filter(allocation => {
    if (allocation.status !== 'accepted') return false;
    const allocDate = getAllocationDate(allocation); // Uses acceptedAt
    return allocDate >= date && allocDate < nextDay;
  });
  
  const dailyAllocated = sum(dayAllocations, 'amount');
  const dailyUsed = sum(invoicesPaidOnDay, 'paidAmount');
  const dailyRemaining = dailyAllocated - dailyUsed;
}
```

**Chart Data**:
- **Blue Line**: Allocated (sum of accepted allocations by `acceptedAt` date)
- **Red Line**: Used (sum of paid invoices by payment date)
- **Green Line**: Remaining (allocated - used)

---

## Status Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     ALLOCATION LIFECYCLE                      │
└─────────────────────────────────────────────────────────────┘

[Accountant creates allocation]
         ↓
    ┌─────────┐
    │ PENDING │ ← createdAt, allocationDate set
    └─────────┘
         ↓
    [PM reviews]
         ↓
    ┌─────┴──────┐
    ↓            ↓
┌──────────┐  ┌──────────┐
│ ACCEPTED │  │ REJECTED │
└──────────┘  └──────────┘
    ↑             ↑
acceptedAt    rejectedAt
acceptedBy    rejectedBy
acceptedByName rejectedByName
```

---

## Migration & Backward Compatibility

### Existing Allocations (Before Update)

Old allocations don't have `acceptedAt`, `rejectedAt`, etc.

**Fallback Logic**:
1. If `acceptedAt` exists → Use it ✅
2. If `acceptedAt` missing → Fall back to `actionDate`
3. If `actionDate` missing → Fall back to `allocationDate`
4. If `allocationDate` missing → Fall back to `createdAt`
5. Last resort → Use `businessDate`

### New Allocations (After Update)

All new allocations will have:
- `createdAt` and `allocationDate` (on creation)
- `acceptedAt` + `acceptedBy` + `acceptedByName` (on acceptance)
- OR `rejectedAt` + `rejectedBy` + `rejectedByName` (on rejection)

---

## Benefits

### 1. **Accurate Reporting**
- Period analysis shows when money was **actually accepted**, not just sent
- 7-day chart reflects real cash availability
- Better cash flow forecasting

### 2. **Complete Audit Trail**
- Track who sent the allocation (`allocatedBy`)
- Track when it was sent (`allocationDate`)
- Track who accepted/rejected (`acceptedBy` / `rejectedBy`)
- Track when they accepted/rejected (`acceptedAt` / `rejectedAt`)

### 3. **Better Filtering**
- Can filter by allocation date (when sent)
- Can filter by acceptance date (when received)
- Can filter by rejection date
- Can analyze delays between allocation and acceptance

### 4. **Performance Metrics**
Future enhancements can now calculate:
- Average time from allocation to acceptance
- PM response times
- Allocation acceptance rates
- Time-of-day patterns for acceptances

---

## Query Examples

### Get All Pending Allocations for PM
```typescript
const q = query(
  collection(db, 'cashAllocations'),
  where('allocatedTo', '==', pmUserId),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
);
```

### Get Allocations Accepted Today
```typescript
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);

// Query all accepted allocations
const q = query(
  collection(db, 'cashAllocations'),
  where('allocatedTo', '==', pmUserId),
  where('status', '==', 'accepted')
);

// Filter in JavaScript by acceptedAt timestamp
const snapshot = await getDocs(q);
const todayAccepted = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(alloc => {
    const acceptedAt = alloc.acceptedAt?.toDate();
    return acceptedAt && acceptedAt >= startOfToday && acceptedAt <= endOfToday;
  });
```

### Get Allocations by Acceptance Date Range
```typescript
// Note: Requires composite index on (allocatedTo, status, acceptedAt)
const q = query(
  collection(db, 'cashAllocations'),
  where('allocatedTo', '==', pmUserId),
  where('status', '==', 'accepted'),
  where('acceptedAt', '>=', startDate),
  where('acceptedAt', '<=', endDate),
  orderBy('acceptedAt', 'desc')
);
```

---

## Console Debugging

### Check Timestamp Usage

The system logs detailed debugging information:

```typescript
console.log('📅 Daily Allocations Date Sources (Accepted only):', {
  total: dailyAllocations.length,
  totalAllocations: cashAllocations.length,
  acceptedCount: cashAllocations.filter(a => a.status === 'accepted').length,
  sample: dailyAllocations.slice(0, 2).map(a => ({
    id: a.id,
    status: a.status,
    hasAcceptedAt: !!a.acceptedAt,
    hasActionDate: !!a.actionDate,
    hasAllocationDate: !!a.allocationDate,
    hasCreatedAt: !!a.createdAt,
    hasBusinessDate: !!a.businessDate,
    parsedDate: getAllocationDate(a)?.toISOString(),
    usingTimestamp: a.acceptedAt ? 'acceptedAt' : 
                   a.actionDate ? 'actionDate' : 
                   a.allocationDate ? 'allocationDate' : 
                   a.createdAt ? 'createdAt' : 
                   'businessDate'
  }))
});
```

### Check Allocation Actions

When PM accepts/rejects:
```typescript
console.log(`✅ Allocation ${allocationId} accepted at ${new Date().toISOString()}`);
```

---

## Related Documentation

- [Cash Allocation Business Logic](./CASH_ALLOCATION_BUSINESS_LOGIC.md)
- [7-Day Cash Flow Chart Fix](./FIX_7DAY_CASH_FLOW_CHART.md)

---

## Technical Implementation Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/dashboard/accountant/allocations/page.tsx` | Creates allocations | 384-426 |
| `src/app/dashboard/purchase-manager/daily-allocation/page.tsx` | Accept/reject allocations | 36-60 (interface), 215-243 (handler) |
| `src/app/dashboard/purchase-manager/page.tsx` | Period analysis logic | 857-905 (getAllocationDate), 890-938 (filtering) |
| `src/app/dashboard/purchase-manager/page.tsx` | 7-day chart logic | 1662-1709 (getAllocationDate), 1757-1762 (filtering) |

---

## Future Enhancements

### 1. **Performance Analytics Dashboard**
Track and display:
- Average acceptance time
- Acceptance rate by PM
- Peak allocation times
- Delay patterns

### 2. **Automated Reminders**
- Notify PM of pending allocations > 24 hours old
- Escalate to supervisor after 48 hours

### 3. **Advanced Filtering**
- Filter by acceptance date range in UI
- Compare allocation date vs acceptance date
- Show allocation aging (time pending)

### 4. **Reporting**
- Monthly acceptance rate reports
- PM performance reports
- Cash flow accuracy reports

---

## Troubleshooting

### Issue: Allocations Not Showing in Period Analysis

**Check**:
1. Status must be `'accepted'` (not `'pending'` or `'rejected'`)
2. Allocation must have `acceptedAt` or `actionDate` or `allocationDate`
3. Date must fall within the period being analyzed

**Debug**:
```javascript
// In browser console
const db = firebase.firestore();
const q = firebase.firestore().query(
  firebase.firestore().collection(db, 'cashAllocations'),
  firebase.firestore().where('status', '==', 'accepted')
);
const snapshot = await firebase.firestore().getDocs(q);
console.log('Accepted allocations:', snapshot.docs.length);
snapshot.docs.forEach(doc => {
  const data = doc.data();
  console.log({
    id: doc.id,
    acceptedAt: data.acceptedAt?.toDate(),
    amount: data.amount
  });
});
```

### Issue: Wrong Dates in 7-Day Chart

**Possible Causes**:
1. Using `allocationDate` instead of `acceptedAt`
2. Timezone issues with date comparisons
3. Date parsing errors

**Fix**: Verify `getAllocationDate()` is prioritizing `acceptedAt` for accepted allocations

---

## Summary

The allocation timestamp tracking system provides:

✅ **Complete lifecycle tracking** from creation to acceptance/rejection  
✅ **Accurate reporting** based on when money was actually received  
✅ **Comprehensive audit trail** with who, what, and when  
✅ **Backward compatibility** with existing allocations  
✅ **Flexible querying** for various date ranges and filters  
✅ **Foundation for future analytics** and performance tracking

---

**Last Updated**: January 20, 2026  
**Version**: 1.0  
**Author**: Development Team
