import { sanitizeHtml, sanitizeHtmlString } from '@/lib/import/html-normalizer';

const HTML_MARKERS = /<(?:p|br|div|strong|b|em|i|ul|ol|li|h[1-3]|blockquote|table)\b/i;

export function biographySectionLooksLikeHtml(text: string): boolean {
  return HTML_MARKERS.test(text.trim());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sanitized HTML for read-only biography section bodies (TipTap HTML or legacy plain text). */
export function biographySectionToSafeHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (biographySectionLooksLikeHtml(trimmed)) {
    if (typeof document === 'undefined') {
      return sanitizeHtmlString(trimmed);
    }
    return sanitizeHtml(trimmed);
  }

  return trimmed
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
