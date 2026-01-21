# Fix 7-Day Cash Flow Chart - Implementation Guide

## Problem

The current 7-day cash flow chart uses **simulated data** instead of real allocation data:

```typescript
// ❌ CURRENT (SIMULATED)
const baseAllocated = metrics.cashFlow.allocated / 7;
const baseUsed = metrics.cashFlow.used / 7;
const dailyAllocated = baseAllocated * (0.8 + Math.random() * 0.4);
const dailyUsed = baseUsed * (0.7 + Math.random() * 0.6);
```

This produces inaccurate charts that don't reflect actual daily allocations.

---

## Solution

Replace the simulated data function with real daily allocation tracking.

---

## Implementation Steps

### Step 1: Update the `generateDailyCashFlow` Function

**Location:** `src/app/dashboard/purchase-manager/page.tsx` (around line 1393)

**Replace this:**

```typescript
const generateDailyCashFlow = () => {
  const days = [];
  const allocatedData = [];
  const usedData = [];
  const remainingData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    // Generate realistic daily variation based on actual metrics
    const baseAllocated = metrics.cashFlow.allocated / 7;
    const baseUsed = metrics.cashFlow.used / 7;
    
    const dailyAllocated = baseAllocated * (0.8 + Math.random() * 0.4);
    const dailyUsed = baseUsed * (0.7 + Math.random() * 0.6);
    const dailyRemaining = dailyAllocated - dailyUsed;
    
    allocatedData.push(Math.max(0, dailyAllocated));
    usedData.push(Math.max(0, dailyUsed));
    remainingData.push(Math.max(0, dailyRemaining));
  }
  
  return { days, allocatedData, usedData, remainingData };
};
```

**With this:**

```typescript
const generateDailyCashFlow = () => {
  const days = [];
  const allocatedData = [];
  const usedData = [];
  const remainingData = [];
  
  // Helper function to get allocation date
  const getAllocationDate = (allocation: any): Date | null => {
    try {
      const dateField = allocation.allocationDate || allocation.createdAt;
      if (!dateField) return null;
      
      const date = dateField?.toDate ? dateField.toDate() : 
                   dateField instanceof Date ? dateField : 
                   typeof dateField === 'string' ? new Date(dateField) : null;
      return date && !isNaN(date.getTime()) ? date : null;
    } catch (error) {
      return null;
    }
  };

  // Helper function to get payment date
  const getPaymentDate = (invoice: any): Date | null => {
    try {
      if (invoice.status !== 'paid') return null;
      
      // Try different date fields
      const dateField = invoice.paidDate || invoice.paymentDate || invoice.updatedAt;
      if (!dateField) return null;
      
      const date = dateField?.toDate ? dateField.toDate() : 
                   dateField instanceof Date ? dateField : 
                   typeof dateField === 'string' ? new Date(dateField) : null;
      return date && !isNaN(date.getTime()) ? date : null;
    } catch (error) {
      return null;
    }
  };
  
  // Generate data for last 7 days
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
    
    // Get allocations for this day (only accepted ones count)
    const dayAllocations = cashAllocations.filter(allocation => {
      if (allocation.status !== 'accepted') return false;
      const allocDate = getAllocationDate(allocation);
      if (!allocDate) return false;
      return allocDate >= date && allocDate < nextDay;
    });
    
    const dailyAllocated = dayAllocations.reduce((sum, alloc) => {
      return sum + (Number(alloc.amount) || 0);
    }, 0);
    
    // Get payments made on this day
    const dayPayments = invoices.filter(invoice => {
      const paymentDate = getPaymentDate(invoice);
      if (!paymentDate) return false;
      return paymentDate >= date && paymentDate < nextDay;
    });
    
    const dailyUsed = dayPayments.reduce((sum, invoice) => {
      return sum + (Number(invoice.paidAmount) || Number(invoice.amount) || 0);
    }, 0);
    
    const dailyRemaining = dailyAllocated - dailyUsed;
    
    allocatedData.push(dailyAllocated);
    usedData.push(dailyUsed);
    remainingData.push(Math.max(0, dailyRemaining));
  }
  
  return { days, allocatedData, usedData, remainingData };
};
```

---

### Step 2: Add Invoice Payment Date Tracking

Ensure invoices track when they were paid. Update the payment function:

**Location:** Wherever invoice payments are processed

```typescript
async function payInvoice(invoiceId: string, paymentAmount: number) {
  await updateDoc(doc(db, 'invoices', invoiceId), {
    status: 'paid',
    paidAmount: paymentAmount,
    paidDate: serverTimestamp(),  // ✅ Add this field
    paymentDate: serverTimestamp(), // ✅ Alternative field name
    updatedAt: serverTimestamp()
  });
}
```

---

### Step 3: Add Allocation Status Acceptance

Ensure allocations are marked as "accepted" when PM acknowledges:

**Location:** `src/app/dashboard/purchase-manager/daily-allocation/page.tsx` (line 215)

Already implemented! ✅ The current code updates status to 'accepted':

```typescript
await updateDoc(allocationRef, {
  status: action, // 'accepted' or 'rejected'
  actionDate: serverTimestamp(),
  actionBy: authService.getCurrentUser()?.uid
});
```

