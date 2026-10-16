-- =====================================================
-- ROLE-BASED DATABASE VIEWS
-- Retail / Supply Chain Management System
-- =====================================================

-- =====================================================
-- 1. PURCHASE MANAGER VIEWS
-- =====================================================

-- Purchase Manager: Fund Acknowledgments (Rule 2.1 - can only acknowledge their funds)
CREATE VIEW purchase_manager_fund_acknowledgments AS
SELECT 
    fa.id,
    fa.actualAmountReceived,
    fa.discrepancyAmount,
    fa.isShortage,
    fa.notes,
    fa.status,
    fa.acknowledgedAt,
    fa.fundType,
    ca.cashCloseTotal,
    ca.purchasingManager as allocatedAmount,
    ca.allocationDate,
    e.FirstName + ' ' + e.LastName as accountantName
FROM FundAcknowledgment fa
JOIN CashAllocation ca ON fa.allocationId = ca.id
JOIN Employee e ON ca.accountantId = e.EmployeeID
WHERE fa.fundType = 'purchasing'
AND fa.purchasingManagerId = CURRENT_USER_ID(); -- Replace with session user ID

-- Purchase Manager: Suppliers they manage (Rule 5.2)
CREATE VIEW purchase_manager_suppliers AS
SELECT 
    s.SupplierID,
    s.SupplierName,
    s.TinNumber,
    s.DateOfRegistration,
    s.Address,
    s.EmailAddress,
    s.PhoneNumber,
    s.BankName,
    s.AccountNumber,
    s.BankNumber,
    COUNT(i.InvoiceID) as TotalInvoices,
    COALESCE(SUM(i.Amount), 0) as TotalInvoiceAmount,
    COALESCE(SUM(p.Amount), 0) as TotalPaid
FROM Supplier s
LEFT JOIN Invoice i ON s.SupplierID = i.SupplierID
LEFT JOIN Payment p ON i.InvoiceID = p.InvoiceID
WHERE s.EmployeeID = CURRENT_USER_ID()
GROUP BY s.SupplierID, s.SupplierName, s.TinNumber, s.DateOfRegistration, 
         s.Address, s.EmailAddress, s.PhoneNumber, s.BankName, s.AccountNumber, s.BankNumber;

-- Purchase Manager: Restock Items Management (Rule 7.1, 7.2)
CREATE VIEW purchase_manager_restock_items AS
SELECT 
    ri.RestockID,
    ri.ProductName,
    ri.Barcode,
    ri.CurrentStock,
    ri.RestockThreshold,
    ri.RestockQuantity,
    ri.Status,
    ri.Note,
    s.SupplierName,
    i.FDN,
    i.Amount as InvoiceAmount,
    CASE 
        WHEN ri.CurrentStock <= ri.RestockThreshold THEN 'URGENT'
        WHEN ri.CurrentStock <= (ri.RestockThreshold * 1.5) THEN 'MEDIUM'
        ELSE 'LOW'
    END as Priority
FROM RestockItems ri
JOIN Supplier s ON ri.SupplierID = s.SupplierID
LEFT JOIN Invoice i ON ri.InvoiceID = i.InvoiceID
WHERE s.EmployeeID = CURRENT_USER_ID()
ORDER BY ri.CurrentStock ASC;

-- =====================================================
-- 2. ACCOUNTANT VIEWS
-- =====================================================

-- Accountant: Cash Allocations (Rule 1.1 - only accountants can create)
CREATE VIEW accountant_cash_allocations AS
SELECT 
    ca.id,
    ca.cashCloseTotal,
    ca.savings,
    ca.specialFunds,
    ca.purchasingManager,
    ca.notes,
    ca.allocationDate,
    pm.FirstName + ' ' + pm.LastName as purchasingManagerName,
    CASE 
        WHEN (ca.savings + ca.specialFunds + ca.purchasingManager) = ca.cashCloseTotal THEN 'BALANCED'
        ELSE 'UNBALANCED'
    END as AllocationStatus,
    -- Rule 1.4: Savings = 12% of cashCloseTotal
    CASE 
        WHEN ca.savings = (ca.cashCloseTotal * 0.12) THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as SavingsValidation
