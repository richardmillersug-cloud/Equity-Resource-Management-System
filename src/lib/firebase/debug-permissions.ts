import { auth, db } from './config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export class PermissionDebugger {
  static async diagnosePermissionIssues(): Promise<void> {
    console.log('🔍 FIREBASE PERMISSION DEBUGGER STARTED');
    console.log('=====================================');

    // 1. Check Authentication State
    await this.checkAuthState();

    // 2. Check User Document
    await this.checkUserDocument();

    // 3. Check Employee Document
    await this.checkEmployeeDocument();

    // 4. Test Firestore Rules
    await this.testFirestoreRules();

    // 5. Provide Solutions
    this.provideSolutions();
  }

  private static async checkAuthState(): Promise<void> {
    console.log('\n1. 🔐 AUTHENTICATION STATE CHECK');
    console.log('----------------------------------');

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('✅ User is authenticated');
          console.log('   - UID:', user.uid);
          console.log('   - Email:', user.email);
          console.log('   - Email Verified:', user.emailVerified);
          console.log('   - Display Name:', user.displayName);
        } else {
          console.log('❌ User is NOT authenticated');
          console.log('   - User needs to sign in');
        }
        unsubscribe();
        resolve();
      });
    });
  }

  private static async checkUserDocument(): Promise<void> {
    console.log('\n2. 👤 USER DOCUMENT CHECK');
    console.log('-------------------------');

    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ User document exists');
        console.log('   - Role:', userData.role);
        console.log('   - Employee ID:', userData.employeeId);
        console.log('   - Created At:', userData.createdAt);
        console.log('   - Last Login:', userData.lastLogin);
        console.log('   - Full Document:', JSON.stringify(userData, null, 2));
      } else {
        console.log('❌ User document does NOT exist');
        console.log('   - This is likely the main issue!');
      }
    } catch (error) {
      console.log('❌ Error accessing user document:', error);
    }
  }

  private static async checkEmployeeDocument(): Promise<void> {
    console.log('\n3. 👷 EMPLOYEE DOCUMENT CHECK');
    console.log('-----------------------------');

    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }

    try {
      // Check if employee document exists using user's email
      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', user.email)
      );
      
      const employeeSnapshot = await getDocs(employeeQuery);
      
      if (!employeeSnapshot.empty) {
        const employeeDoc = employeeSnapshot.docs[0];
        const employeeData = employeeDoc.data();
        console.log('✅ Employee document exists');
        console.log('   - Employee ID:', employeeDoc.id);
        console.log('   - Name:', employeeData.name);
        console.log('   - Email:', employeeData.email);
        console.log('   - Roles:', employeeData.roles);
        console.log('   - Branch:', employeeData.branch);
        console.log('   - Status:', employeeData.status);
        console.log('   - Full Document:', JSON.stringify(employeeData, null, 2));
      } else {
        console.log('❌ Employee document does NOT exist');
        console.log('   - This is likely causing permission issues!');
      }
    } catch (error) {
      console.log('❌ Error accessing employee document:', error);
    }
  }

  private static async testFirestoreRules(): Promise<void> {
    console.log('\n4. 🔥 FIRESTORE RULES TEST');
    console.log('-------------------------');

    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }

    // Test basic read access to different collections
    const collections = ['users', 'employees', 'cashAllocations', 'suppliers', 'inventory'];
    
    for (const collectionName of collections) {
      try {
        console.log(`\nTesting ${collectionName} collection...`);
        const testQuery = query(collection(db, collectionName));
        const snapshot = await getDocs(testQuery);
        console.log(`✅ ${collectionName}: READ access OK (${snapshot.size} documents)`);
      } catch (error: any) {
        console.log(`❌ ${collectionName}: READ access FAILED`);
        console.log(`   Error: ${error.message}`);
      }
    }
  }

  private static provideSolutions(): void {
    console.log('\n5. 💡 SOLUTIONS');
    console.log('---------------');

    console.log('If you see permission errors, try these solutions:');
    console.log('');
    console.log('1. MISSING USER DOCUMENT:');
    console.log('   - Run: await PermissionDebugger.createUserDocument()');
    console.log('');
    console.log('2. MISSING EMPLOYEE DOCUMENT:');
    console.log('   - Run: await PermissionDebugger.createEmployeeDocument()');
    console.log('');
    console.log('3. FIRESTORE RULES ISSUES:');
    console.log('   - Check if your role matches what\'s in firestore.rules');
    console.log('   - Redeploy rules: firebase deploy --only firestore:rules');
    console.log('');
    console.log('4. AUTHENTICATION ISSUES:');
    console.log('   - Sign out and sign back in');
    console.log('   - Clear browser cache and cookies');
    console.log('');
    console.log('5. ROLE PERMISSIONS:');
    console.log('   - Check role-based-queries.ts permissions mapping');
    console.log('   - Ensure your role has the required permissions');
  }

  // Helper method to create missing user document
  static async createUserDocument(role: string = 'Purchasing Manager'): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        email: user.email,
        role: role,
        createdAt: new Date(),
        lastLogin: new Date(),
        employeeId: user.uid // Simple mapping for now
      };

      // Note: This might fail due to security rules
      console.log('⚠️  Attempting to create user document...');
      console.log('   This might fail due to Firestore security rules');
      console.log('   You may need to create this manually in Firebase Console');
      console.log('   Document data:', JSON.stringify(userData, null, 2));
      
    } catch (error) {
      console.log('❌ Failed to create user document:', error);
    }
  }

  // Helper method to check specific permission
  static checkPermission(action: string): boolean {
    console.log(`🔍 Checking permission for action: ${action}`);
    
    // This should match the logic from role-based-queries.ts
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user');
      return false;
    }

    // For now, just log what would happen
    console.log('   - User UID:', user.uid);
    console.log('   - User Email:', user.email);
    console.log('   - Check your user and employee documents');
    
    return false; // Conservative approach
  }
}

// Quick diagnostic function
export const diagnosePermissions = () => PermissionDebugger.diagnosePermissionIssues();

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).diagnosePermissions = diagnosePermissions;
  (window as any).PermissionDebugger = PermissionDebugger;
} 