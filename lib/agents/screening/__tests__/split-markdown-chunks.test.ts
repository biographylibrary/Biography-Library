import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_CHUNK_CHARS,
  MAX_CHUNK_TOKENS,
  effectiveMaxChunkChars,
  forcedFailChunkIndex,
  weightedLength,
} from '@/lib/agents/screening/chunk-limits';
import {
  concatenateChunkBodies,
  splitMarkdownIntoChunks,
} from '@/lib/agents/screening/split-markdown-chunks';

function assertRoundTrip(source: string, maxUnits?: number) {
  const budget = maxUnits ?? MAX_CHUNK_CHARS;
  const chunks = splitMarkdownIntoChunks(source, budget);
  expect(concatenateChunkBodies(chunks)).toBe(source);
  for (const c of chunks) {
    expect(weightedLength(c.body)).toBeLessThanOrEqual(budget);
    expect(c.end - c.start).toBe(c.body.length);
    expect(c.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  }
  for (let i = 1; i < chunks.length; i++) {
    expect(chunks[i].context.length).toBeGreaterThan(0);
    expect(chunks[i].modelText).toContain('[CONTEXT');
    expect(chunks[i].modelText).toContain(chunks[i].body);
  }
}

describe('chunk limits', () => {
  const env = process.env as Record<string, string | undefined>;
  const prevNodeEnv = env.NODE_ENV;
  const prevOverride = env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE;
  const prevForceFail = env.SCREENING_FORCE_FAIL_CHUNK_INDEX;

  afterEach(() => {
    if (prevNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prevNodeEnv;
    if (prevOverride === undefined) delete env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE;
    else env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE = prevOverride;
    if (prevForceFail === undefined) delete env.SCREENING_FORCE_FAIL_CHUNK_INDEX;
    else env.SCREENING_FORCE_FAIL_CHUNK_INDEX = prevForceFail;
  });

  it('fissa il pezzo a un quarto della finestra Infomaniak tolto prompt e uscita', () => {
    expect(MAX_CHUNK_TOKENS).toBe(23_863);
    expect(MAX_CHUNK_CHARS).toBe(95_452);
  });

  it('in production ignora SCREENING_MAX_CHUNK_CHARS_OVERRIDE e SCREENING_FORCE_FAIL_CHUNK_INDEX', () => {
    env.NODE_ENV = 'production';
    env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE = '3000';
    env.SCREENING_FORCE_FAIL_CHUNK_INDEX = '1';
    expect(effectiveMaxChunkChars()).toBe(MAX_CHUNK_CHARS);
    expect(forcedFailChunkIndex()).toBeNull();
  });

  it('fuori da production le variabili di prova hanno effetto', () => {
    env.NODE_ENV = 'test';
    env.SCREENING_MAX_CHUNK_CHARS_OVERRIDE = '3000';
    env.SCREENING_FORCE_FAIL_CHUNK_INDEX = '1';
    expect(effectiveMaxChunkChars()).toBe(3000);
    expect(forcedFailChunkIndex()).toBe(1);
  });
});

describe('splitMarkdownIntoChunks', () => {
  it('ricostruisce esattamente un testo con titoli e paragrafi', () => {
    const source =
      '# Infanzia\n\nPrimo paragrafo.\n\nSecondo paragrafo.\n\n## Scuola\n\nAltro testo.\n';
    assertRoundTrip(source, 80);
    const chunks = splitMarkdownIntoChunks(source, 80);
    expect(chunks.some((c) => c.partTitle === 'Infanzia' || c.partTitle === 'Scuola')).toBe(true);
  });

  it('senza titoli resta fedele e spezza solo sui paragrafi', () => {
    const source = 'Uno.\n\nDue.\n\nTre.\n\nQuattro.';
    assertRoundTrip(source, 12);
  });

  it('un solo paragrafo enorme viene spezzato senza perdere caratteri', () => {
    const source = 'あ'.repeat(50_000);
    assertRoundTrip(source, 1_000);
    const chunks = splitMarkdownIntoChunks(source, 1_000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => weightedLength(c.body) <= 1_000)).toBe(true);
  });

  it('testo CJK lungo resta sotto la finestra (peso 3 per carattere)', () => {
    const source = '漢'.repeat(40_000);
    const chunks = splitMarkdownIntoChunks(source);
    expect(concatenateChunkBodies(chunks)).toBe(source);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(weightedLength(c.body)).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
      // Con peso 3, i caratteri grezzi devono essere al più ~1/3 del budget.
      expect(c.body.length).toBeLessThanOrEqual(Math.ceil(MAX_CHUNK_CHARS / 3) + 1);
    }
  });

  it('scrittura non latina (arabo, cirillico, CJK) round-trip carattere per carattere', () => {
    const source =
      '# حياة\n\nهذا نص عربي طويل بما يكفي.\n\n## Жизнь\n\nЭто русский абзац.\n\n## 人生\n\nこれは日本語の段落です。\n';
    assertRoundTrip(source, 40);
  });

  it('~80.000 parole: la concatenazione senza contesto ripete il testo esatto', () => {
    const word = 'parola';
    const paragraph = Array.from({ length: 100 }, () => word).join(' ');
    const paragraphs = Array.from({ length: 800 }, (_, i) => {
      if (i % 40 === 0) return `# Capitolo ${i / 40 + 1}\n\n${paragraph}`;
      return paragraph;
    });
    const source = paragraphs.join('\n\n');
    // ~80k parole (800 × 100); pezzi piccoli per forzare molti confini.
    assertRoundTrip(source, 5_000);
    const chunks = splitMarkdownIntoChunks(source, 5_000);
    expect(chunks.length).toBeGreaterThan(10);
    expect(concatenateChunkBodies(chunks).split(/\s+/).filter(Boolean).length).toBeGreaterThan(79_000);
  }, 30_000);

  it('testo vuoto produce un pezzo vuoto', () => {
    const chunks = splitMarkdownIntoChunks('');
    expect(chunks).toHaveLength(1);
    expect(concatenateChunkBodies(chunks)).toBe('');
  });
});
