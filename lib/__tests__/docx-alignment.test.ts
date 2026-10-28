// @vitest-environment node
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildBiographyDocxBuffer } from '@/lib/export-utils';

/** Il corpo del file Word deve essere a bandiera sinistra: solo la copertina è centrata. */
describe('Word: allineamento', () => {
  it('scrive «sinistra» come predefinito e tiene al centro solo titolo, autore e data', async () => {
    const buffer = await buildBiographyDocxBuffer('Titolo', 'Autore', '2026-01-01', [
      { title: 'Capitolo', content: 'Primo paragrafo.\n\nSecondo paragrafo.' },
    ]);
    const zip = await JSZip.loadAsync(buffer);
    const styles = await zip.file('word/styles.xml')!.async('string');
    const body = await zip.file('word/document.xml')!.async('string');

    expect(styles).toMatch(/<w:pPrDefault><w:pPr><w:jc w:val="left"\/>/);
    expect((body.match(/<w:jc w:val="center"\/>/g) ?? []).length).toBe(3);
    // Nessun centrato dopo la copertina: il primo paragrafo del corpo viene dopo i tre centrati.
    const afterCover = body.slice(body.indexOf('Primo paragrafo'));
    expect(afterCover).not.toContain('w:val="center"');
  });
});
