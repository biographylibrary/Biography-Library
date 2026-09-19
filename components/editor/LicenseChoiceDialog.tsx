'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  DEFAULT_CONTENT_LICENSE,
  LICENSE_BY_NC_SA_4,
  LICENSE_BY_SA_4,
  type ContentLicenseUri,
} from '@/lib/rights';
import { ExternalLink } from 'lucide-react';

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
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ContentLicenseUri>(DEFAULT_CONTENT_LICENSE);

  useEffect(() => {
    if (open) {
      setSelected(mode === 'upgrade' ? LICENSE_BY_SA_4 : DEFAULT_CONTENT_LICENSE);
    }
  }, [open, mode]);

  const handleConfirm = async () => {
    await onConfirm(mode === 'upgrade' ? LICENSE_BY_SA_4 : selected);
  };

  const legalHref =
    mode === 'upgrade' || selected === LICENSE_BY_SA_4
      ? LICENSE_BY_SA_4
      : LICENSE_BY_NC_SA_4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-left font-serif text-xl leading-snug">
            {mode === 'upgrade' ? t.rightsChoice.upgradeTitle : t.rightsChoice.title}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed pt-1 space-y-2">
            {mode === 'upgrade' ? (
              <span className="block">{t.rightsChoice.upgradeBody}</span>
            ) : (
              <>
                <span className="block">{t.rightsChoice.intro}</span>
                <span className="block text-muted-foreground">{t.rightsChoice.scopeNote}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {mode === 'initial' && (
          <>
            <RadioGroup
              value={selected}
              onValueChange={(v) => setSelected(v as ContentLicenseUri)}
              className="gap-3"
            >
              <label
                htmlFor="license-by-nc-sa"
                className={`flex gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  selected === LICENSE_BY_NC_SA_4
                    ? 'border-brand-greenDark bg-brand-greenLight/20'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <RadioGroupItem value={LICENSE_BY_NC_SA_4} id="license-by-nc-sa" className="mt-1" />
                <div className="min-w-0 space-y-1.5">
                  <span className="text-sm font-medium leading-snug block">
                    {t.rightsChoice.optionByNcSaTitle}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.rightsChoice.optionByNcSaBody}
                  </p>
                </div>
              </label>

              <label
                htmlFor="license-by-sa"
                className={`flex gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  selected === LICENSE_BY_SA_4
                    ? 'border-brand-greenDark bg-brand-greenLight/20'
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <RadioGroupItem value={LICENSE_BY_SA_4} id="license-by-sa" className="mt-1" />
                <div className="min-w-0 space-y-1.5">
                  <span className="text-sm font-medium leading-snug block">
                    {t.rightsChoice.optionBySaTitle}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.rightsChoice.optionBySaBody}
                  </p>
                </div>
              </label>
            </RadioGroup>

            <a
              href={legalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t.rightsChoice.legalDetails}
              <ExternalLink className="h-3 w-3" />
            </a>

            <p className="text-sm text-muted-foreground leading-relaxed">{t.rightsChoice.ifUnsure}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.rightsChoice.changeMind}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.rightsChoice.nameStays}</p>
          </>
        )}

        {mode === 'upgrade' && (
          <>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm font-medium">{t.rightsChoice.optionBySaTitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.rightsChoice.optionBySaBody}
              </p>
            </div>
            <a
              href={LICENSE_BY_SA_4}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t.rightsChoice.legalDetails}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.rightsChoice.nameStays}</p>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t.rightsChoice.cancel}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy}>
            {confirmLabel ??
              (mode === 'upgrade' ? t.rightsChoice.upgradeConfirm : t.rightsChoice.confirm)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
