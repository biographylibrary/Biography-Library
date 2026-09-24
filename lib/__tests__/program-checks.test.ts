import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { buildIndexJson, buildManifestText, decideArchiveDeposit, sha256Hex } from '@/lib/archive-package';
import { htmlToArchiveMarkdown, archiveMarkdownToHtml } from '@/lib/archive-markdown';
import { isHiddenFromPublicCatalog } from '@/lib/publication-state';
import { isWithinProvisionalWindow } from '@/lib/provisional-window';
import { isInPublicCatalog, statusRestoredByAppeal, umRecordIsConsultable } from '@/lib/public-visibility';

const HIDDEN = [
  'revision_requested',
  'revision_pending_review',
  'revision_overdue',
  'suspended_pending_verification',
] as const;

describe('public listing', () => {
  it('keeps hidden moderation statuses out of the catalog', () => {
    for (const status of HIDDEN) {
      expect(isInPublicCatalog(status)).toBe(false);
      expect(isHiddenFromPublicCatalog(status)).toBe(true);
    }
  });

  it('keeps a memorial in the catalog during the 30-day window', () => {
    const until = '2026-10-24T00:00:00.000Z';
    expect(isInPublicCatalog('published')).toBe(true);
    expect(isWithinProvisionalWindow(until, new Date('2026-10-01T00:00:00.000Z'))).toBe(true);
    expect(isWithinProvisionalWindow(until, new Date('2026-10-24T00:00:00.000Z'))).toBe(false);
  });

  it('lets the UM resolver open only a public active record', () => {
    expect(umRecordIsConsultable({
      status: 'published',
      visibility: 'public',
      accountStatus: 'active',
    })).toBe(true);
    for (const status of HIDDEN) {
      expect(umRecordIsConsultable({
        status,
        visibility: 'public',
        accountStatus: 'active',
      })).toBe(false);
    }
  });
});

describe('appeal', () => {
  it('does not restore visibility until the appeal is accepted', () => {
    expect(statusRestoredByAppeal('pending', 'published')).toBeNull();
    expect(statusRestoredByAppeal('rejected', 'published')).toBeNull();
    expect(statusRestoredByAppeal('upheld', 'published')).toBe('published');
    expect(statusRestoredByAppeal('upheld', 'not-a-status')).toBeNull();
  });
});

describe('archive index after erasure', () => {
  it('keeps a destroyed version in index.json with reason data_protection', () => {
    const json = buildIndexJson('UM-0000-K3NQ-7FX2-MVP4', [
      {
        version: 1,
        generated_at: '2026-09-01T00:00:00.000Z',
        manifest_sha256: 'a'.repeat(64),
        reason: 'data_protection',
        status: 'destroyed',
      },
      {
        version: 2,
        generated_at: '2026-09-24T00:00:00.000Z',
        manifest_sha256: 'b'.repeat(64),
        reason: 'republication',
        status: 'stored',
      },
    ]);
    const parsed = JSON.parse(json) as { versions: { version: number; status: string; reason: string }[] };
    expect(parsed.versions[0]).toMatchObject({ version: 1, status: 'destroyed', reason: 'data_protection' });
    expect(parsed.versions[1].status).toBe('stored');
  });

  it('can be checked by rehashing the listed files, not the manifest itself', () => {
    const files = [
      { path: 'biography.md', bytes: 'hello' },
      { path: 'metadata.json', bytes: '{}' },
    ];
    const text = buildManifestText({
      generatedAt: '2026-09-24T00:00:00.000Z',
      files: files.map((file) => ({ path: file.path, sha256: sha256Hex(file.bytes) })),
    });
    for (const file of files) {
      expect(text).toContain(sha256Hex(file.bytes));
    }
    expect(text).not.toContain(sha256Hex(text));
  });

  it('does not deposit a republished memorial while the new window is open', () => {
    expect(decideArchiveDeposit({
      biographyType: 'memorial',
      provisionalUntil: '2026-04-30T00:00:00.000Z',
      now: new Date('2026-04-01T00:00:00.000Z'),
      existingVersions: [1],
      reason: 'republication',
    }).deposit).toBe(false);
  });
});

describe('markdown already in the corpus shape', () => {
  it('roundtrips a clean paragraph the dry-run would convert', () => {
    const html = '<p>Ciao <strong>Lugano</strong>.</p>';
    const md = htmlToArchiveMarkdown(html);
    const again = htmlToArchiveMarkdown(archiveMarkdownToHtml(md));
    expect(again).toBe(md);
    expect(md).toContain('**Lugano**');
  });
});

describe('signup waitlist', () => {
  it('defaults new accounts to waitlist', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260921140000_waitlist_account_status.sql'),
      'utf8',
    );
    expect(sql).toContain("SET DEFAULT 'waitlist'");
  });
});
