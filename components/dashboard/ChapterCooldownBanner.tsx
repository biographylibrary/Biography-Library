'use client';

import { Clock, PartyPopper } from 'lucide-react';
import { format } from 'date-fns';
import { de, enUS, fr, it } from 'date-fns/locale';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { getChapterCooldownState } from '@/lib/biography-chapter-cooldown';
import type { Biography } from '@/lib/biographies';
import { cn } from '@/lib/utils';

const dateLocales = {
  en: enUS,
  it,
  fr,
  de,
};

interface ChapterCooldownBannerProps {
  biography: Biography;
  className?: string;
  compact?: boolean;
}

export function ChapterCooldownBanner({
  biography,
  className,
  compact = false,
}: ChapterCooldownBannerProps) {
  const { t, language } = useTranslation();
  const cooldown = getChapterCooldownState(biography);

  if (!cooldown) return null;

  const locale = dateLocales[language];
  const formattedDate =
    cooldown.availableAt != null
      ? format(cooldown.availableAt, 'd MMMM yyyy', { locale })
      : null;

  if (cooldown.available) {
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
          className
        )}
      >
        <PartyPopper className="h-4 w-4 shrink-0 mt-0.5" />
        <p>{t.dashboard.nextChapterAvailableNow}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
        className
      )}
    >
      <Clock className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <p className="font-medium">
          {t.dashboard.nextChapterCooldownDays.replace(
            '{days}',
            String(cooldown.daysRemaining)
          )}
        </p>
        {formattedDate && !compact && (
          <p className="text-xs opacity-90">
            {t.dashboard.nextChapterAvailableOn.replace('{date}', formattedDate)}
          </p>
        )}
      </div>
    </div>
  );
}
