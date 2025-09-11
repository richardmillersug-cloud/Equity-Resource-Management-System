# Cash Close Collection - Quick Field Reference

## 🔑 Primary Fields (Most Used)

```javascript
{
  // IDENTIFIERS
  id: "firestore-doc-id",
  cashCloseDate: Timestamp,          // Primary date field
  businessDate: "2024-01-15",        // YYYY-MM-DD format
  shift: "day",                       // or "night" - KEY IDENTIFIER
  branchId: "branch_001",
  
  // CORE MONEY FIELDS
  totalRevenue: 8000000,              // Total revenue
  totalCashInTill: 6000000,           // Total cash (primary field)
  totalNetworkPayments: 2000000,      // Total electronic payments
  totalExpenses: 500000,              // Total expenses
  
  // ALLOCATIONS (Calculated)
  profitPercentage: 12,               // Profit % (configurable)
  profitAmount: 720000,               // Calculated profit
  m_expenseFund: 1584000,              // 30% of remaining
  purchasingManager: 3696000,         // 70% of remaining (PM allocation)
  
  // VARIANCES
  totalShortage: 50000,               // Cash shortage
  totalExcess: 0,                     // Cash excess
  
  // METADATA
  status: "completed",                // draft/submitted/approved/completed
  createdAt: Timestamp,
  createdBy: "user-id",
  notes: "Optional notes"
}
```

## 📊 Shifts & Tills Structure

```javascript
shifts: [
  {
    shift: "day",                     // Shift identifier
    shiftTotalRevenue: 5000000,
    shiftTotalCash: 4000000,
    shiftTotalNetwork: 1000000,
    
    tills: [
      {
        tillNumber: 1,                // Till 1 or 2
        totalCashInTill: 2400000,     // Cash in this till
        cashAmount: 2400000,           // Alternative field
        expenses: 200000,              // Till expenses
        totalNetworkPayments: 600000  // Network for this till
      }
    ]
  }
]
```

## 💳 Network Payment Breakdown

```javascript
// Network payment fields (optional)
airtel: 800000,                      // Airtel mobile money
mtn: 700000,                         // MTN mobile money  
stanbicBank: 300000,                 // Stanbic payments
equityBank: 200000,                  // Equity payments
absaBank: 100000,                    // ABSA payments
pesaPal: 100000                      // PesaPal payments
```

## 🔄 Alternative Field Names

| Concept | Primary Field | Alternative Fields |
|---------|--------------|-------------------|
| **Cash Total** | `totalCashInTill` | `closeCash`, `cashAmount`, `totalRevenue` |
| **Network Total** | `totalNetworkPayments` | `totalNetworkMoney` |
| **Date** | `cashCloseDate` | `date`, `businessDate` |
| **Shift** | `shift` | `shiftType` |
| **Shortage** | `totalShortage` | `shortage` |
| **Excess** | `totalExcess` | `excess` |

## 🎯 Key Points for Automated Allocation

1. **Unique Identifier**: `businessDate` + `shift`
2. **PM Allocation Source**: `totalCashInTill` field
3. **Calculation Methods**:
   - **Gross Profit**: `totalCashInTill × grossProfitPercentage`
   - **Standard**: `(totalCashInTill - 12%) × 70%`

## 📝 Minimal Required Fields

```javascript
{
  cashCloseDate: Timestamp,
  totalCashInTill: 5000000,
  shift: "day",                       // Required for allocation
  createdAt: Timestamp,
  createdBy: "user-id"
}
```

---

*Use this for quick lookups. See `CASH_CLOSE_COLLECTION_FIELDS.md` for complete documentation.*



