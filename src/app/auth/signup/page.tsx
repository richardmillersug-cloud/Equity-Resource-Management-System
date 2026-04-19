'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../../../components/auth/AuthContainer';
import { authService } from '@/lib/firebase/auth';

export default function SignupPage() {
  const router = useRouter();

  return (
    <AuthContainer 
      defaultMode="signup"
      onAuthSuccess={(user) => {
        router.push(authService.getDefaultDashboardPath(user));
      }}
    />
  );
} 