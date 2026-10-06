import { describe, expect, it, vi } from 'vitest';
import {
  PT_H1,
  PT_H2,
  PT_H3,
  renderSemanticHtmlBody,
  type SemanticRenderContext,
} from '@/lib/pdf/semantic-html-renderer';
import { archiveMarkdownToHtml } from '@/lib/archive-markdown';

type Drawn = { text: string; fontSize: number };

function makeCtx(drawn: Drawn[], pageWidth = 100): SemanticRenderContext {
  let fontSize = 11;
  const doc = {
    setFontSize: (n: number) => {
      fontSize = n;
    },
    setTextColor: () => {},
    getTextWidth: (text: string) => text.length * (fontSize * 0.45),
    text: (text: string | string[], _x: number, _y: number) => {
      const parts = Array.isArray(text) ? text : [text];
      for (const t of parts) drawn.push({ text: t, fontSize });
    },
    setFont: () => {},
  } as unknown as SemanticRenderContext['doc'];

  return {
    doc,
    y: 20,
    textAreaTop: 20,
    textAreaBottom: 260,
    textStartX: () => 20,
    textAvailableWidth: () => pageWidth,
    absolutePage: 1,
    applyFont: () => {},
    addNewPage: vi.fn(),
    language: 'it',
  };
}

describe('PDF semantic HTML — headings wrap without loss', () => {
  it('long h1/h2/h3 keep every character (narrow page forces wraps)', () => {
    const longH3 =
      'Proposta di percorsi, workshop e laboratori (versione 2, settembre 2026)';
    const longWord = 'Supercalifragilistichespiralidoso'.repeat(3);
    const md = [
      `# Titolo uno lunghissimo che supera il margine destro del foglio A5 senza perdere nulla`,
      ``,
      `## Secondo titolo altrettanto lungo per verificare il wrapping al livello due`,
      ``,
      `### ${longH3}`,
      ``,
      `# ${longWord}`,
    ].join('\n');
    const html = archiveMarkdownToHtml(md);
    const drawn: Drawn[] = [];
    const ctx = makeCtx(drawn, 55);
    renderSemanticHtmlBody(ctx, html);

    const allText = drawn.map((d) => d.text.replace(/-$/, '')).join('');
    const compact = allText.replace(/\s+/g, '');
    expect(compact).toContain('settembre2026)');
    expect(compact).toContain('026)');
    expect(compact).not.toMatch(/settembre2$/);
    // Every source letter from the long h3 appears in drawn output (hyphen may split).
    for (const ch of longH3.replace(/\s+/g, '')) {
      expect(compact).toContain(ch);
    }
    for (const ch of longWord) {
      expect(compact).toContain(ch);
    }
    // Narrow page must force multi-line wraps (not a single clipped line).
    expect(drawn.filter((d) => d.fontSize === PT_H3).length).toBeGreaterThan(1);
    expect(drawn.some((d) => d.fontSize === PT_H3)).toBe(true);
    expect(drawn.some((d) => d.fontSize === PT_H1)).toBe(true);
    expect(drawn.some((d) => d.fontSize === PT_H2)).toBe(true);
  });
});

describe('PDF semantic HTML — lists', () => {
  it('renders ordered lists with numbers and bullets for ul', () => {
    const html = archiveMarkdownToHtml(
      ['1. Introduzione', '', '2. prova', '', '- punto', '', '  - annidato'].join('\n')
    );
    // Nested lists may flatten depending on serializer; at least top-level ol/ul.
    const drawn: Drawn[] = [];
    renderSemanticHtmlBody(makeCtx(drawn, 120), html);
    const lines = drawn.map((d) => d.text).join('\n');
    expect(lines).toMatch(/1\.\s*Introduzione/);
    expect(lines).toMatch(/2\.\s*prova/);
    expect(lines).toMatch(/•\s*punto/);
    expect(lines).not.toMatch(/•\s*Introduzione/);
  });

  it('honours ol start attribute', () => {
    const drawn: Drawn[] = [];
    renderSemanticHtmlBody(
      makeCtx(drawn, 120),
      '<ol start="3"><li><p>tre</p></li><li><p>quattro</p></li></ol>'
    );
    const lines = drawn.map((d) => d.text).join('\n');
    expect(lines).toMatch(/3\.\s*tre/);
    expect(lines).toMatch(/4\.\s*quattro/);
  });
});
