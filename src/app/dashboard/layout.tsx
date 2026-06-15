'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAdminUser, isAdminBlockedPath, ADMIN_BASE_PATH } from '../../lib/firebase/admin-access';
import { Sidebar } from '../../components/ui/Sidebar';
import { authService, AuthUser } from '../../lib/firebase/auth';
import { notificationService } from '../../lib/firebase/notification-service';
import { LogOut, User, ChevronDown, Bell, Settings } from 'lucide-react';
import { QuickThemeToggle } from '../../components/ui/ThemeToggle';
import HydrationSafeLoader from '../../components/ui/HydrationSafeLoader';

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
  const pathname = usePathname();
  const isAdmin = isAdminUser(currentUser);

  useEffect(() => {
    if (!currentUser || !isAdminUser(currentUser) || !pathname) return;
    if (isAdminBlockedPath(pathname)) {
      router.replace(ADMIN_BASE_PATH);
    }
  }, [currentUser, pathname, router]);

  useEffect(() => {
    setHasMounted(true);
    
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);

    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (!user) {
        router.push('/auth/login');
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (currentUser?.uid && !isAdminUser(currentUser)) {
      loadNotificationCount();
      const interval = setInterval(loadNotificationCount, 30000);
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
    try {
      setShowUserMenu(false);
      await authService.signOut();
      setCurrentUser(null);
      router.push('/auth/login');
    } catch (error: unknown) {
      console.error('Error signing out:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to sign out properly';
      alert(`Sign out error: ${errorMessage}\n\nYou will be redirected to the login page.`);
      setCurrentUser(null);
      router.push('/auth/login');
    }
  };

  const getUserRole = () => {
    return currentUser?.employee?.roles?.[0]?.jobTitle || 'User';
  };

  const headerTitle = isAdmin ? 'Administration' : `${getUserRole()} Dashboard`;

  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isAdmin && pathname && isAdminBlockedPath(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="text-gray-600 mt-4">Redirecting to Admin console…</p>
        </div>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/equity-logo.png" alt="Equity Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
                <p className="text-purple-600 font-medium">
                  Welcome back, {currentUser?.employee?.firstName || currentUser?.displayName || 'User'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {!isAdmin && (
                <>
                  <button 
                    onClick={async () => {
                      try {
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
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{notificationCount}</span>
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => router.push('/dashboard/settings')}
                    className="p-2 bg-white rounded-full shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200 group"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  </button>
                </>
              )}

              <QuickThemeToggle />

              <div className="relative dropdown-container">
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
                    <p className="text-xs text-gray-500">{isAdmin ? 'Admin' : getUserRole()}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-all duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50 min-w-[200px]">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{isAdmin ? 'Admin' : getUserRole()}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    </div>
                    {!isAdmin && (
                      <>
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
                      </>
                    )}
                    <div className={`border-t border-gray-100 pt-2 ${!isAdmin ? 'mt-2' : ''}`}>
                      <button
                        onMouseDown={async () => {
                          setShowUserMenu(false);
                          await handleSignOut();
                        }}
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

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
