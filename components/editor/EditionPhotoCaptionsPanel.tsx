'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { GALLERY_PHOTO_LAYOUTS } from '@/lib/biography-media-constants';
import {
  editionCaptionProgress,
  type EditionCaptionPhoto,
  type EditionCaptionRow,
} from '@/lib/edition-photo-captions';
import { textLanguageLabels } from '@/lib/text-languages';

const SIGNED_URL_EXPIRES = 3600;
const SAVE_DEBOUNCE_MS = 600;

type GalleryPhoto = EditionCaptionPhoto & {
  file_url: string;
  display_order?: number | null;
  previewUrl?: string;
};

type RowUi = {
  draft: string;
  saved: string;
  status: '' | 'saved' | 'error' | 'locked';
};

function storagePathFromUrl(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/biography-photos/');
    if (parts[1]) return parts[1];
  } catch {
    /* ignore */
  }
  return fileUrl;
}

async function getSignedUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('biography-photos')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES);
  return data?.signedUrl ?? '';
}

function isAuthorTextLockedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42501') return true;
  return Boolean(error.message?.includes('author_text_locked'));
}

export interface EditionPhotoCaptionsPanelProps {
  editionId: string;
  originalId: string;
  recordLanguageTag: string | null;
  readOnly?: boolean;
  readOnlyReason?: string;
}

