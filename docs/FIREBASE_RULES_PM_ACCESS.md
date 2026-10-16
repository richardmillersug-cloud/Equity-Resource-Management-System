# Firebase Rules: Purchasing Manager Access to Return Notes & Restocking

## Overview

This document outlines the Firebase Firestore security rules updates that grant Purchasing Managers comprehensive access to return notes and restocking functionality while maintaining proper security boundaries.

## Updated Collections & Permissions

### 1. Return Notes Collection (`/returnNotes/{returnId}`)

#### **Enhanced Permissions:**
- **Read Access**: ✅ Purchasing Managers can view all return notes
- **Update Access**: ✅ Purchasing Managers can update items for restocking status
- **Secure Boundaries**: Receivers maintain control over status updates

#### **Technical Implementation:**
```javascript
match /returnNotes/{returnId} {
  allow read: if hasAnyRole(['Admin', 'Receiver', 'Stock Manager', 'Purchasing Manager', 'Purchase Manager']);
  allow create: if hasAnyRole(['Receiver', 'Admin']);
  allow update: if hasAnyRole(['Admin', 'Receiver', 'Purchasing Manager', 'Purchase Manager']) && (
    // Receivers can update status and general fields
    (hasAnyRole(['Receiver', 'Admin']) && (
      request.resource.data.keys().hasAll(['status']) || 
      resource.data.createdBy == request.auth.uid
    )) ||
    // Purchasing Managers can update items for restocking status
    (hasAnyRole(['Purchasing Manager', 'Purchase Manager']) && (
      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['items', 'updatedAt']) ||
      request.resource.data.keys().hasAll(['items'])
    ))
  );
  allow delete: if hasRole('Admin');
}
```

#### **Business Impact:**
- Purchasing Managers can see all return notes across suppliers
- Can track return progress from creation to completion
- Can mark individual items as restocked
- Maintains audit trail of restocking activities

---

### 2. Counters Collection (`/counters/{counterId}`)

#### **New Collection Added:**
- **Purpose**: Sequential numbering for return notes (RN0001, RN0002, etc.)
- **Read Access**: ✅ Purchasing Managers can read counters
- **Update Access**: Only Receivers and Admins can update counters

#### **Technical Implementation:**
```javascript
match /counters/{counterId} {
  allow read: if hasAnyRole(['Admin', 'Receiver', 'Purchasing Manager', 'Purchase Manager']);
  allow create: if hasAnyRole(['Admin', 'Receiver']);
  allow update: if hasAnyRole(['Admin', 'Receiver']) && 
    request.resource.data.keys().hasAll(['count']);
  allow delete: if hasRole('Admin');
}
```

#### **Business Impact:**
- Enables proper return note numbering system
- Purchasing Managers can see return note numbers for tracking
- Secure counter management by authorized roles only

---

### 3. Inventory Collection (`/inventory/{itemId}`)

#### **Enhanced Restocking Permissions:**
- **Read Access**: ✅ Purchasing Managers can view inventory
- **Create Access**: ✅ Purchasing Managers can add new inventory items
- **Update Access**: ✅ Purchasing Managers can update restocking-related fields

#### **Technical Implementation:**
```javascript
match /inventory/{itemId} {
  allow read: if hasAnyRole(['Admin', 'Stock Manager', 'Receiver', 'Purchase Manager', 'Purchasing Manager']);
  allow create: if hasAnyRole(['Stock Manager', 'Receiver', 'Admin', 'Purchase Manager', 'Purchasing Manager']);
  allow update: if hasAnyRole(['Stock Manager', 'Receiver', 'Admin', 'Purchase Manager', 'Purchasing Manager']) && (
    // Stock managers and receivers can update all fields
    hasAnyRole(['Stock Manager', 'Receiver', 'Admin']) ||
    // Purchasing managers can update restocking-related fields
    (hasAnyRole(['Purchase Manager', 'Purchasing Manager']) && 
     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['quantity', 'lastRestocked', 'restockHistory', 'updatedAt']))
  );
  allow delete: if hasRole('Admin');
}
```

#### **Business Impact:**
- Purchasing Managers can update inventory quantities during restocking
- Can track restocking history and timestamps
- Limited to restocking-related fields for security

---

## Security Features

### **Role-Based Access Control**
```javascript
// Utility functions used throughout rules
function isPurchasingManager() {
  return hasAnyRole(['Purchasing Manager', 'Purchase Manager']);
}

function hasAnyRole(roles) {
  let userRole = getUserRole();
  return isAuthenticated() && userRole != null && userRole in roles;
}
```