FROM CashAllocation ca
JOIN Employee pm ON ca.purchasingManagerId = pm.EmployeeID
WHERE ca.accountantId = CURRENT_USER_ID();

-- Accountant: Special Funds Tracker (Rule 2.2)
CREATE VIEW accountant_special_funds_tracker AS
SELECT 
    sft.id,
    sft.specialFundsAllocated,
    sft.specialFundsAcknowledged,
    sft.savingsAllocated,
    sft.savingsAcknowledged,
    sft.lastUpdated,
    (sft.specialFundsAllocated - sft.specialFundsAcknowledged) as SpecialFundsBalance,
    (sft.savingsAllocated - sft.savingsAcknowledged) as SavingsBalance,
    ca.allocationDate
FROM SpecialFundsTracker sft
LEFT JOIN CashAllocation ca ON sft.cashAllocationId = ca.id
WHERE sft.accountantId = CURRENT_USER_ID();

-- Accountant: Expense Management (Rule 4.1, 4.2, 4.3)
CREATE VIEW accountant_expense_management AS
SELECT 
    e.ExpenseID,
    e.Name,
    e.ExpenseDate,
    e.ExpenseTime,
    e.Amount,
    e.Note,
    e.ExpenseType,
    e.PaidAmount,
    (e.Amount - e.PaidAmount) as RemainingBalance,
    emp.FirstName + ' ' + emp.LastName as EmployeeName,
    emp.BranchID,
    b.BranchName,
    CASE 
        WHEN e.PaidAmount = 0 THEN 'UNPAID'
        WHEN e.PaidAmount < e.Amount THEN 'PARTIALLY_PAID'
        WHEN e.PaidAmount = e.Amount THEN 'FULLY_PAID'
        ELSE 'OVERPAID'
    END as PaymentStatus
FROM Expense e
JOIN Employee emp ON e.EmployeeID = emp.EmployeeID
JOIN Branch b ON emp.BranchID = b.BranchID
WHERE e.Amount > 0; -- Rule 4.3: Amount must be > 0

-- =====================================================
-- 3. RECEIVER VIEWS
-- =====================================================

-- Receiver: Incoming Invoices and Deliveries
CREATE VIEW receiver_incoming_deliveries AS
SELECT 
    i.InvoiceID,
    i.Date,
    i.Amount,
    i.Quantity,
    i.FDN,
    i.Status,
    i.Shipping,
    i.Description,
    i.Title,
    i.DueDate,
    s.SupplierName,
    s.PhoneNumber as SupplierPhone,
    emp.FirstName + ' ' + emp.LastName as ProcessorName,
    DATEDIFF(day, GETDATE(), i.DueDate) as DaysUntilDue,
    CASE 
        WHEN i.DueDate < GETDATE() THEN 'OVERDUE'
        WHEN DATEDIFF(day, GETDATE(), i.DueDate) <= 7 THEN 'DUE_SOON'
        ELSE 'ON_TIME'
    END as UrgencyStatus
FROM Invoice i
JOIN Supplier s ON i.SupplierID = s.SupplierID
LEFT JOIN Employee emp ON i.EmployeeID = emp.EmployeeID
WHERE i.Status IN ('Pending', 'Partial')
ORDER BY i.DueDate ASC;

-- Receiver: Return Notes Management (Rule 7.3)
CREATE VIEW receiver_return_notes AS
SELECT 
    rn.ReturnNoteID,
    rn.ReturnDate,
    rn.Quantity,
    rn.Amount,
    rn.Status,
    rn.Note,
    s.SupplierName,
    s.PhoneNumber as SupplierPhone,
    i.FDN,
    i.Title as InvoiceTitle,
    emp.FirstName + ' ' + emp.LastName as ProcessorName
