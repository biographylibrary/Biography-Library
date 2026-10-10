'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { textLanguageLabels } from '@/lib/text-languages';
import { supabase } from '@/lib/supabase';

interface EditionBannerProps {
  languageTag: string | null;
  originalId: string;
  originalTitle: string;
  originalStatus: string | null;
  showDrift: boolean;
  identicalSectionCount: number;
  onAligned: (originalVersionAt: string) => void;
  editionId: string;
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
}: EditionBannerProps) {
  const { t, language } = useTranslation();
  const copy = t.translate;
  const [busy, setBusy] = useState(false);
  const langName = languageTag
    ? textLanguageLabels(languageTag, language).inUi
    : languageTag ?? '';

  const confirmAligned = useCallback(async () => {
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
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
      }
    } finally {
      setBusy(false);
    }
  }, [editionId, onAligned]);

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
          {copy.identicalSections.replace('{count}', String(identicalSectionCount))}
        </p>
      )}
    </div>
  );
}
