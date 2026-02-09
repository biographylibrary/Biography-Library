'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TermsOfServiceContent } from './terms-of-service-content';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { termsTranslations } from '@/lib/i18n/terms-translations';

interface TermsOfServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAcceptButton?: boolean;
  onAccept?: () => void;
}

export function TermsOfServiceModal({
  open,
  onOpenChange,
  showAcceptButton = false,
  onAccept,
}: TermsOfServiceModalProps) {
  const { language } = useTranslation();
  const { close } = useTranslation().t.common;
  const t = termsTranslations[language];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-serif">{t.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6">
          <TermsOfServiceContent />
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          {showAcceptButton && onAccept ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {close}
              </Button>
              <Button onClick={onAccept}>
                {t.acceptButton}
              </Button>
            </div>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              {close}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
