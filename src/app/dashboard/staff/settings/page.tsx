'use client';

import React from 'react';
import { Settings, User, Moon, Sun, Monitor, Mail, Briefcase, Camera } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useStaffPortalData } from '@/components/staff/useStaffPortalData';
import { StaffAvatar } from '@/components/staff/StaffAvatar';
import { EQUITY_BRAND } from '@/components/staff/brand';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';
import { getShiftDefinition } from '@/lib/firebase/staff-shifts';

export default function StaffSettingsPage() {
  const { theme, actualTheme, setTheme } = useTheme();
  const { loading, employeeName, jobTitle, user } = useStaffPortalData();
  const photoUrl = user?.employee?.passportPhoto;
  const shift = getShiftDefinition(user?.employee?.assignedShift);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your profile</h2>
        </div>

        <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <StaffAvatar
            photoUrl={photoUrl}
            name={employeeName}
            size="xl"
            previewable
          />
          <div className="text-center sm:pt-2 sm:text-left">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{employeeName}</p>
            <p className="text-sm font-medium" style={{ color: EQUITY_BRAND.orange }}>
              {jobTitle}
            </p>
            {photoUrl ? (
              <p className="mt-2 inline-flex items-center gap-1 text-xs" style={{ color: EQUITY_BRAND.green }}>
                <Camera className="h-3 w-3" />
                Tap photo to view full size
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                No profile photo on file. Ask your Purchase Manager to add one when registering.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            <User className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</p>
              <p className="font-medium text-slate-900 dark:text-white">{employeeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
              <p className="font-medium text-slate-900 dark:text-white">{jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            {shift.id === 'night' ? (
              <Moon className="h-4 w-4 text-slate-400" />
            ) : (
              <Sun className="h-4 w-4 text-slate-400" />
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Shift</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {shift.label} · {shift.hoursLabel}
              </p>
              <p className="text-xs text-slate-500">
                {shift.durationHours.toFixed(1)} hours expected per working day (default). Shifts can change day to day.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            <Mail className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Email</p>
              <p className="font-medium text-slate-900 dark:text-white">{user?.email || '—'}</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Profile changes are managed by your Purchase Manager or HR.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          {actualTheme === 'dark' ? (
            <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          ) : (
            <Sun className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          )}
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
        </div>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
          Choose light or dark mode. System follows your device setting.
        </p>

        <div className="mb-4">
          <ThemeToggle />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ThemeChoiceCard
            active={theme === 'light'}
            icon={Sun}
            title="Light"
            description="Bright background"
            onClick={() => setTheme('light')}
          />
          <ThemeChoiceCard
            active={theme === 'dark'}
            icon={Moon}
            title="Dark"
            description="Low-light friendly"
            onClick={() => setTheme('dark')}
          />
          <ThemeChoiceCard
            active={theme === 'system'}
            icon={Monitor}
            title="System"
            description="Match device"
            onClick={() => setTheme('system')}
          />
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Active mode: <span className="font-medium capitalize">{actualTheme}</span>
          {theme === 'system' ? ' (from system)' : ''}
        </p>
      </section>
    </div>
  );
}

function ThemeChoiceCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <Icon className="mb-2 h-4 w-4" />
      <p className="text-sm font-semibold">{title}</p>
      <p className={`text-xs ${active ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>
        {description}
      </p>
    </button>
  );
}
