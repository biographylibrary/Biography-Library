import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookParts } from '@/components/biography/BookParts';
import type { BookPart } from '@/lib/book-parts';

describe('BookParts', () => {
  it('titoli nella lingua del testo; dedica ed epigrafe senza titolo visibile', () => {
    const parts: BookPart[] = [
      { key: 'dedication', text: 'Per te' },
      { key: 'epigraph', text: 'Citazione', source: 'Fonte' },
      { key: 'preface', text: 'Prefazione' },
    ];
    const html = renderToStaticMarkup(
      <BookParts position="front" parts={parts} languageTag="it" />
    );
    expect(html).toContain('aria-label="Dedica"');
    expect(html).toContain('aria-label="Epigrafe"');
    expect(html).toContain('Prefazione');
    expect(html).not.toMatch(/>\s*Dedica\s*</);
    expect(html).not.toMatch(/>\s*Epigrafe\s*</);
    expect(html).toContain('— Fonte');
  });

  it('markup pericoloso compare come testo, non come elemento', () => {
    const parts: BookPart[] = [
      {
        key: 'preface',
        text: '<script>alert(1)</script><img onerror="x" src=x>ciao',
      },
    ];
    const html = renderToStaticMarkup(
      <BookParts position="front" parts={parts} languageTag="en" />
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toMatch(/<img[^>]*onerror/i);
    expect(html).toContain('ciao');
  });

  it('fonte epigrafe come testo escapato', () => {
    const parts: BookPart[] = [
      {
        key: 'epigraph',
        text: 'Q',
        source: '<b>fonte</b>',
      },
    ];
    const html = renderToStaticMarkup(
      <BookParts position="front" parts={parts} languageTag="en" />
    );
    expect(html).toContain('&lt;b&gt;fonte&lt;/b&gt;');
    expect(html).not.toContain('<b>fonte</b>');
  });
});
