'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/ui/Sidebar';
import { authService, AuthUser } from '../../lib/firebase/auth';
import { notificationService } from '../../lib/firebase/notification-service';
import { LogOut, User, ChevronDown, Bell, Settings } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
    
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

  // Load notification count when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      loadNotificationCount();
      
      // Set up interval to refresh notification count periodically
      const interval = setInterval(loadNotificationCount, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadNotificationCount = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const count = await notificationService.getUnreadCount(currentUser.uid);
      setNotificationCount(count);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    console.log('handleSignOut called');
    try {
      setShowUserMenu(false); // Close the menu immediately
      await authService.signOut();
      setCurrentUser(null); // Clear local user state
      router.push('/auth/login'); // Force redirect after sign out
    } catch (error: any) {
      console.error('Error signing out:', error);
      const errorMessage = error?.message || 'Failed to sign out properly';
      alert(`Sign out error: ${errorMessage}\n\nYou will be redirected to the login page.`);
      setCurrentUser(null);
      router.push('/auth/login');
    }
  };

  const getUserRole = () => {
    return currentUser?.employee?.roles?.[0]?.jobTitle || 'User';
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
        <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/equity-logo.png" alt="Equity Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {getUserRole()} Dashboard
                </h1>
                <p className="text-purple-600 font-medium">
                  Welcome back, 
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button 
                onClick={async () => {
                  try {
                    // Generate notifications if user has none
                    if (notificationCount === 0 && currentUser) {
                      const userRole = currentUser.employee?.roles?.[0]?.jobTitle || 'general';
                      await notificationService.generateNotifications(currentUser.uid, userRole);
                      await loadNotificationCount();
                    }
                    router.push('/dashboard/notifications');
                  } catch (error) {
                    console.error('Error handling notification click:', error);
                  router.push('/dashboard/notifications');
                  }
                }}
                className="relative p-2 bg-white rounded-full shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200 group"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                {/* Notification Badge */}
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{notificationCount}</span>
                  </span>
                )}
              </button>
              
              {/* Settings */}
              <button 
                onClick={() => router.push('/dashboard/settings')}
                className="p-2 bg-white rounded-full shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200 group"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
              </button>
              
              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 bg-white rounded-full px-4 py-2 shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center group-hover:from-purple-600 group-hover:to-violet-700 transition-all duration-200">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700 transition-colors">
                      {currentUser?.employee?.firstName} {currentUser?.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{getUserRole()}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-all duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50 min-w-[200px]">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{getUserRole()}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    </div>
                    <button 
                      onClick={() => router.push('/dashboard/settings')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button 
                      onClick={() => router.push('/dashboard/notifications')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Notifications
                    </button>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onMouseDown={async () => { console.log('Dropdown sign out clicked'); setShowUserMenu(false); await handleSignOut(); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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