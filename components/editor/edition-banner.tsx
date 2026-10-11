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
 * Da sm (640px): una riga, sm:py-2, sm:max-h-11 (≤44px); solo il titolo troncato.
 * Sotto sm: py-1.5, frase line-clamp-2 (senza max-h sul contenitore), link sempre dentro.
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
      <div className="flex flex-col gap-1 rounded-lg border border-brand-blue/40 bg-brand-blue/15 px-3 py-1.5 text-sm text-brand-ink dark:text-brand-beigeLight sm:max-h-11 sm:flex-row sm:items-center sm:gap-3 sm:overflow-hidden sm:py-2">
        {/*
          line-clamp-2 sotto sm; da sm in su line-clamp-none poi sm:!flex così
          display:flex vince su display:block di line-clamp-none nel CSS generato.
        */}
        <p className="min-w-0 flex-1 leading-snug line-clamp-2 sm:line-clamp-none sm:!flex sm:items-baseline sm:overflow-hidden sm:leading-none">
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
