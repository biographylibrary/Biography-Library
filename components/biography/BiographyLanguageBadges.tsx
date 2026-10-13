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
  /** True sul catalogo (lingua dell'originale); false sulla pagina di un'edizione. */
  isOriginal: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function BiographyLanguageBadges({
  originalLanguage,
  isOriginal,
  className,
  size = 'sm',
}: BiographyLanguageBadgesProps) {
  const { t } = useTranslation();
  const pillClass =
    size === 'sm'
      ? 'text-xs px-2 py-0.5 rounded-full'
      : 'text-sm px-2.5 py-0.5 rounded-full';
  const label = isOriginal ? t.publicBiographies.langOriginal : t.textLanguage.label;

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      <span
        className={cn(
          pillClass,
          'bg-primary/10 text-primary border border-border'
        )}
        title={label}
      >
        {languageCode(originalLanguage)}
        <span className="sr-only"> ({label})</span>
      </span>
    </div>
  );
}
