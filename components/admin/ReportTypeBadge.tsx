'use client';

import { ReportType } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ReportTypeBadgeProps {
  type: ReportType;
}

const TYPE_STYLES: Record<string, string> = {
  level1_content: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  level2_content: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  level3_content: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  user_report: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  living_person: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  right_to_oblivion: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  impersonation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  copyright: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

function getTypeLabel(type: ReportType, t: ReturnType<typeof useTranslation>['t']): string {
  switch (type) {
    case 'level1_content': return t.admin.typeLevel1;
    case 'level2_content': return t.admin.typeLevel2;
    case 'level3_content': return t.admin.typeLevel3;
    default: return t.admin.typeUserReport;
  }
}

export function ReportTypeBadge({ type }: ReportTypeBadgeProps) {
  const { t } = useTranslation();
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.other;
  const label = getTypeLabel(type, t);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}
