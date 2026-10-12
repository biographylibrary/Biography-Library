'use client';

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ModerationFilters as FiltersType, ModerationReport } from '@/lib/moderation/types';
import { useModerationReports } from '@/lib/moderation/use-moderation-reports';
import { ModerationFilters } from '@/components/admin/ModerationFilters';
import { ModerationTable } from '@/components/admin/ModerationTable';
import { ModerationDetailPanel } from '@/components/admin/ModerationDetailPanel';
import { EmailChannelReportDialog } from '@/components/admin/EmailChannelReportDialog';
import { Button } from '@/components/ui/button';

function ModerationContent() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  const [filters, setFilters] = useState<FiltersType>({
    status: 'all',
    type: 'all',
    sort: 'newest',
  });

  const { reports, unassignedCount, loading: reportsLoading, error, refresh } = useModerationReports(filters);

  useEffect(() => {
    if (!selectedReport) return;
    const fresh = reports.find((r) => r.id === selectedReport.id);
    if (fresh && fresh.updated_at !== selectedReport.updated_at) {
      setSelectedReport(fresh);
    }
  }, [reports, selectedReport]);

  return (
    <>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl tone-info shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-foreground flex items-center gap-2">
              {t.admin.moderationTitle}
              {unassignedCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tone-danger font-sans">
                  {unassignedCount} {t.admin.moderationUnassignedBadge}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.admin.moderationSubtitle}
            </p>
          </div>
          <Button variant="outline" className="ml-auto" onClick={() => setEmailOpen(true)}>
            {t.admin.emailReportOpen}
          </Button>
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

      <EmailChannelReportDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        onCreated={refresh}
      />

      <ModerationDetailPanel
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onRefresh={() => {
          refresh();
        }}
      />
    </>
  );
}

export default function AdminModerationPage() {
  return <ModerationContent />;
}
