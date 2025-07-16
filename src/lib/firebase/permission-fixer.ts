import { auth, db } from './config';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export class PermissionFixer {
  /**
   * Main method to fix permission issues
   */
  static async fixPermissionIssues(userRole: string = 'Purchasing Manager'): Promise<void> {
    console.log('🔧 FIREBASE PERMISSION FIXER STARTED');
    console.log('====================================');

    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user found. Please sign in first.');
      return;
    }

    console.log('📋 User Info:');
    console.log('   - UID:', user.uid);
    console.log('   - Email:', user.email);
    console.log('   - Desired Role:', userRole);

    // Step 1: Check and create user document
    await this.ensureUserDocument(user.uid, user.email!, userRole);

    // Step 2: Check and create employee document
    await this.ensureEmployeeDocument(user.email!, userRole);

    console.log('✅ Permission fixing process completed!');
    console.log('💡 If you still have issues, try:');
    console.log('   1. Refresh the page');
    console.log('   2. Sign out and sign back in');
    console.log('   3. Check Firebase Console for manual verification');
  }

  /**
   * Ensure user document exists in Firestore
   */
  private static async ensureUserDocument(uid: string, email: string, role: string): Promise<void> {
    console.log('\n1. 👤 CHECKING USER DOCUMENT');
    console.log('-----------------------------');

    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        console.log('✅ User document already exists');
        const userData = userDoc.data();
        console.log('   - Current Role:', userData.role);
        
        if (userData.role !== role) {
          console.log('⚠️  Role mismatch detected. You may need to update manually.');
        }
      } else {
        console.log('⚠️  User document missing. Creating...');
        
        const userData = {
          email: email,
          role: role,
          createdAt: new Date(),
          lastLogin: new Date(),
          employeeId: uid,
          isActive: true
        };

        // Try to create the document
        try {
          await setDoc(userDocRef, userData);
          console.log('✅ User document created successfully!');
        } catch (error: unknown) {
          console.log('❌ Failed to create user document:', error.message);
          console.log('💡 Manual action required: Create user document in Firebase Console');
          console.log('   Collection: users');
          console.log('   Document ID:', uid);
          console.log('   Data:', JSON.stringify(userData, null, 2));
        }
      }
    } catch (error: unknown) {
      console.log('❌ Error checking user document:', error.message);
    }
  }

  /**
   * Ensure employee document exists in Firestore
   */
  private static async ensureEmployeeDocument(email: string, role: string): Promise<void> {
    console.log('\n2. 👷 CHECKING EMPLOYEE DOCUMENT');
    console.log('--------------------------------');

    try {
      // Check if employee document exists
      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', email)
      );
      
      const employeeSnapshot = await getDocs(employeeQuery);
      
      if (!employeeSnapshot.empty) {
        console.log('✅ Employee document already exists');
        const employeeData = employeeSnapshot.docs[0].data();
        console.log('   - Current Roles:', employeeData.roles);
      } else {
        console.log('⚠️  Employee document missing. Creating...');
        
        const employeeData = {
          name: email.split('@')[0].replace(/[._]/g, ' '), // Generate name from email
          email: email,
          roles: [{
            jobTitle: role,
            department: this.getDepartmentForRole(role),
            salary: this.getSalaryForRole(role),
            startDate: new Date(),
            isActive: true
          }],
          branch: 'Kyengera Branch',
          status: 'active',
          createdAt: new Date(),
          lastUpdated: new Date()
        };

        try {
          const docRef = await addDoc(collection(db, 'employees'), employeeData);
          console.log('✅ Employee document created successfully!');
          console.log('   - Document ID:', docRef.id);
        } catch (error: unknown) {
          console.log('❌ Failed to create employee document:', error.message);
          console.log('💡 Manual action required: Create employee document in Firebase Console');
          console.log('   Collection: employees');
          console.log('   Data:', JSON.stringify(employeeData, null, 2));
        }
      }
    } catch (error: unknown) {
      console.log('❌ Error checking employee document:', error.message);
    }
  }

  /**
   * Get department for a given role
   */
  private static getDepartmentForRole(role: string): string {
    const departmentMap: Record<string, string> = {
      'Admin': 'Administration',
      'Manager': 'Management',
      'Accountant': 'Finance',
      'Managing Director': 'Executive',
      'Purchase Manager': 'Procurement',
      'Purchasing Manager': 'Procurement',
      'HR': 'Human Resources',
      'Stock Manager': 'Inventory',
      'Receiver': 'Warehouse',
      'Auditor': 'Compliance',
      'Supervisor': 'Operations'
    };

    return departmentMap[role] || 'General';
  }

  /**
   * Get default salary for a given role
   */
  private static getSalaryForRole(role: string): number {
    const salaryMap: Record<string, number> = {
      'Admin': 1500000,
      'Manager': 2000000,
      'Accountant': 1200000,
      'Managing Director': 5000000,
      'Purchase Manager': 1100000,
      'Purchasing Manager': 1100000,
      'HR': 1300000,
      'Stock Manager': 1000000,
      'Receiver': 800000,
      'Auditor': 1400000,
      'Supervisor': 900000
    };

    return salaryMap[role] || 1000000;
  }

  /**
   * Quick method to fix permissions for current user
   */
  static async quickFix(): Promise<void> {
    return this.fixPermissionIssues('Purchasing Manager');
  }

  /**
   * Test if current user has proper permissions
   */
  static async testPermissions(): Promise<boolean> {
    console.log('🧪 TESTING PERMISSIONS');
    console.log('----------------------');

    const user = auth.currentUser;
    if (!user) {
      console.log('❌ No authenticated user');
      return false;
    }

    try {
      // Test basic read access
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        console.log('✅ Can read user document');
        
        // Test employee document
        const employeeQuery = query(
          collection(db, 'employees'),
          where('email', '==', user.email)
        );
        
        const employeeSnapshot = await getDocs(employeeQuery);
        if (!employeeSnapshot.empty) {
          console.log('✅ Can read employee document');
          console.log('✅ Permissions appear to be working!');
          return true;
        } else {
          console.log('❌ Cannot find employee document');
        }
      } else {
        console.log('❌ Cannot read user document');
      }
    } catch (error: unknown) {
      console.log('❌ Permission test failed:', error.message);
    }

    return false;
  }
}

// Export convenience functions
export const fixPermissions = (role?: string) => PermissionFixer.fixPermissionIssues(role);
export const quickFixPermissions = () => PermissionFixer.quickFix();
export const testPermissions = () => PermissionFixer.testPermissions();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).fixPermissions = fixPermissions;
  (window as any).quickFixPermissions = quickFixPermissions;
  (window as any).testPermissions = testPermissions;
  (window as any).PermissionFixer = PermissionFixer;
} 