FROM ReturnNote rn
JOIN Supplier s ON rn.SupplierID = s.SupplierID
LEFT JOIN Invoice i ON rn.InvoiceID = i.InvoiceID
LEFT JOIN Employee emp ON rn.EmployeeID = emp.EmployeeID
ORDER BY rn.ReturnDate DESC;

-- =====================================================
-- 4. STOCK MANAGER VIEWS
-- =====================================================

-- Stock Manager: Inventory Overview (Rule 7.1, 7.2)
CREATE VIEW stock_manager_inventory_overview AS
SELECT 
    ri.RestockID,
    ri.ProductName,
    ri.Barcode,
    ri.CurrentStock,
    ri.RestockThreshold,
    ri.RestockQuantity,
    ri.Status,
    s.SupplierName,
    CASE 
        WHEN ri.CurrentStock = 0 THEN 'OUT_OF_STOCK'
        WHEN ri.CurrentStock <= ri.RestockThreshold THEN 'CRITICAL'
        WHEN ri.CurrentStock <= (ri.RestockThreshold * 1.5) THEN 'LOW'
        WHEN ri.CurrentStock <= (ri.RestockThreshold * 2) THEN 'MEDIUM'
        ELSE 'ADEQUATE'
    END as StockLevel,
    CASE 
        WHEN ri.CurrentStock <= ri.RestockThreshold THEN ri.RestockQuantity
        ELSE 0
    END as SuggestedReorder
FROM RestockItems ri
JOIN Supplier s ON ri.SupplierID = s.SupplierID
ORDER BY 
    CASE 
        WHEN ri.CurrentStock = 0 THEN 1
        WHEN ri.CurrentStock <= ri.RestockThreshold THEN 2
        WHEN ri.CurrentStock <= (ri.RestockThreshold * 1.5) THEN 3
        ELSE 4
    END,
    ri.CurrentStock ASC;

-- Stock Manager: Damage Reports (Rule 7.4)
CREATE VIEW stock_manager_damage_reports AS
SELECT 
    d.DamageID,
    d.Status,
    d.DamageDate,
    d.Quantity,
    d.Amount,
    d.BuyingPrice,
    d.Note,
    i.FDN,
    i.Title as InvoiceTitle,
    emp.FirstName + ' ' + emp.LastName as ReporterName,
    (d.Quantity * d.BuyingPrice) as TotalDamageValue,
    DATEDIFF(day, d.DamageDate, GETDATE()) as DaysAgo
FROM Damage d
LEFT JOIN Invoice i ON d.InvoiceID = i.InvoiceID
LEFT JOIN Employee emp ON d.EmployeeID = emp.EmployeeID
ORDER BY d.DamageDate DESC;

-- =====================================================
-- 5. AUDITOR VIEWS
-- =====================================================

-- Auditor: Comprehensive Audit Trail (Rule 13.1, 13.2, 13.3)
CREATE VIEW auditor_audit_trail AS
SELECT 
    al.auditLogID,
    al.tableName,
    al.actionType,
    al.timestamp,
    al.objectID,
    al.objectRepr,
    al.changes,
    emp.FirstName + ' ' + emp.LastName as UserName,
    emp.Email as UserEmail,
    jr.JobTitle,
    b.BranchName
FROM AuditLog al
JOIN Employee emp ON al.userID = emp.EmployeeID
JOIN JobRole jr ON emp.EmployeeID = jr.AssignedEmployeeID
JOIN Branch b ON emp.BranchID = b.BranchID
ORDER BY al.timestamp DESC;

-- Auditor: Financial Discrepancies
CREATE VIEW auditor_financial_discrepancies AS
SELECT 
    'Fund Acknowledgment' as DiscrepancyType,
    fa.id as RecordID,
    fa.discrepancyAmount as Amount,
    fa.notes as Description,
    fa.acknowledgedAt as Date,
    pm.FirstName + ' ' + pm.LastName as ResponsiblePerson
FROM FundAcknowledgment fa
JOIN Employee pm ON fa.purchasingManagerId = pm.EmployeeID
WHERE fa.discrepancyAmount != 0

UNION ALL

