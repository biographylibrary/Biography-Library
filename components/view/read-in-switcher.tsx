'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { buildWorkVersions, type WorkVersion } from '@/lib/work-languages';
import { textLanguageLabels } from '@/lib/text-languages';

type EditionRow = {
  id: string;
  slug: string | null;
  title: string;
  subject_name: string | null;
  record_language_tag: string | null;
  translation_of: string | null;
};

interface ReadInSwitcherProps {
  biographyId: string;
  translationOf: string | null;
  title: string;
  subjectName?: string | null;
  recordLanguageTag: string;
}

function versionHref(version: WorkVersion): string {
  return version.slug
    ? `/biography/${version.slug}/view`
    : `/biography/${version.id}/view`;
}

export function ReadInSwitcher({
  biographyId,
  translationOf,
  title,
  subjectName,
  recordLanguageTag,
}: ReadInSwitcherProps) {
  const { t, language: uiLanguage } = useTranslation();
  const [versions, setVersions] = useState<WorkVersion[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const root = translationOf || biographyId;
    void (async () => {
      const { data } = await supabase
        .from('biographies')
        .select('id, slug, title, subject_name, record_language_tag, translation_of')
        .or(`id.eq.${root},translation_of.eq.${root}`)
        .eq('status', 'published')
        .eq('visibility', 'public');
      if (cancelled || !data) return;
      const rows = data as EditionRow[];
      const originalRow = rows.find((r) => !r.translation_of) ?? {
        id: root,
        slug: null,
        title,
        subject_name: subjectName ?? null,
        record_language_tag: recordLanguageTag,
        translation_of: null,
      };
      const editions = rows.filter((r) => !!r.translation_of);
      const built = buildWorkVersions(
        {
          id: originalRow.id,
          slug: originalRow.slug,
          title: originalRow.title,
          subjectName: originalRow.subject_name,
          tag: originalRow.record_language_tag || recordLanguageTag,
        },
        editions.map((e) => ({
          id: e.id,
          slug: e.slug,
          title: e.title,
          subjectName: e.subject_name,
          tag: e.record_language_tag,
        }))
      );
      if (!cancelled) setVersions(built);
    })();
    return () => {
      cancelled = true;
    };
  }, [biographyId, translationOf, title, subjectName, recordLanguageTag]);

  if (!versions || versions.length < 2) return null;

  return (
    <nav className="mt-3 text-sm text-muted-foreground" aria-label={t.view.readIn}>
      <span className="mr-2">{t.view.readIn}</span>
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        {versions.map((version) => {
          const labels = textLanguageLabels(version.tag, uiLanguage);
          const ownName = labels.own;
          const titleAttr =
            labels.inUi.toLowerCase() !== ownName.toLowerCase() ? labels.inUi : undefined;
          const isCurrent = version.id === biographyId;
          const originalMark = version.isOriginal
            ? ` (${t.view.originalEdition})`
            : '';

          if (isCurrent) {
            return (
              <span
                key={version.id}
                lang={version.tag}
                aria-current="true"
                className="text-foreground"
                title={titleAttr}
              >
                {ownName}
                {originalMark}
              </span>
            );
          }

          return (
            <Link
              key={version.id}
              href={versionHref(version)}
              lang={version.tag}
              hrefLang={version.tag}
              title={titleAttr}
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              {ownName}
              {originalMark}
            </Link>
          );
        })}
      </span>
    </nav>
  );
}
