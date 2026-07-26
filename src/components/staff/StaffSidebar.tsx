'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  LogOut,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import { AuthUser } from '@/lib/firebase/auth';
import { STAFF_PORTAL_PATH } from '@/lib/firebase/staff-portal-roles';
import { QuickThemeToggle } from '@/components/ui/ThemeToggle';
import { EQUITY_BRAND } from '@/components/staff/brand';
import { StaffAvatar } from '@/components/staff/StaffAvatar';

const STAFF_NAV = [
  {
    id: 'home',
    label: 'Portal Home',
    path: STAFF_PORTAL_PATH,
    icon: LayoutDashboard,
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: `${STAFF_PORTAL_PATH}/attendance`,
    icon: Clock,
  },
  {
    id: 'leave',
    label: 'Leave',
    path: `${STAFF_PORTAL_PATH}/leave`,
    icon: CalendarCheck,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: `${STAFF_PORTAL_PATH}/settings`,
    icon: Settings,
  },
] as const;

interface StaffSidebarProps {
  user: AuthUser | null;
  onSignOut: () => void;
}

export function StaffSidebar({ user, onSignOut }: StaffSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.employee?.roles?.[0]?.jobTitle || 'Staff';
  const name = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.displayName || 'Staff';
  const photoUrl = user?.employee?.passportPhoto;

  const isActive = (path: string) => {
    if (path === STAFF_PORTAL_PATH) {
      return pathname === STAFF_PORTAL_PATH;
    }
    return pathname?.startsWith(path) ?? false;
  };

  const navigate = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setMobileOpen(false);
    onSignOut();
  };

  const sidebarBody = (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-[#120818]">
      <div className="border-b border-[#6A2B81]/20 bg-gradient-to-br from-[#F3EAF7] via-white to-[#E8F7E9] px-4 py-5 dark:border-white/10 dark:from-[#1a0f22] dark:via-[#120818] dark:to-[#0f1a12]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/equity-logo.png" alt="Equity" className="h-10 w-auto object-contain" />
          <div>
            <p className="text-sm font-semibold" style={{ color: EQUITY_BRAND.purple }}>
              Staff Portal
            </p>
            <p className="text-xs font-medium" style={{ color: EQUITY_BRAND.green }}>
              Equity Shoppers
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-[#6A2B81]/15 px-4 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <StaffAvatar photoUrl={photoUrl} name={name} size="md" previewable />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{name}</p>
            <p className="truncate text-xs" style={{ color: EQUITY_BRAND.orange }}>
              {role}
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {STAFF_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-slate-700 hover:bg-[#F3EAF7] dark:text-slate-300 dark:hover:bg-white/5'
              }`}
              style={
                active
                  ? { backgroundColor: EQUITY_BRAND.green }
                  : undefined
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-2 border-t border-[#6A2B81]/15 bg-white p-3 dark:border-white/10 dark:bg-[#120818]">
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: EQUITY_BRAND.purpleSoft }}
        >
          <span className="text-xs font-medium" style={{ color: EQUITY_BRAND.purple }}>
            Theme
          </span>
          <QuickThemeToggle />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="contents lg:contents">
      <div
        className="sticky top-0 z-40 flex w-full items-center justify-between border-b bg-white px-4 py-3 dark:bg-[#120818] lg:hidden"
        style={{ borderColor: `${EQUITY_BRAND.purple}33` }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/equity-logo.png" alt="Equity" className="h-8 w-auto object-contain" />
          <span className="text-sm font-semibold" style={{ color: EQUITY_BRAND.purple }}>
            Staff Portal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <QuickThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg border p-2"
            style={{ borderColor: `${EQUITY_BRAND.green}66`, color: EQUITY_BRAND.purple }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl dark:bg-[#120818]">
            {sidebarBody}
          </aside>
        </div>
      )}

      <aside
        className="hidden h-dvh w-64 shrink-0 overflow-hidden border-r bg-white dark:bg-[#120818] lg:flex lg:flex-col"
        style={{ borderColor: `${EQUITY_BRAND.purple}22` }}
      >
        {sidebarBody}
      </aside>
    </div>
  );
}
