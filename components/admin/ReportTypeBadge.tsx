'use client';

import { ReportType } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface ReportTypeBadgeProps {
  type: ReportType;
}

const TYPE_STYLES: Record<string, string> = {
  level1_content: 'tone-danger',
  level2_content: 'tone-warning',
  level3_content: 'tone-info',
  user_report: 'tone-warning',
  living_person: 'tone-warning',
  right_to_oblivion: 'tone-warning',
  impersonation: 'tone-warning',
  copyright: 'tone-warning',
  illegal_content: 'tone-danger',
  sensitive_personal_data: 'tone-warning',
  defamation: 'tone-warning',
  other: 'bg-brand-beigeBg text-brand-ink dark:bg-brand-ink/30 dark:text-brand-beigeLight',
};

function getTypeLabel(type: ReportType, t: ReturnType<typeof useTranslation>['t']): string {
  switch (type) {
    case 'level1_content': return t.admin.typeLevel1;
    case 'level2_content': return t.admin.typeLevel2;
    case 'level3_content': return t.admin.typeLevel3;
    case 'user_report': return t.admin.typeUserReport;
    case 'living_person': return t.admin.typeLivingPerson;
    case 'right_to_oblivion': return t.admin.typeRightToOblivion;
    case 'impersonation': return t.admin.typeImpersonation;
    case 'copyright': return t.admin.typeCopyright;
    case 'illegal_content': return t.admin.typeIllegalContent;
    case 'sensitive_personal_data': return t.admin.typeSensitivePersonalData;
    case 'defamation': return t.admin.typeDefamation;
    case 'other': return t.admin.typeOther;
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
