/** Memorial window is a date, not a status. Autobiographies stay null. */

export const MEMORIAL_WINDOW_DAYS = 30;

export function addUtcDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function isWithinProvisionalWindow(
  provisionalUntil: string | null | undefined,
  now = new Date(),
): boolean {
  if (!provisionalUntil) return false;
  const until = new Date(provisionalUntil).getTime();
  if (Number.isNaN(until)) return false;
  return until > now.getTime();
}

/** First publication of a memorial. Does not touch an existing window. */
export function provisionalUntilOnFirstPublish(
  biographyType: string | null | undefined,
  publishedAt: string,
): string | null {
  if (biographyType !== 'memorial') return null;
  return addUtcDays(publishedAt, MEMORIAL_WINDOW_DAYS);
}

/** Accepted republication. published_at stays as it was. */
export function republicationClock(
  biographyType: string | null | undefined,
  revisedAt: string,
): { revised_at: string; provisional_until?: string } {
  const patch: { revised_at: string; provisional_until?: string } = { revised_at: revisedAt };
  if (biographyType === 'memorial') {
    patch.provisional_until = addUtcDays(revisedAt, MEMORIAL_WINDOW_DAYS);
  }
  return patch;
}