SELECT 
    'Cash Close Variance' as DiscrepancyType,
    cc.CashCloseID as RecordID,
    (cc.ActualAmount - cc.ExpectedAmount) as Amount,
    'Cash close variance' as Description,
    cc.CashCloseDate as Date,
    emp.FirstName + ' ' + emp.LastName as ResponsiblePerson
FROM CashClose cc
JOIN Employee emp ON cc.EmployeeID = emp.EmployeeID
WHERE cc.ActualAmount != cc.ExpectedAmount

ORDER BY Date DESC;

-- =====================================================
-- 6. HR VIEWS
-- =====================================================

-- HR: Employee Management Overview (Rule 8.1-8.5)
CREATE VIEW hr_employee_overview AS
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    e.EmployeeNIN,
    e.Email,
    e.Phone,
    e.DateOfBirth,
    e.HireDate,
    e.EmployeeSalary,
    e.EmploymentStatus,
    b.BranchName,
    jr.JobTitle,
    jr.BaseSalary,
    e.NextOfKinName,
    e.NextOfKinNIN,
    e.NextOfKinPhone,
    DATEDIFF(year, e.HireDate, GETDATE()) as YearsOfService,
    CASE 
        WHEN e.EmploymentStatus = 'Active' THEN 'ACTIVE'
        WHEN e.EmploymentStatus = 'Suspended' THEN 'SUSPENDED'
        WHEN e.EmploymentStatus = 'Terminated' THEN 'TERMINATED'
    END as StatusCategory
FROM Employee e
JOIN Branch b ON e.BranchID = b.BranchID
LEFT JOIN JobRole jr ON e.EmployeeID = jr.AssignedEmployeeID;

