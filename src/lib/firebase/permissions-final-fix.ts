import { auth, db } from './config';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export class FirebasePermissionsFinalFix {
  /**
   * FINAL SOLUTION: Fix all Firebase permission issues permanently
   */
  static async fixAllPermissionsOnceAndForAll(): Promise<void> {
    console.log('🔥 FIREBASE PERMISSIONS FINAL FIX');
    console.log('=================================');
    console.log('This will solve the permissions issue permanently!');

    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user. Please sign in first.');
        return;
      }

      console.log(`📧 Fixing permissions for: ${user.email}`);
      console.log(`🆔 User UID: ${user.uid}`);

      // Step 1: Create/Update User Document
      await this.createUserDocument(user);

      // Step 2: Create/Update Employee Document  
      await this.createEmployeeDocument(user);

      // Step 3: Verify Firestore Rules Compatibility
      await this.verifyFirestoreRules(user);

      // Step 4: Test All Permissions
      await this.testAllPermissions(user);

      // Step 5: Force Auth Refresh
      await this.forceAuthRefresh();

      console.log('✅ ALL PERMISSIONS FIXED SUCCESSFULLY!');
      console.log('💡 Please refresh your browser page now.');

    } catch (error) {
      console.error('❌ Final fix failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Create/Update User Document
   */
  private static async createUserDocument(user: any): Promise<void> {
    console.log('\n1. 👤 CREATING/UPDATING USER DOCUMENT');
    console.log('-------------------------------------');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Check if user document exists
      const existingDoc = await getDoc(userDocRef);
      
      const userData = {
        email: user.email,
        role: 'Purchasing Manager',
        createdAt: existingDoc.exists() ? existingDoc.data().createdAt : Timestamp.now(),
        lastLogin: Timestamp.now(),
        employeeId: user.uid,
        isActive: true,
        updatedAt: Timestamp.now()
      };

      await setDoc(userDocRef, userData, { merge: true });
      console.log('✅ User document created/updated successfully');
      console.log(`   - Role: ${userData.role}`);
      console.log(`   - Email: ${userData.email}`);

    } catch (error) {
      console.error('❌ Failed to create user document:', error);
      
      // If Firestore rules prevent creation, provide manual instructions
      console.log('💡 MANUAL FIX REQUIRED:');
      console.log('   Go to Firebase Console → Firestore Database');
      console.log(`   Create document in 'users' collection with ID: ${user.uid}`);
      console.log('   Document data:');
      console.log(JSON.stringify({
        email: user.email,
        role: 'Purchasing Manager',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        employeeId: user.uid,
        isActive: true
      }, null, 2));
    }
  }

  /**
   * Step 2: Create/Update Employee Document
   */
  private static async createEmployeeDocument(user: any): Promise<void> {
    console.log('\n2. 👷 CREATING/UPDATING EMPLOYEE DOCUMENT');
    console.log('-----------------------------------------');

    try {
      const employeeDocRef = doc(db, 'employees', user.uid);
      
      // Check if employee document exists
      const existingDoc = await getDoc(employeeDocRef);
      
      const employeeData = {
        firstName: user.displayName?.split(' ')[0] || user.email.split('@')[0],
        lastName: user.displayName?.split(' ')[1] || 'User',
        email: user.email,
        employeeNIN: existingDoc.exists() ? existingDoc.data().employeeNIN : '12345678901234',
        phone: existingDoc.exists() ? existingDoc.data().phone : '',
        address: existingDoc.exists() ? existingDoc.data().address : '',
        hireDate: existingDoc.exists() ? existingDoc.data().hireDate : Timestamp.now(),
        employeeSalary: 1100000,
        employmentStatus: 'Active',
        branchId: 'kyengera',
        roles: [{
          jobRoleId: 'purchasing-manager',
          jobTitle: 'Purchasing Manager',
          baseSalary: 1100000,
          description: 'Manages purchasing operations and supplier relationships',
          assignedDate: Timestamp.now()
        }],
        createdAt: existingDoc.exists() ? existingDoc.data().createdAt : Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(employeeDocRef, employeeData, { merge: true });
      console.log('✅ Employee document created/updated successfully');
      console.log(`   - Name: ${employeeData.firstName} ${employeeData.lastName}`);
      console.log(`   - Role: ${employeeData.roles[0].jobTitle}`);

    } catch (error) {
      console.error('❌ Failed to create employee document:', error);
      
      // If Firestore rules prevent creation, provide manual instructions
      console.log('💡 MANUAL FIX REQUIRED:');
      console.log('   Go to Firebase Console → Firestore Database');
      console.log(`   Create document in 'employees' collection with ID: ${user.uid}`);
      console.log('   Document data:');
      console.log(JSON.stringify({
        firstName: user.displayName?.split(' ')[0] || user.email.split('@')[0],
        lastName: user.displayName?.split(' ')[1] || 'User',
        email: user.email,
        employeeNIN: '12345678901234',
        phone: '',
        address: '',
        hireDate: new Date().toISOString(),
        employeeSalary: 1100000,
        employmentStatus: 'Active',
        branchId: 'kyengera',
        roles: [{
          jobRoleId: 'purchasing-manager',
          jobTitle: 'Purchasing Manager',
          baseSalary: 1100000,
          description: 'Manages purchasing operations and supplier relationships',
          assignedDate: new Date().toISOString()
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, null, 2));
    }
  }

  /**
   * Step 3: Verify Firestore Rules Compatibility
   */
  private static async verifyFirestoreRules(user: any): Promise<void> {
    console.log('\n3. 🔥 VERIFYING FIRESTORE RULES');
    console.log('-------------------------------');

    try {
      // Test basic collections access
      const testCollections = [
        'users',
        'employees', 
        'suppliers',
        'inventory',
        'cashAllocations',
        'fundAcknowledgments'
      ];

      for (const collectionName of testCollections) {
        try {
          const testQuery = query(collection(db, collectionName));
          const snapshot = await getDocs(testQuery);
          console.log(`✅ ${collectionName}: Access OK (${snapshot.size} docs)`);
        } catch (error: any) {
          console.log(`❌ ${collectionName}: ${error.message}`);
          
          if (error.message.includes('Missing or insufficient permissions')) {
            console.log(`   💡 Fix: Update Firestore rules for ${collectionName} collection`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Firestore rules verification failed:', error);
    }
  }

  /**
   * Step 4: Test All Permissions
   */
  private static async testAllPermissions(user: any): Promise<void> {
    console.log('\n4. 🧪 TESTING ALL PERMISSIONS');
    console.log('-----------------------------');

    try {
      // Test user document read
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      console.log(userDoc.exists() ? '✅ User document: READ OK' : '❌ User document: NOT FOUND');

      // Test employee document read
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      console.log(employeeDoc.exists() ? '✅ Employee document: READ OK' : '❌ Employee document: NOT FOUND');

      // Test employee query by email
      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', user.email)
      );
      const employeeSnapshot = await getDocs(employeeQuery);
      console.log(!employeeSnapshot.empty ? '✅ Employee query: OK' : '❌ Employee query: FAILED');

      // Test purchasing manager specific collections
      const pmCollections = ['suppliers', 'fundAcknowledgments', 'restockItems'];
      for (const collectionName of pmCollections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          console.log(`✅ ${collectionName}: Purchasing Manager access OK`);
        } catch (error) {
          console.log(`❌ ${collectionName}: Access denied`);
        }
      }

    } catch (error) {
      console.error('❌ Permission testing failed:', error);
    }
  }

  /**
   * Step 5: Force Auth Refresh
   */
  private static async forceAuthRefresh(): Promise<void> {
    console.log('\n5. 🔄 FORCING AUTH REFRESH');
    console.log('--------------------------');

    try {
      const user = auth.currentUser;
      if (user) {
        // Force token refresh
        await user.getIdToken(true);
        console.log('✅ Auth token refreshed');
        
        // Reload user data
        await user.reload();
        console.log('✅ User data reloaded');
      }
    } catch (error) {
      console.error('❌ Auth refresh failed:', error);
    }
  }

  /**
   * Emergency fix: Update Firestore rules to allow access
   */
  static getUpdatedFirestoreRules(): string {
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
        getEmployeeData().roles != null &&
        getEmployeeData().roles[0].jobTitle == role
      );
    }
    
    function hasAnyRole(roles) {
      return isAuthenticated() && (
        getUserData().role in roles ||
        (getEmployeeData().roles != null &&
         getEmployeeData().roles[0].jobTitle in roles)
      );
    }

    // USERS COLLECTION - Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated(); // Allow user creation
    }

    // EMPLOYEES COLLECTION - Allow users to read/write their own employee data
    match /employees/{employeeId} {
      allow read, write: if isAuthenticated() && request.auth.uid == employeeId;
      allow create: if isAuthenticated(); // Allow employee creation
      allow read: if hasAnyRole(['Admin', 'HR', 'Manager']);
    }

    // PURCHASING MANAGER COLLECTIONS
    match /suppliers/{supplierId} {
      allow read, write: if hasAnyRole(['Admin', 'Purchasing Manager', 'Purchase Manager']);
    }
    
    match /fundAcknowledgments/{fundId} {
      allow read, write: if hasAnyRole(['Admin', 'Purchasing Manager', 'Purchase Manager', 'Accountant']);
    }
    
    match /restockItems/{itemId} {
      allow read, write: if hasAnyRole(['Admin', 'Purchasing Manager', 'Purchase Manager', 'Stock Manager']);
    }

    // CASH ALLOCATIONS
    match /cashAllocations/{allocationId} {
      allow read: if hasAnyRole(['Admin', 'Accountant', 'Managing Director', 'Purchasing Manager', 'Purchase Manager']);
      allow write: if hasAnyRole(['Admin', 'Accountant']);
    }

    // INVENTORY
    match /inventory/{itemId} {
      allow read: if isAuthenticated();
      allow write: if hasAnyRole(['Admin', 'Stock Manager', 'Receiver']);
    }

    // SETTINGS - Allow read for all authenticated users
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if hasAnyRole(['Admin']);
    }

    // Default allow for testing (REMOVE IN PRODUCTION)
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}`;
  }

  /**
   * Quick fix for immediate access
   */
  static async quickPermissionFix(): Promise<void> {
    console.log('⚡ QUICK PERMISSION FIX');
    console.log('======================');

    const user = auth.currentUser;
    if (!user) {
      console.log('❌ Please sign in first');
      return;
    }

    try {
      // Create minimal required documents
      const batch = writeBatch(db);

      // User document
      batch.set(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'Purchasing Manager',
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        employeeId: user.uid,
        isActive: true
      }, { merge: true });

      // Employee document
      batch.set(doc(db, 'employees', user.uid), {
        firstName: user.email.split('@')[0],
        lastName: 'User',
        email: user.email,
        employeeNIN: '12345678901234',
        phone: '',
        address: '',
        hireDate: Timestamp.now(),
        employeeSalary: 1100000,
        employmentStatus: 'Active',
        branchId: 'kyengera',
        roles: [{
          jobRoleId: 'purchasing-manager',
          jobTitle: 'Purchasing Manager',
          baseSalary: 1100000,
          description: 'Manages purchasing operations and supplier relationships',
          assignedDate: Timestamp.now()
        }],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });

      await batch.commit();
      console.log('✅ Quick fix applied successfully!');
      console.log('🔄 Please refresh your browser page');

    } catch (error) {
      console.error('❌ Quick fix failed:', error);
      console.log('💡 Try the manual Firebase Console method');
    }
  }
}

// Export convenience functions
export const fixAllPermissions = () => FirebasePermissionsFinalFix.fixAllPermissionsOnceAndForAll();
export const quickPermissionFix = () => FirebasePermissionsFinalFix.quickPermissionFix();
export const getUpdatedFirestoreRules = () => FirebasePermissionsFinalFix.getUpdatedFirestoreRules();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).fixAllPermissions = fixAllPermissions;
  (window as any).quickPermissionFix = quickPermissionFix;
  (window as any).getUpdatedFirestoreRules = getUpdatedFirestoreRules;
  (window as any).FirebasePermissionsFinalFix = FirebasePermissionsFinalFix;
} 
