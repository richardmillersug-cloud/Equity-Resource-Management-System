# Purchase Manager Dashboard Cards Update

## Overview

This document describes the changes made to the "Daily Purchases" and "Pending Invoices" cards on the Purchase Manager Dashboard to provide more accurate and useful metrics.

---

## Changes Summary

### 1. **Daily Purchases Card**
**Before**: Showed total payments made today  
**After**: Shows total value of invoices created today

### 2. **Pending Invoices Card**  
**Before**: Showed count of pending invoices and pending amount  
**After**: Renamed to "Payments Made Today" - shows total payments made today including confirmed cheques

---

## Detailed Changes

### Daily Purchases Card

#### Previous Behavior
- **Metric**: `metrics.totalPurchases.daily`
- **Calculation**: Sum of payment amounts with today's timestamp
- **Label**: "Daily Purchases"
- **Description**: "Today"

#### New Behavior
- **Metric**: `metrics.totalPurchases.daily` (redefined)
- **Calculation**: Sum of invoice amounts created today
- **Label**: "Daily Purchases"
- **Description**: "X invoice(s) created today"

#### Code Changes

**Location**: `src/app/dashboard/purchase-manager/page.tsx`

**Calculation Logic** (lines 757-788):

```typescript
// OLD: Calculate purchase totals based on payments made to invoices
const dailyPurchases = payments
  .filter(payment => {
    const paymentDate = getPaymentDate(payment);
    return paymentDate && paymentDate >= startOfToday && paymentDate <= endOfToday;
  })
  .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

// NEW: Calculate purchase totals based on INVOICES created (not payments)
const dailyPurchases = dailyInvoices.reduce((sum, inv) => 
  sum + (Number(inv.amount || inv.amountInDigits || 0)), 0);
```

**UI Display** (lines 2073-2087):

```typescript
<div className="group bg-gradient-to-r from-blue-500 to-blue-600 ...">
  <p className="text-blue-100 text-sm font-medium mb-1">Daily Purchases</p>
  <p className={`${getDynamicFontSize(metrics.totalPurchases.daily)} font-bold`}>
    {formatCurrencyForDisplay(metrics.totalPurchases.daily)}
  </p>
  <p className="text-blue-100 text-xs">
    {metrics.invoicesByPeriod.daily} invoice{metrics.invoicesByPeriod.daily !== 1 ? 's' : ''} created today
  </p>
</div>
```

---

### Payments Made Today Card (formerly Pending Invoices)

#### Previous Behavior
- **Metric**: `metrics.invoiceMetrics.pending` (count) and `metrics.invoiceMetrics.pendingAmount` (amount)
- **Calculation**: Count and sum of invoices with status "pending"
- **Label**: "Pending Invoices"
- **Icon**: AlertTriangle

#### New Behavior
- **Metric**: `metrics.paymentsMade.daily`
- **Calculation**: Sum of payments made today, including confirmed cheques
- **Label**: "Payments Made Today"
- **Description**: "Including confirmed cheques"
- **Icon**: DollarSign

#### Code Changes

**New Interface Field** (lines 199-203):

```typescript
interface PurchasingMetrics {
  totalPurchases: { daily, weekly, monthly, yearly };
  paymentsMade: {  // ✅ NEW
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  // ... other fields
}
```

**Calculation Logic** (lines 769-808):

```typescript
// Calculate PAYMENTS made (for "Total Payments Made Today" card)
// Daily: Payments made today (including confirmed cheques)
const dailyPaymentsMade = payments
  .filter(payment => {
    const paymentDate = getPaymentDate(payment);
    // Include confirmed cheques and regular payments with today's timestamp
    const isConfirmedCheque = payment.paymentMethod === 'cheque' && payment.status === 'cleared';
    const isRegularPayment = payment.paymentMethod !== 'cheque' || payment.status === 'cleared';
    return paymentDate && 
           paymentDate >= startOfToday && 
           paymentDate <= endOfToday && 
           isRegularPayment;
  })
  .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

// Similar for weekly, monthly, yearly
```

**Updated Metrics** (lines 1035-1040):

```typescript
setMetrics({
  totalPurchases: {
    daily: dailyPurchases,  // Now = invoices created today
    weekly: weeklyPurchases,
    monthly: monthlyPurchases,
    yearly: yearlyPurchases
  },
  paymentsMade: {  // ✅ NEW
    daily: dailyPaymentsMade,
    weekly: weeklyPaymentsMade,
    monthly: monthlyPaymentsMade,
    yearly: yearlyPaymentsMade
  },
  // ... other metrics
});
```

**UI Display** (lines 2088-2104):

