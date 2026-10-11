// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

type Row = Record<string, unknown>;

function fakeClient(tables: Record<string, Row[]>) {
  const query = (table: string) => {
    let rows: Row[] = [...(tables[table] ?? [])];
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (col: string, val: unknown) => ((rows = rows.filter((r) => r[col] === val)), b);
    b.in = (col: string, vals: unknown[]) => ((rows = rows.filter((r) => vals.includes(r[col]))), b);
    b.order = (col: string) => (
      (rows = [...rows].sort((a, c) => Number(a[col] ?? 0) - Number(c[col] ?? 0))),
      b
    );
    b.limit = (n: number) => ((rows = rows.slice(0, n)), b);
    b.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
    return b;
  };
  return {
    from: (table: string) => query(table),
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://signed.example/${path}` },
          error: null,
        }),
      }),
    },
  };
}

describe('PDF edition media: cover + gallery captions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getCoverPhotoDisplayUrl legge la cover dal media owner (originale)', async () => {
    const { getCoverPhotoDisplayUrl, setPdfExportSupabaseClient } = await import('@/lib/pdf-export');
    setPdfExportSupabaseClient(
      fakeClient({
        biographies: [{ id: 'ed-1', translation_of: 'orig-1' }],
        biography_media: [
          {
            id: 'c1',
            biography_id: 'orig-1',
            layout: 'cover',
            file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/u/cover.jpg',
          },
        ],
      }) as never
    );
    expect(await getCoverPhotoDisplayUrl('ed-1')).toBe('https://signed.example/u/cover.jpg');
  });

  it('fetchGalleryPhotos: edizione usa solo biography_edition_captions', async () => {
    const { fetchGalleryPhotos, setPdfExportSupabaseClient } = await import('@/lib/pdf-export');
    setPdfExportSupabaseClient(
      fakeClient({
        biography_media: [
          {
            id: 'm1',
            biography_id: 'orig-1',
            file_url: 'u/a.jpg',
            caption: 'originale',
            layout: 'full-page',
            display_order: 1,
          },
        ],
        biography_edition_captions: [
          { biography_id: 'ed-1', media_id: 'm1', caption: '  edizione  ' },
        ],
      }) as never
    );
    const photos = await fetchGalleryPhotos('ed-1', 'orig-1');
    expect(photos).toEqual([
      expect.objectContaining({ id: 'm1', caption: 'edizione' }),
    ]);
  });

  it('fetchGalleryPhotos: originale usa caption di biography_media', async () => {
    const { fetchGalleryPhotos, setPdfExportSupabaseClient } = await import('@/lib/pdf-export');
    setPdfExportSupabaseClient(
      fakeClient({
        biography_media: [
          {
            id: 'm1',
            biography_id: 'orig-1',
            file_url: 'u/a.jpg',
            caption: '  media caption  ',
            layout: 'full-page',
            display_order: 1,
          },
        ],
      }) as never
    );
    const photos = await fetchGalleryPhotos('orig-1', 'orig-1');
    expect(photos[0].caption).toBe('media caption');
  });

  it('fetchGalleryPhotos: caption edizione solo spazi → null', async () => {
    const { fetchGalleryPhotos, setPdfExportSupabaseClient } = await import('@/lib/pdf-export');
    setPdfExportSupabaseClient(
      fakeClient({
        biography_media: [
          {
            id: 'm1',
            biography_id: 'orig-1',
            file_url: 'u/a.jpg',
            caption: 'originale',
            layout: 'full-page',
            display_order: 1,
          },
        ],
        biography_edition_captions: [{ biography_id: 'ed-1', media_id: 'm1', caption: '   \n' }],
      }) as never
    );
    const photos = await fetchGalleryPhotos('ed-1', 'orig-1');
    expect(photos[0].caption).toBeNull();
  });
});
