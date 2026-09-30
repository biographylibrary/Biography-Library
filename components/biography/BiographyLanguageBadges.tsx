'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';

const LANGUAGE_CODES: Record<string, string> = {
  en: 'EN',
  it: 'IT',
  fr: 'FR',
  de: 'DE',
};

function languageCode(lang: string): string {
  return LANGUAGE_CODES[lang] ?? lang.toUpperCase();
}

interface BiographyLanguageBadgesProps {
  originalLanguage: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function BiographyLanguageBadges({
  originalLanguage,
  className,
  size = 'sm',
}: BiographyLanguageBadgesProps) {
  const { t } = useTranslation();
  const pillClass =
    size === 'sm'
      ? 'text-xs font-medium px-2 py-0.5 rounded-full'
      : 'text-sm font-medium px-2.5 py-0.5 rounded-full';

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      <span
        className={cn(
          pillClass,
          'bg-primary/15 text-primary border border-primary/35'
        )}
        title={t.publicBiographies.langOriginal}
      >
        {languageCode(originalLanguage)}
        <span className="sr-only"> ({t.publicBiographies.langOriginal})</span>
      </span>
    </div>
  );
}
