'use client';

import React, { useEffect, useState } from 'react';
import { authService, LoginData, AuthError, AuthUser } from '@/lib/firebase/auth';
import {
  getEmploymentLoginBlockMessage,
  getEmploymentLoginBlockTitle,
  resolveEmploymentBlockFromError,
} from '@/lib/firebase/employment-access';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Ban, UserX } from 'lucide-react';
import { QuickThemeToggle } from '@/components/ui/ThemeToggle';
import { EQUITY_BRAND } from '@/components/staff/brand';

interface LoginFormProps {
  onSuccess?: (user?: AuthUser) => void;
  initialError?: string | null;
  initialBlockStatus?: 'Terminated' | 'Inactive' | 'Other' | null;
}

export default function LoginForm({
  onSuccess,
  initialError = null,
  initialBlockStatus = null,
}: LoginFormProps) {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialBlockStatus ? getEmploymentLoginBlockMessage(initialBlockStatus) : initialError
  );
  const [blockStatus, setBlockStatus] = useState<'Terminated' | 'Inactive' | 'Other' | null>(
    initialBlockStatus
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (initialBlockStatus) {
      setBlockStatus(initialBlockStatus);
      setError(getEmploymentLoginBlockMessage(initialBlockStatus));
    } else if (initialError) {
      const resolved = resolveEmploymentBlockFromError({ message: initialError });
      setBlockStatus(resolved);
      setError(initialError);
    }
  }, [initialError, initialBlockStatus]);

  const clearAccessError = () => {
    if (error) setError(null);
    if (blockStatus) setBlockStatus(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    clearAccessError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBlockStatus(null);

    try {
      const user = await authService.signIn(formData);
      onSuccess?.(user);
    } catch (err: unknown) {
      const denial = authService.getLastAccessDenial();
      const authError = (denial || err) as AuthError;
      const blocked = resolveEmploymentBlockFromError(authError);
      setBlockStatus(blocked);
      setError(
        blocked
          ? getEmploymentLoginBlockMessage(blocked === 'Other' ? null : blocked)
          : authError.message || 'Sign in failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      setBlockStatus(null);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(formData.email);
      setShowForgotPassword(true);
      setError(null);
      setBlockStatus(null);
    } catch (err: unknown) {
      const authError = err as AuthError;
      setBlockStatus(null);
      setError(authError.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
            <p className="mt-2 text-gray-600">
              We&apos;ve sent a password reset link to <strong>{formData.email}</strong>
            </p>
          </div>

          <button
            onClick={() => setShowForgotPassword(false)}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900 dark:shadow-black/30">
        <div className="absolute right-4 top-4">
          <QuickThemeToggle />
        </div>
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/equity-logo.png"
            alt="Equity Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-3xl font-bold tracking-tight"
            style={{ color: EQUITY_BRAND.purple }}
          >
            Welcome Back
          </h1>
          <p className="text-sm font-medium dark:text-slate-300" style={{ color: EQUITY_BRAND.purple }}>
            Sign in to your retail management account
          </p>
        </div>

        {blockStatus && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              blockStatus === 'Terminated'
                ? 'border-red-200 bg-red-50'
                : 'border-amber-200 bg-amber-50'
            }`}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  blockStatus === 'Terminated' ? 'bg-red-100' : 'bg-amber-100'
                }`}
              >
                {blockStatus === 'Terminated' ? (
                  <UserX className="h-5 w-5 text-red-600" />
                ) : (
                  <Ban className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    blockStatus === 'Terminated' ? 'text-red-800' : 'text-amber-900'
                  }`}
                >
                  {getEmploymentLoginBlockTitle(
                    blockStatus === 'Other' ? null : blockStatus
                  )}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    blockStatus === 'Terminated' ? 'text-red-700' : 'text-amber-800'
                  }`}
                >
                  {error}
                </p>
                <p
                  className={`mt-2 text-xs ${
                    blockStatus === 'Terminated' ? 'text-red-600' : 'text-amber-700'
                  }`}
                >
                  You will not be able to access the portal until your account is set back to Active.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !blockStatus && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold"
              style={{ color: EQUITY_BRAND.purple }}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: EQUITY_BRAND.purple }}
              />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl border border-[#6A2B81]/25 bg-[#F3EAF7]/40 py-3 pl-10 pr-4 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-transparent focus:outline-none dark:border-[#6A2B81]/40 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Enter your email"
                disabled={isLoading}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${EQUITY_BRAND.purple}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = '';
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold"
              style={{ color: EQUITY_BRAND.purple }}
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: EQUITY_BRAND.purple }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl border border-[#6A2B81]/25 bg-[#F3EAF7]/40 py-3 pl-10 pr-12 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-transparent focus:outline-none dark:border-[#6A2B81]/40 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Enter your password"
                disabled={isLoading}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${EQUITY_BRAND.purple}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = '';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                style={{ color: EQUITY_BRAND.purple }}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                style={{ accentColor: EQUITY_BRAND.green }}
              />
              <span className="ml-2 text-sm font-medium" style={{ color: EQUITY_BRAND.purple }}>
                Remember me
              </span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm font-semibold hover:opacity-80"
              style={{ color: EQUITY_BRAND.purple }}
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: EQUITY_BRAND.purple, ['--tw-ring-color' as string]: EQUITY_BRAND.purple }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-semibold" style={{ color: EQUITY_BRAND.purple }}>
            An account must be created first before you can sign in.
          </p>
          <p className="mt-1 text-xs font-medium" style={{ color: EQUITY_BRAND.purple }}>
            Only Super Admin or Managing Director can create accounts. Contact them if you need
            access.
          </p>
        </div>
      </div>
    </div>
  );
}