```typescript
<div className="group bg-gradient-to-r from-orange-500 to-orange-600 ...">
  <p className="text-orange-100 text-sm font-medium mb-1">Payments Made Today</p>
  <p className={`${getDynamicFontSize(metrics.paymentsMade.daily)} font-bold`}>
    {formatCurrencyForDisplay(metrics.paymentsMade.daily)}
  </p>
  <p className="text-orange-100 text-xs">Including confirmed cheques</p>
  <DollarSign className="w-5 h-5" />
</div>
```

---

## Payment Filtering Logic

### What Counts as a Payment?

The system filters payments to include only confirmed/cleared transactions:

```typescript
const isConfirmedCheque = payment.paymentMethod === 'cheque' && payment.status === 'cleared';
const isRegularPayment = payment.paymentMethod !== 'cheque' || payment.status === 'cleared';
```

**Included**:
- All non-cheque payments (cash, bank transfer, mobile money, etc.) with today's timestamp
- Cheque payments with `status: 'cleared'` and today's timestamp

**Excluded**:
- Cheque payments with `status: 'pending'` or `status: 'bounced'`
- Payments without a valid payment date
- Payments from previous days

### Payment Date Resolution

The system uses the `getPaymentDate()` helper function to extract the payment date:

```typescript
const getPaymentDate = (payment: any): Date | null => {
  try {
    if (!payment.paymentDate) return null;
    const date = payment.paymentDate?.toDate ? 
                 payment.paymentDate.toDate() : 
                 new Date(payment.paymentDate);
    return !isNaN(date.getTime()) ? date : null;
  } catch (error) {
    return null;
  }
};
```

---

## Invoice Date Resolution

For the Daily Purchases card, the system uses the `getInvoiceDate()` helper function:

```typescript
const getInvoiceDate = (invoice: any): Date | null => {
  try {
    const invoiceDate = invoice.date || invoice.createdAt;
    if (!invoiceDate) return null;
    const date = invoiceDate?.toDate ? 
                 invoiceDate.toDate() : 
                 invoiceDate instanceof Date ? 
                 invoiceDate : 
                 new Date(invoiceDate);
    return !isNaN(date.getTime()) ? date : null;
  } catch (error) {
    return null;
  }
};
```

**Priority Order**:
1. `invoice.date` - Invoice date field
2. `invoice.createdAt` - Fallback to creation timestamp

---

## Related Updates

### Purchase Period Analysis Cards

The purchase period breakdown cards were also updated for consistency:

**Before**: Label said "Payments"  
**After**: Label says "Invoices Created"

```typescript
// Daily card
<p className="text-xs text-red-600 mt-1 opacity-75">
  Invoices Created: {formatCurrencyForDisplay(metrics.totalPurchases.daily)}
</p>

// Weekly card
<p className="text-xs text-teal-600 mt-1 opacity-75">
  Invoices Created: {formatCurrencyForDisplay(metrics.totalPurchases.weekly)}
</p>

// Monthly card
<p className="text-xs text-blue-600 mt-1 opacity-75">
  Invoices Created: {formatCurrencyForDisplay(metrics.totalPurchases.monthly)}
</p>

// Yearly card
<p className="text-xs text-green-600 mt-1 opacity-75">
  Invoices Created: {formatCurrencyForDisplay(metrics.totalPurchases.yearly)}
</p>
```

---

## Benefits

### 1. **Clear Distinction**
- **Daily Purchases**: Tracks invoices received (what you owe)
- **Payments Made Today**: Tracks money actually paid out

### 2. **Better Cash Flow Tracking**
- Can see how many invoices were created today
- Can see how much money was paid out today
- Can compare the two metrics

### 3. **Confirmed Payments Only**
- Only counts cleared cheques, not pending ones
- More accurate representation of actual cash outflow

### 4. **Consistent Labeling**
- All labels now accurately describe what they're showing
- No confusion between invoices, payments, and purchases

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PURCHASE MANAGER DASHBOARD                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐          ┌──────────────────────┐
│  INVOICES CREATED    │          │   PAYMENTS MADE       │
│      (TODAY)         │          │      (TODAY)          │
└──────────────────────┘          └──────────────────────┘
         ↓                                  ↓
    Filter by:                         Filter by:
    - invoice.date                     - payment.paymentDate
    - invoice.createdAt                - payment.status
    - >= startOfToday                  - >= startOfToday
    - <= endOfToday                    - <= endOfToday
         ↓                                  ↓
    Sum amounts                        Sum amounts
         ↓                                  ↓
