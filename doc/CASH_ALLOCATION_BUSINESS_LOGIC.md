# Cash Allocation Business Logic - Official Documentation

## Overview
This document defines the official business logic for cash allocation in the EquitySYS retail management system.

---

## 🎯 Core Principle

**The accountant allocates money to the Purchase Manager (PM) as the official way PM receives spending funds.**

Each allocation represents a real transfer of funds from the accountant to the PM, with full tracking and audit trail.

---

## 📊 Allocation Frequency (RECOMMENDED)

### **OPTION C: One Allocation Per Transfer (BEST PRACTICE)**

**Why this approach:**
- ✅ Real accounting accuracy - Each transfer is individually tracked
- ✅ Clear audit trail - Every allocation links to a specific cash close
- ✅ Flexible timing - Allocate when cash is physically ready
- ✅ Proper reconciliation - PM verifies each amount received
- ✅ Better reporting - Accurate daily/weekly/monthly trends

**When to allocate:**
- After day shift close (~2 PM) - if cash is ready to transfer
- After night shift close (~10 PM) - if cash is ready to transfer
- Any time during business day when transferring funds to PM

**Typical pattern:**
- 1-2 allocations per day (one after each shift)
- Can be more if multiple transfers occur
- Can be less if no cash is available for transfer

---

## 💾 Database Schema

### `cashAllocations` Collection

```typescript
interface CashAllocation {
  // Primary Keys
  id: string;
  
  // Allocation Details
  amount: number;                    // Amount allocated to PM (after deductions)
  allocationDate: Timestamp;         // When allocation was created
  businessDate: string;              // Business date (YYYY-MM-DD)
  shiftType: 'day' | 'night';        // Shift this allocation is from
  
  // Source Reference
  cashCloseId: string;               // Link to specific cash close
  
  // Financial Breakdown
  cashCloseTotal: number;            // Original total from cash close
  profitDeduction: number;           // 12% profit amount deducted
  monthlyExpenseFund: number;        // Monthly expense fund deducted (if applicable)
  totalDeductions: number;           // Total deductions (profit + expenses)
  
  // People
  allocatedBy: string;               // Accountant user ID
  allocatedTo: string;               // PM user ID
  allocatorName: string;             // Accountant name
  recipientName: string;             // PM name
  
  // Status Tracking
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  
  // Metadata
  branchId: string;                  // Branch identifier
  description?: string;              // Optional notes
  createdAt: Timestamp;              // Record creation
  updatedAt?: Timestamp;             // Last update
  
  // Acknowledgment
  acknowledgedAt?: Timestamp;        // When PM accepted/rejected
  acknowledgedBy?: string;           // PM user ID who acknowledged
  actualAmountReceived?: number;     // If different from allocated amount
  discrepancyReason?: string;        // If PM reports discrepancy
}
```

### Status Flow

```
pending → accepted → completed
   ↓
rejected
```

- **pending**: Allocation created, awaiting PM acknowledgment
- **accepted**: PM confirmed receipt of funds
- **rejected**: PM declined allocation (rare, requires explanation)
- **completed**: Funds fully used or accounted for

---

## 🧮 Calculation Logic

### Step 1: Cash Close Total
```typescript
const cashCloseTotal = cashClose.totalCashInTill;
```

### Step 2: Profit Deduction (12%)
```typescript
const profitDeduction = Math.round(cashCloseTotal * 0.12);
```

### Step 3: Monthly Expense Fund (First Day Shift Only)
```typescript
// Check if this is the first day shift of the month
const isFirstDayShift = isFirstDayOfMonth(businessDate) && shiftType === 'day';
const monthlyExpenseFund = isFirstDayShift ? 100000 : 0;
```

### Step 4: Calculate PM Allocation
```typescript
const totalDeductions = profitDeduction + monthlyExpenseFund;
const allocationAmount = cashCloseTotal - totalDeductions;

// Validation
if (allocationAmount <= 0) {
  throw new Error('Allocation amount would be zero or negative');
}
```

### Example Calculation