-- HR: Attendance Summary (Rule 10.1-10.4)
CREATE VIEW hr_attendance_summary AS
SELECT 
    a.EmployeeID,
    e.FirstName + ' ' + e.LastName as EmployeeName,
    b.BranchName,
    COUNT(*) as TotalDays,
    SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) as PresentDays,
    SUM(CASE WHEN a.Status = 'Late' THEN 1 ELSE 0 END) as LateDays,
    SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) as AbsentDays,
    AVG(CASE 
        WHEN a.CheckOutTime IS NOT NULL AND a.CheckInTime IS NOT NULL 
        THEN DATEDIFF(minute, a.CheckInTime, a.CheckOutTime) / 60.0 
        ELSE NULL 
    END) as AvgHoursWorked,
    (SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as AttendanceRate
FROM Attendance a
JOIN Employee e ON a.EmployeeID = e.EmployeeID
JOIN Branch b ON e.BranchID = b.BranchID
WHERE a.AttendanceDate >= DATEADD(month, -3, GETDATE()) -- Last 3 months
GROUP BY a.EmployeeID, e.FirstName, e.LastName, b.BranchName;

-- HR: Leave Requests Management
CREATE VIEW hr_leave_requests AS
SELECT 
    lr.LeaveID,
    e.FirstName + ' ' + e.LastName as EmployeeName,
    lr.LeaveType,
    lr.StartDate,
    lr.EndDate,
    DATEDIFF(day, lr.StartDate, lr.EndDate) + 1 as TotalDays,
    lr.Status,
    lr.Reason,
    approver.FirstName + ' ' + approver.LastName as ApproverName,
    b.BranchName,
    CASE 
        WHEN lr.Status = 'Pending' AND lr.StartDate <= DATEADD(day, 7, GETDATE()) THEN 'URGENT'
        WHEN lr.Status = 'Pending' THEN 'NORMAL'
        ELSE 'PROCESSED'
    END as Priority
FROM LeaveRequest lr
JOIN Employee e ON lr.EmployeeID = e.EmployeeID
JOIN Branch b ON e.BranchID = b.BranchID
LEFT JOIN Employee approver ON lr.ApprovedBy = approver.EmployeeID
ORDER BY 
    CASE WHEN lr.Status = 'Pending' THEN 1 ELSE 2 END,
    lr.StartDate ASC;

-- =====================================================
-- 7. MANAGER VIEWS
-- =====================================================

-- Manager: Branch Performance Dashboard
CREATE VIEW manager_branch_performance AS
SELECT 
    b.BranchID,
    b.BranchName,
    COUNT(DISTINCT e.EmployeeID) as TotalEmployees,
    COUNT(DISTINCT CASE WHEN e.EmploymentStatus = 'Active' THEN e.EmployeeID END) as ActiveEmployees,
    COALESCE(SUM(cc.ActualAmount), 0) as TotalCashClosed,
    COALESCE(SUM(exp.Amount), 0) as TotalExpenses,
    COALESCE(SUM(cc.ActualAmount), 0) - COALESCE(SUM(exp.Amount), 0) as NetCashFlow,
    COUNT(DISTINCT cc.CashCloseID) as CashCloseCount,
    AVG(CASE 
        WHEN a.Status = 'Present' THEN 1.0 
        WHEN a.Status IN ('Late', 'Absent') THEN 0.0 
        ELSE NULL 
    END) * 100 as AttendanceRate
FROM Branch b
LEFT JOIN Employee e ON b.BranchID = e.BranchID
LEFT JOIN CashClose cc ON b.BranchID = cc.BranchID AND cc.CashCloseDate >= DATEADD(month, -1, GETDATE())
LEFT JOIN Expense exp ON e.EmployeeID = exp.EmployeeID AND exp.ExpenseDate >= DATEADD(month, -1, GETDATE())
LEFT JOIN Attendance a ON e.EmployeeID = a.EmployeeID AND a.AttendanceDate >= DATEADD(month, -1, GETDATE())
GROUP BY b.BranchID, b.BranchName;

-- Manager: Supplier Performance
CREATE VIEW manager_supplier_performance AS
SELECT 
    s.SupplierID,
    s.SupplierName,
    COUNT(DISTINCT i.InvoiceID) as TotalInvoices,
    COALESCE(SUM(i.Amount), 0) as TotalInvoiceValue,
    COALESCE(SUM(p.Amount), 0) as TotalPaid,
    COALESCE(SUM(i.Amount), 0) - COALESCE(SUM(p.Amount), 0) as OutstandingBalance,
    AVG(DATEDIFF(day, i.Date, COALESCE(p.PaymentDate, GETDATE()))) as AvgPaymentDays,
    COUNT(CASE WHEN i.Status = 'Overdue' THEN 1 END) as OverdueInvoices,
    COUNT(CASE WHEN rn.ReturnNoteID IS NOT NULL THEN 1 END) as ReturnCount,
    COUNT(CASE WHEN d.DamageID IS NOT NULL THEN 1 END) as DamageReports
FROM Supplier s
LEFT JOIN Invoice i ON s.SupplierID = i.SupplierID
LEFT JOIN Payment p ON i.InvoiceID = p.InvoiceID
LEFT JOIN ReturnNote rn ON s.SupplierID = rn.SupplierID
LEFT JOIN Damage d ON i.InvoiceID = d.InvoiceID
WHERE i.Date >= DATEADD(month, -6, GETDATE()) OR i.Date IS NULL
GROUP BY s.SupplierID, s.SupplierName;

-- =====================================================
-- 8. ADMIN VIEWS
-- =====================================================

-- Admin: System Overview
CREATE VIEW admin_system_overview AS
SELECT 
    'Branches' as EntityType,
    COUNT(*) as TotalCount,
    COUNT(CASE WHEN CreatedAt >= DATEADD(month, -1, GETDATE()) THEN 1 END) as RecentCount
FROM Branch

UNION ALL

SELECT 
    'Employees' as EntityType,
    COUNT(*) as TotalCount,
    COUNT(CASE WHEN CreatedAt >= DATEADD(month, -1, GETDATE()) THEN 1 END) as RecentCount
FROM Employee

UNION ALL

SELECT 
    'Suppliers' as EntityType,
    COUNT(*) as TotalCount,
    COUNT(CASE WHEN DateOfRegistration >= DATEADD(month, -1, GETDATE()) THEN 1 END) as RecentCount
FROM Supplier

UNION ALL

SELECT 
    'Invoices' as EntityType,
    COUNT(*) as TotalCount,
    COUNT(CASE WHEN Date >= DATEADD(month, -1, GETDATE()) THEN 1 END) as RecentCount
FROM Invoice;

-- Admin: Security and Access Control
CREATE VIEW admin_security_overview AS
SELECT 
    e.EmployeeID,
    e.FirstName + ' ' + e.LastName as EmployeeName,
    e.Email,
    e.EmploymentStatus,
    jr.JobTitle,
    b.BranchName,
    e.CreatedAt as AccountCreated,
    MAX(al.timestamp) as LastActivity,
    COUNT(al.auditLogID) as TotalActions,
    CASE 
        WHEN MAX(al.timestamp) < DATEADD(day, -30, GETDATE()) THEN 'INACTIVE'
        WHEN MAX(al.timestamp) < DATEADD(day, -7, GETDATE()) THEN 'LOW_ACTIVITY'
        ELSE 'ACTIVE'
    END as ActivityLevel
FROM Employee e
LEFT JOIN JobRole jr ON e.EmployeeID = jr.AssignedEmployeeID
LEFT JOIN Branch b ON e.BranchID = b.BranchID
LEFT JOIN AuditLog al ON e.EmployeeID = al.userID
GROUP BY e.EmployeeID, e.FirstName, e.LastName, e.Email, e.EmploymentStatus, 
         jr.JobTitle, b.BranchName, e.CreatedAt;

-- =====================================================
-- ROLE-BASED ACCESS CONTROL FUNCTIONS
-- =====================================================

-- Function to get current user's role
CREATE FUNCTION GetCurrentUserRole()
RETURNS VARCHAR(50)
AS
BEGIN
    DECLARE @Role VARCHAR(50)
    
    SELECT @Role = jr.JobTitle
    FROM Employee e
    JOIN JobRole jr ON e.EmployeeID = jr.AssignedEmployeeID
    WHERE e.EmployeeID = CURRENT_USER_ID()
    
    RETURN @Role
END;

-- Function to check if user has permission for specific action
CREATE FUNCTION HasPermission(@Action VARCHAR(100))
RETURNS BIT
AS
BEGIN
    DECLARE @Role VARCHAR(50) = dbo.GetCurrentUserRole()
    DECLARE @HasPermission BIT = 0
    
    -- Define role permissions
    IF @Role = 'Admin'
        SET @HasPermission = 1
    ELSE IF @Role = 'Manager' AND @Action IN ('VIEW_ALL_BRANCHES', 'VIEW_PERFORMANCE', 'MANAGE_EMPLOYEES')
        SET @HasPermission = 1
    ELSE IF @Role = 'Accountant' AND @Action IN ('CREATE_CASH_ALLOCATION', 'MANAGE_EXPENSES', 'VIEW_FINANCIAL_DATA')
        SET @HasPermission = 1
    ELSE IF @Role = 'Purchase Manager' AND @Action IN ('ACKNOWLEDGE_FUNDS', 'MANAGE_SUPPLIERS', 'MANAGE_RESTOCK')
        SET @HasPermission = 1
    ELSE IF @Role = 'HR' AND @Action IN ('MANAGE_EMPLOYEES', 'VIEW_ATTENDANCE', 'MANAGE_LEAVE')
        SET @HasPermission = 1
    ELSE IF @Role = 'Stock Manager' AND @Action IN ('MANAGE_INVENTORY', 'VIEW_DAMAGE_REPORTS')
        SET @HasPermission = 1
    ELSE IF @Role = 'Receiver' AND @Action IN ('MANAGE_DELIVERIES', 'PROCESS_RETURNS')
        SET @HasPermission = 1
    ELSE IF @Role = 'Auditor' AND @Action IN ('VIEW_AUDIT_TRAIL', 'VIEW_ALL_DATA')
        SET @HasPermission = 1
    
    RETURN @HasPermission
END; 