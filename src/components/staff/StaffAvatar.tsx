'use client';

import React, { useState } from 'react';
import { User, X, Camera } from 'lucide-react';
import { EQUITY_BRAND } from '@/components/staff/brand';

interface StaffAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Allow clicking to open a larger preview */
  previewable?: boolean;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-28 w-28',
} as const;

const ICON_SIZE = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-10 w-10',
} as const;

export function StaffAvatar({
  photoUrl,
  name,
  size = 'md',
  previewable = false,
  className = '',
}: StaffAvatarProps) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(photoUrl) && !broken;

  const avatar = (
    <div
      className={`${SIZE_CLASS[size]} shrink-0 overflow-hidden rounded-full border-2 ${className}`}
      style={{
        borderColor: showPhoto ? EQUITY_BRAND.green : EQUITY_BRAND.purpleSoft,
        backgroundColor: EQUITY_BRAND.purpleSoft,
      }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <User className={ICON_SIZE[size]} style={{ color: EQUITY_BRAND.purple }} />
        </div>
      )}
    </div>
  );

  if (!previewable || !showPhoto) {
    return avatar;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ ['--tw-ring-color' as string]: EQUITY_BRAND.green }}
        title="View profile photo"
      >
        {avatar}
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-white text-white shadow"
          style={{ backgroundColor: EQUITY_BRAND.purple }}
        >
          <Camera className="h-3 w-3" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close photo"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl dark:bg-[#120818]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="overflow-hidden rounded-xl border-2"
              style={{ borderColor: EQUITY_BRAND.green }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl!}
                alt={`${name} profile`}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">Passport photo</p>
          </div>
        </div>
      )}
    </>
  );
}
