import { auth, db } from '../lib/firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  limit, 
  where,
  doc,
  getDoc
} from 'firebase/firestore';

export class PagePermissionTester {
  private static testResults: { [page: string]: { success: boolean; error?: string; collections?: string[] } } = {};

  /**
   * Test all dashboard pages for Firebase permission errors
   */
  static async testAllPages(): Promise<void> {
    console.log('🔍 FIREBASE PERMISSION PAGE TESTER');
    console.log('=================================');
    
    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user. Please sign in first.');
      return;
    }

    console.log(`📧 Testing permissions for: ${user.email}`);
    console.log(`🆔 User UID: ${user.uid}`);
    console.log('');

    // Test basic auth documents first
    await this.testBasicDocuments();
    
    // Test each dashboard page and its collections
    await this.testDashboardPages();
    
    // Print summary
    this.printSummary();
  }

  /**
   * Test basic user and employee documents
   */
  private static async testBasicDocuments(): Promise<void> {
    console.log('1. 📋 TESTING BASIC DOCUMENTS');
    console.log('------------------------------');
    
    const user = auth.currentUser!;
    
    try {
      // Test user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      console.log(userDoc.exists() ? '✅ User document: ACCESSIBLE' : '❌ User document: NOT FOUND');
      
      // Test employee document
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      console.log(employeeDoc.exists() ? '✅ Employee document: ACCESSIBLE' : '❌ Employee document: NOT FOUND');
      
      // Test employee query by email
      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', user.email),
        limit(1)
      );
      const employeeSnapshot = await getDocs(employeeQuery);
      console.log(!employeeSnapshot.empty ? '✅ Employee query: ACCESSIBLE' : '❌ Employee query: NO RESULTS');
      
    } catch (error: any) {
      console.log('❌ Basic documents test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test each dashboard page and associated collections
   */
  private static async testDashboardPages(): Promise<void> {
    console.log('2. 🏠 TESTING DASHBOARD PAGES');
    console.log('-----------------------------');
    
    const pageTests = [
      {
        page: '/dashboard/accountant',
        collections: ['cashAllocations', 'expenses', 'specialFundsTracker', 'cashClose']
      },
      {
        page: '/dashboard/purchase-manager',
        collections: ['invoices', 'invoicePayments', 'suppliers', 'cashAllocations', 'expenses']
      },
      {
        page: '/dashboard/hr',
        collections: ['employees', 'attendance', 'payroll', 'leaveRequests', 'barcodes']
      },
      {
        page: '/dashboard/receiver',
        collections: ['deliveries', 'returnNotes', 'damages', 'restockItems', 'invoices', 'suppliers']
      },
      {
        page: '/dashboard/admin',
        collections: ['users', 'employees', 'branches', 'settings', 'auditLogs']
      },
      {
        page: '/dashboard/auditor',
        collections: ['auditLogs', 'expenses', 'invoices', 'cashClose']
      },
      {
        page: '/dashboard/stock-manager',
        collections: ['inventory', 'restockItems', 'damages', 'barcodes']
      },
      {
        page: '/dashboard/manager',
        collections: ['employees', 'attendance', 'expenses', 'performance']
      }
    ];

    for (const test of pageTests) {
      await this.testPageCollections(test.page, test.collections);
    }
  }

  /**
   * Test collections for a specific page
   */
  private static async testPageCollections(page: string, collections: string[]): Promise<void> {
    console.log(`\n📄 Testing: ${page}`);
    console.log('   Collections to test:', collections.join(', '));
    
    const results = { success: true, collections: [], error: '' };
    
    for (const collectionName of collections) {
      try {
        const testQuery = query(collection(db, collectionName), limit(1));
        const snapshot = await getDocs(testQuery);
        console.log(`   ✅ ${collectionName}: OK (${snapshot.size} docs found)`);
        results.collections!.push(collectionName);
      } catch (error: any) {
        console.log(`   ❌ ${collectionName}: ${error.message}`);
        results.success = false;
        results.error = error.message;
        
        if (error.message.includes('Missing or insufficient permissions')) {
          console.log(`      💡 PERMISSION ERROR: This collection causes the Firebase error!`);
        }
      }
    }
    
    this.testResults[page] = results;
  }

  /**
   * Test specific collection with detailed error info
   */
  static async testCollection(collectionName: string): Promise<void> {
    console.log(`\n🔍 DETAILED TEST: ${collectionName} collection`);
    console.log('=' .repeat(50));
    
    try {
      // Test basic read
      console.log('Testing basic read access...');
      const testQuery = query(collection(db, collectionName), limit(5));
      const snapshot = await getDocs(testQuery);
      console.log(`✅ Read access: OK (${snapshot.size} documents)`);
      
      // Show sample data structure
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        console.log('📋 Sample document structure:');
        console.log('   Document ID:', firstDoc.id);
        console.log('   Fields:', Object.keys(firstDoc.data()));
      }
      
    } catch (error: any) {
      console.log('❌ Collection test failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error);
      
      if (error.message.includes('Missing or insufficient permissions')) {
        console.log('\n💡 PERMISSION ERROR DETECTED!');
        console.log('   This collection is causing Firebase permission errors.');
        console.log('   Possible solutions:');
        console.log('   1. Check Firestore rules for this collection');
        console.log('   2. Verify user role has access to this collection');
        console.log('   3. Run permission fix: debugUserData.fixAllPermissions()');
      }
    }
  }

  /**
   * Print summary of all test results
   */
  private static printSummary(): void {
    console.log('\n📊 PERMISSION TEST SUMMARY');
    console.log('==========================');
    
    const failed = Object.entries(this.testResults).filter(([_, result]) => !result.success);
    const passed = Object.entries(this.testResults).filter(([_, result]) => result.success);
    
    console.log(`✅ Pages working: ${passed.length}`);
    console.log(`❌ Pages with errors: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n🚨 PAGES WITH PERMISSION ERRORS:');
      failed.forEach(([page, result]) => {
        console.log(`   ${page}: ${result.error}`);
      });
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('1. Run: debugUserData.fixAllPermissions()');
      console.log('2. Or run: debugUserData.quickPermissionFix()');
      console.log('3. Check console for specific collection errors above');
    }
    
    if (passed.length > 0) {
      console.log('\n✅ WORKING PAGES:');
      passed.forEach(([page]) => {
        console.log(`   ${page}`);
      });
    }
  }

  /**
   * Get test results
   */
  static getResults() {
    return this.testResults;
  }

  /**
   * Reset test results
   */
  static resetResults() {
    this.testResults = {};
  }
}

// Make available globally for console access
if (typeof window !== 'undefined') {
  (window as any).PagePermissionTester = PagePermissionTester;
}

export default PagePermissionTester; 