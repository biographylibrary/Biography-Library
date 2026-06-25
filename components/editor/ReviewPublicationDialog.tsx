'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Circle,
  FileText,
  Loader as Loader2,
  Send,
  Sparkles,
  Download,
  ShieldCheck,
  TriangleAlert as AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import type { BiographyPublicationStatus } from '@/lib/biographies';
import { isReviewOrScreeningLockStatus, isLockedPendingScreeningStatus } from '@/lib/publication-state';
import { cn } from '@/lib/utils';

interface ReviewPublicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biographyMode: 'sections' | 'freeflow';
  completedSections: string[];
  contentFreeflow: string;
  biographyStatus: BiographyPublicationStatus;
  isPreflightChecking?: boolean;
  publicationActionLoading?: 'start' | 'approve' | 'prepare' | null;
  canApproveFinalPdf?: boolean;
  pdfDraftIteration?: number | null;
  draftHasSeverity3Flags?: boolean;
  draftAiHasSuggestions?: boolean;
  submitPreflightError?: string | null;
  publicationActionError?: string | null;
  aiScreeningResult?: 'pending' | 'passed' | 'flagged' | 'ai_error' | 'parse_error' | null;
  onOpenFinalReview: () => void;
  onSubmitForReview: () => void;
  onPrepareFreeflowFinal: () => void;
  onStartPdfDraft: () => void;
  onOpenExport: () => void;
  onApproveFinalPdf: () => void;
}

