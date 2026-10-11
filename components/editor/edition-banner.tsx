'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { textLanguageLabels } from '@/lib/text-languages';

interface EditionBannerProps {
  languageTag: string | null;
  originalId: string;
  originalTitle: string;
}

/**
 * Barra in cima all'editor di un'edizione: solo la frase e «Apri l'originale».
 * Da sm (640px) una riga ≤44px; sotto, fino a due righe / 76px a 375px.
 * Solo il titolo dell'originale può essere troncato (da sm in su).
 */
export function EditionBanner({
  languageTag,
  originalId,
  originalTitle,
}: EditionBannerProps) {
  const { t, language } = useTranslation();
  const copy = t.translate;
  const langName = languageTag
    ? textLanguageLabels(languageTag, language).inUi
    : languageTag ?? '';
  const title = originalTitle || '—';
  const [prefixRaw, suffix = ''] = copy.bannerWriting.split('{title}');
  const prefix = prefixRaw.replace('{language}', langName);

  return (
    <div className="mx-4 mt-3 mb-1">
      <div className="flex max-h-[4.75rem] flex-col gap-1 rounded-lg border border-brand-blue/40 bg-brand-blue/15 px-3 py-2 text-sm text-brand-ink dark:text-brand-beigeLight sm:max-h-11 sm:flex-row sm:items-center sm:gap-3 sm:overflow-hidden sm:py-0">
        <p className="min-w-0 flex-1 leading-snug sm:flex sm:items-baseline sm:overflow-hidden sm:leading-none">
          <span className="shrink-0">{prefix}</span>
          <span className="min-w-0 sm:truncate" title={title}>
            {title}
          </span>
          <span className="shrink-0">{suffix}</span>
        </p>
        <Link
          href={`/biography/${originalId}/edit`}
          className="shrink-0 underline underline-offset-2 font-medium whitespace-nowrap"
        >
          {copy.bannerOpenOriginal}
        </Link>
      </div>
    </div>
  );
}
