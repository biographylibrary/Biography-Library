'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Globe, Lock, Scale, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EditorSidebarDialog } from '@/components/editor/EditorSidebarDialog';
import { LicenseChoiceForm } from '@/components/editor/LicenseChoiceForm';
import { buildShareTokenPayload } from '@/lib/editor/write-payloads';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  LICENSE_BY_NC_SA_4,
  LICENSE_BY_SA_4,
  type ContentLicenseUri,
} from '@/lib/rights';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export type BiographyVisibility = 'private' | 'link-only' | 'public';

const visibilityIcons: Record<BiographyVisibility, typeof Lock> = {
  private: Lock,
  'link-only': Users,
  public: Globe,
};

export interface VisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyId: string;
  visibility: BiographyVisibility;
  onVisibilityChange: (visibility: BiographyVisibility) => void;
  currentShareToken: string | null;
  onTokenGenerated: (token: string) => void;
  rightsStatementUri?: string | null;
  onRequestLicenseUpgrade?: () => void;
  licenseBusy?: boolean;
  licenseView?: null | 'initial' | 'upgrade';
  onLicenseConfirm?: (uri: ContentLicenseUri) => void | Promise<void>;
  onLicenseCancel?: () => void;
}

export function VisibilityDialog({
  open,
  onOpenChange,
  biographyId,
  visibility = 'private',
  onVisibilityChange,
  currentShareToken,
  onTokenGenerated,
  rightsStatementUri = null,
  onRequestLicenseUpgrade,
  licenseBusy = false,
  licenseView = null,
  onLicenseConfirm,
  onLicenseCancel,
}: VisibilityDialogProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoGenerateAttemptedRef = useRef(false);

  const generateShareLink = useCallback(async () => {
    if (!biographyId) return;
    setIsGenerating(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('biographies')
        .update(buildShareTokenPayload(token))
        .eq('id', biographyId);

      if (!error) {
        onTokenGenerated(token);
      }
    } catch (err) {
      console.error('Error generating share link:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [biographyId, onTokenGenerated]);

  useEffect(() => {
    if (!open) {
      autoGenerateAttemptedRef.current = false;
      return;
    }
    if (
      visibility === 'link-only' &&
      !currentShareToken &&
      !isGenerating &&
      !autoGenerateAttemptedRef.current
    ) {
      autoGenerateAttemptedRef.current = true;
      void generateShareLink();
    }
  }, [open, visibility, currentShareToken, isGenerating, generateShareLink]);

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  const shareUrl = currentShareToken
    ? `${origin}/biography/${biographyId}/view?token=${currentShareToken}`
    : '';

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && licenseView !== null) {
      onLicenseCancel?.();
    }
    onOpenChange(nextOpen);
  };

  const HeaderIcon = visibilityIcons[visibility] ?? Lock;
  const isByNcSa = rightsStatementUri === LICENSE_BY_NC_SA_4;
  const isBySa = rightsStatementUri === LICENSE_BY_SA_4;
  const hasKnownLicense = isByNcSa || isBySa;
  const licenseLabel = isByNcSa
    ? t.rightsChoice.optionByNcSaTitle.replace(/^[^.]+\.\s*/, '')
    : isBySa
      ? t.rightsChoice.optionBySaTitle.replace(/^[^.]+\.\s*/, '')
      : '';

  return (
    <EditorSidebarDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t.dashboard.visibility}
      icon={<HeaderIcon className="h-5 w-5 text-primary" />}
    >
      {licenseView !== null ? (
        <div className="space-y-4" data-testid="visibility-license-view">
          <LicenseChoiceForm
            mode={licenseView}
            onConfirm={(uri) => onLicenseConfirm?.(uri)}
            onCancel={() => onLicenseCancel?.()}
            busy={licenseBusy}
            inDialog={false}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.share.visibilityDialogSubtitle}
          </p>

          <RadioGroup
            value={visibility}
            onValueChange={(val) => onVisibilityChange(val as BiographyVisibility)}
            className="gap-3"
          >
            {/* Private */}
            <label
              htmlFor="visibility-private"
              data-testid="visibility-option-private"
              className={cn(
                'flex gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                visibility === 'private'
                  ? 'tone-success'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <RadioGroupItem value="private" id="visibility-private" className="mt-1" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Lock className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm leading-snug">{t.dashboard.private}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {t.share.defaultBadge}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.share.privateModeDescription}
                </p>
              </div>
            </label>

            {/* Family (link-only) */}
            <div
              data-testid="visibility-option-family"
              className={cn(
                'rounded-lg border p-4 transition-colors space-y-3',
                visibility === 'link-only'
                  ? 'tone-success'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <label htmlFor="visibility-family" className="flex gap-3 cursor-pointer">
                <RadioGroupItem value="link-only" id="visibility-family" className="mt-1" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm leading-snug">{t.dashboard.family}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.share.familyModeDescription}
                  </p>
                </div>
              </label>

              {visibility === 'link-only' && (
                <div
                  className="pl-7 pt-2 border-t border-border space-y-2"
                  data-testid="family-share-link-section"
                >
                  <p className="text-xs text-muted-foreground">
                    {t.share.familyViewDescription}
                  </p>
                  {!currentShareToken ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void generateShareLink()}
                      disabled={isGenerating}
                      data-testid="family-share-generate-btn"
                    >
                      {isGenerating ? t.share.generating : t.share.generateLink}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        data-testid="family-share-url-input"
                        className="text-sm bg-background"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void copyToClipboard()}
                        data-testid="family-share-copy-btn"
                        className="shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            {t.share.copied}
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            {t.share.copy}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Public */}
            <div
              data-testid="visibility-option-public"
              className={cn(
                'rounded-lg border p-4 transition-colors space-y-3',
                visibility === 'public'
                  ? 'tone-success'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <label htmlFor="visibility-public" className="flex gap-3 cursor-pointer">
                <RadioGroupItem value="public" id="visibility-public" className="mt-1" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm leading-snug">{t.dashboard.public}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.share.publicModeDescription}
                  </p>
                </div>
              </label>

              {visibility === 'public' && hasKnownLicense && (
                <div
                  className="pl-7 pt-2 border-t border-border space-y-2"
                  data-testid="public-license-summary"
                >
                  <div className="flex items-start gap-2">
                    <Scale className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {t.rightsChoice.currentLicense}
                      </p>
                      <p className="text-sm leading-relaxed">{licenseLabel}</p>
                    </div>
                  </div>
                  {isByNcSa && onRequestLicenseUpgrade && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onRequestLicenseUpgrade}
                      disabled={licenseBusy}
                    >
                      {t.rightsChoice.upgradeButton}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </RadioGroup>
        </div>
      )}
    </EditorSidebarDialog>
  );
}
