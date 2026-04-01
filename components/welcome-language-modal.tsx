'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Language, languageNames, languageFlags } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth-context';

interface WelcomeLanguageModalProps {
  open?: boolean;
  onComplete?: () => void;
}

export function WelcomeLanguageModal({ open, onComplete }: WelcomeLanguageModalProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const { setLanguage, t } = useTranslation();
  const { user } = useAuth();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  useEffect(() => {
    if (!isControlled && user) {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        setInternalOpen(true);
      }
    }
  }, [user, isControlled]);

  const handleContinue = async () => {
    await setLanguage(selectedLang);
    localStorage.setItem('hasSeenWelcome', 'true');
    if (!isControlled) {
      setInternalOpen(false);
    }
    onComplete?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={isControlled ? undefined : setInternalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t.welcome.title}</DialogTitle>
          <DialogDescription>{t.welcome.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
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
          <Button onClick={handleContinue} className="w-full">
            {t.welcome.continue}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
