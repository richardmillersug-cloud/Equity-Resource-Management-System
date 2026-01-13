# Gross Profit Allocation Method

## Overview
The system now supports two calculation methods for PM allocations based on cash close data:

1. **Gross Profit Method** (New Default)
2. **Standard Method** (Original 12% profit deduction)

## Gross Profit Method Calculation

### Formula
```
PM Allocation = Total Till Cash × Monthly Gross Profit %
```

### Example
- **Total Till Cash**: UGX 5,000,000
- **Monthly Gross Profit**: 15%
- **PM Allocation**: UGX 5,000,000 × 0.15 = **UGX 750,000**

### Key Features
- Uses **shift** as the unique identifier
- Directly calculates PM allocation based on gross profit percentage
- No separate profit deduction or special funds allocation
- Simpler, more straightforward calculation

## How to Use

### 1. Select Date and Shift
The system uses the **shift** (day/night) as the unique identifier along with the date to find the cash close record.

### 2. Choose Calculation Method
- **Gross Profit Method** (Default):
  - Set the Monthly Gross Profit percentage (default 15%)
  - PM receives the calculated percentage of total till cash
  
- **Standard Method**:
  - 12% profit deduction
  - Remaining split: 70% PM, 30% Special Funds

### 3. Review Calculation
The system displays:
- Total Till Cash amount
- Calculation method being used
- Resulting PM allocation
- Clear breakdown of the calculation

### 4. Process Allocation
Click "Process Automated Allocation" to:
- Send calculated amount to PM
- Create allocation record with shift identifier
- Generate tracking records

## Comparison Table

| Aspect | Gross Profit Method | Standard Method |
|--------|-------------------|-----------------|
| **Formula** | Total × Gross % | (Total - 12%) × 70% |
| **Identifier** | Shift (day/night) | Document ID |
| **PM Amount (5M example)** | 750,000 (15%) | 3,080,000 (70% of 88%) |
| **Special Funds** | None | 1,320,000 (30% of 88%) |
| **Profit Retention** | None separate | 600,000 (12%) |
| **Complexity** | Simple | Multi-step |

## Configuration

### Adjusting Gross Profit Percentage
1. Select "Gross Profit Method"
2. Enter desired percentage (1-100%)
3. System recalculates automatically

### Default Settings
- **Method**: Gross Profit
- **Percentage**: 15%
- **Identifier**: Shift

## Benefits

### Gross Profit Method
✅ **Simplicity**: Single calculation step
✅ **Transparency**: Clear percentage-based allocation
✅ **Flexibility**: Adjustable gross profit percentage
✅ **Shift-based**: Uses shift as natural identifier

### When to Use Each Method

**Use Gross Profit Method when:**
- You want direct percentage-based allocation
- Shift identifier is sufficient
- Simpler calculation is preferred

**Use Standard Method when:**
- You need profit retention (12%)
- Special funds allocation is required
- Traditional split is desired

## Technical Implementation

### Service Layer
```typescript
// Calculate using gross profit method
const allocation = AutomatedAllocationService.calculateAllocationBreakdown(
  totalCash,
  'gross-profit',
  0.15 // 15% gross profit
);
```

### Database Record
```javascript
{
  cashCloseId: "xxx",
  shift: "day", // Unique identifier
  pmAllocation: 750000,
  calculationMethod: "gross-profit",
  monthlyGrossProfit: 0.15,
  notes: "Gross Profit Method: 15% of 5,000,000"
}
```

## Troubleshooting

### No Cash Close Found
- Ensure cash close exists for selected date/shift
- Check that shift value matches exactly ("day" or "night")

### Calculation Issues
- Verify gross profit percentage is between 1-100
- Check total till cash is greater than 0

### Allocation Fails
- Confirm PM is selected
- Verify user has accountant permissions

---

*Last Updated: December 2024*
*Version: 2.0 - Added Gross Profit Method*








