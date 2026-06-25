'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/i18n-context';
import type { CatalogLanguage } from '@/lib/biography-translation-locales';

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
  translationLanguages?: string[];
  className?: string;
  size?: 'sm' | 'md';
}

export function BiographyLanguageBadges({
  originalLanguage,
  translationLanguages = [],
  className,
  size = 'sm',
}: BiographyLanguageBadgesProps) {
  const { t } = useTranslation();
  const translations = translationLanguages.filter(
    (lang) => lang !== originalLanguage && LANGUAGE_CODES[lang]
  ) as CatalogLanguage[];

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
      {translations.map((lang) => (
        <span
          key={lang}
          className={cn(
            pillClass,
            'bg-muted/60 text-muted-foreground border border-border'
          )}
          title={t.publicBiographies.langTranslation}
        >
          {languageCode(lang)}
          <span className="sr-only"> ({t.publicBiographies.langTranslation})</span>
        </span>
      ))}
    </div>
  );
}
