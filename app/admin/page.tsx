'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ADMIN_ROLES } from '@/lib/auth-context';
import { Shield } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  reviewer: 'Reviewer',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role !== null && !ADMIN_ROLES.includes(role)) {
      router.replace('/dashboard');
    }
  }, [loading, user, role, router]);

  if (loading || !user || !role) return null;
  if (!ADMIN_ROLES.includes(role)) return null;

  const name = user.user_metadata?.name || user.email || 'Unknown';
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30">
            <Shield className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            Moderation Panel
          </h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-1">Logged in as</p>
          <p className="font-semibold text-foreground text-lg">{name}</p>
          <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            {roleLabel}
          </span>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-muted-foreground text-sm">
          Admin features coming soon.
        </div>
      </div>
    </div>
  );
}
