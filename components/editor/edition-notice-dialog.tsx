'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import type { BookStructureReminderPart } from '@/lib/edition-book-structure-reminder';

export interface EditionNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  showDrift: boolean;
  identicalSectionCount: number;
  originalStatus: string | null;
  missingBookStructureParts: BookStructureReminderPart[];
  onAligned: (originalVersionAt: string) => void;
  onOpenBookStructure?: () => void;
}

export function EditionNoticeDialog({
  open,
  onOpenChange,
  editionId,
  showDrift,
  identicalSectionCount,
  originalStatus,
  missingBookStructureParts,
  onAligned,
  onOpenBookStructure,
}: EditionNoticeDialogProps) {
  const { t } = useTranslation();
  const copy = t.translate;
  const [busy, setBusy] = useState(false);

  const partLabels: Record<BookStructureReminderPart, string> = {
    authorCopyrightPage: t.editor.bookStructureAuthorCopyrightPageShort,
    dedication: t.editor.bookStructureDedication,
    epigraph: t.editor.bookStructureEpigraph,
    preface: t.editor.bookStructurePreface,
    epilogue: t.editor.bookStructureEpilogue,
    acknowledgements: t.editor.bookStructureAcknowledgements,
    credits: t.editor.bookStructureCredits,
  };
  const missingPartsLabel = missingBookStructureParts
    .map((part) => partLabels[part])
    .join(', ');

  const showBookStructure = missingBookStructureParts.length > 0;
  const showUnpublished = Boolean(originalStatus && originalStatus !== 'published');
  const showIdentical = identicalSectionCount > 0;

  const confirmAligned = useCallback(async () => {
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error(t.toast.requestFailed);
        return;
      }
      const res = await fetch('/api/biography/edition-aligned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ editionId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        originalVersionAt?: string;
      };
      if (res.ok && payload.originalVersionAt) {
        onAligned(payload.originalVersionAt);
      } else {
        toast.error(t.toast.requestFailed);
      }
    } catch {
      toast.error(t.toast.requestFailed);
    } finally {
      setBusy(false);
    }
  }, [editionId, onAligned, t.toast.requestFailed]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.noticeTitle}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p>{copy.bannerManualOnly}</p>
              {showBookStructure && (
                <div className="space-y-2">
                  <p>{copy.bookStructureReminder.replace('{parts}', missingPartsLabel)}</p>
                  {onOpenBookStructure && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenBookStructure();
                      }}
                    >
                      {t.editor.bookStructureTitle}
                    </Button>
                  )}
                </div>
              )}
              {showDrift && (
                <div className="space-y-2">
                  <p>{copy.driftMessage}</p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void confirmAligned()}
                  >
                    {copy.driftConfirm}
                  </Button>
                </div>
              )}
              {showUnpublished && <p>{copy.originalUnpublishedNote}</p>}
              {showIdentical && (
                <p>
                  {(identicalSectionCount === 1
                    ? copy.identicalSectionOne
                    : copy.identicalSections
                  ).replace('{count}', String(identicalSectionCount))}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction type="button" onClick={() => onOpenChange(false)}>
            {copy.noticeUnderstood}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
