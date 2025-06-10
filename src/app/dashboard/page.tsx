'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthUser } from '../../lib/firebase/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

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
          'Admin': '/dashboard/admin',
          'Manager': '/dashboard/manager',
          'Accountant': '/dashboard/accountant',
          'Purchase Manager': '/dashboard/purchase-manager',
          'HR': '/dashboard/hr',
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">{debugInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Issue</h1>
        <p className="text-gray-600 mb-4">Unable to determine your role or access level.</p>
        <div className="bg-gray-100 p-4 rounded-lg text-left">
          <h3 className="font-semibold mb-2">Debug Information:</h3>
          <p className="text-sm text-gray-700">{debugInfo}</p>
          {currentUser && (
            <div className="mt-2 text-sm">
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
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
} 