---

### Step 4: Update Chart Title

Update the chart section title to reflect real data:

**Location:** `src/app/dashboard/purchase-manager/page.tsx` (around line 1768)

```typescript
<h4 className="text-lg font-bold text-gray-900 mb-4">
  Cash Flow Analysis - Last 7 Days
</h4>
```

Add a subtitle:

```typescript
<p className="text-sm text-gray-600 mb-4">
  Real allocation and spending data from the last 7 days
</p>
```

---

### Step 5: Add Zero-Data Handling

Handle cases where no allocations exist:

```typescript
const generateDailyCashFlow = () => {
  // ... existing code ...
  
  // After generating data, check if all values are zero
  const hasData = allocatedData.some(val => val > 0) || 
                  usedData.some(val => val > 0);
  
  return { 
    days, 
    allocatedData, 
    usedData, 
    remainingData,
    hasData  // ✅ Add this flag
  };
};
```

Then in the JSX:

```typescript
{dailyCashFlow.hasData ? (
  <Bar data={cashFlowData} options={trendChartOptions} />
) : (
  <div className="h-72 flex items-center justify-center">
    <div className="text-center text-gray-500">
      <p className="mb-2">No allocation data for the last 7 days</p>
      <p className="text-sm">Allocations will appear here once created</p>
    </div>
  </div>
)}
```

---

## Testing Steps

### 1. Test with No Data
- Clear all allocations
- Chart should show empty state or all zeros

### 2. Test with Single Day Data
- Create one allocation today
- Chart should show allocation only for today

### 3. Test with Multiple Days
- Create allocations on different days
- Chart should show correct amounts per day

### 4. Test with Payments
- Create allocation
- Pay some invoices
- Chart should show "used" amount for payment days

### 5. Test Date Boundaries
- Create allocation at 11:59 PM
- Create allocation at 12:01 AM next day
- Verify they appear on correct days

---

## Validation Queries

### Check Allocation Dates
```javascript
// In browser console
const allocations = await getDocs(collection(db, 'cashAllocations'));
allocations.docs.forEach(doc => {
  const data = doc.data();
  console.log({
    id: doc.id,
    amount: data.amount,
    date: data.allocationDate?.toDate?.() || data.createdAt?.toDate?.(),
    status: data.status
  });
});
```

### Check Invoice Payment Dates
```javascript
const invoices = await getDocs(collection(db, 'invoices'));
invoices.docs.forEach(doc => {
  const data = doc.data();
  if (data.status === 'paid') {
    console.log({
      id: doc.id,
      amount: data.paidAmount,
      paidDate: data.paidDate?.toDate?.() || data.paymentDate?.toDate?.(),
    });
  }
});
```

---

## Expected Behavior

### Before Fix
```
Day 1: UGX 142,857 (allocated / 7 + random)
Day 2: UGX 128,473 (allocated / 7 + random)
Day 3: UGX 165,291 (allocated / 7 + random)
...
```
*Inaccurate, simulated data*

### After Fix
```
Day 1: UGX 0 (no allocations)
Day 2: UGX 0 (no allocations)
Day 3: UGX 780,000 (actual allocation)
Day 4: UGX 0 (no allocations)
Day 5: UGX 704,000 (actual allocation)
Day 6: UGX 0 (no allocations)
Day 7: UGX 650,000 (actual allocation - today)
```
*Accurate, real data*

---

## Benefits of Real Data

✅ **Accuracy** - Shows actual allocation patterns  
✅ **Transparency** - PM can see exact days money was allocated  
✅ **Audit Trail** - Links to specific cash closes  
✅ **Trend Analysis** - Identify allocation patterns (e.g., "we only allocate after night shifts")  
✅ **Planning** - PM can plan purchases based on expected allocation days  
✅ **Accountability** - Clear tracking of when funds were provided

---

## Edge Cases to Handle

1. **Multiple Allocations Same Day** - Sum them correctly
2. **Rejected Allocations** - Don't count them in metrics
3. **Pending Allocations** - Show separately, don't include in "allocated" until accepted
4. **Timezone Issues** - Use local business date, not UTC
5. **Partial Payments** - Track exact paidAmount, not full invoice amount

---

## Performance Considerations

- ✅ Filtering in memory is fast for 7 days
- ✅ No additional database queries needed (data already loaded)
- ✅ Calculations happen on render, not on every data change
- ✅ Can add memoization if performance issues arise

```typescript
const dailyCashFlow = useMemo(
  () => generateDailyCashFlow(),
  [cashAllocations, invoices] // Only recalculate when data changes
);
```

---

## Future Enhancements

1. **30-Day View** - Add option to view last 30 days
2. **Custom Date Range** - Let PM select specific date range
3. **Allocation Forecasting** - Predict next allocation based on patterns
4. **Budget Tracking** - Compare actual vs expected allocations
5. **Alert System** - Notify PM when allocation is below threshold

---

**Implementation Priority:** HIGH  
**Estimated Time:** 1-2 hours  
**Testing Time:** 30 minutes  
**Impact:** Immediate improvement in data accuracy and reporting
