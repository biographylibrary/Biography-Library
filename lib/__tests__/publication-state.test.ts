import { describe, expect, it } from 'vitest';
import {
  BIOGRAPHY_STATUS_VALUES,
  isAuthorTextEditableStatus,
  isBiographyPublicationStatus,
  isFinalVersionSourceStatus,
  isLockedPendingScreeningStatus,
  isPdfDraftPhaseStatus,
  isReviewOrScreeningLockStatus,
  type BiographyPublicationStatus,
} from '@/lib/publication-state';

describe('publication-state', () => {
  it('accepts all canonical status values', () => {
    for (const status of BIOGRAPHY_STATUS_VALUES) {
      expect(isBiographyPublicationStatus(status)).toBe(true);
    }
  });

  it('rejects unknown status strings', () => {
    expect(isBiographyPublicationStatus('')).toBe(false);
    expect(isBiographyPublicationStatus('pending')).toBe(false);
    expect(isBiographyPublicationStatus('PUBLISHED')).toBe(false);
  });

  it('allows author edits only in early lifecycle states', () => {
    const editable: BiographyPublicationStatus[] = ['draft', 'sections_complete', 'final_version', 'pdf_draft'];
    const locked: BiographyPublicationStatus[] = [
      'locked_pending_screening',
      'under_review',
      'published',
      'removed',
    ];

    for (const status of editable) {
      expect(isAuthorTextEditableStatus(status)).toBe(true);
    }
    for (const status of locked) {
      expect(isAuthorTextEditableStatus(status)).toBe(false);
    }
  });

  it('identifies PDF draft phase', () => {
    expect(isPdfDraftPhaseStatus('pdf_draft')).toBe(true);
    expect(isPdfDraftPhaseStatus('final_version')).toBe(false);
  });

  it('identifies locked pending screening', () => {
    expect(isLockedPendingScreeningStatus('locked_pending_screening')).toBe(true);
    expect(isLockedPendingScreeningStatus('under_review')).toBe(false);
  });

  it('groups review and screening lock statuses', () => {
    expect(isReviewOrScreeningLockStatus('under_review')).toBe(true);
    expect(isReviewOrScreeningLockStatus('locked_pending_screening')).toBe(true);
    expect(isReviewOrScreeningLockStatus('draft')).toBe(false);
  });

  it('uses final_version as PDF body source for late-stage statuses', () => {
    expect(isFinalVersionSourceStatus('final_version')).toBe(true);
    expect(isFinalVersionSourceStatus('published')).toBe(true);
    expect(isFinalVersionSourceStatus('pdf_draft')).toBe(true);
    expect(isFinalVersionSourceStatus('locked_pending_screening')).toBe(true);
    expect(isFinalVersionSourceStatus('draft')).toBe(false);
  });
});
