import { describe, expect, it } from 'vitest';
import {
  buildArchiveEditionsMeta,
  buildManifestText,
  decideArchiveDeposit,
  editionMarkdownPath,
  sha256Hex,
} from '@/lib/archive-package';

describe('archive package', () => {
  it('does not put the manifest hash inside the manifest', () => {
    const text = buildManifestText({
      generatedAt: '2026-09-24T12:00:00.000Z',
      files: [
        { path: 'biography.md', sha256: 'a'.repeat(64) },
        { path: 'metadata.json', sha256: 'b'.repeat(64) },
      ],
    });
    expect(text).toContain('UM SPEC 1.0');
    expect(text).toContain('biography.md');
    expect(text).not.toContain('MANIFEST.txt');
    expect(text).not.toContain(sha256Hex(text));
  });

  it('deposits an autobiography at publication and waits for a memorial', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    expect(
      decideArchiveDeposit({
        biographyType: 'autobiography',
        provisionalUntil: null,
        now,
        existingVersions: [],
        reason: 'publication',
      })
    ).toEqual({ deposit: true, version: 1 });
    expect(
      decideArchiveDeposit({
        biographyType: 'memorial',
        provisionalUntil: '2026-10-24T12:00:00.000Z',
        now,
        existingVersions: [],
        reason: 'publication',
      })
    ).toEqual({ deposit: false, version: 1 });
  });

  it('deposits memorial v1 only after the window, and never a second time', () => {
    const now = new Date('2026-10-25T12:00:00.000Z');
    expect(
      decideArchiveDeposit({
        biographyType: 'memorial',
        provisionalUntil: '2026-10-24T12:00:00.000Z',
        now,
        existingVersions: [],
        reason: 'provisional_expired',
      }).deposit
    ).toBe(true);
    expect(
      decideArchiveDeposit({
        biographyType: 'memorial',
        provisionalUntil: '2026-10-24T12:00:00.000Z',
        now,
        existingVersions: [1],
        reason: 'provisional_expired',
      }).deposit
    ).toBe(false);
  });

  it('waits to deposit a republished memorial until the new window has passed', () => {
    expect(
      decideArchiveDeposit({
        biographyType: 'memorial',
        provisionalUntil: '2026-04-30T00:00:00.000Z',
        now: new Date('2026-05-01T00:00:00.000Z'),
        existingVersions: [1],
        reason: 'republication',
      }).deposit
    ).toBe(true);
  });

  it('edition_published: deposita solo con versioni esistenti e finestra chiusa', () => {
    const now = new Date('2026-10-01T00:00:00.000Z');
    expect(
      decideArchiveDeposit({
        biographyType: 'autobiography',
        provisionalUntil: null,
        now,
        existingVersions: [1],
        reason: 'edition_published',
      })
    ).toEqual({ deposit: true, version: 2 });
    expect(
      decideArchiveDeposit({
        biographyType: 'autobiography',
        provisionalUntil: null,
        now,
        existingVersions: [],
        reason: 'edition_published',
      }).deposit
    ).toBe(false);
    expect(
      decideArchiveDeposit({
        biographyType: 'memorial',
        provisionalUntil: '2026-10-24T00:00:00.000Z',
        now: new Date('2026-10-01T00:00:00.000Z'),
        existingVersions: [1],
        reason: 'edition_published',
      }).deposit
    ).toBe(false);
  });

  it('editionMarkdownPath: biography.<tag>.md; rifiuta caratteri strani', () => {
    expect(editionMarkdownPath('it')).toBe('biography.it.md');
    expect(editionMarkdownPath('pt-BR')).toBe('biography.pt-BR.md');
    expect(() => editionMarkdownPath('../x')).toThrow(/invalid_edition_language_tag/);
    expect(() => editionMarkdownPath('')).toThrow(/invalid_edition_language_tag/);
    expect(editionMarkdownPath('it')).not.toBe('biography.md');
  });

  it('buildArchiveEditionsMeta: assente senza edizioni; ordinato; caption vuota se manca', () => {
    expect(buildArchiveEditionsMeta([])).toBeUndefined();
    const meta = buildArchiveEditionsMeta([
      {
        language_tag: 'pt-BR',
        published_at: '2026-10-02T00:00:00.000Z',
        captions: [{ path: 'media/a.jpg', caption: '' }],
      },
      {
        language_tag: 'it',
        published_at: '2026-10-01T00:00:00.000Z',
        captions: [{ path: 'media/a.jpg', caption: 'foto' }],
      },
    ]);
    expect(meta!.map((e) => e.language_tag)).toEqual(['it', 'pt-BR']);
    expect(meta![0]!.file).toBe('biography.it.md');
    expect(meta![1]!.captions[0]!.caption).toBe('');
  });
});
