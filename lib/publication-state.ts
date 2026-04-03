/**
 * Biography publication lifecycle — DB `biographies.status` and helpers.
 * See ARCHITECTURE.md §6 / §6a for product behaviour.
 */

export const BIOGRAPHY_STATUS_VALUES = [
  'draft',
  'sections_complete',
  'final_version',
  'pdf_draft',
  'locked_pending_screening',
  'under_review',
  'published',
  'removed',
] as const;

export type BiographyPublicationStatus = (typeof BIOGRAPHY_STATUS_VALUES)[number];

export function isBiographyPublicationStatus(s: string): s is BiographyPublicationStatus {
  return (BIOGRAPHY_STATUS_VALUES as readonly string[]).includes(s);
}

/** Author may still change body text (not yet locked for definitive PDF / screening). */
export function isAuthorTextEditableStatus(status: BiographyPublicationStatus): boolean {
  return (
    status === 'draft' ||
    status === 'sections_complete' ||
    status === 'final_version' ||
    status === 'pdf_draft'
  );
}

/**
 * Definitive text lock after final PDF approval, before/during AI screening.
 * Distinct from `under_review` (human queue after AI flags).
 */
export function isLockedPendingScreeningStatus(status: BiographyPublicationStatus): boolean {
  return status === 'locked_pending_screening';
}

/** Watermarked PDF draft rounds — uses `pdf_draft_iteration` 1–3 in DB. */
export function isPdfDraftPhaseStatus(status: BiographyPublicationStatus): boolean {
  return status === 'pdf_draft';
}

/**
 * Treat like legacy "final or published" for PDF body source (`final_version` field) and export gates.
 */
export function isFinalVersionSourceStatus(status: BiographyPublicationStatus): boolean {
  return (
    status === 'final_version' ||
    status === 'published' ||
    status === 'pdf_draft' ||
    status === 'locked_pending_screening'
  );
}

/**
 * Editor / section read-only flags that mirror `under_review` (full lock until partial revision unlock is implemented).
 */
export function isReviewOrScreeningLockStatus(status: BiographyPublicationStatus): boolean {
  return status === 'under_review' || status === 'locked_pending_screening';
}
