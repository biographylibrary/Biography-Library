'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ModerationFilters as FiltersType, ModerationReport } from '@/lib/moderation/types';
import { useModerationReports } from '@/lib/moderation/use-moderation-reports';
import { ModerationFilters } from '@/components/admin/ModerationFilters';
import { ModerationTable } from '@/components/admin/ModerationTable';
import { ModerationDetailPanel } from '@/components/admin/ModerationDetailPanel';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';

function ModerationContent() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);

  const [filters, setFilters] = useState<FiltersType>({
    status: 'all',
    type: 'all',
    sort: 'newest',
  });

  const { reports, unassignedCount, loading: reportsLoading, error, refresh } = useModerationReports(filters);

  return (
    <div className="min-h-full bg-background">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-[#C4DAEB] dark:bg-[#C4DAEB]/20 shrink-0">
            <Shield className="h-5 w-5 text-[#121212] dark:text-[#FDFBF7]" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground flex items-center gap-2">
              {t.admin.moderationTitle}
              {unassignedCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#6D323E] text-white dark:bg-[#6D323E] dark:text-white font-sans">
                  {unassignedCount} {t.admin.moderationUnassignedBadge}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.admin.loadingReports && ''}
              Review and act on reported content
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <ModerationFilters filters={filters} onChange={setFilters} />
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

export default function AdminModerationPage() {
  return (
    <AdminGuard>
      <ModerationContent />
    </AdminGuard>
  );
}
