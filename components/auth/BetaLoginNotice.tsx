'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { clearBetaLoginNotice, hasBetaLoginNotice } from '@/lib/beta-login-notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BetaLoginNotice() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasBetaLoginNotice()) setOpen(true);
  }, []);

  const close = () => {
    clearBetaLoginNotice();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">BETA</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed">{t.waitlist.loginNotice}</p>
        <DialogFooter>
          <Button type="button" onClick={close}>
            {t.waitlist.loginNoticeClose}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
