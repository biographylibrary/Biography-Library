'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ADMIN_ROLES } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Shield, ShieldOff } from 'lucide-react';
import { ModerationFilters as FiltersType, ModerationReport } from '@/lib/moderation/types';
import { useModerationReports } from '@/lib/moderation/use-moderation-reports';
import { ModerationFilters } from '@/components/admin/ModerationFilters';
import { ModerationTable } from '@/components/admin/ModerationTable';
import { ModerationDetailPanel } from '@/components/admin/ModerationDetailPanel';

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);

  const [filters, setFilters] = useState<FiltersType>({
    status: 'all',
    type: 'all',
    sort: 'newest',
  });

  const isDenied = !loading && (!user || (role !== null && !ADMIN_ROLES.includes(role)));

  const { reports, unassignedCount, loading: reportsLoading, error, refresh } = useModerationReports(filters);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            router.replace('/login');
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (role !== null && !ADMIN_ROLES.includes(role)) {
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            router.replace('/dashboard');
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loading, user, role, router]);

  if (loading) return null;

  if (isDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-5">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30">
              <ShieldOff className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-5">
            You do not have permission to access this page.
          </p>
          <p className="text-xs text-muted-foreground">
            Redirecting in{' '}
            <span className="font-semibold tabular-nums text-foreground">{countdown}</span>{' '}
            second{countdown !== 1 ? 's' : ''}…
          </p>
        </div>
      </div>
    );
  }

  if (!user || !role) return null;
  if (!ADMIN_ROLES.includes(role)) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 shrink-0">
            <Shield className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
            {t.admin.moderationTitle}
            {unassignedCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 font-sans">
                {unassignedCount} {t.admin.moderationUnassignedBadge}
              </span>
            )}
          </h1>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <ModerationFilters filters={filters} onChange={setFilters} />
          </div>

          <ModerationTable
            reports={reports}
            loading={reportsLoading}
            error={error}
            onOpen={setSelectedReport}
          />
        </div>
      </div>

      <ModerationDetailPanel
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onRefresh={() => {
          refresh();
          setSelectedReport(null);
        }}
      />
    </div>
  );
}
