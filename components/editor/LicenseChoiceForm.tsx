'use client';

import { useEffect, useState } from 'react';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export interface LicenseChoiceFormProps {
  mode?: 'initial' | 'upgrade';
  onConfirm: (licenseUri: ContentLicenseUri) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  confirmLabel?: string;
  inDialog?: boolean;
}

export function LicenseChoiceForm({
  mode = 'initial',
  onConfirm,
  onCancel,
  busy = false,
  confirmLabel,
  inDialog = false,
}: LicenseChoiceFormProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ContentLicenseUri>(
    mode === 'upgrade' ? LICENSE_BY_SA_4 : DEFAULT_CONTENT_LICENSE
  );

  useEffect(() => {
    setSelected(mode === 'upgrade' ? LICENSE_BY_SA_4 : DEFAULT_CONTENT_LICENSE);
  }, [mode]);

  const handleConfirm = async () => {
    await onConfirm(mode === 'upgrade' ? LICENSE_BY_SA_4 : selected);
  };

  const legalHref =
    mode === 'upgrade' || selected === LICENSE_BY_SA_4
      ? LICENSE_BY_SA_4
      : LICENSE_BY_NC_SA_4;

  const titleText =
    mode === 'upgrade' ? t.rightsChoice.upgradeTitle : t.rightsChoice.title;

  const descriptionContent =
    mode === 'upgrade' ? (
      <span className="block">{t.rightsChoice.upgradeBody}</span>
    ) : (
      <>
        <span className="block">{t.rightsChoice.intro}</span>
        <span className="block text-muted-foreground">{t.rightsChoice.scopeNote}</span>
      </>
    );

  return (
    <>
      {inDialog ? (
        <DialogHeader>
          <DialogTitle className="text-left font-serif text-xl leading-snug">
            {titleText}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed pt-1 space-y-2">
            {descriptionContent}
          </DialogDescription>
        </DialogHeader>
      ) : (
        <div className="space-y-1.5 text-left">
          <h3 className="font-serif text-xl leading-snug">{titleText}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed pt-1 space-y-2">
            {descriptionContent}
          </p>
        </div>
      )}

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
                  ? 'tone-success'
                  : 'border border-border hover:border-muted-foreground/40'
              }`}
            >
              <RadioGroupItem value={LICENSE_BY_NC_SA_4} id="license-by-nc-sa" className="mt-1" />
              <div className="min-w-0 space-y-1.5">
                <span className="text-sm leading-snug block">
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
                  ? 'tone-success'
                  : 'border border-border hover:border-muted-foreground/40'
              }`}
            >
              <RadioGroupItem value={LICENSE_BY_SA_4} id="license-by-sa" className="mt-1" />
              <div className="min-w-0 space-y-1.5">
                <span className="text-sm leading-snug block">
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
            <p className="text-sm">{t.rightsChoice.optionBySaTitle}</p>
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

      {inDialog ? (
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            {t.rightsChoice.cancel}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy}>
            {confirmLabel ??
              (mode === 'upgrade' ? t.rightsChoice.upgradeConfirm : t.rightsChoice.confirm)}
          </Button>
        </DialogFooter>
      ) : (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            {t.rightsChoice.cancel}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy}>
            {confirmLabel ??
              (mode === 'upgrade' ? t.rightsChoice.upgradeConfirm : t.rightsChoice.confirm)}
          </Button>
        </div>
      )}
    </>
  );
}
