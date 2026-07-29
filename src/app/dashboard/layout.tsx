'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAdminUser, isAdminBlockedPath, ADMIN_BASE_PATH } from '../../lib/firebase/admin-access';
import {
  isStaffPortalUser,
  STAFF_PORTAL_PATH,
} from '../../lib/firebase/staff-portal-roles';
import { StaffSidebar } from '../../components/staff/StaffSidebar';
import { staffBrandStyle, EQUITY_BRAND } from '../../components/staff/brand';
import { Sidebar } from '../../components/ui/Sidebar';
import { authService, AuthUser } from '../../lib/firebase/auth';
import {
  getEmploymentLoginBlockMessage,
  isEmployeeAllowedToLogin,
} from '../../lib/firebase/employment-access';
import { firestoreServices } from '../../lib/firebase/firestore-service';
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
  const isStaff = isStaffPortalUser(currentUser?.employee?.roles);

  useEffect(() => {
    if (!currentUser || !isAdminUser(currentUser) || !pathname) return;
    if (isAdminBlockedPath(pathname)) {
      router.replace(ADMIN_BASE_PATH);
    }
  }, [currentUser, pathname, router]);

  // Staff portal roles may only use /dashboard/staff
  useEffect(() => {
    if (!currentUser || !isStaffPortalUser(currentUser.employee?.roles) || !pathname) return;
    if (!pathname.startsWith(STAFF_PORTAL_PATH)) {
      router.replace(STAFF_PORTAL_PATH);
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
        return;
      }

      if (user.employee && !isEmployeeAllowedToLogin(user.employee)) {
        const status = user.employee.employmentStatus || 'Inactive';
        void authService.signOut().finally(() => {
          router.replace(
            `/auth/login?status=${encodeURIComponent(status)}&blocked=${encodeURIComponent(
              getEmploymentLoginBlockMessage(status)
            )}`
          );
        });
      }
    });

    return unsubscribe;
  }, [router]);

  // Kick out Inactive / Terminated users who still have a cached session
  useEffect(() => {
    if (!currentUser?.uid) return;

    let cancelled = false;

    const verifyStatus = async () => {
      try {
        const employee = await firestoreServices.employee.getById(currentUser.uid);
        if (cancelled) return;

        if (employee && !isEmployeeAllowedToLogin(employee)) {
          await authService.signOut();
          router.replace(
            `/auth/login?status=${encodeURIComponent(employee.employmentStatus)}&blocked=${encodeURIComponent(
              getEmploymentLoginBlockMessage(employee.employmentStatus)
            )}`
          );
        }
      } catch (err) {
        console.error('Failed to verify employment status:', err);
      }
    };

    void verifyStatus();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Redirecting to Admin console…</p>
        </div>
      </div>
    );
  }

  // Staff portal shell — Equity Shoppers brand colors from logo
  if (isStaff) {
    return (
      <div
        className="flex h-dvh min-h-0 flex-col overflow-hidden dark:bg-[#0A0A0A] lg:flex-row"
        style={{
          ...staffBrandStyle,
          background: `linear-gradient(160deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 42%, ${EQUITY_BRAND.orangeSoft} 72%, ${EQUITY_BRAND.greenSoft} 100%)`,
        }}
      >
        <StaffSidebar user={currentUser} onSignOut={handleSignOut} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden dark:bg-[#0A0A0A]/90">
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8">
            <div className="page-shell mx-auto flex h-full w-full max-w-7xl flex-col">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 lg:flex-row">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-purple-100 bg-white/90 px-3 py-2.5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="hidden min-w-0 items-center gap-3 sm:flex">
              <img src="/equity-logo.png" alt="Equity Logo" className="hidden h-9 w-auto object-contain lg:block" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
                  {headerTitle}
                </h1>
                <p className="hidden truncate text-sm font-medium text-purple-600 dark:text-purple-400 md:block">
                  Welcome back,{' '}
                  {currentUser?.employee?.firstName || currentUser?.displayName || 'User'}
                </p>
              </div>
            </div>
            <div className="min-w-0 sm:hidden">
              <h1 className="truncate text-base font-bold text-gray-900 dark:text-white">{headerTitle}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 sm:space-x-0">
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
                    className="group relative rounded-full border border-purple-100 bg-white p-2 shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-600 dark:bg-gray-800"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5 text-gray-600 transition-colors group-hover:text-purple-600 dark:text-gray-300 dark:group-hover:text-purple-400" />
                    {notificationCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                        <span className="text-xs font-bold text-white">{notificationCount}</span>
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="group hidden rounded-full border border-purple-100 bg-white p-2 shadow-sm transition-all duration-200 hover:shadow-md sm:inline-flex dark:border-gray-600 dark:bg-gray-800"
                    title="Settings"
                  >
                    <Settings className="h-5 w-5 text-gray-600 transition-colors group-hover:text-purple-600 dark:text-gray-300 dark:group-hover:text-purple-400" />
                  </button>
                </>
              )}

              <QuickThemeToggle />

              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="group flex cursor-pointer items-center gap-2 rounded-full border border-purple-100 bg-white px-2 py-1.5 shadow-sm transition-all duration-200 hover:shadow-md sm:space-x-3 sm:px-4 sm:py-2 dark:border-gray-600 dark:bg-gray-800"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-200 group-hover:from-purple-600 group-hover:to-violet-700">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium text-gray-900 transition-colors group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-300">
                      {currentUser?.employee?.firstName} {currentUser?.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isAdmin ? 'Admin' : getUserRole()}
                    </p>
                  </div>
                  <ChevronDown
                    className={`hidden h-4 w-4 text-gray-400 transition-all duration-200 group-hover:text-purple-600 sm:block dark:text-gray-500 ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-2xl border border-gray-100 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {isAdmin ? 'Admin' : getUserRole()}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
                    </div>
                    {!isAdmin && (
                      <>
                        <button
                          onClick={() => router.push('/dashboard/settings')}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300"
                        >
                          <User className="h-4 w-4" />
                          Profile Settings
                        </button>
                        <button
                          onClick={() => router.push('/dashboard/notifications')}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300"
                        >
                          <Bell className="h-4 w-4" />
                          Notifications
                        </button>
                      </>
                    )}
                    <div className={`border-t border-gray-100 pt-2 dark:border-gray-700 ${!isAdmin ? 'mt-2' : ''}`}>
                      <button
                        onMouseDown={async () => {
                          setShowUserMenu(false);
                          await handleSignOut();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-950">
          <div className="page-shell mx-auto w-full p-3 sm:p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
