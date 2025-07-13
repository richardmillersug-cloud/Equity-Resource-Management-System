'use client';

import React, { useState, useEffect } from 'react';
import { authService, AuthUser } from '@/lib/firebase/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { Loader2 } from 'lucide-react';

interface AuthContainerProps {
  onAuthSuccess?: (user: AuthUser) => void;
  defaultMode?: 'login' | 'signup';
}

export default function AuthContainer({ onAuthSuccess, defaultMode = 'login' }: AuthContainerProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuthState = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      setIsCheckingAuth(false);
      
      if (user && onAuthSuccess) {
        onAuthSuccess(user);
      }
    };

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsCheckingAuth(false);
      
      if (user && onAuthSuccess) {
        onAuthSuccess(user);
      }
    });

    checkAuthState();

    return unsubscribe;
  }, [onAuthSuccess]);

  const handleAuthSuccess = () => {
    const user = authService.getCurrentUser();
    if (user && onAuthSuccess) {
      onAuthSuccess(user);
    }
  };

  const handleSwitchToSignup = () => {
    setMode('signup');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  // Show loading spinner while checking auth state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('auth.checkingAuth', 'Checking authentication...')}</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, don't show auth forms
  if (currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignup={handleSwitchToSignup}
          />
        ) : (
          <SignupForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </div>
    </div>
  );
} 