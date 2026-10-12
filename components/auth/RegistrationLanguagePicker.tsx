'use client';

import { Language, languageNames, translations } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';

const LANGUAGES: Language[] = ['en', 'de', 'fr', 'it'];

type RegistrationLanguagePickerProps = {
  value: Language;
  onChange: (lang: Language) => void;
  label: string;
};

export function RegistrationLanguagePicker({
  value,
  onChange,
  label,
}: RegistrationLanguagePickerProps) {
  const lockedCopy = translations[value].auth;

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => onChange(lang)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              value === lang
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card hover:border-foreground/25',
            )}
          >
            <span>{languageNames[lang]}</span>
          </button>
        ))}
      </div>
      <div className="notice tone-info px-3 py-2.5">
        <p className="text-sm">
          {lockedCopy.registrationLanguageAlertTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed">
          {lockedCopy.registrationLanguageAlertMessage}
        </p>
      </div>
    </div>
  );
}
