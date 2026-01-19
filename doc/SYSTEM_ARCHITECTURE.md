# Multi-Branch Retail/Supply Chain Management System

## System Overview

This is a comprehensive enterprise-grade retail and supply chain management system designed for multi-branch operations. The system enforces strict business rules, role-based access control, and maintains data integrity across all operations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Web UI    │ │  Mobile App │ │     API     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Financial   │ │ Supply Chain│ │     HR      │           │
│  │  Service    │ │   Service   │ │  Service    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                              │                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Business Rules Engine                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Database   │ │    Cache    │ │ File Storage│           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Core Business Domains

### 1. Financial Management & Cash Control

**Key Features:**
- Daily cash reconciliation across 7 payment methods
- Sophisticated fund allocation system (Purchasing Manager, Special, 12% Savings)
- Multi-step fund acknowledgment workflow
- Categorized expense management with partial payment tracking

**Business Rules:**
- Only accountants can create cash allocations
- Purchasing managers can only acknowledge their allocated funds
- Special funds require accountant acknowledgment
- 12% savings are mandatory and automatically tracked
- Payments cannot exceed invoice remaining balance

**Files:**
- `src/lib/services/financial-service.ts` - Core financial operations
- `src/lib/database/schema.ts` - Financial entity definitions

### 2. Supply Chain & Procurement

**Key Features:**
- TIN-based supplier registration with banking details
- FDN-based invoice system with payment tracking
- Threshold-based restock management
- Product return and damage tracking

**Business Rules:**
- Only purchasing managers can create suppliers and invoices
- Supplier TIN numbers must be unique
- Invoice FDN must be unique
- Restock only triggered when stock <= minimum threshold
- Due dates must be after invoice dates

**Files:**
- `src/lib/services/supply-chain-service.ts` - Supply chain operations
- `src/lib/database/schema.ts` - Supply chain entity definitions

### 3. Human Resources & Payroll

**Key Features:**
- NIN-based employee registration
- Barcode-supported attendance tracking
- Automated payroll calculations with overtime
- Leave management with balance tracking

**Business Rules:**
- Employee NIN and email must be unique
- Only HR personnel can manage employee records
- Attendance check-in required before check-out
- Leave requests require appropriate approval levels

**Files:**
- `src/lib/services/hr-service.ts` - HR operations
- `src/lib/database/schema.ts` - HR entity definitions

## Role-Based Access Control Matrix

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access |
| **HR** | Employee management, payroll, attendance, leave approval |
| **Accountant** | Cash allocation, fund acknowledgment, expense approval, payment processing |
| **Accountant Ops** | Cash management, fund acknowledgment, cash close operations |
| **Purchasing Manager** | Supplier management, invoice creation, procurement, fund acknowledgment |
| **Stock Manager** | Inventory management, restock requests, return notes, damage reporting |
| **Receiver** | Purchase receiving, stock updates, return processing |
| **Supervisor** | Analytics, reporting, emergency expense approval |
| **Managing Director** | Banking operations, high-level financial oversight |

## Data Integrity Rules

### Unique Constraints
- Employee NIN and Email
- Supplier TIN numbers
- Invoice FDN (Fiscal Document Number)
- Payment Transaction IDs

### Referential Integrity
- All employees must belong to a branch
- All financial transactions linked to employees
- Suppliers managed by specific employees
- Cash allocations require both accountant and purchasing manager assignments

### Business Logic Constraints
- Due dates must be after invoice dates
- Payment amounts cannot be negative
- Cash close amounts must balance across payment methods
- Fund acknowledgments must match allocation amounts

## Payment Methods Supported

1. **Cash** - Physical cash transactions
2. **Airtel** - Mobile money (Airtel)
3. **MTN** - Mobile money (MTN)
4. **Stanbic Bank** - Bank transfers
5. **Equity Bank** - Bank transfers
6. **Absa Bank** - Bank transfers
7. **PesaPal** - Digital payment platform

## Key Workflows

### Cash Allocation Workflow
```
Accountant Creates Allocation → 
Purchasing Manager Acknowledges → 
Funds Available for Use → 
Expense Tracking & Reporting
```

### Invoice Payment Workflow
```
Purchasing Manager Creates Invoice → 
Payment Processing (Multiple Methods) → 
Automatic Status Updates → 
Balance Calculations → 
Overdue Tracking
```

### Employee Attendance Workflow
```
Employee Check-in (Barcode) → 
Work Period → 
Employee Check-out (Barcode) → 
Hours Calculation → 
Overtime Detection → 
Payroll Integration
```

### Expense Approval Workflow
```
Employee Submits Expense → 
Category-Based Routing → 
Role-Based Approval → 
Payment Processing → 
Balance Tracking
```

## File Structure

```
src/
├── lib/
│   ├── database/
│   │   └── schema.ts              # Complete database schema
│   ├── business-rules/
│   │   └── index.ts               # Business rules engine
│   └── services/
│       ├── financial-service.ts   # Financial operations
│       ├── supply-chain-service.ts # Supply chain operations
│       └── hr-service.ts          # HR operations
├── app/
│   ├── page.tsx                   # Main application page
│   ├── layout.tsx                 # Application layout
│   └── globals.css                # Global styles
└── components/                    # UI components (to be implemented)
```

## Implementation Status

### ✅ Completed
- Complete database schema with all entities
- Business rules engine with validation logic
- Financial service with cash allocation and payment processing
- Supply chain service with supplier and invoice management
- HR service with employee, attendance, and payroll management
- Role-based access control implementation

### 🚧 In Progress
- User interface components
- Database integration layer
- API endpoints
- Authentication system

### 📋 Planned
- Reporting and analytics dashboards
- Mobile application
- Integration with external payment systems
- Advanced inventory management features

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

## Business Rules Implementation

The system enforces business rules through the `RetailBusinessRules` class:

- **Financial Controls**: Validates cash allocations, payment amounts, and expense approvals
- **Access Control**: Enforces role-based permissions for all operations
- **Data Integrity**: Validates unique constraints and referential integrity
- **Business Logic**: Ensures dates, amounts, and balances are logically consistent

## Key Features

### Financial Management
- Multi-method cash reconciliation
- Sophisticated fund allocation system
- Automated invoice status updates
- Partial payment tracking
- Expense categorization and approval workflows

### Supply Chain
- Supplier performance tracking
- Automated restock notifications
- Return and damage cost tracking
- Invoice payment history
- Overdue invoice management

### Human Resources
- Comprehensive employee management
- Barcode-based attendance tracking
- Automated payroll calculations
- Leave balance management
- Performance metrics tracking

## Security Considerations

- Role-based access control at service level
- Input validation and sanitization
- Business rule enforcement
- Audit trails for all financial transactions
- Data encryption for sensitive information

## Scalability Features

- Service-oriented architecture
- Singleton service instances
- Efficient database query patterns
- Caching strategies for frequently accessed data
- Modular component design

This system provides a robust foundation for multi-branch retail operations with comprehensive financial controls, supply chain management, and human resources functionality. 