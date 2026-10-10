'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
}: EditionBannerProps) {
  const { t, language } = useTranslation();
  const copy = t.translate;
  const [busy, setBusy] = useState(false);
  const langName = languageTag
    ? textLanguageLabels(languageTag, language).inUi
    : languageTag ?? '';

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
    <div className="mx-4 mt-3 mb-1 space-y-2 rounded-lg border border-brand-blue/40 bg-brand-blue/15 px-4 py-3 text-sm text-brand-ink">
      <p>
        {copy.bannerWriting
          .replace('{language}', langName)
          .replace('{title}', originalTitle || '—')}{' '}
        <Link
          href={`/biography/${originalId}/edit`}
          className="underline underline-offset-2 font-medium"
        >
          {copy.bannerOpenOriginal}
        </Link>
      </p>
      <p>{copy.bannerManualOnly}</p>
      {missingBookStructureParts.length > 0 && (
        <p>
          {copy.bookStructureReminder.replace('{parts}', missingPartsLabel)}
        </p>
      )}
      {showDrift && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-brand-mustardLight/50 border border-brand-mustardDark/30 px-3 py-2">
          <p className="flex-1 min-w-[12rem]">{copy.driftMessage}</p>
          <Button type="button" size="sm" disabled={busy} onClick={() => void confirmAligned()}>
            {copy.driftConfirm}
          </Button>
        </div>
      )}
      {originalStatus && originalStatus !== 'published' && (
        <p className="text-brand-mustardDark">{copy.originalUnpublishedNote}</p>
      )}
      {identicalSectionCount > 0 && (
        <p>
          {(identicalSectionCount === 1
            ? copy.identicalSectionOne
            : copy.identicalSections
          ).replace('{count}', String(identicalSectionCount))}
        </p>
      )}
    </div>
  );
}
