# Firestore Page Connection Guide

## Quick Start: Connect Any Page to Firestore

### 1. Basic Page Setup

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { authService } from '../../../lib/firebase/auth';
import { bulletproofServices } from '../../../lib/firebase/firestore-service-fixed';

export default function YourPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadData = async () => {
    try {
      const result = await bulletproofServices.yourService.getAll();
      setData(result);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? 'Loading...' : `Found ${data.length} items`}
    </div>
  );
}
```

### 2. Available Services

```typescript
// CSV and Analytics
bulletproofServices.storedCSV        // Stored CSV files
bulletproofServices.productSales     // Product sales data
bulletproofServices.salesAnalytics   // Sales analytics reports

// Purchase Manager
bulletproofServices.suppliers        // Supplier management
bulletproofServices.invoices         // Invoice management
bulletproofServices.payments         // Payment tracking
bulletproofServices.expenses         // Expense management

// HR
bulletproofServices.employees        // Employee management
bulletproofServices.attendance       // Attendance tracking
bulletproofServices.leaveRequests    // Leave requests
bulletproofServices.payroll          // Payroll management

// Receiver
bulletproofServices.deliveries       // Delivery management
bulletproofServices.returnNotes      // Return notes
bulletproofServices.damages          // Damage reports
bulletproofServices.restockItems     // Restock items

// General
bulletproofServices.branches         // Branch management
bulletproofServices.auditLogs        // Audit logs
bulletproofServices.notifications    // Notifications
```

### 3. Common Operations

#### Load All Data
```typescript
const data = await bulletproofServices.expenses.getAll();
```

#### Create New Item
```typescript
const newItem = {
  name: 'Example',
  amount: 5000,
  createdBy: currentUser.uid
};
const id = await bulletproofServices.expenses.create(newItem);
```

#### Update Item
```typescript
await bulletproofServices.expenses.update(itemId, {
  name: 'Updated Name',
  amount: 6000
});
```

#### Delete Item
```typescript
await bulletproofServices.expenses.delete(itemId);
```

#### Get by ID
```typescript
const item = await bulletproofServices.expenses.getById(itemId);
```

#### Filter Data
```typescript
const activeItems = await bulletproofServices.expenses.getWhere({
  status: 'active'
});
```

#### Get by Date Range
```typescript
const recentItems = await bulletproofServices.expenses.getByDateRange(
  'createdAt',
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

### 4. Real-time Subscriptions

```typescript
useEffect(() => {
  const unsubscribe = bulletproofServices.expenses.subscribeToCollection(
    (newData) => {
      setData(newData);
    },
    (error) => {
      console.error('Subscription error:', error);
    }
  );

  return unsubscribe; // Cleanup on component unmount
}, []);
```

### 5. Error Handling

```typescript
const handleOperation = async () => {
  try {
    await bulletproofServices.expenses.create(newItem);
    setSuccess('Item created successfully!');
  } catch (error) {
    console.error('Operation failed:', error);
    setError(`Failed to create item: ${error.message}`);
  }
};
```

### 6. Complete CRUD Example

```tsx
export default function CRUDPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', amount: 0 });

  // Load data
  const loadItems = async () => {
    const data = await bulletproofServices.expenses.getAll();
    setItems(data);
    setLoading(false);
  };

  // Create
  const handleCreate = async () => {
    await bulletproofServices.expenses.create(formData);
    loadItems(); // Refresh
    setFormData({ name: '', amount: 0 }); // Reset form
  };

  // Update
  const handleUpdate = async (id, updates) => {
    await bulletproofServices.expenses.update(id, updates);
    loadItems(); // Refresh
  };

  // Delete
  const handleDelete = async (id) => {
    await bulletproofServices.expenses.delete(id);
    loadItems(); // Refresh
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

### 7. Service-Specific Examples

#### CSV Data
```typescript
// Get stored CSV files
const csvFiles = await bulletproofServices.storedCSV.getAll();

// Get files by month
const monthFiles = await bulletproofServices.storedCSV.getCSVFilesByMonth(12, 2024);

// Store new CSV
const csvId = await bulletproofServices.storedCSV.storeCSVFile(
  'sales-data.csv',
  csvContent,
  12, // month
  2024, // year
  currentUser.uid
);
```

#### Employees
```typescript
// Get all employees
const employees = await bulletproofServices.employees.getAll();

// Get by role
const managers = await bulletproofServices.employees.getWhere({
  role: 'Manager'
});

// Get by branch
const branchEmployees = await bulletproofServices.employees.getWhere({
  branchId: 'branch-123'
});
```

#### Invoices
```typescript
// Get all invoices
const invoices = await bulletproofServices.invoices.getAll();

// Get by supplier
const supplierInvoices = await bulletproofServices.invoices.getWhere({
  supplierId: 'supplier-123'
});

// Get pending invoices
const pendingInvoices = await bulletproofServices.invoices.getWhere({
  status: 'pending'
});
```

### 8. Authentication Patterns

```typescript
// Check if user is authenticated
const user = await authService.getCurrentUser();
if (!user) {
  router.push('/auth');
  return;
}

// Use user ID in operations
const newItem = {
  ...itemData,
  createdBy: user.uid,
  updatedBy: user.uid
};
```

### 9. Pagination (for large datasets)

```typescript
const [lastDoc, setLastDoc] = useState(null);
const [hasMore, setHasMore] = useState(true);

const loadMoreData = async () => {
  const result = await bulletproofServices.expenses.getPaginated(
    10, // limit
    lastDoc // startAfter
  );
  
  setItems(prev => [...prev, ...result.data]);
  setLastDoc(result.lastDoc);
  setHasMore(result.hasMore);
};
```

### 10. Bulk Operations

```typescript
// Bulk create
const newItems = [
  { name: 'Item 1', amount: 1000 },
  { name: 'Item 2', amount: 2000 },
  { name: 'Item 3', amount: 3000 }
];

await bulletproofServices.expenses.bulkCreate(newItems);

// Bulk update
const updates = [
  { id: 'item1', updates: { amount: 1500 } },
  { id: 'item2', updates: { amount: 2500 } }
];

await bulletproofServices.expenses.bulkUpdate(updates);
```

## Quick Reference

- **Template File**: `src/app/dashboard/example-firestore-page/page.tsx`
- **Utility File**: `src/utils/firestorePageTemplate.ts`
- **Main Service**: `bulletproofServices` from `src/lib/firebase/firestore-service-fixed.ts`
- **Auth Service**: `authService` from `src/lib/firebase/auth.ts`

## Need Help?

1. Check existing pages in `src/app/dashboard/` for real examples
2. Look at `src/lib/firebase/firestore-service-fixed.ts` for available methods
3. Use the template files as starting points
4. Follow the authentication patterns from existing pages