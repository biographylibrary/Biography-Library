export type EditionCaptionPhoto = {
  id: string;
  caption?: string | null;
  layout?: string | null;
};

export type EditionCaptionRow = {
  media_id: string;
  caption?: string | null;
};

export type EditionCaptionProgress = {
  total: number;
  translated: number;
  missingMediaIds: string[];
};

function nonEmptyCaption(value: string | null | undefined): boolean {
  return Boolean(typeof value === 'string' && value.trim());
}

/**
 * Progress of translated gallery captions.
 * `total` counts gallery photos that have a non-empty caption on the original.
 * Rows for missing or non-gallery media are ignored.
 */
export function editionCaptionProgress(
  originalPhotos: EditionCaptionPhoto[],
  editionCaptions: EditionCaptionRow[]
): EditionCaptionProgress {
  const captionByMedia = new Map<string, string>();
  for (const row of editionCaptions) {
    if (typeof row.media_id === 'string') {
      captionByMedia.set(row.media_id, typeof row.caption === 'string' ? row.caption : '');
    }
  }

  const withOriginalCaption = originalPhotos.filter((p) => nonEmptyCaption(p.caption));
  const missingMediaIds: string[] = [];
  let translated = 0;
  for (const photo of withOriginalCaption) {
    if (nonEmptyCaption(captionByMedia.get(photo.id))) {
      translated += 1;
    } else {
      missingMediaIds.push(photo.id);
    }
  }

  return {
    total: withOriginalCaption.length,
    translated,
    missingMediaIds,
  };
}
