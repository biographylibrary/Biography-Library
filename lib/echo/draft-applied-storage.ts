const STORAGE_PREFIX = 'echo-applied-drafts:';

function storageKey(threadId: string): string {
  return `${STORAGE_PREFIX}${threadId}`;
}

export function getAppliedDraftMessageIds(threadId: string | undefined): Set<string> {
  if (!threadId || typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey(threadId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function markDraftApplied(threadId: string | undefined, messageId: string): void {
  if (!threadId || typeof window === 'undefined') return;
  const ids = getAppliedDraftMessageIds(threadId);
  ids.add(messageId);
  try {
    localStorage.setItem(storageKey(threadId), JSON.stringify(Array.from(ids)));
  } catch {
    // ignore quota errors
  }
}
