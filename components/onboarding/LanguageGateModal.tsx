'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Language, languageNames, languageFlags, translations } from '@/lib/i18n/translations';
import { popupDisplayLanguage } from '@/lib/i18n/detect-browser-language';

interface LanguageGateModalProps {
  open: boolean;
  browserTag: string;
  initialSelection: Language;
  onConfirm: (lang: Language) => Promise<void>;
}

export function LanguageGateModal({
  open,
  browserTag,
  initialSelection,
  onConfirm,
}: LanguageGateModalProps) {
  const [selectedLang, setSelectedLang] = useState<Language>(initialSelection);
  const [saving, setSaving] = useState(false);

  const displayLang = popupDisplayLanguage(browserTag);
  const t = translations[displayLang].welcome;

  const handleContinue = async () => {
    setSaving(true);
    try {
      await onConfirm(selectedLang);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">{t.title}</DialogTitle>
          <DialogDescription>{t.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  selectedLang === lang
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-[#C4DAEB] hover:bg-[#C4DAEB]/20'
                }`}
              >
                <span className="text-2xl">{languageFlags[lang]}</span>
                <span className="font-medium">{languageNames[lang]}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => void handleContinue()} className="w-full" disabled={saving}>
            {t.continue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