export function EditionPhotoCaptionsPanel({
  editionId,
  originalId,
  recordLanguageTag,
  readOnly = false,
  readOnlyReason,
}: EditionPhotoCaptionsPanelProps) {
  const { t, language } = useTranslation();
  const copy = t.photos;
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [rows, setRows] = useState<Record<string, RowUi>>({});
  const [loading, setLoading] = useState(true);
  const [textLocked, setTextLocked] = useState(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveGenRef = useRef<Record<string, number>>({});
  const textLockedRef = useRef(false);

  const languageName = recordLanguageTag
    ? textLanguageLabels(recordLanguageTag, language).inUi
    : copy.editionCaptionsLanguageFallback;

  const persist = useCallback(
    async (mediaId: string, caption: string) => {
      if (readOnly || textLockedRef.current) return;
      const current = rowsRef.current[mediaId];
      if (!current) return;
      if (caption === current.saved) return;

      const gen = (saveGenRef.current[mediaId] ?? 0) + 1;
      saveGenRef.current[mediaId] = gen;
      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from('biography_edition_captions').upsert(
        {
          biography_id: editionId,
          media_id: mediaId,
          caption,
          updated_at: updatedAt,
        },
        { onConflict: 'biography_id,media_id' }
      );

      if (saveGenRef.current[mediaId] !== gen) return;

      if (error) {
        if (isAuthorTextLockedError(error)) {
          textLockedRef.current = true;
          setTextLocked(true);
          setRows((prev) => {
            const next: Record<string, RowUi> = {};
            for (const [id, row] of Object.entries(prev)) {
              next[id] = { ...row, status: 'locked' };
            }
            return next;
          });
          return;
        }
        setRows((prev) => ({
          ...prev,
          [mediaId]: { ...prev[mediaId], status: 'error' },
        }));
        return;
      }

      setRows((prev) => ({
        ...prev,
        [mediaId]: { draft: caption, saved: caption, status: 'saved' },
      }));
    },
    [editionId, readOnly]
  );

  const flushMedia = useCallback(
    (mediaId: string) => {
      const timer = timersRef.current[mediaId];
      if (timer) {
        clearTimeout(timer);
        delete timersRef.current[mediaId];
      }
      const current = rowsRef.current[mediaId];
      if (!current) return;
      void persist(mediaId, current.draft);
    },
    [persist]
  );

  const flushAll = useCallback(() => {
    for (const mediaId of Object.keys(timersRef.current)) {
      clearTimeout(timersRef.current[mediaId]);
      delete timersRef.current[mediaId];
    }
    for (const [mediaId, row] of Object.entries(rowsRef.current)) {
      if (row.draft !== row.saved) {
        void persist(mediaId, row.draft);
      }
    }
  }, [persist]);

  const schedulePersist = useCallback(
    (mediaId: string) => {
      const existing = timersRef.current[mediaId];
      if (existing) clearTimeout(existing);
      timersRef.current[mediaId] = setTimeout(() => {
        delete timersRef.current[mediaId];
        const current = rowsRef.current[mediaId];
        if (current) void persist(mediaId, current.draft);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: mediaRows } = await supabase
        .from('biography_media')
        .select('id, file_url, caption, layout, display_order')
        .eq('biography_id', originalId)
        .in('layout', [...GALLERY_PHOTO_LAYOUTS])
        .order('display_order', { ascending: true });

      if (cancelled) return;
      const gallery = ((mediaRows as GalleryPhoto[] | null) ?? []).filter((row) =>
        (GALLERY_PHOTO_LAYOUTS as readonly string[]).includes(row.layout ?? '')
      );

      const { data: captionRows } = await supabase
        .from('biography_edition_captions')
        .select('media_id, caption')
        .eq('biography_id', editionId);

      if (cancelled) return;
      const captions = (captionRows as EditionCaptionRow[] | null) ?? [];
      const byMedia = new Map(captions.map((c) => [c.media_id, c.caption ?? '']));

      const withPreview = await Promise.all(
        gallery.map(async (row) => {
          const path = storagePathFromUrl(row.file_url);
          const previewUrl = await getSignedUrl(path);
          return { ...row, previewUrl };
        })
      );

      if (cancelled) return;
      const nextRows: Record<string, RowUi> = {};
      for (const photo of withPreview) {
        const saved = byMedia.get(photo.id) ?? '';
        nextRows[photo.id] = { draft: saved, saved, status: '' };
      }
      setPhotos(withPreview);
      setRows(nextRows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [editionId, originalId]);

  useEffect(() => {
    return () => {
      flushAll();
    };
  }, [flushAll]);

  const progress = editionCaptionProgress(
    photos as EditionCaptionPhoto[],
    Object.entries(rows).map(([media_id, row]) => ({
      media_id,
      caption: row.saved,
    }))
  );

  const onDraftChange = (mediaId: string, value: string) => {
    if (readOnly || textLockedRef.current) return;
    setRows((prev) => ({
      ...prev,
      [mediaId]: {
        draft: value,
        saved: prev[mediaId]?.saved ?? '',
        status: prev[mediaId]?.status === 'locked' ? 'locked' : '',
      },
    }));
    schedulePersist(mediaId);
  };

  const fieldsDisabled = readOnly || textLocked;

  if (loading) {
    return <p className="text-sm text-muted-foreground">{copy.editionCaptionsLoading}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">
        {copy.editionCaptionsProgress
          .replace('{n}', String(progress.translated))
          .replace('{m}', String(progress.total))}
      </p>
      <p className="text-sm text-muted-foreground">{copy.editionCaptionsRule}</p>
      {readOnly && readOnlyReason ? (
        <p className="text-sm text-muted-foreground" role="status">
          {readOnlyReason}
        </p>
      ) : null}
      {textLocked && !readOnly ? (
        <p className="text-sm text-muted-foreground" role="status">
          {copy.editionCaptionsLocked}
        </p>
      ) : null}

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.editionCaptionsEmpty}</p>
      ) : (
        <ul className="space-y-6">
          {photos.map((photo) => {
            const row = rows[photo.id] ?? { draft: '', saved: '', status: '' as const };
            const originalCaption = (photo.caption ?? '').trim();
            const statusText =
              row.status === 'saved'
                ? copy.editionCaptionsSaved
                : row.status === 'error'
                  ? copy.editionCaptionsSaveFailed
                  : row.status === 'locked'
                    ? copy.editionCaptionsLocked
                    : '';
            return (
              <li key={photo.id} className="flex flex-col gap-2 min-w-0">
                <div className="flex gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl || photo.file_url}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded object-cover bg-muted"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {copy.editionCaptionsOriginalPrefix}{' '}
                      </span>
                      {originalCaption
                        ? originalCaption
                        : copy.editionCaptionsOriginalEmpty}
                    </p>
                    <Input
                      value={row.draft}
                      disabled={fieldsDisabled}
                      onChange={(e) => onDraftChange(photo.id, e.target.value)}
                      onBlur={() => flushMedia(photo.id)}
                      placeholder={copy.editionCaptionsPlaceholder.replace(
                        '{language}',
                        languageName
                      )}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground min-h-[1rem]" aria-live="polite">
                      {statusText}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