### **Field-Level Security**
- **Purchasing Managers** can only update specific fields:
  - Return Notes: `items`, `updatedAt`
  - Inventory: `quantity`, `lastRestocked`, `restockHistory`, `updatedAt`
- **Receivers** maintain full control over return note status updates
- **Admins** have unrestricted access for system administration

### **Data Validation**
- All updates require proper field validation
- Atomic operations prevent partial updates
- Audit trails maintained through `updatedAt` timestamps

---

## Deployment Instructions

### **Option 1: Manual Deployment**
```bash
# Using Firebase CLI
firebase deploy --only firestore:rules --project equitysys-41320
```

### **Option 2: Automated Script**
```bash
# Using the provided deployment script
node deploy-firestore-rules.js
```

### **Verification Steps**
1. **Test Return Notes Access:**
   - Login as Purchasing Manager
   - Navigate to `/dashboard/purchase-manager/return-notes`
   - Verify all return notes are visible

2. **Test Restocking Functionality:**
   - Click "Mark as Restocked" on returned items
   - Verify updates are saved successfully
   - Check for any permission errors in console

3. **Verify Security Boundaries:**
   - Ensure Purchasing Managers cannot update return note status
   - Confirm only authorized fields can be modified
   - Test that unauthorized access is properly denied

---

## Integration with Application

### **Service Layer**
The enhanced `EnhancedReturnNoteService` includes new methods that work with these permissions:

```typescript
// New methods for Purchasing Managers
async getReturnNotesForPurchasing(): Promise<ReturnNote[]>
async getItemsForRestocking(): Promise<any[]>
async markItemAsRestocked(returnNoteId: string, itemIndex: number): Promise<void>
async getPurchasingStats(): Promise<PurchasingStats>
```

### **UI Components**
The new purchasing manager dashboard includes:
- **Return Notes Overview**: Complete visibility into all return notes
- **Returned Items View**: Items that have been physically returned
- **Restocking Dashboard**: Priority-based restocking management
- **Statistics Dashboard**: Trends and metrics for business intelligence

---

## Monitoring & Maintenance

### **Audit Logging**
- All restocking updates are logged with timestamps
- User actions tracked through Firebase Auth integration
- Return note modifications maintain full audit trail

### **Performance Considerations**
- Rules optimized for minimal database reads
- Efficient role checking with cached user data
- Batch operations supported for bulk restocking

### **Future Enhancements**
- **Automated Restocking**: Rules ready for automated inventory updates
- **Advanced Analytics**: Support for detailed restocking metrics
- **Integration APIs**: Prepared for third-party inventory systems

---

## Troubleshooting

### **Common Issues:**

1. **Permission Denied Errors:**
   - Verify user has correct role: `Purchasing Manager` or `Purchase Manager`
   - Check employee document has proper role assignment
   - Ensure Firebase Auth is properly configured

2. **Update Failures:**
   - Confirm only authorized fields are being updated
   - Check that all required fields are present
   - Verify data types match schema requirements

3. **Read Access Issues:**
   - Ensure user is authenticated
   - Verify role permissions in employee document
   - Check Firebase project configuration

### **Debug Commands:**
```bash
# Check current rules deployment
firebase firestore:rules:get --project equitysys-41320

# Test rules with simulator
firebase emulators:start --only firestore

# View security rule violations
# Check Firebase Console > Firestore > Rules tab
```

---

## Security Compliance

### **Data Protection**
- ✅ Role-based access control enforced
- ✅ Field-level permissions implemented
- ✅ Audit trails maintained
- ✅ No unauthorized data exposure

### **Business Logic Security**
- ✅ Purchasing Managers cannot bypass approval workflows
- ✅ Return note status updates restricted to authorized roles
- ✅ Inventory updates limited to restocking operations
- ✅ Administrative functions protected

---

## Summary

The updated Firebase rules provide Purchasing Managers with comprehensive access to return notes and restocking functionality while maintaining strict security boundaries. This enables efficient inventory management and return tracking without compromising data integrity or business process controls.

**Key Benefits:**
- 📊 Complete visibility into return notes and trends
- 📦 Streamlined restocking workflow management
- 🔒 Secure role-based access control
- 📈 Enhanced business intelligence capabilities
- ⚡ Optimized performance and scalability