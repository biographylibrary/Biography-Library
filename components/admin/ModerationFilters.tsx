'use client';

import { ModerationFilters as FiltersType, ReportStatus, ReportType, SortOrder } from '@/lib/moderation/types';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ModerationFiltersProps {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
}

export function ModerationFilters({ filters, onChange }: ModerationFiltersProps) {
  const { t } = useTranslation();

  function setStatus(value: string) {
    onChange({ ...filters, status: value as ReportStatus | 'all' });
  }

  function setType(value: string) {
    onChange({ ...filters, type: value as ReportType | 'all' });
  }

  function setSort(value: string) {
    onChange({ ...filters, sort: value as SortOrder });
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t.admin.filterStatus}</span>
        <Select value={filters.status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.admin.filterAll}</SelectItem>
            <SelectItem value="unassigned">{t.admin.statusUnassigned}</SelectItem>
            <SelectItem value="in_review">{t.admin.statusInReview}</SelectItem>
            <SelectItem value="decided">{t.admin.statusDecided}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t.admin.filterType}</span>
        <Select value={filters.type} onValueChange={setType}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.admin.filterAll}</SelectItem>
            <SelectItem value="level1_content">{t.admin.typeLevel1}</SelectItem>
            <SelectItem value="level2_content">{t.admin.typeLevel2}</SelectItem>
            <SelectItem value="level3_content">{t.admin.typeLevel3}</SelectItem>
            <SelectItem value="user_report">{t.admin.typeUserReport}</SelectItem>
            <SelectItem value="living_person">{t.admin.typeLivingPerson}</SelectItem>
            <SelectItem value="right_to_oblivion">{t.admin.typeRightToOblivion}</SelectItem>
            <SelectItem value="impersonation">{t.admin.typeImpersonation}</SelectItem>
            <SelectItem value="copyright">{t.admin.typeCopyright}</SelectItem>
            <SelectItem value="other">{t.admin.typeOther}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t.admin.filterSort}</span>
        <Select value={filters.sort} onValueChange={setSort}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t.admin.sortNewest}</SelectItem>
            <SelectItem value="oldest">{t.admin.sortOldest}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
