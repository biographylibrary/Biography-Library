'use client';

import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  LICENSE_BY_NC_SA_4,
  LICENSE_BY_SA_4,
  type ContentLicenseUri,
} from '@/lib/rights';

interface AuthorLicensePanelProps {
  visibility: 'private' | 'link-only' | 'public';
  rightsStatementUri: string | null;
  onRequestUpgrade: () => void;
  disabled?: boolean;
}

export function AuthorLicensePanel({
  visibility,
  rightsStatementUri,
  onRequestUpgrade,
  disabled = false,
}: AuthorLicensePanelProps) {
  const { t } = useTranslation();

  if (visibility !== 'public' || !rightsStatementUri) {
    return null;
  }

  const isByNcSa = rightsStatementUri === LICENSE_BY_NC_SA_4;
  const isBySa = rightsStatementUri === LICENSE_BY_SA_4;
  if (!isByNcSa && !isBySa) {
    return null;
  }

  // Panel label: short form without "Choice N." prefix
  const label = isByNcSa
    ? t.rightsChoice.optionByNcSaTitle.replace(/^[^.]+\.\s*/, '')
    : t.rightsChoice.optionBySaTitle.replace(/^[^.]+\.\s*/, '');

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/10">
      <div className="flex items-start gap-2 mb-2">
        <Scale className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-medium">{t.rightsChoice.currentLicense}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{label}</p>
        </div>
      </div>
      {isByNcSa && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={onRequestUpgrade}
          disabled={disabled}
        >
          {t.rightsChoice.upgradeButton}
        </Button>
      )}
    </div>
  );
}

export type { ContentLicenseUri };
