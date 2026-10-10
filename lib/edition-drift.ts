/**
 * Vero se l'originale è stato rivisto dopo l'ultimo allineamento della traduzione.
 * Se original_version_at è nullo non c'è avviso.
 */
export function originalIsNewerThanEditionAlignment(input: {
  originalVersionAt: string | null | undefined;
  originalRevisedAt: string | null | undefined;
  originalPublishedAt: string | null | undefined;
}): boolean {
  if (!input.originalVersionAt) return false;
  const aligned = Date.parse(input.originalVersionAt);
  if (Number.isNaN(aligned)) return false;

  const revised = input.originalRevisedAt ? Date.parse(input.originalRevisedAt) : NaN;
  const published = input.originalPublishedAt ? Date.parse(input.originalPublishedAt) : NaN;
  const current =
    !Number.isNaN(revised) ? revised : !Number.isNaN(published) ? published : NaN;
  if (Number.isNaN(current)) return false;
  return current > aligned;
}

/** COALESCE(revised_at, published_at) come stringa ISO, o null. */
export function originalVersionTimestamp(input: {
  revised_at?: string | null;
  published_at?: string | null;
}): string | null {
  return input.revised_at ?? input.published_at ?? null;
}
