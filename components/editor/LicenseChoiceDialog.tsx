'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ContentLicenseUri } from '@/lib/rights';
import { LicenseChoiceForm } from './LicenseChoiceForm';

interface LicenseChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the author confirms. Parent persists rights (+ visibility if initial). */
  onConfirm: (licenseUri: ContentLicenseUri) => void | Promise<void>;
  /** Initial choice (default) vs one-way upgrade to BY-SA. */
  mode?: 'initial' | 'upgrade';
  confirmLabel?: string;
  busy?: boolean;
}

export function LicenseChoiceDialog({
  open,
  onOpenChange,
  onConfirm,
  mode = 'initial',
  confirmLabel,
  busy = false,
}: LicenseChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <LicenseChoiceForm
          key={open ? mode : 'closed'}
          mode={mode}
          onConfirm={onConfirm}
          onCancel={() => onOpenChange(false)}
          confirmLabel={confirmLabel}
          busy={busy}
          inDialog
        />
      </DialogContent>
    </Dialog>
  );
}
