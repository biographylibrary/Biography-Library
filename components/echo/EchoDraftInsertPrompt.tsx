'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EchoDraftInsertPromptProps {
  sectionTitle: string;
  cardTitle: string;
  cardSubtitle: string;
  confirmLabel: string;
  laterLabel: string;
  showPreviewLabel: string;
  hidePreviewLabel: string;
  readyLabel: string;
  sectionMismatchWarning?: string;
  successTitle: string;
  successBody: string;
  openEditorLabel: string;
  preview: string;
  deferred?: boolean;
  applying?: boolean;
  inserted?: boolean;
  insertError?: string;
  onConfirm: () => void;
  onDefer: () => void;
  onExpand?: () => void;
  onOpenEditor?: () => void;
}

const PREVIEW_COLLAPSED_MAX_H = 'max-h-52';
const PREVIEW_EXPANDED_MAX_H = 'max-h-[min(28rem,55vh)]';

export function EchoDraftInsertPrompt({
  sectionTitle,
  cardTitle,
  cardSubtitle,
  confirmLabel,
  laterLabel,
  showPreviewLabel,
  hidePreviewLabel,
  readyLabel,
  sectionMismatchWarning,
  successTitle,
  successBody,
  openEditorLabel,
  preview,
  deferred = false,
  applying = false,
  inserted = false,
  insertError,
  onConfirm,
  onDefer,
  onExpand,
  onOpenEditor,
}: EchoDraftInsertPromptProps) {
  const [previewExpanded, setPreviewExpanded] = useState(false);

  if (inserted) {
    return (
      <div
        role="region"
        aria-label={successTitle}
        className="mt-3 rounded-lg border border-brand-green/40 bg-brand-greenLight/30 dark:bg-brand-greenLight/10 p-3 space-y-2"
      >
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-green shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{successTitle}</p>
            <p className="text-xs text-muted-foreground">{successBody}</p>
          </div>
        </div>
        {onOpenEditor && (
          <Button type="button" size="sm" variant="default" className="w-full sm:w-auto" onClick={onOpenEditor}>
            {openEditorLabel}
          </Button>
        )}
      </div>
    );
  }

  if (deferred) {
    return (
      <div
        role="region"
        aria-label={readyLabel}
        className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-medium text-primary truncate max-w-[40%]">{sectionTitle}</span>
        <span className="text-xs text-muted-foreground flex-1 min-w-[8rem]">{readyLabel}</span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button type="button" size="sm" disabled={applying} onClick={onConfirm}>
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : confirmLabel}
          </Button>
          {onExpand && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={onExpand}
            >
              {showPreviewLabel}
            </button>
          )}
        </div>
        {insertError && <p className="w-full text-xs text-destructive">{insertError}</p>}
      </div>
    );
  }

  const needsExpandToggle =
    preview.length > 320 || preview.split('\n').length > 8;

  return (
    <div
      role="region"
      aria-label={cardTitle}
      className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2.5"
    >
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">{cardTitle.replace('{section}', sectionTitle)}</p>
          <p className="text-xs text-muted-foreground">{cardSubtitle}</p>
        </div>
      </div>

      {sectionMismatchWarning && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{sectionMismatchWarning}</span>
        </div>
      )}

      <div
        className={cn(
          'text-sm text-foreground/80 whitespace-pre-wrap rounded bg-background/60 px-2.5 py-2 border border-border/40 overflow-y-auto overscroll-contain',
          previewExpanded ? PREVIEW_EXPANDED_MAX_H : PREVIEW_COLLAPSED_MAX_H
        )}
      >
        {preview}
      </div>

      {needsExpandToggle && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={() => setPreviewExpanded((v) => !v)}
        >
          {previewExpanded ? hidePreviewLabel : showPreviewLabel}
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Button type="button" size="sm" disabled={applying} onClick={onConfirm}>
          {applying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              {confirmLabel}
            </>
          ) : (
            confirmLabel
          )}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={applying} onClick={onDefer}>
          {laterLabel}
        </Button>
      </div>

      {insertError && <p className="text-xs text-destructive">{insertError}</p>}
    </div>
  );
}
