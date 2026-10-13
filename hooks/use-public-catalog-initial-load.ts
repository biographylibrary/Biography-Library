'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchDiscoverBiographies,
  fetchFeaturedBiographies,
  fetchMostReadBiographies,
  fetchPublicEditionsOf,
  fetchPublicLanguageTags,
  type PublishedBiography,
  type PublicEditionRow,
} from '@/lib/biographies';
import { languageOptions } from '@/lib/work-languages';

/**
 * Caricamento iniziale del catalogo pubblico.
 * Non dipende dalla lingua dell'interfaccia: il messaggio di errore sta in un ref.
 */
export function usePublicCatalogInitialLoad(opts: {
  errorLoadingMessage: string;
  language: string;
}) {
  const errorLoadingRef = useRef(opts.errorLoadingMessage);
  errorLoadingRef.current = opts.errorLoadingMessage;

  const [featured, setFeatured] = useState<PublishedBiography[]>([]);
  const [mostRead, setMostRead] = useState<PublishedBiography[]>([]);
  const [discover, setDiscover] = useState<PublishedBiography[]>([]);
  const [editionsByOriginal, setEditionsByOriginal] = useState<
    Record<string, PublicEditionRow[]>
  >({});
  const [languageTags, setLanguageTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const languageMenu = useMemo(
    () => languageOptions(languageTags, opts.language),
    [languageTags, opts.language]
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      const [featuredRes, mostReadRes, tagsRes] = await Promise.all([
        fetchFeaturedBiographies(),
        fetchMostReadBiographies(),
        fetchPublicLanguageTags(),
      ]);

      if (featuredRes.error || mostReadRes.error) {
        setError(
          featuredRes.error ?? mostReadRes.error ?? errorLoadingRef.current
        );
        setIsLoading(false);
        return;
      }

      const featuredData = featuredRes.data ?? [];
      const mostReadData = mostReadRes.data ?? [];

      const shownIds = [
        ...featuredData.map((b) => b.id),
        ...mostReadData.map((b) => b.id),
      ];
      const uniqueShownIds = shownIds.filter((id, i, arr) => arr.indexOf(id) === i);

      const discoverRes = await fetchDiscoverBiographies(uniqueShownIds);
      const discoverData = discoverRes.data ?? [];

      const allShownIds = [
        ...uniqueShownIds,
        ...discoverData.map((b) => b.id),
      ].filter((id, i, arr) => arr.indexOf(id) === i);

      const editionsRes = await fetchPublicEditionsOf(allShownIds);
      const byOriginal: Record<string, PublicEditionRow[]> = {};
      for (const row of editionsRes.data ?? []) {
        const key = row.translation_of;
        if (!byOriginal[key]) byOriginal[key] = [];
        byOriginal[key]!.push(row);
      }

      const tags = (tagsRes.data ?? [])
        .map((r) => r.record_language_tag)
        .filter((tag): tag is string => !!tag?.trim());

      setFeatured(featuredData);
      setMostRead(mostReadData);
      setDiscover(discoverData);
      setEditionsByOriginal(byOriginal);
      setLanguageTags(tags);
      setIsLoading(false);
    };

    void load();
  }, []);

  return {
    featured,
    mostRead,
    discover,
    editionsByOriginal,
    setEditionsByOriginal,
    languageTags,
    languageMenu,
    isLoading,
    error,
  };
}
