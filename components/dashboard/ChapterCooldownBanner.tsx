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
          'notice tone-success flex items-start gap-2 px-3 py-2.5 text-sm',
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
        'notice tone-warning flex items-start gap-2 px-3 py-2.5 text-sm',
        className
      )}
    >
      <Clock className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <p>
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
