'use client';

import { Scale } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

export function BiographyContentRightsNotice() {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t.view.contentRightsNoticeAriaLabel}
      className="mb-8 text-left text-sm text-muted-foreground bg-muted/30 border border-border/60 rounded-lg px-4 py-3.5 not-prose"
    >
      <div className="flex items-start gap-2.5">
        <Scale className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
        <div className="space-y-2 leading-relaxed">
          <p>{t.view.contentRightsNoticeParagraph1}</p>
          <p>{t.view.contentRightsNoticeParagraph2}</p>
        </div>
      </div>
    </aside>
  );
}
