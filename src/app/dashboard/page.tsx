'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthUser } from '../../lib/firebase/auth';
import { resolveDashboardPathFromRoles } from '../../lib/firebase/dashboard-routes';
import { isStaffPortalUser, STAFF_PORTAL_PATH } from '../../lib/firebase/staff-portal-roles';
import { UserEmployeeDataFixer } from '../../lib/utils/fix-user-employee-data';
import { diagnosePermissions } from '../../lib/firebase/debug-permissions';
import { quickFixPermissions, testPermissions } from '../../lib/firebase/permission-fixer';
import { cleanupPurchasingManagers, createNewPurchasingManager, getDatabaseStats } from '../../lib/firebase/cleanup-purchasing-managers';
import { fixAllPermissions, quickPermissionFix, getUpdatedFirestoreRules } from '../../lib/firebase/permissions-final-fix';
import '../../lib/firebase/test-purchasing-manager';
import HydrationSafeLoader from '../../components/ui/HydrationSafeLoader';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    try {
      (window as any).debugUserData = {
        checkUser: () => {
          const user = authService.getCurrentUser();
          console.log('Current user:', user);
          return user;
        },
        createAdmin: () => UserEmployeeDataFixer.createAdminProfile(),
        createAccountant: (first: string, last: string, nin: string) =>
          UserEmployeeDataFixer.createAccountantProfile(first, last, nin),
        createPurchasingManager: (first: string, last: string, nin: string) =>
          UserEmployeeDataFixer.createPurchasingManagerProfile(first, last, nin),
        diagnosePermissions: () => diagnosePermissions(),
        fixPermissions: () => quickFixPermissions(),
        testPermissions: () => testPermissions(),
        cleanupPMs: () => cleanupPurchasingManagers(),
        createNewPM: () => createNewPurchasingManager(),
        getStats: () => getDatabaseStats(),
        fixAllPermissions: () => fixAllPermissions(),
        quickFix: () => quickPermissionFix(),
        getUpdatedFirestoreRules: () => getUpdatedFirestoreRules(),
      };
    } catch (error) {
      console.error('Failed to load employee data fixer:', error);
    }
  }, []);

  useEffect(() => {
    const redirectToRoleDashboard = () => {
      try {
        const user = authService.getCurrentUser();
        setDebugInfo(`User: ${user?.email || 'None'}`);

        if (!user) {
          router.replace('/auth/login');
          return;
        }

        setCurrentUser(user);

        if (!user.employee) {
          setDebugInfo(`User: ${user.email}, Employee: None`);
          setLoading(false);
          return;
        }

        const role = user.employee.roles?.[0]?.jobTitle;
        setDebugInfo(`User: ${user.email}, Role: ${role || 'None'}`);

        // Staff portal users must never see the profile-missing / fixer screen
        if (isStaffPortalUser(user.employee.roles)) {
          router.replace(STAFF_PORTAL_PATH);
          return;
        }

        if (!role) {
          setLoading(false);
          return;
        }

        const targetRoute = resolveDashboardPathFromRoles(user.employee.roles);

        if (targetRoute && targetRoute !== '/dashboard') {
          router.replace(targetRoute);
          return;
        }

        setDebugInfo(`User: ${user.email}, Role: ${role}, Destination: ${targetRoute}`);
        setLoading(false);
      } catch (error) {
        console.error('Error redirecting to role dashboard:', error);
        setDebugInfo(`Error: ${error}`);
        setLoading(false);
      }
    };

    const unsubscribe = authService.onAuthStateChange((user) => {
      if (user) {
        redirectToRoleDashboard();
      } else {
        router.replace('/auth/login');
      }
    });

    redirectToRoleDashboard();

    return unsubscribe;
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">{debugInfo}</p>
        </div>
      </div>
    );
  }

  // Profile exists — never show the "missing profile" fixer UI
  if (currentUser?.employee) {
    const role = currentUser.employee.roles?.[0]?.jobTitle || 'Unknown';

    // Keep loading UI while redirecting staff (avoid calling router during render)
    if (isStaffPortalUser(currentUser.employee.roles)) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <HydrationSafeLoader />
            <p className="mt-3 text-gray-600">Opening staff portal…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Unable to open dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your profile is present, but role <strong>{role}</strong> does not have a dashboard route.
          </p>
          <p className="mt-4 text-xs text-slate-500">{debugInfo}</p>
          <button
            type="button"
            onClick={() => {
              const path = resolveDashboardPathFromRoles(currentUser.employee?.roles);
              router.replace(path === '/dashboard' ? '/auth/login' : path);
            }}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={async () => {
              await authService.signOut();
              router.replace('/auth/login');
            }}
            className="mt-3 block w-full text-sm text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const handleCreateAdminProfile = async () => {
    try {
      setLoading(true);
      await UserEmployeeDataFixer.createAdminProfile();
    } catch (error) {
      console.error('Error creating admin profile:', error);
      alert('Failed to create admin profile. Check console for details.');
      setLoading(false);
    }
  };

  const handleCreateAccountantProfile = async () => {
    try {
      const firstName = prompt('Enter your first name:');
      const lastName = prompt('Enter your last name:');
      const nin = prompt('Enter your NIN (14 digits):');

      if (!firstName || !lastName || !nin) {
        alert('All fields are required');
        return;
      }

      if (nin.length !== 14) {
        alert('NIN must be exactly 14 digits');
        return;
      }

      setLoading(true);
      await UserEmployeeDataFixer.createAccountantProfile(firstName, lastName, nin);
    } catch (error) {
      console.error('Error creating accountant profile:', error);
      alert('Failed to create accountant profile. Check console for details.');
      setLoading(false);
    }
  };

  const handleCreatePurchasingManagerProfile = async () => {
    try {
      const firstName = prompt('Enter your first name:');
      const lastName = prompt('Enter your last name:');
      const nin = prompt('Enter your NIN (14 digits):');

      if (!firstName || !lastName || !nin) {
        alert('All fields are required');
        return;
      }

      if (nin.length !== 14) {
        alert('NIN must be exactly 14 digits');
        return;
      }

      setLoading(true);
      await UserEmployeeDataFixer.createPurchasingManagerProfile(firstName, lastName, nin);
    } catch (error) {
      console.error('Error creating purchasing manager profile:', error);
      alert('Failed to create purchasing manager profile. Check console for details.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Employee Profile Missing</h1>
        <p className="text-gray-600 mb-4">
          Your user account exists but your employee profile is missing. Contact your Purchase Manager or HR to register your account.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2 text-red-800">Debug Information:</h3>
          <p className="text-sm text-red-700">{debugInfo}</p>
          {currentUser && (
            <div className="mt-2 text-sm text-red-700">
              <p>
                <strong>Email:</strong> {currentUser.email}
              </p>
              <p>
                <strong>Employee Data:</strong> Missing
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-blue-800">🔧 Admin / Setup Tools</h3>
          <p className="text-sm text-blue-700 mb-4">Only for system setup — not for staff portal roles:</p>

          <div className="space-y-3">
            <button
              onClick={handleCreateAdminProfile}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Admin Profile
            </button>

            <button
              onClick={handleCreateAccountantProfile}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Accountant Profile
            </button>

            <button
              onClick={handleCreatePurchasingManagerProfile}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Create Purchasing Manager Profile
            </button>

            <button
              onClick={async () => {
                try {
                  await quickFixPermissions();
                  alert('Permissions fix attempted. Refresh the page.');
                  window.location.reload();
                } catch (error) {
                  console.error('Permission fix failed:', error);
                  alert('Permission fix failed. Check console for details.');
                }
              }}
              className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Quick Fix Permissions
            </button>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
