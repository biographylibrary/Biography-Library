import { looksLikeStoredHtml, storedToSafeHtml } from '@/lib/archive-markdown';

export function biographySectionLooksLikeHtml(text: string): boolean {
  return looksLikeStoredHtml(text);
}

/** Sanitized HTML for read-only bodies, generated from stored Markdown (or legacy HTML). */
export function biographySectionToSafeHtml(text: string): string {
  return storedToSafeHtml(text);
}
