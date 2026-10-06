import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applyMarkdownConversionToBiography } from '@/lib/server/markdown-format-conversion';
import { BIO, U, as, createTestDb, reseed } from './harness';
import { pgliteServiceClient } from './pglite-supabase';

const FP = 'b'.repeat(64);
const HTML = '<p>Ciao <strong>mondo</strong></p>';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await reseed(db);
});

const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);

async function seedHtmlBios(): Promise<void> {
  await asService(`update biographies set content_freeflow = $2 where id = $1`, [BIO.draft, HTML]);
  await asService(`update biographies set content_freeflow = $2, status = 'published', published_at = now() where id = $1`, [
    BIO.published,
    HTML,
  ]);
  await asService(
    `insert into publication_records (biography_id, kind, fingerprint, verdict, scope, examined_chars, source_chars)
     values ($1, 'screening', $2, 'passed', 'full', 20, 20)`,
    [BIO.published, FP]
  );
}

describe('markdown format conversion (PGlite)', () => {
  it('converte bozza e pubblicata; la seconda esecuzione non cambia nulla né sovrascrive l’HTML', async () => {
    await seedHtmlBios();
    const client = pgliteServiceClient(db);

    const load = async (id: string) => {
      const [bio] = await asService<Record<string, unknown>>(
        `select id, slug, title, um_id, status, content, content_freeflow, final_version from biographies where id = $1`,
        [id]
      );
      const sections = await asService<Record<string, unknown>>(
        `select id, biography_id, section_key, content, revision_history from biography_sections where biography_id = $1`,
        [id]
      );
      return { bio, sections };
    };

    const draft1 = await load(BIO.draft);
    const pub1 = await load(BIO.published);

    expect(
      await applyMarkdownConversionToBiography(
        client,
        draft1.bio as never,
        draft1.sections as never,
        undefined
      )
    ).toBe('converted');
    expect(
      await applyMarkdownConversionToBiography(
        client,
        pub1.bio as never,
        pub1.sections as never,
        undefined
      )
    ).toBe('converted');

    const [draftMd] = await asService<{ content_freeflow: string }>(
      `select content_freeflow from biographies where id = $1`,
      [BIO.draft]
    );
    const [pubMd] = await asService<{ content_freeflow: string }>(
      `select content_freeflow from biographies where id = $1`,
      [BIO.published]
    );
    expect(draftMd.content_freeflow).toBe('Ciao **mondo**');
    expect(pubMd.content_freeflow).toBe('Ciao **mondo**');

    const legacyBefore = await asService<{ content: string; converted_at: string }>(
      `select content, converted_at::text from biography_source_html_legacy order by source_column, biography_id`
    );
    expect(legacyBefore).toHaveLength(2);
    expect(legacyBefore.every((r) => r.content === HTML)).toBe(true);

    const screenings = await asService<{ reason: string | null; previous_record_id: string | null }>(
      `select reason, previous_record_id from publication_records
       where biography_id = $1 and kind = 'screening' order by created_at`,
      [BIO.published]
    );
    expect(screenings).toHaveLength(2);
    expect(screenings[1].reason).toBe('conversione di formato, contenuto invariato');
    expect(screenings[1].previous_record_id).toBeTruthy();

    const draft2 = await load(BIO.draft);
    const pub2 = await load(BIO.published);
    expect(
      await applyMarkdownConversionToBiography(
        client,
        draft2.bio as never,
        draft2.sections as never,
        undefined
      )
    ).toBe('skipped');
    expect(
      await applyMarkdownConversionToBiography(
        client,
        pub2.bio as never,
        pub2.sections as never,
        undefined
      )
    ).toBe('skipped');

    const legacyAfter = await asService<{ content: string; converted_at: string }>(
      `select content, converted_at::text from biography_source_html_legacy order by source_column, biography_id`
    );
    expect(legacyAfter).toEqual(legacyBefore);

    const [draftStill] = await asService<{ content_freeflow: string }>(
      `select content_freeflow from biographies where id = $1`,
      [BIO.draft]
    );
    expect(draftStill.content_freeflow).toBe('Ciao **mondo**');

    const screeningsAfter = await asService(
      `select id from publication_records where biography_id = $1 and kind = 'screening'`,
      [BIO.published]
    );
    expect(screeningsAfter).toHaveLength(2);
  });

  it('non è raggiungibile come scrittura authenticated su publication_records reason', async () => {
    await seedHtmlBios();
    await expect(
      as(
        db,
        'authenticated',
        U.author,
        `insert into publication_records (biography_id, kind, fingerprint, verdict, scope, examined_chars, source_chars, reason)
         values ($1, 'screening', $2, 'passed', 'full', 1, 1, 'conversione di formato, contenuto invariato')`,
        [BIO.published, FP]
      )
    ).rejects.toThrow(/permission denied|violates/);
  });

  it('(d) interruzione a metà: legacy già presente, colonna ancora HTML → completa senza duplicare', async () => {
    await asService(`update biographies set content_freeflow = $2 where id = $1`, [BIO.draft, HTML]);
    await asService(
      `insert into biography_source_html_legacy (biography_id, source_column, entry_id, content)
       values ($1, 'content_freeflow', null, $2)`,
      [BIO.draft, HTML]
    );
    const before = await asService<{ id: string; content: string; converted_at: string }>(
      `select id, content, converted_at::text from biography_source_html_legacy where biography_id = $1`,
      [BIO.draft]
    );
    expect(before).toHaveLength(1);

    const client = pgliteServiceClient(db);
    const [bio] = await asService<Record<string, unknown>>(
      `select id, slug, title, um_id, status, content, content_freeflow, final_version from biographies where id = $1`,
      [BIO.draft]
    );
    expect(
      await applyMarkdownConversionToBiography(client, bio as never, [], undefined)
    ).toBe('converted');

    const [md] = await asService<{ content_freeflow: string }>(
      `select content_freeflow from biographies where id = $1`,
      [BIO.draft]
    );
    expect(md.content_freeflow).toBe('Ciao **mondo**');

    const after = await asService<{ id: string; content: string; converted_at: string }>(
      `select id, content, converted_at::text from biography_source_html_legacy where biography_id = $1`,
      [BIO.draft]
    );
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].content).toBe(HTML);
    expect(after[0].converted_at).toBe(before[0].converted_at);
  });

  it('(d) legacy diversa dall’HTML corrente → si ferma senza convertire né sovrascrivere', async () => {
    const other = '<p>Altro testo</p>';
    await asService(`update biographies set content_freeflow = $2 where id = $1`, [BIO.draft, HTML]);
    await asService(
      `insert into biography_source_html_legacy (biography_id, source_column, entry_id, content)
       values ($1, 'content_freeflow', null, $2)`,
      [BIO.draft, other]
    );

    const client = pgliteServiceClient(db);
    const [bio] = await asService<Record<string, unknown>>(
      `select id, slug, title, um_id, status, content, content_freeflow, final_version from biographies where id = $1`,
      [BIO.draft]
    );
    await expect(
      applyMarkdownConversionToBiography(client, bio as never, [], undefined)
    ).rejects.toThrow(`legacy_content_mismatch:${BIO.draft}:content_freeflow`);

    const [still] = await asService<{ content_freeflow: string }>(
      `select content_freeflow from biographies where id = $1`,
      [BIO.draft]
    );
    expect(still.content_freeflow).toBe(HTML);

    const legacy = await asService<{ content: string }>(
      `select content from biography_source_html_legacy where biography_id = $1`,
      [BIO.draft]
    );
    expect(legacy).toEqual([{ content: other }]);
  });
});
