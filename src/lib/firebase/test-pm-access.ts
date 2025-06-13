import { auth, db } from './config';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  getDocs,
  limit
} from 'firebase/firestore';

export class PMAccessTester {
  /**
   * Test all PM-related Firebase access
   */
  static async testAllAccess(): Promise<void> {
    console.log('🧪 TESTING PM ACCESS');
    console.log('====================');

    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user');
        return;
      }

      console.log(`📧 Testing access for: ${user.email}`);

      // Test 1: User document access
      await this.testUserAccess(user.uid);

      // Test 2: Employee document access
      await this.testEmployeeAccess(user.uid);

      // Test 3: Collections access
      await this.testCollectionsAccess();

      console.log('✅ PM ACCESS TEST COMPLETED');

    } catch (error) {
      console.error('❌ PM access test failed:', error);
    }
  }

  /**
   * Test user document access
   */
  private static async testUserAccess(uid: string): Promise<void> {
    console.log('\n1. 👤 Testing User Document Access');
    console.log('-----------------------------------');

    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ User document accessible');
        console.log(`   - Role: ${userData.role}`);
        console.log(`   - Permissions: ${Object.keys(userData.permissions || {}).length}`);
      } else {
        console.log('❌ User document does not exist');
      }
    } catch (error: any) {
      console.log(`❌ User document access failed: ${error.message}`);
    }
  }

  /**
   * Test employee document access
   */
  private static async testEmployeeAccess(uid: string): Promise<void> {
    console.log('\n2. 👷 Testing Employee Document Access');
    console.log('--------------------------------------');

    try {
      const employeeDoc = await getDoc(doc(db, 'employees', uid));
      
      if (employeeDoc.exists()) {
        const employeeData = employeeDoc.data();
        console.log('✅ Employee document accessible');
        console.log(`   - Name: ${employeeData.firstName} ${employeeData.lastName}`);
        console.log(`   - Roles: ${employeeData.roles?.length || 0}`);
        if (employeeData.roles?.[0]) {
          console.log(`   - Job Title: ${employeeData.roles[0].jobTitle}`);
          console.log(`   - Permissions: ${Object.keys(employeeData.roles[0].permissions || {}).length}`);
        }
      } else {
        console.log('❌ Employee document does not exist');
      }
    } catch (error: any) {
      console.log(`❌ Employee document access failed: ${error.message}`);
    }
  }

  /**
   * Test collections access
   */
  private static async testCollectionsAccess(): Promise<void> {
    console.log('\n3. 📊 Testing Collections Access');
    console.log('---------------------------------');

    const collections = [
      'invoices',
      'suppliers',
      'cashClose',
      'expenses',
      'chequeTracker',
      'installmentPlans',
      'cashAllocations',
      'fundAcknowledgment',
      'specialFundsTracker',
      'cashInjection'
    ];

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(query(collection(db, collectionName), limit(1)));
        console.log(`✅ ${collectionName}: Access OK (${snapshot.size} documents)`);
      } catch (error: any) {
        console.log(`❌ ${collectionName}: ${error.message}`);
      }
    }
  }

  /**
   * Quick health check
   */
  static async quickHealthCheck(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      // Test basic document access
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (!userDoc.exists() || !employeeDoc.exists()) {
        return false;
      }

      // Test one collection
      await getDocs(query(collection(db, 'invoices'), limit(1)));
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export convenience functions
export const testPMAccess = () => PMAccessTester.testAllAccess();
export const quickHealthCheck = () => PMAccessTester.quickHealthCheck();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).testPMAccess = testPMAccess;
  (window as any).quickHealthCheck = quickHealthCheck;
  (window as any).PMAccessTester = PMAccessTester;
} 