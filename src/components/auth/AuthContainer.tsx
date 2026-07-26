'use client';

import React, { useState, useEffect } from 'react';
import { authService, AuthUser } from '@/lib/firebase/auth';
import {
  getEmploymentBlockReason,
  getEmploymentLoginBlockMessage,
  isEmployeeAllowedToLogin,
  resolveEmploymentBlockFromError,
  employmentStatusFromAuthCode,
} from '@/lib/firebase/employment-access';
import LoginForm from './LoginForm';
import { Loader2 } from 'lucide-react';
import { EQUITY_BRAND } from '@/components/staff/brand';

interface AuthContainerProps {
  onAuthSuccess?: (user: AuthUser) => void;
  defaultMode?: 'login' | 'signup';
  loginError?: string | null;
}

export default function AuthContainer({
  onAuthSuccess,
  defaultMode = 'login',
  loginError = null,
}: AuthContainerProps) {
  // Public signup is disabled — ignore defaultMode signup
  void defaultMode;
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [accessBlockError, setAccessBlockError] = useState<string | null>(loginError);
  const [accessBlockStatus, setAccessBlockStatus] = useState<
    'Terminated' | 'Inactive' | 'Other' | null
  >(loginError ? resolveEmploymentBlockFromError({ message: loginError }) : null);

  const applyAccessDenial = (code?: string, message?: string, statusHint?: string | null) => {
    const fromCode = employmentStatusFromAuthCode(code);
    const fromMessage = resolveEmploymentBlockFromError({ code, message });
    const status =
      (statusHint === 'Terminated' || statusHint === 'Inactive' ? statusHint : null) ||
      fromCode ||
      fromMessage;

    setCurrentUser(null);
    setAccessBlockStatus(status);
    setAccessBlockError(
      message || getEmploymentLoginBlockMessage(status === 'Other' ? null : status)
    );
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (loginError) {
      applyAccessDenial(undefined, loginError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginError]);

  useEffect(() => {
    if (!isMounted) return;

    const acceptUser = (user: AuthUser | null) => {
      const denial = authService.getLastAccessDenial();
      if (denial) {
        applyAccessDenial(denial.code, denial.message);
        setIsCheckingAuth(false);
        setCurrentUser(null);
        return;
      }

      if (user?.employee && !isEmployeeAllowedToLogin(user.employee)) {
        const status = user.employee.employmentStatus;
        applyAccessDenial(
          undefined,
          getEmploymentLoginBlockMessage(status),
          getEmploymentBlockReason(status)
        );
        setIsCheckingAuth(false);
        void authService.signOut();
        return;
      }

      // Never treat a blocked account as a successful session
      if (user && user.employee && isEmployeeAllowedToLogin(user.employee)) {
        setCurrentUser(user);
        setIsCheckingAuth(false);
        setAccessBlockError(null);
        setAccessBlockStatus(null);
        onAuthSuccess?.(user);
        return;
      }

      if (user && !user.employee) {
        // Profile still loading or missing — keep login visible, don't blank the page
        setCurrentUser(null);
        setIsCheckingAuth(false);
        return;
      }

      setCurrentUser(null);
      setIsCheckingAuth(false);
    };

    acceptUser(authService.getCurrentUser());

    const unsubscribe = authService.onAuthStateChange((user) => {
      acceptUser(user);
    });

    return unsubscribe;
  }, [onAuthSuccess, isMounted]);

  const handleAuthSuccess = (user?: AuthUser) => {
    const denial = authService.getLastAccessDenial();
    if (denial) {
      applyAccessDenial(denial.code, denial.message);
      return;
    }

    const resolved = user || authService.getCurrentUser();
    if (!resolved) return;

    if (resolved.employee && !isEmployeeAllowedToLogin(resolved.employee)) {
      applyAccessDenial(
        undefined,
        getEmploymentLoginBlockMessage(resolved.employee.employmentStatus),
        getEmploymentBlockReason(resolved.employee.employmentStatus)
      );
      void authService.signOut();
      return;
    }

    if (resolved.employee && isEmployeeAllowedToLogin(resolved.employee)) {
      onAuthSuccess?.(resolved);
    }
  };

  if (!isMounted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center dark:from-slate-950 dark:to-slate-900"
        style={{
          background: `linear-gradient(160deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 45%, ${EQUITY_BRAND.purpleSoft} 75%, ${EQUITY_BRAND.greenSoft} 100%)`,
        }}
      >
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: `linear-gradient(160deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 45%, ${EQUITY_BRAND.purpleSoft} 75%, ${EQUITY_BRAND.greenSoft} 100%)`,
        }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" style={{ color: EQUITY_BRAND.purple }} />
          <p className="text-gray-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only hide the form for fully allowed Active sessions
  if (
    currentUser?.employee &&
    isEmployeeAllowedToLogin(currentUser.employee) &&
    !accessBlockStatus
  ) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background: `linear-gradient(160deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 45%, ${EQUITY_BRAND.purpleSoft} 75%, ${EQUITY_BRAND.greenSoft} 100%)`,
        }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" style={{ color: EQUITY_BRAND.purple }} />
          <p className="text-gray-600 dark:text-slate-400">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 dark:bg-slate-950"
      style={{
        background: `linear-gradient(160deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 45%, ${EQUITY_BRAND.purpleSoft} 75%, ${EQUITY_BRAND.greenSoft} 100%)`,
      }}
    >
      <div className="w-full max-w-4xl">
        <LoginForm
          key={accessBlockStatus || accessBlockError || 'login'}
          onSuccess={handleAuthSuccess}
          initialError={accessBlockError}
          initialBlockStatus={accessBlockStatus}
        />
      </div>
    </div>
  );
}
