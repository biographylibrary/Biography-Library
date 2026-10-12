'use client';

import { ReportStatus } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ReportStatusBadgeProps {
  status: ReportStatus;
}

const STATUS_STYLES: Record<ReportStatus, string> = {
  unassigned: 'bg-brand-beigeBg text-brand-ink dark:bg-brand-ink/30 dark:text-brand-beigeLight',
  assigned: 'tone-info',
  in_review: 'tone-info',
  decided: 'tone-success',
};

function getStatusLabel(status: ReportStatus, t: ReturnType<typeof useTranslation>['t']): string {
  switch (status) {
    case 'unassigned': return t.admin.statusUnassigned;
    case 'assigned': return t.admin.statusAssigned;
    case 'in_review': return t.admin.statusInReview;
    case 'decided': return t.admin.statusDecided;
  }
}

export function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status];
  const label = getStatusLabel(status, t);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}
