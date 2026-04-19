'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthUser } from '@/lib/firebase/auth';
import AuthContainer from './AuthContainer';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback 
}: ProtectedRouteProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      
      if (user) {
        // Check if user has required roles
        if (requiredRoles.length === 0) {
          setHasAccess(true);
        } else {
          const hasRequiredRole = authService.hasAnyRole(requiredRoles);
          setHasAccess(hasRequiredRole);
        }
      } else {
        setHasAccess(false);
      }
      
      setIsLoading(false);
    };

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      
      if (user) {
        // Check if user has required roles
        if (requiredRoles.length === 0) {
          setHasAccess(true);
        } else {
          const hasRequiredRole = authService.hasAnyRole(requiredRoles);
          setHasAccess(hasRequiredRole);
        }
      } else {
        setHasAccess(false);
        // Redirect to login when user is signed out
        router.push('/auth/login');
      }
      
      setIsLoading(false);
    });

    checkAuth();

    return unsubscribe;
  }, [requiredRoles, router]);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      // Redirect will be handled by the auth state change listener
    } catch (error) {
      console.error('Error signing out:', error);
      // If there's an error, still try to redirect
      router.push('/auth/login');
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show auth container
  if (!currentUser) {
    return (
      <AuthContainer 
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          router.push(authService.getDefaultDashboardPath(user));
        }} 
      />
    );
  }

  // If user doesn't have required roles, show access denied
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Required roles: {requiredRoles.join(', ')}
          </p>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
          {fallback && (
            <div className="mt-4">
              {fallback}
            </div>
          )}
        </div>
      </div>
    );
  }

  // User is authenticated and has access, render children
  return <>{children}</>;
} 