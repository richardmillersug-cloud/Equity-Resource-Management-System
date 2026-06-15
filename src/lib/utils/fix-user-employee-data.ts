import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { authService } from '../firebase/auth';
import { Employee, JobRole } from '../firebase/models';
import { Timestamp } from 'firebase/firestore';

/**
 * Utility to create missing employee data for an existing user account
 * This fixes the "Employee Data: Missing" issue
 */
export class UserEmployeeDataFixer {
  
  /**
   * Creates employee document for the current user with provided data
   */
  static async createEmployeeProfileForCurrentUser(employeeData: {
    firstName: string;
    lastName: string;
    employeeNIN: string;
    phone?: string;
    branchId: string;
    roles: JobRole[];
    employeeSalary?: number;
  }): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Calculate base salary from roles if not provided
      const baseSalary = employeeData.employeeSalary || 
        (employeeData.roles.length > 0 
          ? Math.max(...employeeData.roles.map(role => role.baseSalary))
          : 800000); // Default salary

      const employee: Omit<Employee, 'id'> = {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        employeeNIN: employeeData.employeeNIN,
        email: currentUser.email,
        phone: employeeData.phone || '',
        address: '',
        hireDate: Timestamp.now(),
        employeeSalary: baseSalary,
        employmentStatus: 'Active',
        branchId: employeeData.branchId,
        roles: employeeData.roles,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Create employee document with the same ID as the auth user
      await setDoc(doc(db, 'employees', currentUser.uid), employee);

      console.log('✅ Employee profile created successfully for user:', currentUser.email);
      
      // Force refresh the auth service to pick up the new employee data
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error creating employee profile:', error);
      throw error;
    }
  }

  /**
   * Quick fix for admin users - creates admin employee profile
   */
  /** Unified Admin (business + platform). */
  static async createAdminProfile(firstName = 'System', lastName = 'Administrator'): Promise<void> {
    const adminRole: JobRole = {
      jobRoleId: 'admin',
      jobTitle: 'Admin',
      baseSalary: 2500000,
      description:
        'Full administrator: business operations, security, sessions, roles, and accountability',
      assignedDate: Timestamp.now(),
    };

    await this.createEmployeeProfileForCurrentUser({
      firstName,
      lastName,
      employeeNIN: '80001019700001',
      branchId: 'main',
      roles: [adminRole],
      employeeSalary: 2500000,
    });
  }

  /** @deprecated Use createAdminProfile — merges former System Admin into Admin. */
  static async createSystemAdminProfile(firstName = 'System', lastName = 'Administrator'): Promise<void> {
    return this.createAdminProfile(firstName, lastName);
  }

  /**
   * Quick fix for accountant users
   */
  static async createAccountantProfile(firstName: string, lastName: string, nin: string): Promise<void> {
    const accountantRole: JobRole = {
      jobRoleId: 'accountant',
      jobTitle: 'Accountant',
      baseSalary: 1200000,
      description: 'Handles all accounting and financial operations',
      assignedDate: Timestamp.now()
    };

    await this.createEmployeeProfileForCurrentUser({
      firstName,
      lastName,
      employeeNIN: nin,
      branchId: 'kyengera',
      roles: [accountantRole],
      employeeSalary: 1200000
    });
  }

  /**
   * Quick fix for purchasing manager users
   */
  static async createPurchasingManagerProfile(firstName: string, lastName: string, nin: string): Promise<void> {
    const purchasingManagerRole: JobRole = {
      jobRoleId: 'purchasing-manager',
      jobTitle: 'Purchasing Manager',
      baseSalary: 1100000,
      description: 'Manages purchasing operations and supplier relationships',
      assignedDate: Timestamp.now()
    };

    await this.createEmployeeProfileForCurrentUser({
      firstName,
      lastName,
      employeeNIN: nin,
      branchId: 'kyengera',
      roles: [purchasingManagerRole],
      employeeSalary: 1100000
    });
  }

  /**
   * Checks if current user has employee data
   */
  /** Upgrades legacy "System Admin" job title to unified "Admin". */
  static async mergeLegacySystemAdminToAdmin(): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser?.employee) {
      throw new Error('No employee profile found');
    }
    const roles = currentUser.employee.roles.map((r) =>
      r.jobTitle === 'System Admin'
        ? {
            ...r,
            jobRoleId: 'admin',
            jobTitle: 'Admin',
            description: 'Full administrator (business + platform)',
          }
        : r
    );
    await setDoc(
      doc(db, 'employees', currentUser.uid),
      { roles, updatedAt: Timestamp.now() },
      { merge: true }
    );
    window.location.reload();
  }

  static async checkEmployeeDataExists(): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      return currentUser?.employee !== undefined;
    } catch (error) {
      return false;
    }
  }
}

// Quick console commands for manual fixing
(window as any).fixUserData = {
  createAdmin: () => UserEmployeeDataFixer.createAdminProfile(),
  createSystemAdmin: (firstName?: string, lastName?: string) =>
    UserEmployeeDataFixer.createAdminProfile(firstName, lastName),
  mergeLegacySystemAdmin: () => UserEmployeeDataFixer.mergeLegacySystemAdminToAdmin(),
  createAccountant: (firstName: string, lastName: string, nin: string) => 
    UserEmployeeDataFixer.createAccountantProfile(firstName, lastName, nin),
  createPurchasingManager: (firstName: string, lastName: string, nin: string) => 
    UserEmployeeDataFixer.createPurchasingManagerProfile(firstName, lastName, nin),
  check: () => UserEmployeeDataFixer.checkEmployeeDataExists()
};

console.log('🔧 User data fixer loaded. Available commands:');
console.log('- fixUserData.createAdmin() - Create admin profile');
console.log('- fixUserData.createAccountant("First", "Last", "NIN") - Create accountant profile');
console.log('- fixUserData.createPurchasingManager("First", "Last", "NIN") - Create purchasing manager profile');
console.log('- fixUserData.check() - Check if employee data exists'); 
