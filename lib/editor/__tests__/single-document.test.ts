import { describe, expect, it } from 'vitest';
import { getEmptyContent } from '@/lib/editor-constants';
import {
  appendChapter,
  composeSingleDocument,
  listChapterAnchors,
  sectionsToDocumentHtml,
} from '@/lib/editor/single-document';

describe('single document', () => {
  it('keeps an existing continuous text and ignores empty preset sections', () => {
    const content = getEmptyContent();
    content.childhood = { text: '<p>Nascita</p>', todo: false, audioTranscript: '' };
    const sheet = composeSingleDocument(content, '<p>Già scritto</p>', (key) => key);
    expect(sheet).toBe('<p>Già scritto</p>');
    expect(listChapterAnchors(sheet)).toEqual([]);
  });

  it('turns only filled sections into chapters', () => {
    const content = getEmptyContent();
    content.family = { text: '<p>Mia madre</p>', todo: false, audioTranscript: '' };
    const sheet = composeSingleDocument(content, '', (key) => (key === 'family' ? 'Famiglia' : key));
    expect(listChapterAnchors(sheet)).toEqual([{ index: 0, title: 'Famiglia' }]);
    expect(sheet).toContain('<p>Mia madre</p>');
    expect(sheet).not.toContain('childhood');
  });

  it('adds a chapter without inventing one when the sheet is empty', () => {
    expect(listChapterAnchors('')).toEqual([]);
    const next = appendChapter('', 'Capitolo');
    expect(next).toBe('# Capitolo');
    expect(listChapterAnchors(next)).toEqual([{ index: 0, title: 'Capitolo' }]);
  });

  it('reads chapter titles from the saved text', () => {
    expect(listChapterAnchors('# Infanzia\n\nEro piccolo.\n\n## Non un capitolo')).toEqual([
      { index: 0, title: 'Infanzia' },
    ]);
  });

  it('turns imported headings into chapter titles', () => {
    const html = sectionsToDocumentHtml([
      { title: 'Infanzia', content: '<p>Ero piccolo.</p>' },
      { title: '', content: '<p>Senza titolo</p>' },
    ]);
    expect(listChapterAnchors(html)).toEqual([{ index: 0, title: 'Infanzia' }]);
    expect(html).toContain('<p>Senza titolo</p>');
    expect(html).not.toContain('<h1></h1>');
  });
});
