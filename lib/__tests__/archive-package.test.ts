import { describe, expect, it } from 'vitest';
import {
  buildManifestText,
  decideArchiveDeposit,
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
});