**Day Shift (First day of month):**
```
Cash Close Total:      UGX 1,000,000
Profit (12%):          UGX   120,000  (-)
Monthly Expense Fund:  UGX   100,000  (-)
──────────────────────────────────────
PM Allocation:         UGX   780,000
```

**Night Shift (Regular day):**
```
Cash Close Total:      UGX   800,000
Profit (12%):          UGX    96,000  (-)
Monthly Expense Fund:  UGX         0  (-)
──────────────────────────────────────
PM Allocation:         UGX   704,000
```

---

## 📈 PM Metrics Calculation

### Cash Flow Metrics

```typescript
interface CashFlowMetrics {
  allocated: number;        // Sum of all accepted allocations
  used: number;             // Sum of all paid invoices
  remaining: number;        // allocated - used
  utilization: number;      // (used / allocated) * 100
  todayAllocated: number;   // Allocations created today
}
```

### Calculation Functions

```typescript
// Total Allocated: Sum all accepted allocations
const totalAllocated = cashAllocations
  .filter(a => a.status === 'accepted')
  .reduce((sum, a) => sum + a.amount, 0);

// Total Used: Sum all paid invoice amounts
const totalUsed = invoices
  .filter(inv => inv.status === 'paid')
  .reduce((sum, inv) => sum + inv.paidAmount, 0);

// Remaining
const remaining = totalAllocated - totalUsed;

// Utilization Percentage
const utilization = totalAllocated > 0 
  ? (totalUsed / totalAllocated) * 100 
  : 0;

// Today's Allocation: Filter by today's date
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const endOfToday = new Date();
endOfToday.setHours(23, 59, 59, 999);

const todayAllocated = cashAllocations
  .filter(a => {
    const allocDate = a.allocationDate.toDate();
    return allocDate >= startOfToday && allocDate <= endOfToday;
  })
  .reduce((sum, a) => sum + a.amount, 0);
```

---

## 📊 7-Day Cash Flow Chart (Real Data)

### Current Issue
The system currently uses **simulated data** (divides total by 7 with random variation).

### Recommended Solution: Use Real Daily Allocations

```typescript
function generateReal7DayCashFlow(cashAllocations: CashAllocation[]) {
  const days = [];
  const allocatedData = [];
  const usedData = [];
  const remainingData = [];
  
  // Last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    // Format day label
    days.push(date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }));
    
    // Get allocations for this day
    const dayAllocations = cashAllocations.filter(a => {
      const allocDate = a.allocationDate.toDate();
      return allocDate >= date && allocDate < nextDay && a.status === 'accepted';
    });
    
    const dailyAllocated = dayAllocations.reduce((sum, a) => sum + a.amount, 0);
    
    // Get invoices paid on this day
    const dayPayments = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.paidDate) return false;
      const paidDate = inv.paidDate.toDate();
      return paidDate >= date && paidDate < nextDay;
    });
    
    const dailyUsed = dayPayments.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const dailyRemaining = dailyAllocated - dailyUsed;
    
    allocatedData.push(dailyAllocated);
    usedData.push(dailyUsed);
    remainingData.push(Math.max(0, dailyRemaining));
  }
  
  return { days, allocatedData, usedData, remainingData };
}
```

---

## 🔄 Allocation Workflow Implementation

### Accountant Side

```typescript
async function createAllocation(cashClose: CashClose, pmId: string) {
  const currentUser = authService.getCurrentUser();
  
  // 1. Calculate amounts
  const cashCloseTotal = cashClose.totalCashInTill;
  const profitDeduction = Math.round(cashCloseTotal * 0.12);
  
  const isFirstDayShift = 
    isFirstDayOfMonth(cashClose.businessDate) && 
    cashClose.shift === 'day';
  const monthlyExpenseFund = isFirstDayShift ? 100000 : 0;
  
  const totalDeductions = profitDeduction + monthlyExpenseFund;
  const allocationAmount = cashCloseTotal - totalDeductions;
  
  // 2. Validate
  if (allocationAmount <= 0) {
    throw new Error('Cannot create allocation with zero or negative amount');
  }
  
  // 3. Create allocation record
  const allocation = {
    amount: allocationAmount,
    allocationDate: serverTimestamp(),
    businessDate: cashClose.businessDate,
    shiftType: cashClose.shift,
    cashCloseId: cashClose.id,
    cashCloseTotal,
    profitDeduction,
    monthlyExpenseFund,
    totalDeductions,
    allocatedBy: currentUser.uid,
    allocatedTo: pmId,
    allocatorName: currentUser.displayName,
    recipientName: pmUser.name,
    status: 'pending',
    branchId: currentUser.branchId,
    description: `Allocation from ${cashClose.shift} shift`,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'cashAllocations'), allocation);
  
  // 4. Update cash close status
  await updateDoc(doc(db, 'cashCloses', cashClose.id), {
    status: 'allocated',
    allocatedAt: serverTimestamp(),
    allocatedTo: pmId,
    allocationAmount
  });
  
  return docRef.id;
}
```

