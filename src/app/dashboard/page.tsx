'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthUser } from '../../lib/firebase/auth';
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
  const [fixerLoaded, setFixerLoaded] = useState(false);

  useEffect(() => {
    // Load the fixer utility
    try {
      setFixerLoaded(true);
      
      // Add console helpers for debugging
      (window as any).debugUserData = {
        checkUser: () => {
          const user = authService.getCurrentUser();
          console.log('Current user:', user);
          return user;
        },
        checkEmployee: async () => {
          const exists = await UserEmployeeDataFixer.checkEmployeeDataExists();
          console.log('Employee data exists:', exists);
          return exists;
        },
        diagnosePermissions: diagnosePermissions,
        quickFixPermissions: quickFixPermissions,
        testPermissions: testPermissions,
        cleanupPurchasingManagers: cleanupPurchasingManagers,
        createNewPurchasingManager: createNewPurchasingManager,
        getDatabaseStats: getDatabaseStats,
        fixAllPermissions: fixAllPermissions,
        quickPermissionFix: quickPermissionFix,
        getUpdatedFirestoreRules: getUpdatedFirestoreRules
      };
      
      console.log('🔧 Debug commands available:');
      console.log('- debugUserData.checkUser() - Check current user');
      console.log('- debugUserData.checkEmployee() - Check if employee data exists');
      console.log('- debugUserData.diagnosePermissions() - Run full permission diagnosis');
      console.log('- debugUserData.quickFixPermissions() - Try to fix permission issues');
      console.log('- debugUserData.testPermissions() - Test if permissions are working');
      console.log('- debugUserData.cleanupPurchasingManagers() - Clean up all purchasing manager users');
      console.log('- debugUserData.createNewPurchasingManager(email, password, firstName, lastName, nin) - Create new purchasing manager');
      console.log('- debugUserData.getDatabaseStats() - Show database statistics');
      console.log('- debugUserData.fixAllPermissions() - FINAL FIX: Solve all permission issues permanently');
      console.log('- debugUserData.quickPermissionFix() - Quick emergency permission fix');
      console.log('- debugUserData.getUpdatedFirestoreRules() - Get updated Firestore rules');
    } catch (error) {
      console.error('Failed to load employee data fixer:', error);
    }
  }, []);

  useEffect(() => {
    const redirectToRoleDashboard = async () => {
      try {
        // Wait for auth state to be determined
        const user = authService.getCurrentUser();
        console.log('Current user:', user);
        setDebugInfo(`User: ${user?.email || 'None'}`);
        
        if (!user) {
          console.log('No user found, redirecting to login');
          router.push('/auth/login');
          return;
        }

        setCurrentUser(user);

        // Check if employee data is loaded
        if (!user.employee) {
          console.log('No employee data found for user');
          setDebugInfo(`User: ${user.email}, Employee: None`);
          setLoading(false);
          return;
        }

        console.log('Employee data:', user.employee);
        console.log('Employee roles:', user.employee.roles);

        const role = user.employee.roles?.[0]?.jobTitle;
        console.log('Detected role:', role);
        setDebugInfo(`User: ${user.email}, Role: ${role || 'None'}`);

        if (!role) {
          console.error('No role found for user');
          setLoading(false);
          return;
        }

        // Route to role-specific dashboard
        const roleRoutes: Record<string, string> = {
          'System Admin': '/dashboard/admin',
          'Admin': '/dashboard/admin',
          'Managing Director': '/dashboard/managing-director',
          'Manager': '/dashboard/manager',
          'Accountant': '/dashboard/analytics',
          'Purchase Manager': '/dashboard/purchase-manager',
          'Purchasing Manager': '/dashboard/purchase-manager', // Added alias for consistency
          'HR Manager': '/dashboard/hr',
          'HR': '/dashboard/hr', // Keep for backward compatibility
          'Stock Manager': '/dashboard/stock-manager',
          'Receiver': '/dashboard/receiver',
          'Auditor': '/dashboard/auditor'
        };

        const targetRoute = roleRoutes[role];
        console.log('Target route for role', role, ':', targetRoute);
        
        if (targetRoute) {
          console.log('Redirecting to:', targetRoute);
          router.push(targetRoute);
        } else {
          console.error('Unknown role:', role);
          setDebugInfo(`User: ${user.email}, Role: ${role}, Error: Unknown role`);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error redirecting to role dashboard:', error);
        setDebugInfo(`Error: ${error}`);
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      console.log('Auth state changed:', user);
      if (user) {
        redirectToRoleDashboard();
      } else {
        router.push('/auth/login');
      }
    });

    // Also try immediately in case auth is already loaded
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
        <p className="text-gray-600 mb-4">Your user account exists but your employee profile is missing. You need to create it to access the system.</p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2 text-red-800">Debug Information:</h3>
          <p className="text-sm text-red-700">{debugInfo}</p>
          {currentUser && (
            <div className="mt-2 text-sm text-red-700">
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Employee Data:</strong> {currentUser.employee ? 'Present' : 'Missing'}</p>
              {currentUser.employee && (
                <>
                  <p><strong>Name:</strong> {currentUser.employee.firstName} {currentUser.employee.lastName}</p>
                  <p><strong>Roles:</strong> {JSON.stringify(currentUser.employee.roles)}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-red-800">🧹 Clean Up & Reset</h3>
          <p className="text-sm text-red-700 mb-4">Start fresh by cleaning up existing purchasing manager accounts:</p>
          
          <div className="space-y-2">
            <button
              onClick={async () => {
                if (confirm('⚠️ This will DELETE ALL existing purchasing manager users from both Firebase Auth and Firestore. Are you sure?')) {
                  try {
                    await cleanupPurchasingManagers();
                    alert('✅ Cleanup completed! Check console for details. You can now create new accounts.');
                  } catch (error) {
                    console.error('Cleanup failed:', error);
                    alert('❌ Cleanup failed. Check console for details.');
                  }
                }
              }}
              className="w-full px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 text-sm font-medium"
            >
              🗑️ Clean Up All Purchasing Managers
            </button>
            
            <button
              onClick={async () => {
                const email = prompt('Enter email for new purchasing manager:');
                const password = prompt('Enter password (min 6 characters):');
                const firstName = prompt('Enter first name:');
                const lastName = prompt('Enter last name:');
                const nin = prompt('Enter 14-digit NIN:');
                const phone = prompt('Enter phone number (optional):');
                
                if (!email || !password || !firstName || !lastName || !nin) {
                  alert('All fields except phone are required');
                  return;
                }
                
                if (password.length < 6) {
                  alert('Password must be at least 6 characters');
                  return;
                }
                
                if (nin.length !== 14) {
                  alert('NIN must be exactly 14 digits');
                  return;
                }
                
                try {
                  await createNewPurchasingManager(email, password, firstName, lastName, nin, phone || undefined);
                  alert('✅ New purchasing manager created successfully! Check console for details.');
                } catch (error) {
                  console.error('Creation failed:', error);
                  alert('❌ Failed to create user. Check console for details.');
                }
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              ➕ Create New Purchasing Manager
            </button>
            
            <button
              onClick={async () => {
                await getDatabaseStats();
                console.log('Check console for database statistics');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              📊 Show Database Stats
            </button>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-red-800">🚨 PERMISSIONS ERROR FIX</h3>
          <p className="text-sm text-red-700 mb-4">If you're getting "Missing or insufficient permissions" error, click this button:</p>
          
          <div className="space-y-2">
            <button
              onClick={async () => {
                try {
                  console.log('🚨 PM EMERGENCY PERMISSIONS FIX');
                  console.log('================================');
                  
                  // Import and run the PM emergency fix
                  const { fixPMPermissions } = await import('../../lib/firebase/pm-permissions-emergency-fix');
                  await fixPMPermissions();
                  
                  alert('🎉 PM PERMISSIONS FIXED! The page will refresh automatically.');
                  
                  // Refresh the page after a short delay
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                  
                } catch (error) {
                  console.error('PM emergency fix failed:', error);
                  alert('❌ PM emergency fix failed. Check console for details.');
                }
              }}
              className="w-full px-4 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 text-sm font-bold"
            >
              🚨 PM EMERGENCY PERMISSIONS FIX
            </button>
            
            <button
              onClick={async () => {
                try {
                  console.log('🔧 GENERAL PERMISSIONS FIX');
                  console.log('============================');
                  
                  // Import and run the finance permissions fix
                  const { fixFinancePermissions } = await import('../../lib/firebase/finance-permissions-fix');
                  await fixFinancePermissions();
                  
                  // Also run the general permissions fix
                  const { fixAllPermissions } = await import('../../lib/firebase/permissions-final-fix');
                  await fixAllPermissions();
                  
                  alert('🎉 GENERAL PERMISSIONS FIXED! The page will refresh automatically.');
                  
                  // Refresh the page after a short delay
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                  
                } catch (error) {
                  console.error('General emergency fix failed:', error);
                  alert('❌ General emergency fix failed. Check console for details.');
                }
              }}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-bold"
            >
              🔧 GENERAL PERMISSIONS FIX
            </button>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-green-800">🔥 FINAL SOLUTION</h3>
          <p className="text-sm text-green-700 mb-4">Solve Firebase permission issues once and for all:</p>
          
          <div className="space-y-2">
            <button
              onClick={async () => {
                try {
                  console.log('💰 Running Finance Permissions Fix...');
                  const { fixFinancePermissions } = await import('../../lib/firebase/finance-permissions-fix');
                  await fixFinancePermissions();
                  alert('💰 FINANCE PERMISSIONS FIXED! Your account now complies with all business rules.');
                } catch (error) {
                  console.error('Finance permissions fix failed:', error);
                  alert('❌ Finance fix failed. Check console for details.');
                }
              }}
              className="w-full px-4 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-bold"
            >
              💰 FIX FINANCE PERMISSIONS (Business Rules)
            </button>
            
            <button
              onClick={async () => {
                try {
                  await fixAllPermissions();
                  alert('🎉 ALL PERMISSIONS FIXED! Please refresh your browser page now.');
                } catch (error) {
                  console.error('Final fix failed:', error);
                  alert('❌ Final fix failed. Check console and try manual method.');
                }
              }}
              className="w-full px-4 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-bold"
            >
              🔥 FIX ALL PERMISSIONS PERMANENTLY
            </button>
            
            <button
              onClick={async () => {
                try {
                  await quickPermissionFix();
                  alert('⚡ Quick fix applied! Please refresh your browser page.');
                } catch (error) {
                  console.error('Quick fix failed:', error);
                  alert('❌ Quick fix failed. Try the full fix or manual method.');
                }
              }}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              ⚡ Quick Emergency Fix
            </button>
            
            <button
              onClick={() => {
                const rules = getUpdatedFirestoreRules();
                console.log('📋 UPDATED FIRESTORE RULES:');
                console.log(rules);
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(rules).then(() => {
                    alert('📋 Firestore rules copied to clipboard! Paste them in Firebase Console → Firestore → Rules');
                  }).catch(() => {
                    alert('📋 Rules logged to console. Copy them manually to Firebase Console.');
                  });
                } else {
                  alert('📋 Rules logged to console. Copy them manually to Firebase Console.');
                }
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              📋 Get Updated Firestore Rules
            </button>
            
            <button
              onClick={async () => {
                try {
                  const { getFinanceFirestoreRules } = await import('../../lib/firebase/finance-permissions-fix');
                  const rules = getFinanceFirestoreRules();
                  console.log('💰 FINANCE FIRESTORE RULES:');
                  console.log(rules);
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(rules).then(() => {
                      alert('💰 Finance Firestore rules copied to clipboard! These include all business rules for finance tables.');
                    }).catch(() => {
                      alert('💰 Finance rules logged to console. Copy them manually to Firebase Console.');
                    });
                  } else {
                    alert('💰 Finance rules logged to console. Copy them manually to Firebase Console.');
                  }
                } catch (error) {
                  console.error('Failed to get finance rules:', error);
                  alert('❌ Failed to get finance rules. Check console.');
                }
              }}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
            >
              💰 Get Finance Firestore Rules
            </button>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-orange-800">🚨 Backup Methods</h3>
          <p className="text-sm text-orange-700 mb-4">If the final fix doesn't work, try these backup methods:</p>
          
          <div className="space-y-2">
            <button
              onClick={() => {
                diagnosePermissions();
                console.log('Check console for detailed diagnosis results');
              }}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
            >
              🔍 Diagnose Permission Issues
            </button>
            
            <button
              onClick={async () => {
                try {
                  await quickFixPermissions();
                  alert('Permission fix completed! Check console for details and try refreshing the page.');
                } catch (error) {
                  console.error('Permission fix failed:', error);
                  alert('Could not auto-fix. Check console for details.');
                }
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              🔧 Quick Fix Permissions
            </button>
            
            <button
              onClick={async () => {
                const working = await testPermissions();
                alert(working ? 'Permissions are working!' : 'Permissions still have issues. Check console.');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              🧪 Test Permissions
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 text-blue-800">🔧 Fix Your Account</h3>
          <p className="text-sm text-blue-700 mb-4">Choose the option that matches your role:</p>
          
          <div className="space-y-3">
            <button
              onClick={handleCreateAdminProfile}
              disabled={loading}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : '👑 Create Admin Profile (business + platform)'}
            </button>
            
            <button
              onClick={handleCreateAccountantProfile}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : '💰 Create Accountant Profile'}
            </button>
            
            <button
              onClick={handleCreatePurchasingManagerProfile}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : '🛒 Create Purchasing Manager Profile'}
            </button>
          </div>
          
          <p className="text-xs text-blue-600 mt-3">
            This will create your employee profile and redirect you to the appropriate dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
          >
            🔄 Refresh Page
          </button>
          
          <button
            onClick={() => authService.signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
} 