import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  UserCredential,
  getAuth,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { app, auth, db } from './config';
import { Employee, JobRole } from './models';
import { firestoreServices } from './firestore-service';
import { businessRules } from './business-rules';
import { recordLoginSession, sessionService } from './session-service';
import { resolveDashboardPathFromRoles } from './dashboard-routes';
import {
  getEmploymentAuthErrorCode,
  getEmploymentLoginBlockMessage,
  isEmployeeAllowedToLogin,
} from './employment-access';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  employee?: Employee;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeNIN: string;
  phone?: string;
  branchId: string;
  roles: JobRole[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

class FirebaseAuthService {
  private currentUser: AuthUser | null = null;
  private authStateListeners: ((user: AuthUser | null) => void)[] = [];
  /** Set when Inactive/Terminated users are blocked so the login UI can show a message */
  private lastAccessDenial: AuthError | null = null;

  constructor() {
    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const authUser = await this.createAuthUser(user);

        // Inactive / Terminated accounts cannot keep a portal session
        if (authUser.employee && !isEmployeeAllowedToLogin(authUser.employee)) {
          const status = authUser.employee.employmentStatus;
          this.setAccessDenial(status);
          this.currentUser = null;
          this.authStateListeners.forEach((listener) => listener(null));
          await this.forceSignOutQuiet();
          return;
        }

        this.clearAccessDenial();
        this.currentUser = authUser;
      } else {
        this.currentUser = null;
      }

      // Notify all listeners
      this.authStateListeners.forEach((listener) => listener(this.currentUser));
    });
  }

  private setAccessDenial(status?: Employee['employmentStatus'] | string | null) {
    this.lastAccessDenial = {
      code: getEmploymentAuthErrorCode(status),
      message: getEmploymentLoginBlockMessage(status),
    };
  }

  private clearAccessDenial() {
    this.lastAccessDenial = null;
  }

  getLastAccessDenial(): AuthError | null {
    return this.lastAccessDenial;
  }

  /** Sign out without throwing — used when rejecting Inactive/Terminated logins */
  private async forceSignOutQuiet(): Promise<void> {
    try {
      await sessionService.endSession();
    } catch {
      /* ignore */
    }
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out blocked user:', err);
    }
    this.currentUser = null;
  }

  // Create AuthUser object with employee data
  private async createAuthUser(user: User): Promise<AuthUser> {
    const authUser: AuthUser = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      emailVerified: user.emailVerified
    };

    try {
      // Get employee data from Firestore
      const employee = await firestoreServices.employee.getById(user.uid);
      if (employee) {
        authUser.employee = employee;
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }

    return authUser;
  }

  // Sign up new user
  async signUp(signUpData: SignUpData): Promise<{ user: AuthUser; employee: Employee }> {
    try {
      // Calculate base salary from roles (optional — default 0 when unset)
      const roleSalaries = signUpData.roles
        .map((role) => Number(role.baseSalary) || 0)
        .filter((salary) => salary >= 0);
      const baseSalary = roleSalaries.length > 0 ? Math.max(...roleSalaries) : 0;

      // Validate employee data first
      const employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        employeeNIN: signUpData.employeeNIN,
        email: signUpData.email,
        phone: signUpData.phone,
        address: '',
        hireDate: new Date() as any, // Will be converted to Timestamp
        employeeSalary: baseSalary, // Use calculated salary from roles
        employmentStatus: 'Active',
        branchId: signUpData.branchId,
        roles: signUpData.roles
      };

      // Ensure branch exists in Firestore
      try {
        const existingBranch = await firestoreServices.branch.getById(signUpData.branchId);
        if (!existingBranch) {
          // Create the branch if it doesn't exist
          const defaultBranches = {
            'kyengera': { branchName: 'Kyengera Branch', address: 'Kyengera Town', phoneNumber: '+256 700 123 450', email: 'kyengera@retailsystem.com' },
            'main': { branchName: 'Main Branch', address: 'Kampala Central', phoneNumber: '+256 700 123 456', email: 'main@retailsystem.com' },
            'ntinda': { branchName: 'Ntinda Branch', address: 'Ntinda Shopping Center', phoneNumber: '+256 700 123 457', email: 'ntinda@retailsystem.com' },
            'entebbe': { branchName: 'Entebbe Branch', address: 'Entebbe Road', phoneNumber: '+256 700 123 458', email: 'entebbe@retailsystem.com' },
            'jinja': { branchName: 'Jinja Branch', address: 'Jinja Main Street', phoneNumber: '+256 700 123 459', email: 'jinja@retailsystem.com' }
          };

          const branchData = defaultBranches[signUpData.branchId as keyof typeof defaultBranches];
          if (branchData) {
            await firestoreServices.branch.create(branchData);
          }
        }
      } catch (error) {
        console.error('Error checking/creating branch:', error);
        // Continue with signup even if branch creation fails
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signUpData.email,
        signUpData.password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: `${signUpData.firstName} ${signUpData.lastName}`
      });

      // Create employee document in Firestore with the same ID as auth user
      const employeeWithId = {
        ...employeeData,
        id: userCredential.user.uid
      };

      await setDoc(doc(db, 'employees', userCredential.user.uid), {
        ...employeeData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Create AuthUser object
      const authUser = await this.createAuthUser(userCredential.user);

      // Log the signup action
      await firestoreServices.audit.logAction(
        'employees',
        'CREATE',
        userCredential.user.uid,
        userCredential.user.uid,
        { action: 'user_signup', email: signUpData.email },
        `User signed up: ${signUpData.email}`
      );

      return { user: authUser, employee: employeeWithId as Employee };
    } catch (error: unknown) {
      console.error('Signup error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Create an account without replacing the current Admin/MD session.
   * Uses a temporary secondary Firebase Auth app instance.
   */
  async createManagedAccount(
    signUpData: SignUpData,
    createdBy: { uid: string; name?: string; role?: string },
    extras?: Record<string, unknown>
  ): Promise<{ uid: string; email: string }> {
    const roleSalaries = signUpData.roles
      .map((role) => Number(role.baseSalary) || 0)
      .filter((salary) => salary >= 0);
    const baseSalary = roleSalaries.length > 0 ? Math.max(...roleSalaries) : 0;

    const employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
      firstName: signUpData.firstName,
      lastName: signUpData.lastName,
      employeeNIN: signUpData.employeeNIN,
      email: signUpData.email,
      phone: signUpData.phone,
      address: '',
      hireDate: new Date() as any,
      employeeSalary: baseSalary,
      employmentStatus: 'Active',
      branchId: signUpData.branchId,
      roles: signUpData.roles,
    };

    const secondaryName = `managed-account-${Date.now()}`;
    const secondaryApp = initializeApp(app.options, secondaryName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      try {
        const existingBranch = await firestoreServices.branch.getById(signUpData.branchId);
        if (!existingBranch) {
          const defaultBranches = {
            kyengera: {
              branchName: 'Kyengera Branch',
              address: 'Kyengera Town',
              phoneNumber: '+256 700 123 450',
              email: 'kyengera@retailsystem.com',
            },
            main: {
              branchName: 'Main Branch',
              address: 'Kampala Central',
              phoneNumber: '+256 700 123 456',
              email: 'main@retailsystem.com',
            },
            ntinda: {
              branchName: 'Ntinda Branch',
              address: 'Ntinda Shopping Center',
              phoneNumber: '+256 700 123 457',
              email: 'ntinda@retailsystem.com',
            },
            entebbe: {
              branchName: 'Entebbe Branch',
              address: 'Entebbe Road',
              phoneNumber: '+256 700 123 458',
              email: 'entebbe@retailsystem.com',
            },
            jinja: {
              branchName: 'Jinja Branch',
              address: 'Jinja Main Street',
              phoneNumber: '+256 700 123 459',
              email: 'jinja@retailsystem.com',
            },
          };
          const branchData = defaultBranches[signUpData.branchId as keyof typeof defaultBranches];
          if (branchData) {
            await firestoreServices.branch.create(branchData);
          }
        }
      } catch (branchErr) {
        console.warn('Branch ensure failed during managed account create:', branchErr);
      }

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        signUpData.email,
        signUpData.password
      );

      await updateProfile(userCredential.user, {
        displayName: `${signUpData.firstName} ${signUpData.lastName}`,
      });

      await setDoc(doc(db, 'employees', userCredential.user.uid), {
        ...employeeData,
        ...(extras || {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        registeredBy: createdBy.uid,
        registeredByName: (extras?.registeredByName as string) || createdBy.name || '',
        registeredByRole:
          (extras?.registeredByRole as string) || createdBy.role || createdBy.name || 'Admin',
      });

      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.warn('Email verification send failed:', verifyErr);
      }

      await firestoreServices.audit.logAction(
        'employees',
        'CREATE',
        createdBy.uid,
        userCredential.user.uid,
        {
          action: 'managed_account_create',
          email: signUpData.email,
          createdBy: createdBy.uid,
        },
        `Account created by ${createdBy.name || createdBy.uid}: ${signUpData.email}`
      );

      await signOut(secondaryAuth);

      return { uid: userCredential.user.uid, email: signUpData.email };
    } catch (error: unknown) {
      console.error('Managed account create error:', error);
      throw this.handleAuthError(error);
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch {
        /* ignore */
      }
    }
  }

  // Sign in existing user
  async signIn(loginData: LoginData): Promise<AuthUser> {
    this.clearAccessDenial();

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );

      const authUser = await this.createAuthUser(userCredential.user);

      // Check if user has employee record — do not publish session yet
      if (!authUser.employee) {
        await this.forceSignOutQuiet();
        throw new Error('Employee record not found. Please contact your administrator.');
      }

      // Inactive / Terminated cannot log in
      if (!isEmployeeAllowedToLogin(authUser.employee)) {
        const status = authUser.employee.employmentStatus;
        this.setAccessDenial(status);
        await this.forceSignOutQuiet();
        this.authStateListeners.forEach((listener) => listener(null));
        const blockedError: AuthError = {
          code: getEmploymentAuthErrorCode(status),
          message: getEmploymentLoginBlockMessage(status),
        };
        throw blockedError;
      }

      // Only now publish an authenticated session
      this.clearAccessDenial();
      this.currentUser = authUser;

      // Log the signin action
      await firestoreServices.audit.logAction(
        'employees',
        'UPDATE',
        userCredential.user.uid,
        userCredential.user.uid,
        { action: 'user_signin', email: loginData.email },
        `User signed in: ${loginData.email}`
      );

      await recordLoginSession();

      // Notify listeners with fully loaded employee profile
      this.authStateListeners.forEach((listener) => listener(this.currentUser));

      return authUser;
    } catch (error: unknown) {
      console.error('Signin error:', error);
      // Preserve structured employment-access errors for the login UI
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as AuthError).code === 'string' &&
        ((error as AuthError).code.startsWith('auth/account-') ||
          (error as AuthError).code.startsWith('auth/'))
      ) {
        // Re-throw Firebase auth errors and our account-* errors as AuthError shape
        if ((error as AuthError).code.startsWith('auth/account-')) {
          throw error as AuthError;
        }
      }
      throw this.handleAuthError(error);
    }
  }

  // Sign out current user
  async signOut(): Promise<void> {
    try {
      const currentUserId = this.currentUser?.uid;
      
      await sessionService.endSession();

      // Log the signout action BEFORE signing out (while user still has permissions)
      if (currentUserId) {
        try {
          await firestoreServices.audit.logAction(
            'employees',
            'UPDATE',
            currentUserId,
            currentUserId,
            { action: 'user_signout' },
            'User signed out'
          );
        } catch (auditError) {
          // Don't fail the signout if audit logging fails
          console.warn('Failed to log signout action:', auditError);
        }
      }
      
      // Sign out from Firebase Auth
      await signOut(auth);
      
    } catch (error: unknown) {
      console.error('Signout error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Emergency signout without audit logging (fallback method)
  async forceSignOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: unknown) {
      console.error('Force signout error:', error);
      // Even if Firebase signOut fails, clear local state
      this.currentUser = null;
      this.authStateListeners.forEach(listener => listener(null));
      throw this.handleAuthError(error);
    }
  }

  // Send password reset email
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Update user profile
  async updateUserProfile(updates: {
    displayName?: string;
    phone?: string;
    address?: string;
  }): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('No user is currently signed in');
      }

      // Update Firebase Auth profile
      if (updates.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName
        });
      }

      // Update employee document
      const employeeUpdates: unknown = {};
      if (updates.phone) employeeUpdates.phone = updates.phone;
      if (updates.address) employeeUpdates.address = updates.address;

      if (Object.keys(employeeUpdates).length > 0) {
        await updateDoc(doc(db, 'employees', this.currentUser.uid), {
          ...employeeUpdates,
          updatedAt: new Date()
        });
      }

      // Refresh current user data
      if (auth.currentUser) {
        this.currentUser = await this.createAuthUser(auth.currentUser);
      }
    } catch (error: unknown) {
      console.error('Profile update error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    if (!this.currentUser?.employee) return false;
    return this.currentUser.employee.roles.some(r => r.jobTitle.toLowerCase() === role.toLowerCase());
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: string[]): boolean {
    if (!this.currentUser?.employee) return false;
    return roles.some(role => this.hasRole(role));
  }

  /** Landing route after login/signup. */
  getDefaultDashboardPath(user: AuthUser): string {
    if (!user.employee) return '/dashboard';
    return resolveDashboardPathFromRoles(user.employee.roles);
  }

  // Get user permissions
  getUserPermissions() {
    if (!this.currentUser?.employee) return null;
    // Get permissions based on user roles
    const permissions = new Set<string>();
    this.currentUser.employee.roles.forEach(role => {
      // Add basic permissions based on role
      switch (role.jobTitle.toLowerCase()) {
        case 'system admin':
        case 'admin':
          permissions.add('all');
          break;
        case 'hr':
          permissions.add('employee_management');
          permissions.add('payroll_management');
          break;
        case 'accountant':
          permissions.add('financial_management');
          permissions.add('cash_allocation');
          break;
        case 'purchasing_manager':
          permissions.add('procurement_management');
          break;
        case 'stock_manager':
          permissions.add('inventory_management');
          break;
        default:
          permissions.add('basic_access');
      }
    });
    return Array.from(permissions);
  }

  // Listen for auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.authStateListeners.push(callback);

    // Sync immediately when a session is already loaded (e.g. after client navigations).
    // Do not emit null here — that can race before Firebase Auth finishes initializing.
    if (this.currentUser) {
      callback(this.currentUser);
    }

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Handle authentication errors
  private handleAuthError(error: unknown): AuthError {
    let message = 'An unexpected error occurred';
    let code = 'unknown';

    // Handle Firebase Auth errors
    if (error.code && error.code.startsWith('auth/')) {
      code = error.code;
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password';
          break;
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        default:
          message = error.message || message;
      }
    } 
    // Handle Firestore permission errors
    else if (error.code && error.code.startsWith('permission-denied')) {
      code = 'permission-denied';
      message = 'Permission denied. Please check your access rights.';
    }
    // Handle other Firebase errors
    else if (error.code) {
      code = error.code;
      message = error.message || message;
    }
    // Handle generic errors
    else if (error.message) {
      message = error.message;
    }
    // Handle empty error objects
    else if (typeof error === 'object' && Object.keys(error).length === 0) {
      message = 'An unknown error occurred during authentication';
      code = 'empty-error';
    }

    return {
      code,
      message
    };
  }

  // Admin function to create employee account
  async createEmployeeAccount(
    employeeData: SignUpData,
    createdBy: string
  ): Promise<{ user: AuthUser; employee: Employee }> {
    try {
      // Only admins and HR can create employee accounts
      if (!this.hasAnyRole(['admin', 'hr'])) {
        throw new Error('Insufficient permissions to create employee accounts');
      }

      const result = await this.signUp(employeeData);

      // Log admin action
      await firestoreServices.audit.logAction(
        'employees',
        'CREATE',
        createdBy,
        result.user.uid,
        { 
          action: 'admin_create_employee',
          createdEmployee: employeeData.email,
          roles: employeeData.roles.map(r => r.jobTitle)
        },
        `Admin created employee account: ${employeeData.email}`
      );

      return result;
    } catch (error: unknown) {
      console.error('Admin create employee error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Admin function to deactivate employee
  async deactivateEmployee(employeeId: string): Promise<void> {
    try {
      if (!this.hasAnyRole(['admin', 'hr'])) {
        throw new Error('Insufficient permissions to deactivate employees');
      }

      await firestoreServices.employee.update(employeeId, {
        employmentStatus: 'Inactive'
      });

      // Log admin action
      await firestoreServices.audit.logAction(
        'employees',
        'UPDATE',
        this.currentUser!.uid,
        employeeId,
        { action: 'admin_deactivate_employee' },
        `Admin deactivated employee: ${employeeId}`
      );
    } catch (error: unknown) {
      console.error('Deactivate employee error:', error);
      throw this.handleAuthError(error);
    }
  }
}

// Export singleton instance
export const authService = new FirebaseAuthService(); 