### PM Side

```typescript
async function acknowledgeAllocation(allocationId: string, accept: boolean) {
  const currentUser = authService.getCurrentUser();
  
  const updateData = {
    status: accept ? 'accepted' : 'rejected',
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: currentUser.uid,
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(doc(db, 'cashAllocations', allocationId), updateData);
}
```

---

## 📋 Business Rules

### 1. Allocation Creation Rules

- ✅ Only accountants can create allocations
- ✅ One allocation per cash close (prevent duplicates)
- ✅ Allocation amount must be positive
- ✅ Must link to a valid cash close
- ✅ PM must have PURCHASING_MANAGER role

### 2. Acknowledgment Rules

- ✅ Only the assigned PM can acknowledge
- ✅ PM must accept or reject within reasonable time
- ✅ Rejected allocations require explanation

### 3. Usage Rules

- ✅ PM can only spend from accepted allocations
- ✅ Total spending cannot exceed allocated amount
- ✅ Track allocation balance in real-time

### 4. Reporting Rules

- ✅ Show all allocations by date range
- ✅ Filter by status (pending/accepted/rejected)
- ✅ Track utilization percentage
- ✅ Alert when utilization exceeds 90%

---

## 🎨 UI/UX Recommendations

### Accountant Dashboard
- Show pending cash closes ready for allocation
- One-click allocation with auto-calculations
- Visual breakdown of deductions
- Allocation history with status

### PM Dashboard
- Show pending allocations requiring acknowledgment
- Display available balance prominently
- Today's allocation card
- 7-day allocation trend (real data)
- Utilization percentage with color coding

### Color Coding
- 🟢 Green: Available funds, low utilization (<70%)
- 🟡 Yellow: Moderate utilization (70-90%)
- 🔴 Red: High utilization (>90%)
- ⚫ Gray: Pending/rejected allocations

---

## 🔍 Reporting Queries

### Daily Allocation Report
```sql
SELECT 
  businessDate,
  COUNT(*) as allocation_count,
  SUM(amount) as total_allocated,
  SUM(profitDeduction) as total_profit,
  SUM(monthlyExpenseFund) as total_monthly_fund
FROM cashAllocations
WHERE businessDate BETWEEN :startDate AND :endDate
GROUP BY businessDate
ORDER BY businessDate DESC
```

### PM Utilization Report
```sql
SELECT 
  recipientName,
  SUM(CASE WHEN status = 'accepted' THEN amount ELSE 0 END) as allocated,
  SUM(used_amount) as used,
  (SUM(used_amount) / SUM(amount)) * 100 as utilization_pct
FROM cashAllocations
LEFT JOIN invoice_payments ON cashAllocations.allocatedTo = invoice_payments.paidBy
GROUP BY recipientName
ORDER BY utilization_pct DESC
```

---

## ✅ Migration Steps

If you need to migrate from old schema to this recommended schema:

1. **Backup existing data**
2. **Create migration script** to transform old records
3. **Test on staging environment**
4. **Update UI components** to use new fields
5. **Update calculation functions**
6. **Deploy to production**
7. **Monitor for issues**

---

## 📞 Support

For questions or clarifications:
- Review this document first
- Check code examples in `/src/lib/firebase/`
- Consult with accounting team for business rules
- Document any edge cases discovered

---

**Last Updated:** January 20, 2026  
**Version:** 1.0  
**Status:** Official Business Logic Documentation
