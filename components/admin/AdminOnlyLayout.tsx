'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const allowed = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace('/admin');
    }
  }, [loading, allowed, router]);

  if (loading || !allowed) return null;

  return <>{children}</>;
}
