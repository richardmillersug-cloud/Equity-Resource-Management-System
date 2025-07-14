'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../../../components/auth/AuthContainer';

export default function SignupPage() {
  const router = useRouter();

  return (
    <AuthContainer 
      defaultMode="signup"
      onAuthSuccess={(user) => {
        // Redirect to dashboard after successful authentication
        router.push('/dashboard');
      }}
    />
  );
} 