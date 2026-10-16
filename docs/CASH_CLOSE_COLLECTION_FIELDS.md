# Cash Close Collection Fields Reference

## Complete Field List for `cashCloses` Collection

### 📋 Document Metadata
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Firestore document ID (auto-generated) |
| `createdAt` | Timestamp | When the record was created |
| `updatedAt` | Timestamp | Last update timestamp |
| `createdBy` | string | User ID who created the record |
| `branchId` | string | Branch identifier |
| `status` | string | 'draft', 'submitted', 'approved', 'rejected', 'completed' |

### 📅 Date Fields
| Field | Type | Description |
|-------|------|-------------|
| `cashCloseDate` | Timestamp | Primary business date (Firestore Timestamp) |
| `date` | string/Date | Alternative date field (ISO string or Date) |
| `businessDate` | string | Business date in YYYY-MM-DD format |

### 💰 Core Financial Totals
| Field | Type | Description |
|-------|------|-------------|
| `totalRevenue` | number | Total revenue for the day |
| `totalCashInTill` | number | Total cash amount in all tills |
| `closeCash` | number | Alternative field for total cash |
| `totalNetworkPayments` | number | Total network/electronic payments |
| `totalNetworkMoney` | number | Alternative field for network payments |
| `totalExpenses` | number | Total expenses for the period |
| `totalTillUsed` | number | Total amount used from tills |

### 📊 Cash Management
| Field | Type | Description |
|-------|------|-------------|
| `totalExpectedCash` | number | Expected physical cash amount |
| `totalActualCash` | number | Actual physical cash present |
| `cashPresent` | number | Alternative field for actual cash |
| `actualAmount` | number | Alternative field for actual cash |
| `expectedAmount` | number | Alternative field for expected cash |

### 📈 Variances
| Field | Type | Description |
|-------|------|-------------|
| `totalShortage` | number | Total cash shortage amount |
| `shortage` | number | Alternative field for shortage |
| `totalExcess` | number | Total cash excess amount |
| `excess` | number | Alternative field for excess |
| `totalNetworkShortage` | number | Network payment shortage |
| `totalNetworkExcess` | number | Network payment excess |

### 💸 Financial Calculations
| Field | Type | Description |
|-------|------|-------------|
| `profitPercentage` | number | Profit percentage (e.g., 12) |
| `profitAmount` | number | Calculated profit amount |
| `taxRate` | number | Tax rate (e.g., 0.18 for 18%) |
| `taxAmount` | number | Calculated tax amount |
| `afterTaxAmount` | number | Amount after tax deduction |
| `remainingAmount` | number | Amount for distribution |
| `m_expenseFund` | number | Amount allocated to m expense fund (30%) |
| `purchasingManager` | number | Amount for purchasing manager (70%) |

### 🏪 Network Payment Breakdown
| Field | Type | Description |
|-------|------|-------------|
| `airtel` | number | Airtel mobile money amount |
| `mtn` | number | MTN mobile money amount |
| `stanbicBank` | number | Stanbic Bank payments |
| `equityBank` | number | Equity Bank payments |
| `absaBank` | number | ABSA Bank payments |
| `pesaPal` | number | PesaPal payments |

### 👥 Shifts Array
| Field | Type | Description |
|-------|------|-------------|
| `shifts` | Array | Array of shift objects |
| `shifts[].shift` | string | 'day' or 'night' |
| `shifts[].shiftTotalRevenue` | number | Total revenue for shift |
| `shifts[].shiftTotalCash` | number | Total cash for shift |
| `shifts[].shiftTotalNetwork` | number | Total network payments for shift |
| `shifts[].shiftStartTime` | Timestamp | Shift start time |
| `shifts[].shiftEndTime` | Timestamp | Shift end time |
| `shifts[].shiftSupervisor` | string | Supervisor name/ID |
| `shifts[].tills` | Array | Array of till data |

### 💵 Till Data (within shifts)
| Field | Type | Description |
|-------|------|-------------|
| `tills[].tillNumber` | number | Till identifier (1, 2, etc.) |
| `tills[].tillName` | string | Optional till name |
| `tills[].totalCashInTill` | number | Total cash in specific till |
| `tills[].cashAmount` | number | Cash amount in till |
| `tills[].cashAtHand` | number | Physical cash at hand |
| `tills[].expectedNetworkMoney` | number | Expected network payments |
| `tills[].actualNetworkMoney` | number | Actual network payments |
| `tills[].tillUsed` | number | Amount used from till |
| `tills[].expenses` | number | Till expenses |
| `tills[].expenseDetails` | Array | Detailed expense records |
| `tills[].networkPayments` | Array | Network payment details |
| `tills[].totalNetworkPayments` | number | Total network for till |
| `tills[].expectedCashAtHand` | number | Expected cash |
| `tills[].cashShortage` | number | Cash shortage for till |
| `tills[].cashExcess` | number | Cash excess for till |
| `tills[].networkShortage` | number | Network shortage |
| `tills[].networkExcess` | number | Network excess |

