import { auth, db } from './config';
// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   deleteDoc,
//   doc,
//   writeBatch,
//   getDoc,
// } from 'firebase/firestore';
import { deleteUser, signInWithEmailAndPassword } from 'firebase/auth';

export class PurchasingManagerCleanup {
  /**
   * Clean up all existing purchasing manager users from both Auth and Firestore
   */
  static async cleanupAllPurchasingManagers(): Promise<void> {
    console.log('🧹 CLEANING UP PURCHASING MANAGER USERS');
    console.log('======================================');

    try {
      // Step 1: Find all purchasing manager employees in Firestore
      await this.cleanupFirestoreEmployees();
      
      // Step 2: Clean up user documents
      await this.cleanupUserDocuments();
      
      // Step 3: Test Firestore connection
      await this.testFirestoreConnection();
      
      console.log('✅ Cleanup completed successfully!');
      console.log('💡 You can now create new purchasing manager accounts');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean up employee documents with purchasing manager role
   */
  private static async cleanupFirestoreEmployees(): Promise<void> {
    console.log('\n1. 🗑️ CLEANING FIRESTORE EMPLOYEES');
    console.log('----------------------------------');

    try {
      // Query for employees with purchasing manager role
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      
      const batch = writeBatch(db);
      let deleteCount = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const roles = data.roles || [];
        
        // Check if user has purchasing manager role
        const hasPurchasingRole = roles.some((role: unknown) => 
          role.jobTitle === 'Purchasing Manager' || 
          role.jobTitle === 'Purchase Manager'
        );
        
        if (hasPurchasingRole) {
          console.log(`   - Deleting employee: ${data.email} (${docSnapshot.id})`);
          batch.delete(doc(db, 'employees', docSnapshot.id));
          deleteCount++;
        }
      });
      
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${deleteCount} purchasing manager employee records`);
      } else {
        console.log('ℹ️ No purchasing manager employees found to delete');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up employees:', error);
      throw error;
    }
  }

  /**
   * Clean up user documents for purchasing managers
   */
  private static async cleanupUserDocuments(): Promise<void> {
    console.log('\n2. 🗑️ CLEANING USER DOCUMENTS');
    console.log('-----------------------------');

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['Purchasing Manager', 'Purchase Manager']));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      let deleteCount = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        console.log(`   - Deleting user: ${data.email} (${docSnapshot.id})`);
        batch.delete(doc(db, 'users', docSnapshot.id));
        deleteCount++;
      });
      
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${deleteCount} purchasing manager user records`);
      } else {
        console.log('ℹ️ No purchasing manager users found to delete');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up users:', error);
      throw error;
    }
  }

  /**
   * Test Firestore database connection
   */
  private static async testFirestoreConnection(): Promise<void> {
    console.log('\n3. 🔗 TESTING FIRESTORE CONNECTION');
    console.log('----------------------------------');

    try {
      // Test basic read
      const testDoc = await getDoc(doc(db, 'settings', 'test'));
      console.log('✅ Firestore READ access: OK');
      
      // Test basic write
      const testData = {
        testConnection: true,
        timestamp: new Date(),
        message: 'Connection test successful'
      };
      
      await writeBatch(db).set(doc(db, 'settings', 'connection-test'), testData).commit();
      console.log('✅ Firestore WRITE access: OK');
      
      // Test collections access
      const collections = ['employees', 'users', 'suppliers', 'inventory'];
      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(query(collection(db, collectionName)));
          console.log(`✅ Collection '${collectionName}': ${snapshot.size} documents`);
        } catch (error) {
          console.log(`❌ Collection '${collectionName}': Access failed`);
        }
      }
      
      console.log('✅ Firestore connection is working properly');
      
    } catch (error) {
      console.error('❌ Firestore connection test failed:', error);
      throw error;
    }
  }

  /**
   * Create a new purchasing manager with proper Firestore connection
   */
  static async createNewPurchasingManager(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    nin: string,
    phone?: string
  ): Promise<void> {
    console.log('\n🛒 CREATING NEW PURCHASING MANAGER');
    console.log('==================================');
    console.log(`Email: ${email}`);
    console.log(`Name: ${firstName} ${lastName}`);

    try {
      // Import auth service
      const { authService } = await import('./auth');
      
      const signUpData = {
        email,
        password,
        firstName,
        lastName,
        employeeNIN: nin,
        phone: phone || '',
        branchId: 'kyengera',
        roles: [{
          jobRoleId: 'purchasing-manager',
          jobTitle: 'Purchasing Manager',
          baseSalary: 1100000,
          description: 'Manages purchasing operations and supplier relationships',
          assignedDate: new Date() as any
        }]
      };

      console.log('📝 Creating user account...');
      const result = await authService.signUp(signUpData);
      
      console.log('✅ User created successfully!');
      console.log(`   - Auth UID: ${result.user.uid}`);
      console.log(`   - Employee ID: ${result.employee.id}`);
      console.log(`   - Role: ${result.employee.roles[0].jobTitle}`);
      
      // Verify the data was saved to Firestore
      await this.verifyUserCreation(result.user.uid, email);
      
    } catch (error) {
      console.error('❌ Failed to create purchasing manager:', error);
      throw error;
    }
  }

  /**
   * Verify that user was properly created in Firestore
   */
  private static async verifyUserCreation(uid: string, email: string): Promise<void> {
    console.log('\n🔍 VERIFYING USER CREATION');
    console.log('--------------------------');

    try {
      // Check user document
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        console.log('✅ User document created in Firestore');
        console.log(`   - Role: ${userDoc.data().role}`);
      } else {
        console.log('❌ User document NOT found in Firestore');
      }

      // Check employee document
      const employeeDoc = await getDoc(doc(db, 'employees', uid));
      if (employeeDoc.exists()) {
        const data = employeeDoc.data();
        console.log('✅ Employee document created in Firestore');
        console.log(`   - Name: ${data.firstName} ${data.lastName}`);
        console.log(`   - Email: ${data.email}`);
        console.log(`   - Roles: ${JSON.stringify(data.roles.map((r: unknown) => r.jobTitle))}`);
      } else {
        console.log('❌ Employee document NOT found in Firestore');
      }

      // Check if user can query their own data
      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', email)
      );
      const employeeSnapshot = await getDocs(employeeQuery);
      
      if (!employeeSnapshot.empty) {
        console.log('✅ Employee can be found by email query');
      } else {
        console.log('❌ Employee NOT found by email query');
      }
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
    }
  }

  /**
   * Get current database statistics
   */
  static async getDatabaseStats(): Promise<void> {
    console.log('\n📊 DATABASE STATISTICS');
    console.log('----------------------');

    try {
      const collections = ['users', 'employees', 'suppliers', 'inventory', 'cashAllocations'];
      
      for (const collectionName of collections) {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          console.log(`${collectionName}: ${snapshot.size} documents`);
        } catch (error) {
          console.log(`${collectionName}: Error accessing collection`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
    }
  }
}

// Export convenience functions
export const cleanupPurchasingManagers = () => PurchasingManagerCleanup.cleanupAllPurchasingManagers();
export const createNewPurchasingManager = (email: string, password: string, firstName: string, lastName: string, nin: string, phone?: string) => 
  PurchasingManagerCleanup.createNewPurchasingManager(email, password, firstName, lastName, nin, phone);
export const getDatabaseStats = () => PurchasingManagerCleanup.getDatabaseStats();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).cleanupPurchasingManagers = cleanupPurchasingManagers;
  (window as any).createNewPurchasingManager = createNewPurchasingManager;
  (window as any).getDatabaseStats = getDatabaseStats;
  (window as any).PurchasingManagerCleanup = PurchasingManagerCleanup;
} 