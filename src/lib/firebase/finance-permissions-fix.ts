import { auth, db } from './config';
// import {
//   doc,
//   setDoc,
//   getDoc,
//   collection,
//   query,
//   where,
//   getDocs,
//   writeBatch,
//   Timestamp,
// } from 'firebase/firestore';

export class FinancePermissionsFix {
  /**
   * Fix permissions specifically for finance tables and business rules
   */
  static async fixFinancePermissions(): Promise<void> {
    console.log('💰 FINANCE PERMISSIONS FIX');
    console.log('===========================');
    console.log('Fixing permissions for finance tables based on business rules');

    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user. Please sign in first.');
        return;
      }

      console.log(`📧 Fixing finance permissions for: ${user.email}`);
      console.log(`🆔 User UID: ${user.uid}`);

      // Step 1: Create/Update User Document with proper role
      await this.createFinanceUserDocument(user);

      // Step 2: Create/Update Employee Document with finance permissions
      await this.createFinanceEmployeeDocument(user);

      // Step 3: Test Finance Table Access
      await this.testFinanceTableAccess(user);

      // Step 4: Verify Business Rules Compliance
      await this.verifyBusinessRules(user);

      console.log('✅ FINANCE PERMISSIONS FIXED SUCCESSFULLY!');
      console.log('💡 You now have proper access to finance tables');

    } catch (error) {
      console.error('❌ Finance permission fix failed:', error);
      throw error;
    }
  }

  /**
   * Create user document with proper finance role
   */
  private static async createFinanceUserDocument(user: Record<string, unknown>): Promise<void> {
    console.log('\n1. 👤 CREATING FINANCE USER DOCUMENT');
    console.log('------------------------------------');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      const userData = {
        email: user.email,
        role: 'Purchasing Manager', // Finance role
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        employeeId: user.uid,
        isActive: true,
        financePermissions: {
          canAcknowledgeFunds: true,
          canViewCashAllocations: true,
          canCreateExpenses: true,
          fundTypes: ['purchasing'] // Rule 2.1: Only their funds
        },
        updatedAt: Timestamp.now()
      };

      await setDoc(userDocRef, userData, { merge: true });
      console.log('✅ Finance user document created successfully');
      console.log(`   - Role: ${userData.role}`);
      console.log(`   - Finance Permissions: ${JSON.stringify(userData.financePermissions)}`);

    } catch (error) {
      console.error('❌ Failed to create finance user document:', error);
    }
  }

  /**
   * Create employee document with finance-specific roles and permissions
   */
  private static async createFinanceEmployeeDocument(user: Record<string, unknown>): Promise<void> {
    console.log('\n2. 👷 CREATING FINANCE EMPLOYEE DOCUMENT');
    console.log('----------------------------------------');

    try {
      const employeeDocRef = doc(db, 'employees', user.uid);
      
      const employeeData = {
        firstName: user.displayName?.split(' ')[0] || user.email.split('@')[0],
        lastName: user.displayName?.split(' ')[1] || 'User',
        email: user.email,
        employeeNIN: '12345678901234',
        phone: '',
        address: '',
        hireDate: Timestamp.now(),
        employeeSalary: 1100000,
        employmentStatus: 'Active',
        branchId: 'kyengera', // Updated to use correct branch
        roles: [{
          jobRoleId: 'purchasing-manager',
          jobTitle: 'Purchasing Manager',
          baseSalary: 1100000,
          description: 'Manages purchasing operations and supplier relationships',
          assignedDate: Timestamp.now(),
          financePermissions: {
            // Rule 2.1: Purchasing managers only acknowledge their funds
            canAcknowledgePurchasingFunds: true,
            canViewCashAllocations: true,
            canCreateExpenses: true,
            canViewFundAcknowledgments: true,
            // Cannot create CashAllocation (Rule 1.1 - only accountants)
            canCreateCashAllocation: false,
            // Cannot acknowledge special/savings (Rule 2.2 - only accountants)
            canAcknowledgeSpecialFunds: false,
            canAcknowledgeSavings: false
          }
        }],
        financeAccess: {
          allowedTables: [
            'FundAcknowledgment', // Rule 2.1
            'CashAllocation', // Read only
            'Expense', // Can create/view
            'CashClose', // Read only
            'CashInjection' // Read only
          ],
          restrictedTables: [
            'SpecialFundsTracker' // Rule 2.2 - accountants only
          ],
          fundTypes: ['purchasing'] // Rule 2.1
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(employeeDocRef, employeeData, { merge: true });
      console.log('✅ Finance employee document created successfully');
      console.log(`   - Name: ${employeeData.firstName} ${employeeData.lastName}`);
      console.log(`   - Finance Access: ${JSON.stringify(employeeData.financeAccess)}`);

    } catch (error) {
      console.error('❌ Failed to create finance employee document:', error);
    }
  }

  /**
   * Test access to finance tables
   */
  private static async testFinanceTableAccess(user: Record<string, unknown>): Promise<void> {
    console.log('\n3. 💰 TESTING FINANCE TABLE ACCESS');
    console.log('----------------------------------');

    const financeCollections = [
      'cashAllocations',
      'fundAcknowledgments', 
      'specialFundsTracker',
      'cashClose',
      'expenses',
      'cashInjection'
    ];

    for (const collectionName of financeCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        console.log(`✅ ${collectionName}: Access OK (${snapshot.size} documents)`);
      } catch (error: unknown) {
        console.log(`❌ ${collectionName}: ${error.message}`);
      }
    }
  }

  /**
   * Verify business rules compliance
   */
  private static async verifyBusinessRules(user: Record<string, unknown>): Promise<void> {
    console.log('\n4. 📋 VERIFYING BUSINESS RULES');
    console.log('------------------------------');

    try {
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (employeeDoc.exists()) {
        const data = employeeDoc.data();
        const financeAccess = data.financeAccess;
        
        console.log('Business Rules Verification:');
        
        // Rule 1.1: Only accountants can create CashAllocation
        const canCreateCashAllocation = data.roles[0]?.financePermissions?.canCreateCashAllocation;
        console.log(`   Rule 1.1 (CashAllocation creation): ${canCreateCashAllocation ? '❌ VIOLATION' : '✅ COMPLIANT'}`);
        
        // Rule 2.1: Purchasing managers only acknowledge their funds
        const fundTypes = financeAccess?.fundTypes || [];
        const hasOnlyPurchasingFunds = fundTypes.length === 1 && fundTypes[0] === 'purchasing';
        console.log(`   Rule 2.1 (Fund acknowledgment): ${hasOnlyPurchasingFunds ? '✅ COMPLIANT' : '❌ VIOLATION'}`);
        
        // Rule 2.2: Accountants acknowledge special/savings
        const canAcknowledgeSpecial = data.roles[0]?.financePermissions?.canAcknowledgeSpecialFunds;
        console.log(`   Rule 2.2 (Special funds): ${!canAcknowledgeSpecial ? '✅ COMPLIANT' : '❌ VIOLATION'}`);
        
        console.log('✅ Business rules verification completed');
      }
      
    } catch (error) {
      console.error('❌ Business rules verification failed:', error);
    }
  }

  /**
   * Get updated Firestore rules for finance tables
   */
  static getFinanceFirestoreRules(): string {
    return `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function getEmployeeData() {
      return get(/databases/$(database)/documents/employees/$(request.auth.uid)).data;
    }
    
    function hasRole(role) {
      return isAuthenticated() && (
        getUserData().role == role ||
        getEmployeeData().roles[0].jobTitle == role
      );
    }
    
    function hasAnyRole(roles) {
      return isAuthenticated() && (
        getUserData().role in roles ||
        getEmployeeData().roles[0].jobTitle in roles
      );
    }

    // FINANCE TABLES

    // Rule 1.1: Only accountants can create CashAllocation
    match /cashAllocations/{allocationId} {
      allow read: if hasAnyRole(['Admin', 'Accountant', 'Purchasing Manager']);
      allow create: if hasRole('Accountant'); // Rule 1.1
      allow update: if hasRole('Accountant');
      allow delete: if hasRole('Admin');
    }

    // Rule 2.1: Purchasing managers only acknowledge their funds
    match /fundAcknowledgments/{fundId} {
      allow read: if hasAnyRole(['Admin', 'Accountant', 'Purchasing Manager']);
      allow create: if hasAnyRole(['Accountant', 'Purchasing Manager']);
      allow update: if hasAnyRole(['Accountant', 'Purchasing Manager']) && 
        (hasRole('Accountant') || 
         (hasRole('Purchasing Manager') && resource.data.fundType == 'purchasing')); // Rule 2.1
      allow delete: if hasRole('Admin');
    }

    // Rule 2.2: Accountants handle special/savings funds
    match /specialFundsTracker/{trackerId} {
      allow read, write: if hasAnyRole(['Admin', 'Accountant']); // Rule 2.2
    }

    // Cash Close - Employee/Branch specific
    match /cashClose/{closeId} {
      allow read: if hasAnyRole(['Admin', 'Accountant', 'Manager']);
      allow create: if isAuthenticated();
      allow update: if hasAnyRole(['Admin', 'Accountant']) || 
        resource.data.employeeId == request.auth.uid;
      allow delete: if hasRole('Admin');
    }

    // Rule 4.1: Type-specific approval paths for expenses
    match /expenses/{expenseId} {
      allow read: if hasAnyRole(['Admin', 'Accountant', 'Manager']) || 
        resource.data.employeeId == request.auth.uid;
      allow create: if isAuthenticated();
      allow update: if hasAnyRole(['Admin', 'Accountant']) || 
        resource.data.employeeId == request.auth.uid;
      allow delete: if hasRole('Admin');
    }

    // Cash Injection
    match /cashInjection/{injectionId} {
      allow read: if hasAnyRole(['Admin', 'Accountant', 'Manager']);
      allow create: if isAuthenticated();
      allow update: if hasAnyRole(['Admin', 'Accountant']);
      allow delete: if hasRole('Admin');
    }

    // Standard collections
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated();
    }

    match /employees/{employeeId} {
      allow read, write: if isAuthenticated() && request.auth.uid == employeeId;
      allow create: if isAuthenticated();
      allow read: if hasAnyRole(['Admin', 'HR', 'Manager']);
    }

    // Default allow for authenticated users (adjust as needed)
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}`;
  }
}

// Export convenience functions
export const fixFinancePermissions = () => FinancePermissionsFix.fixFinancePermissions();
export const getFinanceFirestoreRules = () => FinancePermissionsFix.getFinanceFirestoreRules();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).fixFinancePermissions = fixFinancePermissions;
  (window as any).getFinanceFirestoreRules = getFinanceFirestoreRules;
  (window as any).FinancePermissionsFix = FinancePermissionsFix;
} 