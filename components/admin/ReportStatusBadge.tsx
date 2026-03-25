'use client';

import { ReportStatus } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ReportStatusBadgeProps {
  status: ReportStatus;
}

const STATUS_STYLES: Record<ReportStatus, string> = {
  unassigned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  assigned: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  decided: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
};

function getStatusLabel(status: ReportStatus, t: ReturnType<typeof useTranslation>['t']): string {
  switch (status) {
    case 'unassigned': return t.admin.statusUnassigned;
    case 'assigned': return t.admin.statusUnassigned;
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
