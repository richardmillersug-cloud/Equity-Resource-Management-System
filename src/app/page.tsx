'use client';


import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import HydrationSafeLoader from '../components/ui/HydrationSafeLoader';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the role-based dashboard system
    router.push('/dashboard');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <HydrationSafeLoader />
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
