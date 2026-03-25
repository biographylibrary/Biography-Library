'use client';

import { ReportType } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ReportTypeBadgeProps {
  type: ReportType;
}

const TYPE_STYLES: Record<string, string> = {
  level1_content: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  level2_content: 'bg-[#EDE4B9] text-[#121212] dark:bg-[#EDE4B9]/20 dark:text-[#EDE4B9]',
  level3_content: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  user_report: 'bg-[#EDE4B9] text-[#121212] dark:bg-[#EDE4B9]/20 dark:text-[#EDE4B9]',
  living_person: 'bg-[#EDE4B9] text-[#121212] dark:bg-[#EDE4B9]/20 dark:text-[#EDE4B9]',
  right_to_oblivion: 'bg-[#EDE4B9] text-[#121212] dark:bg-[#EDE4B9]/20 dark:text-[#EDE4B9]',
  impersonation: 'bg-[#EDE4B9] text-[#121212] dark:bg-[#EDE4B9]/20 dark:text-[#EDE4B9]',
  copyright: 'bg-[#EDE4B9] text-[#121212] dark:bg-[#EDE4B9]/20 dark:text-[#EDE4B9]',
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