export function ReviewPublicationDialog({
  open,
  onOpenChange,
  biographyMode,
  completedSections,
  contentFreeflow,
  biographyStatus,
  isPreflightChecking = false,
  publicationActionLoading = null,
  canApproveFinalPdf = false,
  pdfDraftIteration = null,
  draftHasSeverity3Flags = false,
  draftAiHasSuggestions = false,
  submitPreflightError = null,
  publicationActionError = null,
  aiScreeningResult = null,
  onOpenFinalReview,
  onSubmitForReview,
  onPrepareFreeflowFinal,
  onStartPdfDraft,
  onOpenExport,
  onApproveFinalPdf,
}: ReviewPublicationDialogProps) {
  const { t } = useTranslation();
  const rp = t.editor.reviewPublication;

  const allSectionKeys = BIOGRAPHY_SECTIONS.map((s) => s.key);
  const incompleteSections =
    biographyMode === 'sections'
      ? allSectionKeys.filter((key) => !completedSections.includes(key))
      : [];
  const freeflowReady = contentFreeflow.trim().length > 0;
  const writingReady =
    biographyMode === 'sections' ? incompleteSections.length === 0 : freeflowReady;

  const underReviewLock = isReviewOrScreeningLockStatus(biographyStatus);
  const lockedPendingScreening = isLockedPendingScreeningStatus(biographyStatus);
  const earlyDraftStatus =
    biographyStatus === 'draft' || biographyStatus === 'sections_complete';

  const closeAndRun = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const showApproveDisabledHint =
    biographyStatus === 'pdf_draft' &&
    !canApproveFinalPdf &&
    publicationActionLoading !== 'approve';

  const actionButtonClass =
    'gap-1.5 w-full sm:w-auto whitespace-normal h-auto min-h-9 py-2 text-left';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[min(90vh,640px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{rp.title}</DialogTitle>
          <DialogDescription>{rp.description}</DialogDescription>
        </DialogHeader>

        {(submitPreflightError || publicationActionError) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-brand-wine/40 bg-brand-wine/10 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-brand-wine" />
            <p className="text-sm text-brand-wineDark dark:text-brand-beigeLight leading-relaxed">
              {submitPreflightError || publicationActionError}
            </p>
          </div>
        )}

        {underReviewLock ? (
          <div className="space-y-3 pt-2">
            <Badge variant="secondary" className="text-xs">
              {lockedPendingScreening ? rp.statusLockedPendingScreening : rp.statusUnderReview}
            </Badge>
            {aiScreeningResult === 'pending' ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>{rp.screeningPendingHint}</span>
              </div>
            ) : biographyStatus === 'under_review' && aiScreeningResult === 'flagged' ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{rp.revisionFlaggedHint}</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lockedPendingScreening
                  ? rp.lockedPendingScreeningHint
                  : rp.underReviewHint}
              </p>
            )}
          </div>
        ) : !writingReady ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">{rp.incompleteMessage}</p>
            {biographyMode === 'sections' && incompleteSections.length > 0 && (
              <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3">
                {incompleteSections.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Circle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t.sectionTitles[key as keyof typeof t.sectionTitles] ||
                        BIOGRAPHY_SECTIONS.find((s) => s.key === key)?.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {biographyMode === 'freeflow' && !freeflowReady && (
              <p className="text-sm text-muted-foreground">{rp.freeflowEmptyHint}</p>
            )}
          </div>
        ) : (
          <ol className="space-y-4 pt-2">
            {earlyDraftStatus && biographyMode === 'sections' && (
              <li className="flex gap-3 rounded-lg border border-border/60 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  1
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-medium text-sm">{rp.stepAiReviewTitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rp.stepAiReviewDesc}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={actionButtonClass}
                    onClick={() => closeAndRun(onOpenFinalReview)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {rp.stepAiReviewButton}
                  </Button>
                </div>
              </li>
            )}

            {earlyDraftStatus && biographyMode === 'freeflow' && (
              <li className="flex gap-3 rounded-lg border border-border/60 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  1
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-medium text-sm">{rp.stepFreeflowPrepareTitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rp.stepFreeflowPrepareDesc}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className={actionButtonClass}
                    disabled={publicationActionLoading !== null}
                    onClick={() => void onPrepareFreeflowFinal()}
                  >
                    {publicationActionLoading === 'prepare' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {rp.stepFreeflowPrepareButton}
                  </Button>
                </div>
              </li>
            )}

            {earlyDraftStatus && (
              <li className="flex gap-3 rounded-lg border border-border/60 p-4">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium'
                  )}
                >
                  {biographyMode === 'sections' ? '2' : '2'}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-medium text-sm">{rp.stepSubmitTitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rp.stepSubmitDesc}
                  </p>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed border-l-2 border-border pl-2">
                    {t.editor.publicationLegacySubmitHint}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={actionButtonClass}
                    disabled={isPreflightChecking}
                    onClick={() => void onSubmitForReview()}
                  >
                    {isPreflightChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {rp.stepSubmitButton}
                  </Button>
                </div>
              </li>
            )}

            {biographyStatus === 'final_version' && (
              <li className="flex gap-3 rounded-lg border border-border/60 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  1
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-medium text-sm">{rp.stepPdfDraftTitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rp.stepPdfDraftDesc}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className={actionButtonClass}
                    disabled={publicationActionLoading !== null}
                    onClick={() => void onStartPdfDraft()}
                  >
                    {publicationActionLoading === 'start' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {rp.stepPdfDraftButton}
                  </Button>
                </div>
              </li>
            )}

            {biographyStatus === 'pdf_draft' && (
              <>
                <li className="flex gap-3 rounded-lg border border-border/60 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <p className="font-medium text-sm">{rp.stepExportTitle}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rp.stepExportDesc}
                    </p>
                    {pdfDraftIteration != null && (
                      <p className="text-xs text-muted-foreground">
                        {rp.draftProgress.replace('{count}', String(pdfDraftIteration))}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={actionButtonClass}
                      onClick={() => closeAndRun(onOpenExport)}
                    >
                      <Download className="h-4 w-4" />
                      {rp.stepExportButton}
                    </Button>
                  </div>
                </li>
                <li className="flex gap-3 rounded-lg border border-border/60 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <p className="font-medium text-sm">{rp.stepApproveTitle}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rp.stepApproveDesc}
                    </p>
                    {showApproveDisabledHint && (
                      <p className="text-xs text-muted-foreground border-l-2 border-brand-mustardDark/50 pl-2">
                        {draftHasSeverity3Flags
                          ? rp.severity3BlockHint
                          : (pdfDraftIteration ?? 0) < 1
                            ? rp.approveDisabledHint
                            : rp.approveAiPendingHint}
                      </p>
                    )}
                    {canApproveFinalPdf && draftAiHasSuggestions && (
                      <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">
                        {rp.approveAiSuggestionsHint}
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className={actionButtonClass}
                      disabled={publicationActionLoading !== null || !canApproveFinalPdf}
                      onClick={() => void onApproveFinalPdf()}
                    >
                      {publicationActionLoading === 'approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      {rp.stepApproveButton}
                    </Button>
                  </div>
                </li>
              </>
            )}

            {biographyStatus === 'published' && (
              <li className="flex gap-3 rounded-lg border border-brand-greenDark/40 bg-brand-greenLight/20 p-4">
                <Check className="h-5 w-5 shrink-0 text-brand-greenDark mt-0.5" />
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="font-medium text-sm">{rp.publishedTitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rp.publishedDesc}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={actionButtonClass}
                    onClick={() => closeAndRun(onOpenExport)}
                  >
                    <Download className="h-4 w-4" />
                    {rp.stepExportButton}
                  </Button>
                </div>
              </li>
            )}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
