// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { languageOptions } from '@/lib/work-languages';

const fetchFeaturedBiographies = vi.fn();
const fetchMostReadBiographies = vi.fn();
const fetchDiscoverBiographies = vi.fn();
const fetchPublicEditionsOf = vi.fn();
const fetchPublicLanguageTags = vi.fn();

vi.mock('@/lib/biographies', () => ({
  fetchFeaturedBiographies: (...args: unknown[]) => fetchFeaturedBiographies(...args),
  fetchMostReadBiographies: (...args: unknown[]) => fetchMostReadBiographies(...args),
  fetchDiscoverBiographies: (...args: unknown[]) => fetchDiscoverBiographies(...args),
  fetchPublicEditionsOf: (...args: unknown[]) => fetchPublicEditionsOf(...args),
  fetchPublicLanguageTags: (...args: unknown[]) => fetchPublicLanguageTags(...args),
}));

import { usePublicCatalogInitialLoad } from '@/hooks/use-public-catalog-initial-load';

const SAMPLE_BIO = {
  id: 'bio-1',
  title: 'Maria',
  slug: 'maria',
  author_name: 'Maria',
  subject_name: null,
  biography_type: 'autobiography' as const,
  record_language_tag: 'it',
  published_at: '2026-09-01T00:00:00.000Z',
  provisional_until: null,
  cover_photo_url: null,
  is_featured: false,
  view_count: 0,
};

describe('usePublicCatalogInitialLoad', () => {
  beforeEach(() => {
    fetchFeaturedBiographies.mockResolvedValue({ data: [SAMPLE_BIO], error: null });
    fetchMostReadBiographies.mockResolvedValue({ data: [], error: null });
    fetchDiscoverBiographies.mockResolvedValue({ data: [], error: null });
    fetchPublicEditionsOf.mockResolvedValue({ data: [], error: null });
    fetchPublicLanguageTags.mockResolvedValue({
      data: [{ record_language_tag: 'it' }, { record_language_tag: 'de' }],
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('cambio lingua UI: nessun nuovo fetch, isLoading resta false, etichette menu aggiornate', async () => {
    const { result, rerender } = renderHook(
      ({ language, errorLoadingMessage }) =>
        usePublicCatalogInitialLoad({ language, errorLoadingMessage }),
      {
        initialProps: {
          language: 'en',
          errorLoadingMessage: 'Failed to load biographies.',
        },
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const featuredCalls = fetchFeaturedBiographies.mock.calls.length;
    const mostReadCalls = fetchMostReadBiographies.mock.calls.length;
    const discoverCalls = fetchDiscoverBiographies.mock.calls.length;
    const editionsCalls = fetchPublicEditionsOf.mock.calls.length;
    const tagsCalls = fetchPublicLanguageTags.mock.calls.length;

    expect(featuredCalls).toBeGreaterThanOrEqual(1);
    expect(result.current.languageMenu.map((o) => o.label)).toEqual(
      languageOptions(['it', 'de'], 'en').map((o) => o.label)
    );

    await act(async () => {
      rerender({
        language: 'it',
        errorLoadingMessage: 'Impossibile caricare le biografie.',
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(fetchFeaturedBiographies).toHaveBeenCalledTimes(featuredCalls);
    expect(fetchMostReadBiographies).toHaveBeenCalledTimes(mostReadCalls);
    expect(fetchDiscoverBiographies).toHaveBeenCalledTimes(discoverCalls);
    expect(fetchPublicEditionsOf).toHaveBeenCalledTimes(editionsCalls);
    expect(fetchPublicLanguageTags).toHaveBeenCalledTimes(tagsCalls);
    expect(result.current.languageMenu.map((o) => o.label)).toEqual(
      languageOptions(['it', 'de'], 'it').map((o) => o.label)
    );
    expect(result.current.languageMenu.map((o) => o.label)).not.toEqual(
      languageOptions(['it', 'de'], 'en').map((o) => o.label)
    );
  });
});
