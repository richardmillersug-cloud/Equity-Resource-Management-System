'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/ui/Sidebar';
import { authService, AuthUser } from '../../lib/firebase/auth';
import { LogOut, User, ChevronDown } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);

    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // If user is null (signed out), redirect to login
      if (!user) {
        router.push('/auth/login');
      }
    });

    return unsubscribe;
  }, [router]);

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false); // Close the menu immediately
      await authService.signOut();
      // The redirect will be handled by the auth state change listener
    } catch (error: any) {
      console.error('Error signing out:', error);
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to sign out properly';
      alert(`Sign out error: ${errorMessage}\n\nYou will be redirected to the login page.`);
      
      // If there's an error, still try to redirect
      router.push('/auth/login');
    }
  };

  const getUserRole = () => {
    return currentUser?.employee?.roles?.[0]?.jobTitle || 'User';
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, don't render the dashboard (redirect will happen via useEffect)
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {getUserRole()} Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {currentUser?.employee?.firstName || 'User'}
              </p>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-700 font-medium">
                  {currentUser?.employee?.firstName} {currentUser?.employee?.lastName}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <p className="font-medium">{getUserRole()}</p>
                    <p className="text-gray-500">{currentUser?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 