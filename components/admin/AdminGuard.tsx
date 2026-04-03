'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { useAuth, ADMIN_ROLES, UserRole } from '@/lib/auth-context';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function AdminGuard({ children, requiredRole, redirectTo = '/dashboard' }: AdminGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  const isAllowed = !loading && user && (
    requiredRole ? role === requiredRole : (role !== null && ADMIN_ROLES.includes(role))
  );

  const isDenied = !loading && !isAllowed;

  useEffect(() => {
    if (!isDenied) return;

    const target = !user ? '/login' : redirectTo;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.replace(target);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDenied, user, router, redirectTo]);

  if (loading) return null;

  if (isDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-5">
            <div className="p-4 rounded-2xl bg-brand-wine/10 dark:bg-brand-wine/20">
              <ShieldOff className="h-8 w-8 text-brand-wine dark:text-brand-mustardLight" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-5">
            You do not have permission to access this page.
          </p>
          <p className="text-xs text-muted-foreground">
            Redirecting in{' '}
            <span className="font-semibold tabular-nums text-foreground">{countdown}</span>s…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
