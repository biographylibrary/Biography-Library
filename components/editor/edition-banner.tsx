'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { textLanguageLabels } from '@/lib/text-languages';
import { supabase } from '@/lib/supabase';
import type { BookStructureReminderPart } from '@/lib/edition-book-structure-reminder';

interface EditionBannerProps {
  languageTag: string | null;
  originalId: string;
  originalTitle: string;
  originalStatus: string | null;
  showDrift: boolean;
  identicalSectionCount: number;
  onAligned: (originalVersionAt: string) => void;
  editionId: string;
  missingBookStructureParts?: BookStructureReminderPart[];
  onOpenBookStructure?: () => void;
}

export function EditionBanner({
  languageTag,
  originalId,
  originalTitle,
  originalStatus,
  showDrift,
  identicalSectionCount,
  onAligned,
  editionId,
  missingBookStructureParts = [],
  onOpenBookStructure,
}: EditionBannerProps) {
  const { t, language } = useTranslation();
  const copy = t.translate;
  const [busy, setBusy] = useState(false);
  const langName = languageTag
    ? textLanguageLabels(languageTag, language).inUi
    : languageTag ?? '';
  const title = originalTitle || '—';
  const compactLabel = copy.bannerCompact
    .replace('{language}', langName)
    .replace('{title}', title);

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

  const showBookStructureReminder = missingBookStructureParts.length > 0;
  const showUnpublished = Boolean(originalStatus && originalStatus !== 'published');
  const showIdentical = identicalSectionCount > 0;
  const hasReminders =
    showBookStructureReminder || showDrift || showUnpublished || showIdentical;

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
    <div className="mx-4 mt-3 mb-1 space-y-2">
      <div className="flex h-auto min-h-11 max-h-[4.75rem] sm:max-h-11 items-center gap-2 rounded-lg border border-brand-blue/40 bg-brand-blue/15 px-3 py-2 text-sm text-brand-ink dark:text-brand-beigeLight">
        <Languages className="h-4 w-4 shrink-0 text-brand-ink/80 dark:text-brand-beigeLight/80" aria-hidden />
        <p className="min-w-0 flex-1 truncate leading-snug sm:leading-none" title={title}>
          {compactLabel}
        </p>
        <Link
          href={`/biography/${originalId}/edit`}
          className="shrink-0 underline underline-offset-2 font-medium whitespace-nowrap"
        >
          {copy.bannerOpenOriginal}
        </Link>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 px-2 text-brand-ink dark:text-brand-beigeLight"
            >
              {copy.howItWorks}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 text-sm leading-relaxed">
            <p>{copy.bannerManualOnly}</p>
          </PopoverContent>
        </Popover>
      </div>

      {hasReminders && (
        <div className="space-y-2 text-sm text-brand-ink dark:text-brand-beigeLight">
          {showBookStructureReminder && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <p className="flex-1 min-w-[12rem]">
                {copy.bookStructureReminderShort.replace('{parts}', missingPartsLabel)}
              </p>
              {onOpenBookStructure && (
                <Button type="button" variant="outline" size="sm" onClick={onOpenBookStructure}>
                  {t.editor.bookStructureTitle}
                </Button>
              )}
            </div>
          )}
          {showDrift && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-brand-mustardLight/50 border border-brand-mustardDark/30 px-3 py-2 dark:bg-brand-mustardDark/15 dark:border-brand-mustardDark/45">
              <p className="flex-1 min-w-[12rem]">{copy.driftMessage}</p>
              <Button type="button" size="sm" disabled={busy} onClick={() => void confirmAligned()}>
                {copy.driftConfirm}
              </Button>
            </div>
          )}
          {showUnpublished && (
            <p className="rounded-md border border-brand-mustardDark/40 bg-brand-mustardLight/50 px-3 py-2 text-brand-ink dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 dark:text-brand-beigeLight">
              {copy.originalUnpublishedNote}
            </p>
          )}
          {showIdentical && (
            <p className="px-1">
              {(identicalSectionCount === 1
                ? copy.identicalSectionOne
                : copy.identicalSections
              ).replace('{count}', String(identicalSectionCount))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
