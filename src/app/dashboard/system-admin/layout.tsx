'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/firebase/auth';
import { isAdminUser } from '@/lib/firebase/admin-access';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';

/** Platform tools under /dashboard/system-admin — requires Admin role. */
export default function AdminPlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const verify = () => {
      const user = authService.getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      if (!isAdminUser(user)) {
        router.replace('/dashboard');
        return;
      }
      setAllowed(true);
      setChecked(true);
    };

    verify();
    return authService.onAuthStateChange((user) => {
      if (!user) router.replace('/auth/login');
      else if (!isAdminUser(user)) router.replace('/dashboard');
      else setAllowed(true);
      setChecked(true);
    });
  }, [router]);

  if (!checked || !allowed) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <HydrationSafeLoader />
      </div>
    );
  }

  return <>{children}</>;
}
