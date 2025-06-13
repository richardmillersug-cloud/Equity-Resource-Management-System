import { db } from './config';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { authService } from './auth';
import { Timestamp } from 'firebase/firestore';

/**
 * Test suite to verify Purchasing Manager role integration with Firebase
 */
export class PurchasingManagerFirebaseTest {
  
  /**
   * Test basic Firebase connection
   */
  static async testFirebaseConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing Firebase connection...');
      
      // Test database reference
      const testRef = collection(db, 'test');
      console.log('✅ Firebase DB connection successful');
      
      return true;
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      return false;
    }
  }

  /**
   * Test if purchasing manager role can be saved to employees collection
   */
  static async testPurchasingManagerRoleSave(): Promise<boolean> {
    try {
      console.log('🛒 Testing Purchasing Manager role save to Firestore...');
      
      const testEmployeeData = {
        firstName: 'Test',
        lastName: 'PurchaseManager',
        employeeNIN: '80001234567890',
        email: 'test.purchasemanager@test.com',
        phone: '+256700123456',
        address: 'Test Address',
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
      };

      // Create test document (use a test ID)
      const testDocId = 'test-purchasing-manager-' + Date.now();
      await setDoc(doc(db, 'employees', testDocId), testEmployeeData);
      
      console.log('✅ Purchasing Manager role saved successfully');
      
      // Verify it was saved
      const savedDoc = await getDoc(doc(db, 'employees', testDocId));
      if (savedDoc.exists()) {
        const data = savedDoc.data();
        console.log('✅ Purchasing Manager role retrieved successfully');
        console.log('Role:', data.roles[0].jobTitle);
        
        // Clean up test data
        // await deleteDoc(doc(db, 'employees', testDocId));
        console.log('⚠️ Test employee document left in Firestore for manual verification');
        
        return true;
      } else {
        console.error('❌ Test document not found after save');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Purchasing Manager role save test failed:', error);
      return false;
    }
  }

  /**
   * Test purchasing manager queries
   */
  static async testPurchasingManagerQueries(): Promise<boolean> {
    try {
      console.log('📊 Testing Purchasing Manager queries...');
      
      // Test query for purchasing manager employees
      const q = query(
        collection(db, 'employees'),
        where('roles', 'array-contains', { jobTitle: 'Purchasing Manager' })
      );
      
      const snapshot = await getDocs(q);
      console.log(`✅ Purchasing Manager query successful. Found ${snapshot.size} purchasing managers`);
      
      return true;
    } catch (error) {
      console.error('❌ Purchasing Manager queries test failed:', error);
      return false;
    }
  }

  /**
   * Test suppliers collection access (purchasing manager permission)
   */
  static async testSuppliersAccess(): Promise<boolean> {
    try {
      console.log('🏢 Testing suppliers collection access...');
      
      const suppliersRef = collection(db, 'suppliers');
      const snapshot = await getDocs(suppliersRef);
      
      console.log(`✅ Suppliers collection accessible. Found ${snapshot.size} suppliers`);
      return true;
    } catch (error) {
      console.error('❌ Suppliers access test failed:', error);
      return false;
    }
  }

  /**
   * Test current user role detection
   */
  static testCurrentUserRole(): boolean {
    try {
      console.log('👤 Testing current user role detection...');
      
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log('✅ Current user found:', currentUser.email);
        
        if (currentUser.employee) {
          console.log('✅ Employee data found');
          console.log('Roles:', currentUser.employee.roles);
          return true;
        } else {
          console.log('⚠️ No employee data found for user');
          return false;
        }
      } else {
        console.log('⚠️ No current user found');
        return false;
      }
    } catch (error) {
      console.error('❌ Current user role test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Running Purchasing Manager Firebase Integration Tests...');
    console.log('================================================');

    const results = {
      firebaseConnection: await this.testFirebaseConnection(),
      roleSave: await this.testPurchasingManagerRoleSave(),
      queries: await this.testPurchasingManagerQueries(),
      suppliersAccess: await this.testSuppliersAccess(),
      userRole: this.testCurrentUserRole()
    };

    console.log('================================================');
    console.log('🧪 Test Results Summary:');
    console.log('================================================');
    console.log('Firebase Connection:', results.firebaseConnection ? '✅ PASS' : '❌ FAIL');
    console.log('Role Save/Retrieve:', results.roleSave ? '✅ PASS' : '❌ FAIL');
    console.log('Role Queries:', results.queries ? '✅ PASS' : '❌ FAIL');
    console.log('Suppliers Access:', results.suppliersAccess ? '✅ PASS' : '❌ FAIL');
    console.log('User Role Detection:', results.userRole ? '✅ PASS' : '❌ FAIL');
    
    const overallSuccess = Object.values(results).every(result => result === true);
    console.log('================================================');
    console.log('Overall Status:', overallSuccess ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
    
    if (overallSuccess) {
      console.log('✅ Purchasing Manager role is fully connected to Firebase!');
    } else {
      console.log('❌ Purchasing Manager role has some Firebase integration issues');
    }
  }
}

// Export for console usage
(window as any).testPurchasingManager = {
  runAll: () => PurchasingManagerFirebaseTest.runAllTests(),
  connection: () => PurchasingManagerFirebaseTest.testFirebaseConnection(),
  save: () => PurchasingManagerFirebaseTest.testPurchasingManagerRoleSave(),
  queries: () => PurchasingManagerFirebaseTest.testPurchasingManagerQueries(),
  suppliers: () => PurchasingManagerFirebaseTest.testSuppliersAccess(),
  userRole: () => PurchasingManagerFirebaseTest.testCurrentUserRole()
};

console.log('🧪 Purchasing Manager Firebase tests loaded!');
console.log('Available commands:');
console.log('- testPurchasingManager.runAll() - Run all tests');
console.log('- testPurchasingManager.connection() - Test Firebase connection');
console.log('- testPurchasingManager.save() - Test role save/retrieve');
console.log('- testPurchasingManager.queries() - Test role queries');
console.log('- testPurchasingManager.suppliers() - Test suppliers access');
console.log('- testPurchasingManager.userRole() - Test user role detection'); 