### 📝 Additional Fields
| Field | Type | Description |
|-------|------|-------------|
| `notes` | string | General notes/comments |
| `shift` | string | Single shift field (when not using shifts array) |
| `shiftType` | string | Alternative shift field |
| `employeeId` | string | Employee who created/owns record |
| `approvedBy` | string | User who approved |
| `approvedAt` | Timestamp | Approval timestamp |
| `rejectionReason` | string | Reason for rejection |

### 🔧 Workflow & Tracking
| Field | Type | Description |
|-------|------|-------------|
| `entryDelay` | number | Days between business date and entry |
| `isLateEntry` | boolean | Flag for late entries |
| `dataSource` | string | Source collection/system |
| `automatedAllocation` | boolean | If allocation was automated |

## 📊 Field Usage Patterns

### Minimum Required Fields
```javascript
{
  id: "auto-generated",
  cashCloseDate: Timestamp,
  totalCashInTill: 5000000,
  shifts: [{
    shift: "day",
    tills: [{
      tillNumber: 1,
      totalCashInTill: 3000000
    }]
  }],
  createdAt: Timestamp,
  createdBy: "user-id"
}
```

### Typical Complete Record
```javascript
{
  id: "doc-id",
  cashCloseDate: Timestamp,
  businessDate: "2024-01-15",
  date: "2024-01-15T12:00:00Z",
  
  // Financial totals
  totalRevenue: 8000000,
  totalCashInTill: 6000000,
  totalNetworkPayments: 2000000,
  totalExpenses: 500000,
  
  // Variances
  totalShortage: 50000,
  totalExcess: 0,
  
  // Calculations
  profitPercentage: 12,
  profitAmount: 720000,
  m_expenseFund: 1584000,
  purchasingManager: 3696000,
  
  // Network breakdown
  airtel: 800000,
  mtn: 700000,
  stanbicBank: 300000,
  equityBank: 200000,
  
  // Shifts with tills
  shifts: [{
    shift: "day",
    shiftTotalRevenue: 5000000,
    shiftTotalCash: 4000000,
    shiftTotalNetwork: 1000000,
    tills: [{
      tillNumber: 1,
      totalCashInTill: 2400000,
      cashAmount: 2400000,
      expenses: 200000,
      totalNetworkPayments: 600000
    }, {
      tillNumber: 2,
      totalCashInTill: 1600000,
      cashAmount: 1600000,
      expenses: 100000,
      totalNetworkPayments: 400000
    }]
  }, {
    shift: "night",
    shiftTotalRevenue: 3000000,
    shiftTotalCash: 2000000,
    shiftTotalNetwork: 1000000,
    tills: [{
      tillNumber: 1,
      totalCashInTill: 1200000,
      cashAmount: 1200000,
      expenses: 100000,
      totalNetworkPayments: 600000
    }, {
      tillNumber: 2,
      totalCashInTill: 800000,
      cashAmount: 800000,
      expenses: 100000,
      totalNetworkPayments: 400000
    }]
  }],
  
  // Metadata
  status: "completed",
  branchId: "branch_001",
  createdBy: "accountant-id",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  notes: "Daily cash close completed"
}
```

## 🔍 Field Variations by Source

### SimpleCashCloseService Fields
- Uses: `cashCloseDate`, `totalRevenue`, `shifts`
- Converts Timestamps to Date objects

### ComprehensiveCashCloseService Fields  
- Uses all fields with full structure
- Includes detailed till and expense tracking

### Unified Service Fields
- Maps various field names to standard format
- Handles: `closeCash`, `cashCloseTotal`, `totalCashInTill`

## 📌 Important Notes

1. **Date Fields**: Multiple date fields exist for compatibility
   - `cashCloseDate` (Timestamp) - Primary
   - `businessDate` (string) - YYYY-MM-DD format
   - `date` (string/Date) - Alternative format

2. **Cash Fields**: Multiple names for same concept
   - `totalCashInTill` - Preferred
   - `closeCash` - Alternative
   - `totalRevenue` - Sometimes used

3. **Network Fields**: Two common names
   - `totalNetworkPayments` - Preferred
   - `totalNetworkMoney` - Alternative

4. **Shift Identifier**: Used as unique key with date
   - Combination of `businessDate` + `shift` creates unique identifier
   - Essential for automated allocation system

---

*Last Updated: December 2024*
*Collection: `cashCloses`*



