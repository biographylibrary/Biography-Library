import { isBiographyPublicationStatus } from '@/lib/publication-state';

/** Catalog, lists, and social cards. A memorial inside its window is still published. */
export function isInPublicCatalog(status: string): boolean {
  return status === 'published';
}

/** The UM resolver redirects only when the record can actually be read. */
export function umRecordIsConsultable(input: {
  status: string;
  visibility: string;
  accountStatus: string | null | undefined;
}): boolean {
  return (
    input.status === 'published' &&
    input.visibility === 'public' &&
    input.accountStatus === 'active'
  );
}

/**
 * While an appeal is open or rejected, the biography stays as the decision left it.
 * Only an accepted appeal returns the status from before that decision.
 */
export function statusRestoredByAppeal(
  outcome: 'pending' | 'upheld' | 'rejected',
  statusBeforeDecision: string | null,
): string | null {
  if (outcome !== 'upheld') return null;
  if (!statusBeforeDecision || !isBiographyPublicationStatus(statusBeforeDecision)) return null;
  return statusBeforeDecision;
}
