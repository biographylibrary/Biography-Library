'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CircleHelp, Download, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { MANUAL_META } from '@/lib/help/manual-meta.generated';

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the authenticated user chooses Ask Echo (e.g. scroll to panel). */
  onAskEcho?: () => void;
};

export function HelpDialog({ open, onOpenChange, onAskEcho }: HelpDialogProps) {
  const { user } = useAuth();
  const { t, language } = useTranslation();

  const downloadName = useMemo(
    () => `biography-library-manual-v${MANUAL_META.version}-${MANUAL_META.date}-en.md`,
    []
  );

  const versionLine = t.helpDialog.manualVersion
    .replace('{version}', MANUAL_META.version)
    .replace('{date}', MANUAL_META.date);

  const handleAskEcho = () => {
    onOpenChange(false);
    if (onAskEcho) {
      onAskEcho();
      return;
    }
    const panel = document.querySelector('[data-tour-id="echo-panel"]');
    const input = document.querySelector('[data-tour-id="echo-input"]') as HTMLElement | null;
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
      input?.focus();
      return;
    }
    window.location.href = '/echo';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="h-5 w-5" aria-hidden />
            {t.helpDialog.title}
          </DialogTitle>
          <DialogDescription>{t.helpDialog.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {user ? (
            <Button type="button" className="w-full" onClick={handleAskEcho}>
              <MessageCircle className="h-4 w-4 mr-2" aria-hidden />
              {t.helpDialog.askEcho}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href="/" onClick={() => onOpenChange(false)}>
                {t.helpDialog.requestAccess}
              </Link>
            </Button>
          )}

          <div className="rounded-lg border border-border px-3 py-3 space-y-2">
            <p className="text-sm text-foreground">{t.helpDialog.downloadManual}</p>
            <p className="text-xs text-muted-foreground">{versionLine}</p>
            <p className="text-xs text-muted-foreground">{t.helpDialog.downloadHint}</p>
            <Button type="button" variant="secondary" className="w-full" asChild>
              <a href="/help/biography-library-manual.en.md" download={downloadName}>
                <Download className="h-4 w-4 mr-2" aria-hidden />
                {language === 'en'
                  ? t.helpDialog.downloadEn
                  : `${t.helpDialog.downloadEn} (${t.helpDialog.englishFallback})`}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type HelpTriggerProps = {
  className?: string;
  onClick: () => void;
};

export function HelpTriggerButton({ className, onClick }: HelpTriggerProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={t.helpDialog.openAria}
    >
      <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t.helpDialog.title}</span>
    </button>
  );
}
