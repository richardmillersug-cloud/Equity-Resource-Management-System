'use client';

import { useRouter } from 'next/navigation';
import AuthContainer from '../../../components/auth/AuthContainer';

export default function LoginPage() {
  const router = useRouter();

  return (
    <AuthContainer 
      defaultMode="login"
      onAuthSuccess={(user) => {
        // Redirect to dashboard after successful authentication
        router.push('/dashboard');
      }}
    />
  );
} 