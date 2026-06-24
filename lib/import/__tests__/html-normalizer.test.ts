import { describe, expect, it } from 'vitest';
import {
  matchSectionTitle,
  sanitizeHtmlString,
  splitHtmlByTopHeadings,
} from '@/lib/import/html-normalizer';

describe('sanitizeHtmlString', () => {
  it('strips disallowed tags and control characters', () => {
    const out = sanitizeHtmlString('<p>Hello</p><script>x</script><span>World</span>');
    expect(out).toContain('<p>Hello</p>');
    expect(out).not.toContain('script');
  });
});

describe('splitHtmlByTopHeadings', () => {
  it('splits on h1 boundaries', () => {
    const html = '<h1>Infanzia</h1><p>Testo uno</p><h1>Carriera</h1><p>Testo due</p>';
    const chunks = splitHtmlByTopHeadings(html, 'h1');
    expect(chunks).toHaveLength(2);
    expect(chunks[0].title).toBe('Infanzia');
    expect(chunks[1].title).toBe('Carriera');
  });
});

describe('matchSectionTitle', () => {
  it('matches English section key', () => {
    const m = matchSectionTitle('childhood', 'en');
    expect(m?.key).toBe('childhood');
    expect(m?.confidence).toBe('high');
  });

  it('matches Italian localized title', () => {
    const m = matchSectionTitle('Infanzia e Primi Anni', 'it');
    expect(m?.key).toBe('childhood');
    expect(m?.confidence).toBe('high');
  });
});
