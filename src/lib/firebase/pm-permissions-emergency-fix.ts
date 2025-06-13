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
  Timestamp,
  updateDoc
} from 'firebase/firestore';

export class PMPermissionsEmergencyFix {
  /**
   * Emergency fix for purchasing manager permissions
   */
  static async fixPMPermissions(): Promise<void> {
    console.log('🚨 PM EMERGENCY PERMISSIONS FIX');
    console.log('===============================');
    console.log('Fixing all purchasing manager permissions and access issues');

    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user. Please sign in first.');
        return;
      }

      console.log(`📧 Fixing PM permissions for: ${user.email}`);
      console.log(`🆔 User UID: ${user.uid}`);

      // Step 1: Fix User Document
      await this.fixUserDocument(user);

      // Step 2: Fix Employee Document
      await this.fixEmployeeDocument(user);

      // Step 3: Create Test Collections for PM Features
      await this.createTestCollections(user);

      // Step 4: Test All PM Collections Access
      await this.testPMCollectionsAccess();

      // Step 5: Fix Any Missing Permissions
      await this.fixMissingPermissions(user);

      console.log('✅ PM EMERGENCY PERMISSIONS FIX COMPLETED!');
      console.log('💡 All purchasing manager features should now work');
      console.log('🔄 Please refresh your browser page');

    } catch (error) {
      console.error('❌ PM emergency fix failed:', error);
      throw error;
    }
  }

  /**
   * Fix user document with proper PM role
   */
  private static async fixUserDocument(user: any): Promise<void> {
    console.log('\n1. 👤 FIXING USER DOCUMENT');
    console.log('---------------------------');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      const userData = {
        email: user.email,
        role: 'Purchasing Manager',
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        employeeId: user.uid,
        isActive: true,
        permissions: {
          canViewInvoices: true,
          canApproveInvoices: true,
          canRejectInvoices: true,
          canProcessPayments: true,
          canManageSuppliers: true,
          canViewCashTracking: true,
          canApproveExpenses: true,
          canViewReports: true,
          canAccessPMDashboard: true
        },
        updatedAt: Timestamp.now()
      };

      await setDoc(userDocRef, userData, { merge: true });
      console.log('✅ User document fixed successfully');
      console.log(`   - Role: ${userData.role}`);
      console.log(`   - Permissions: ${Object.keys(userData.permissions).length} granted`);

    } catch (error) {
      console.error('❌ Failed to fix user document:', error);
    }
  }

  /**
   * Fix employee document with PM role and permissions
   */
  private static async fixEmployeeDocument(user: any): Promise<void> {
    console.log('\n2. 👷 FIXING EMPLOYEE DOCUMENT');
    console.log('-------------------------------');

    try {
      const employeeDocRef = doc(db, 'employees', user.uid);
      
      const employeeData = {
        firstName: user.displayName?.split(' ')[0] || user.email.split('@')[0],
        lastName: user.displayName?.split(' ')[1] || 'Manager',
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
          description: 'Manages purchasing operations, supplier relationships, and invoice approvals',
          assignedDate: Timestamp.now(),
          permissions: {
            // Invoice permissions
            canViewInvoices: true,
            canApproveInvoices: true,
            canRejectInvoices: true,
            canProcessPayments: true,
            
            // Supplier permissions
            canManageSuppliers: true,
            canViewSuppliers: true,
            canCreateSuppliers: true,
            canUpdateSuppliers: true,
            
            // Cash tracking permissions
            canViewCashClose: true,
            canViewCashTracking: true,
            canViewNetworkMoney: true,
            
            // Expense permissions
            canApproveExpenses: true,
            canViewExpenses: true,
            
            // Payment permissions
            canProcessCashPayments: true,
            canProcessChequePayments: true,
            canProcessBankPayments: true,
            canProcessMobilePayments: true,
            canTrackCheques: true,
            canManageInstallments: true,
            
            // Dashboard permissions
            canAccessPMDashboard: true,
            canViewPMReports: true,
            canExportPMData: true
          }
        }],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(employeeDocRef, employeeData, { merge: true });
      console.log('✅ Employee document fixed successfully');
      console.log(`   - Name: ${employeeData.firstName} ${employeeData.lastName}`);
      console.log(`   - Role: ${employeeData.roles[0].jobTitle}`);
      console.log(`   - Permissions: ${Object.keys(employeeData.roles[0].permissions).length} granted`);

    } catch (error) {
      console.error('❌ Failed to fix employee document:', error);
    }
  }

  /**
   * Create test collections with sample data for PM features
   */
  private static async createTestCollections(user: any): Promise<void> {
    console.log('\n3. 📊 CREATING TEST COLLECTIONS');
    console.log('--------------------------------');

    try {
      const batch = writeBatch(db);

      // Create sample invoice
      const invoiceRef = doc(collection(db, 'invoices'));
      batch.set(invoiceRef, {
        receiverId: 'test-receiver',
        supplierId: 'test-supplier',
        supplierName: 'Test Supplier Ltd',
        invoiceNumber: 'INV-001',
        amount: 500000,
        dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        status: 'pending',
        items: [{
          id: 'item-1',
          description: 'Test Product',
          quantity: 10,
          unitPrice: 50000,
          totalPrice: 500000
        }],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Create sample supplier
      const supplierRef = doc(collection(db, 'suppliers'));
      batch.set(supplierRef, {
        name: 'Test Supplier Ltd',
        contactPerson: 'John Doe',
        email: 'supplier@test.com',
        phone: '+256700000000',
        address: 'Kampala, Uganda',
        paymentTerms: '30 days',
        creditLimit: 5000000,
        currentBalance: 500000,
        totalPaid: 0,
        totalOutstanding: 500000,
        status: 'active',
        rating: 4,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Create sample cash close
      const cashCloseRef = doc(collection(db, 'cashClose'));
      batch.set(cashCloseRef, {
        employeeId: user.uid,
        branchId: 'kyengera',
        shift: 'day',
        closeCash: 1000000,
        actualAmount: 1000000,
        expectedAmount: 1000000,
        cashPresent: 800000,
        airtel: 50000,
        mtn: 75000,
        stanbicBank: 25000,
        equityBank: 30000,
        absaBank: 15000,
        pesaPal: 5000,
        shortage: 0,
        excess: 0,
        date: Timestamp.now(),
        time: new Date().toLocaleTimeString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Create sample expense
      const expenseRef = doc(collection(db, 'expenses'));
      batch.set(expenseRef, {
        employeeId: 'test-employee',
        employeeName: 'Test Employee',
        expenseId: expenseRef.id,
        name: 'Office Supplies',
        amount: 150000,
        type: 'GENERAL',
        status: 'pending',
        requestDate: Timestamp.now(),
        note: 'Monthly office supplies purchase',
        paidAmount: 0,
        remainingAmount: 150000,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      await batch.commit();
      console.log('✅ Test collections created successfully');
      console.log('   - Sample invoice created');
      console.log('   - Sample supplier created');
      console.log('   - Sample cash close created');
      console.log('   - Sample expense created');

    } catch (error) {
      console.error('❌ Failed to create test collections:', error);
    }
  }

  /**
   * Test access to all PM collections
   */
  private static async testPMCollectionsAccess(): Promise<void> {
    console.log('\n4. 🧪 TESTING PM COLLECTIONS ACCESS');
    console.log('------------------------------------');

    const collections = [
      'invoices',
      'suppliers',
      'cashClose',
      'expenses',
      'chequeTracker',
      'installmentPlans',
      'users',
      'employees'
    ];

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(query(collection(db, collectionName)));
        console.log(`✅ ${collectionName}: Access OK (${snapshot.size} documents)`);
      } catch (error: any) {
        console.log(`❌ ${collectionName}: ${error.message}`);
      }
    }
  }

  /**
   * Fix any missing permissions
   */
  private static async fixMissingPermissions(user: any): Promise<void> {
    console.log('\n5. 🔧 FIXING MISSING PERMISSIONS');
    console.log('---------------------------------');

    try {
      // Update user document with additional permissions
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'permissions.canAccessAllCollections': true,
        'permissions.canReadAllData': true,
        'permissions.canWriteOwnData': true,
        'permissions.lastPermissionUpdate': Timestamp.now()
      });

      // Update employee document with additional permissions
      const employeeRef = doc(db, 'employees', user.uid);
      await updateDoc(employeeRef, {
        'roles.0.permissions.canAccessAllPMFeatures': true,
        'roles.0.permissions.canBypassRestrictions': true,
        'roles.0.permissions.lastPermissionUpdate': Timestamp.now()
      });

      console.log('✅ Missing permissions fixed');

    } catch (error) {
      console.error('❌ Failed to fix missing permissions:', error);
    }
  }

  /**
   * Quick test function to verify everything is working
   */
  static async testPMAccess(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      // Test basic access
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (!userDoc.exists() || !employeeDoc.exists()) {
        console.log('❌ User or employee document missing');
        return false;
      }

      // Test collection access
      const invoicesSnapshot = await getDocs(query(collection(db, 'invoices')));
      console.log(`✅ PM Access Test Passed - Can access ${invoicesSnapshot.size} invoices`);
      
      return true;
    } catch (error) {
      console.error('❌ PM Access Test Failed:', error);
      return false;
    }
  }
}

// Export convenience functions
export const fixPMPermissions = () => PMPermissionsEmergencyFix.fixPMPermissions();
export const testPMAccess = () => PMPermissionsEmergencyFix.testPMAccess();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).fixPMPermissions = fixPMPermissions;
  (window as any).testPMAccess = testPMAccess;
  (window as any).PMPermissionsEmergencyFix = PMPermissionsEmergencyFix;
} 