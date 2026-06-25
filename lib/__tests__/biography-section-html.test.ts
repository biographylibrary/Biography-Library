import { describe, expect, it } from 'vitest';
import {
  biographySectionLooksLikeHtml,
  biographySectionToSafeHtml,
} from '@/lib/biography-section-html';

describe('biographySectionToSafeHtml', () => {
  it('renders TipTap HTML without visible tags', () => {
    const input =
      '<p style="text-align: left;">Hello <strong>world</strong>.<br><br>Second paragraph.</p>';
    const out = biographySectionToSafeHtml(input);
    expect(biographySectionLooksLikeHtml(input)).toBe(true);
    expect(out).toContain('<p>');
    expect(out).toContain('<strong>world</strong>');
    expect(out).not.toContain('text-align');
    expect(out).not.toContain('<script');
  });

  it('wraps legacy plain text in paragraphs', () => {
    const input = 'First paragraph.\n\nSecond paragraph.';
    const out = biographySectionToSafeHtml(input);
    expect(out).toBe('<p>First paragraph.</p><p>Second paragraph.</p>');
  });

  it('strips script tags from HTML', () => {
    const out = biographySectionToSafeHtml('<p>Safe</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).toContain('Safe');
  });
});