┌──────────────────────┐          ┌──────────────────────┐
│  DAILY PURCHASES     │          │ PAYMENTS MADE TODAY  │
│      CARD            │          │        CARD          │
│                      │          │                      │
│ UGX 5,234,000        │          │  UGX 3,120,000       │
│ 12 invoices created  │          │  Including cleared   │
│                      │          │  cheques             │
└──────────────────────┘          └──────────────────────┘
```

---

## Database Collections Used

### 1. **Invoices Collection**

Used for Daily Purchases card:

```typescript
{
  id: string;
  date: Timestamp;           // Invoice date
  createdAt: Timestamp;      // Fallback date
  amount: number;            // Invoice amount
  amountInDigits: number;    // Alternative amount field
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  supplierId: string;
  // ... other fields
}
```

### 2. **Payments Collection**

Used for Payments Made Today card:

```typescript
{
  id: string;
  paymentDate: Timestamp;          // Payment date
  amount: number;                  // Payment amount
  paymentMethod: string;           // 'cheque', 'cash', 'bank_transfer', etc.
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  invoiceId: string;               // Reference to invoice
  // ... other fields
}
```

---

## Time Period Filtering

Both metrics support multiple time periods:

| Period | Date Range |
|--------|------------|
| Daily | Start of today (00:00:00) to end of today (23:59:59) |
| Weekly | Start of current week (Monday 00:00:00) to end of current week (Sunday 23:59:59) |
| Monthly | Start of current month to end of current month |
| Yearly | Start of current year to end of current year |

**Implementation**:

```typescript
const now = new Date();

// Daily
const startOfToday = new Date(now);
startOfToday.setHours(0, 0, 0, 0);
const endOfToday = new Date(now);
endOfToday.setHours(23, 59, 59, 999);

// Weekly
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
startOfWeek.setHours(0, 0, 0, 0);
// ... etc
```

---

## Testing

### How to Verify Daily Purchases Card

1. Create a new invoice with today's date
2. Check the "Daily Purchases" card
3. Verify the amount increased by the invoice amount
4. Verify the count shows "X invoice(s) created today"

### How to Verify Payments Made Today Card

1. Create a payment with today's date
2. **For cheques**: Ensure status is "cleared"
3. **For other methods**: Any status is accepted
4. Check the "Payments Made Today" card
5. Verify the amount increased by the payment amount

### Edge Cases to Test

1. **Pending Cheque**: Should NOT be counted in payments made
2. **Bounced Cheque**: Should NOT be counted
3. **Cleared Cheque**: Should be counted
4. **Cash Payment**: Should be counted regardless of status
5. **Invoice without date**: Should use `createdAt` timestamp
6. **Payment without date**: Should be excluded

---

## Console Debugging

To verify the calculations in the browser console:

```javascript
// Check invoices created today
const invoices = await getDocs(collection(db, 'invoices'));
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayInvoices = invoices.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .filter(inv => {
    const date = inv.date?.toDate?.() || inv.createdAt?.toDate?.();
    return date && date >= today;
  });
console.log('Invoices created today:', todayInvoices.length);
console.log('Total amount:', todayInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0));

// Check payments made today
const payments = await getDocs(collection(db, 'payments'));
const todayPayments = payments.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .filter(pay => {
    const date = pay.paymentDate?.toDate?.();
    const isCleared = pay.paymentMethod !== 'cheque' || pay.status === 'cleared';
    return date && date >= today && isCleared;
  });
console.log('Payments made today:', todayPayments.length);
console.log('Total amount:', todayPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0));
```

---

## Related Documentation

- [Allocation Timestamp Tracking](./ALLOCATION_TIMESTAMP_TRACKING.md)
- [Cash Allocation Business Logic](./CASH_ALLOCATION_BUSINESS_LOGIC.md)

---

## Future Enhancements

### 1. **Payment Status Breakdown**
Show breakdown of payments by method:
- Cash: UGX X
- Cheques: UGX X
- Bank Transfers: UGX X
- Mobile Money: UGX X

### 2. **Invoice vs Payment Comparison**
Add a third card showing:
- Invoices Created: UGX X
- Payments Made: UGX Y
- Net Change: UGX (X - Y)

### 3. **Pending Cheques Warning**
Add a warning badge if there are pending cheques:
- "X pending cheques worth UGX Y"

### 4. **Time-based Analysis**
Add charts showing:
- Invoices created over time
- Payments made over time
- Gap between invoice creation and payment

---

## Summary

The changes provide:

✅ **Clear distinction** between invoices received and payments made  
✅ **Accurate payment tracking** with confirmed cheques only  
✅ **Better cash flow visibility** for purchase managers  
✅ **Consistent labeling** across the dashboard  
✅ **Flexible time period support** (daily, weekly, monthly, yearly)

---

**Last Updated**: January 20, 2026  
**Version**: 1.0  
**Author**: Development Team
