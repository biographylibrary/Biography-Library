'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { postLoginPath, shouldHoldOnWaitlist } from '@/lib/waitlist';

export function WaitlistGate({ children }: { children: React.ReactNode }) {
  const { user, loading, profileReady, accountStatus, role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !profileReady || !user) return;
    if (shouldHoldOnWaitlist({ accountStatus, role, pathname })) {
      router.replace('/waitlist');
      return;
    }
    if (
      accountStatus === 'active' &&
      (pathname === '/' || pathname === '/register')
    ) {
      router.replace(postLoginPath({ accountStatus, role }));
    }
  }, [loading, profileReady, user, accountStatus, role, pathname, router]);

  return <>{children}</>;
}
