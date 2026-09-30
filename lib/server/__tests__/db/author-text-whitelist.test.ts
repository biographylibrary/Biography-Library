import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AUTHOR_TEXT_WRITABLE_STATUSES, BIOGRAPHY_STATUS_VALUES } from '@/lib/publication-state';
import { BIO, U, as, createTestDb, errorOf, reseed } from './harness';

/**
 * Regola E: il testo di una scheda si scrive solo negli stati di lavoro (elenco
 * chiuso), anche nelle tabelle figlie. Database locale in memoria, mai la produzione.
 */
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

const asAuthor = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'authenticated', U.author, sql, params);
const asOther = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'authenticated', U.other, sql, params);
const asStaff = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'authenticated', U.staff, sql, params);
const asService = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'service_role', null, sql, params);
const asAdmin = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  as<T>(db, 'postgres', null, sql, params);

/** Una scheda per ogni valore di status ammesso dal vincolo CHECK. */
const BIO_BY_STATUS: Record<(typeof BIOGRAPHY_STATUS_VALUES)[number], string> = {
  draft: BIO.draft,
  sections_complete: BIO.sectionsComplete,
  final_version: BIO.finalVersion,
  pdf_draft: BIO.pdfDraft,
  locked_pending_screening: BIO.lockedPending,
  under_review: BIO.underReview,
  published: BIO.published,
  removed: BIO.removed,
  suspended_pending_verification: BIO.suspended,
  revision_requested: BIO.revisionRequested,
  revision_pending_review: BIO.revisionPending,
  revision_overdue: BIO.revisionOverdue,
};

const WRITABLE = new Set<string>(AUTHOR_TEXT_WRITABLE_STATUSES);

/** Colonne di testo e un'assegnazione che le cambia davvero. */
const TEXT_ASSIGNMENTS: Array<[string, string]> = [
  ['title', `title = 'Titolo nuovo'`],
  ['content', `content = '{"childhood":{"text":"nuovo"}}'::jsonb`],
  ['content_freeflow', `content_freeflow = 'testo nuovo'`],
  ['final_version', `final_version = 'versione nuova'`],
  ['narrative_order', `narrative_order = '["b","a"]'::jsonb`],
  ['author_name', `author_name = 'Nome nuovo'`],
  ['subject_name', `subject_name = 'Soggetto nuovo'`],
  ['name_as_written', `name_as_written = 'Nome scritto'`],
  ['name_given', `name_given = 'Nome'`],
  ['name_family', `name_family = 'Cognome'`],
  ['name_order', `name_order = 'family-first'`],
  ['name_romanized', `name_romanized = 'Romanizzato'`],
  ['romanization_system', `romanization_system = 'Hepburn'`],
  ['content_html_legacy', `content_html_legacy = '{"x":1}'::jsonb`],
];

/** Prova un update e dice se ha cambiato una riga; l'errore, se c'è. */
async function tryUpdate(
  run: <T>(sql: string, params?: unknown[]) => Promise<T[]>,
  bio: string,
  assignment: string
): Promise<{ error: string | null; rows: number }> {
  let rows = 0;
  const error = await errorOf(async () => {
    const res = await run<{ id: string }>(`update biographies set ${assignment} where id = $1 returning id`, [bio]);
    rows = res.length;
  });
  return { error, rows };
}

describe('l\'elenco degli stati', () => {
  it('è quello deciso, e coincide con la funzione SQL', async () => {
    expect([...AUTHOR_TEXT_WRITABLE_STATUSES].sort()).toEqual(
      ['draft', 'final_version', 'pdf_draft', 'revision_requested', 'sections_complete'].sort()
    );
    const [row] = await asAdmin<{ s: string[] }>(`select public.author_text_writable_statuses() as s`);
    expect([...row.s].sort()).toEqual([...AUTHOR_TEXT_WRITABLE_STATUSES].sort());
  });

  it('copre tutti e 12 gli stati del vincolo CHECK di produzione', async () => {
    expect(BIOGRAPHY_STATUS_VALUES).toHaveLength(12);
    expect(Object.keys(BIO_BY_STATUS).sort()).toEqual([...BIOGRAPHY_STATUS_VALUES].sort());
    const rows = await asAdmin<{ status: string }>(`select distinct status from biographies where user_id = $1`, [U.author]);
    expect(rows.map((r) => r.status).sort()).toEqual([...BIOGRAPHY_STATUS_VALUES].sort());
  });

  it('le colonne di testo protette sono quelle dichiarate', async () => {
    const [row] = await asAdmin<{ c: string[] }>(`select public.biographies_author_text_columns() as c`);
    expect([...row.c].sort()).toEqual(TEXT_ASSIGNMENTS.map(([c]) => c).sort());
  });
});

describe('controllo negativo: senza la migrazione il banco se ne accorge', () => {
  it('senza 20260930120150 l\'autore riscrive il testo di una scheda pubblicata', async () => {
    const bare = await createTestDb({ skip: ['20260930120150_author_text_whitelist.sql'] });
    try {
      const res = await as(bare, 'authenticated', U.author, `update biographies set final_version = 'riscritto' where id = $1 returning id`, [BIO.published]);
      expect(res).toHaveLength(1);
      const media = await errorOf(() =>
        as(bare, 'authenticated', U.author, `insert into biography_media (biography_id, user_id, file_url) values ($1, $2, 'https://x/f.jpg')`, [BIO.underReview, U.author])
      );
      expect(media).toBeNull();
    } finally {
      await bare.close();
    }
  }, 60_000);
});

describe('biographies: il testo si scrive solo negli stati di lavoro', () => {
  for (const status of BIOGRAPHY_STATUS_VALUES) {
    const writable = WRITABLE.has(status);
    describe(`stato ${status}`, () => {
      it.each(TEXT_ASSIGNMENTS)(
        writable ? 'scrive %s' : 'NON scrive %s',
        async (_col, assignment) => {
          const bio = BIO_BY_STATUS[status];
          const { error, rows } = await tryUpdate(asAuthor, bio, assignment);
          if (writable) {
            expect(error).toBeNull();
            expect(rows).toBe(1);
          } else if (status === 'removed') {
            // L'autore non vede le schede rimosse (policy di lettura): l'update non tocca righe.
            expect(error === null ? rows : 0).toBe(0);
          } else {
            expect(error).toContain('author_text_locked');
          }
        }
      );
    });
  }

  it('in stato bloccato il testo resta quello di prima', async () => {
    await asService(`update biographies set final_version = 'testo esaminato' where id = $1`, [BIO.underReview]);
    const err = await errorOf(() =>
      asAuthor(`update biographies set final_version = 'testo cambiato dopo lo screening' where id = $1`, [BIO.underReview])
    );
    expect(err).toContain('author_text_locked');
    const [row] = await asService<{ final_version: string }>(`select final_version from biographies where id = $1`, [BIO.underReview]);
    expect(row.final_version).toBe('testo esaminato');
  });

  it('riscrivere lo stesso valore in stato bloccato non è una modifica', async () => {
    const res = await asAuthor(`update biographies set title = title, final_version = final_version where id = $1 returning id`, [BIO.published]);
    expect(res).toHaveLength(1);
  });

  it('le colonne che non sono testo restano scrivibili anche a scheda pubblicata', async () => {
    const res = await asAuthor(
      `update biographies set visibility = 'public', editor_font_size = 18, rights_statement_uri = 'https://creativecommons.org/licenses/by/4.0/', rights_holder = 'Autore', slug = 'pubblicata' where id = $1 returning id`,
      [BIO.published]
    );
    expect(res).toHaveLength(1);
  });

  it('lo staff non ha un\'esenzione dal browser', async () => {
    const err = await errorOf(() => asStaff(`update biographies set final_version = 'forzato' where id = $1`, [BIO.published]));
    expect(err).toContain('author_text_locked');
  });

  it('il ruolo di servizio e gli script diretti scrivono in ogni stato (rotte server)', async () => {
    for (const bio of [BIO.published, BIO.underReview, BIO.lockedPending, BIO.revisionOverdue]) {
      const a = await asService(`update biographies set final_version = 'dal server' where id = $1 returning id`, [bio]);
      expect(a).toHaveLength(1);
      const b = await asAdmin(`update biographies set title = 'da script' where id = $1 returning id`, [bio]);
      expect(b).toHaveLength(1);
    }
  });

  it('una scheda congelata non si scrive nemmeno in stato di lavoro', async () => {
    await asService(`update biographies set is_frozen = true where id = $1`, [BIO.draft]);
    const { error, rows } = await tryUpdate(asAuthor, BIO.draft, `title = 'x'`);
    // La policy RLS (NOT is_frozen) la respinge prima ancora del trigger.
    expect(error === null ? rows : 0).toBe(0);
    const viaStaff = await errorOf(() => asStaff(`update biographies set title = 'x' where id = $1`, [BIO.draft]));
    expect(viaStaff).toContain('author_text_locked');
  });

  it('un autore non tocca il testo della scheda di un altro', async () => {
    const res = await asAuthor(`update biographies set title = 'rubata' where id = $1 returning id`, [BIO.otherDraft]);
    expect(res).toHaveLength(0);
  });

  it('i passaggi di stato dell\'autore funzionano ancora e non aprono il testo', async () => {
    const ok = await asAuthor(`update biographies set status = 'sections_complete', title = 'Nuovo titolo' where id = $1 returning id`, [BIO.draft]);
    expect(ok).toHaveLength(1);
    const err = await errorOf(() => asAuthor(`update biographies set status = 'draft', title = 'x' where id = $1`, [BIO.published]));
    expect(err).toMatch(/server_only_column|author_text_locked/);
  });
});

describe('tabelle figlie: seguono lo stato della scheda madre', () => {
  /** Una riga per tabella figlia su ogni scheda (inserita come script: senza trigger). */
  async function seedChildren(): Promise<void> {
    for (const bio of Object.values(BIO_BY_STATUS)) {
      await asAdmin(`set session_replication_role = replica`);
      await asAdmin(
        `insert into biography_sections (biography_id, section_key, section_name, content) values ($1, 'childhood', 'Infanzia', 'testo')`,
        [bio]
      );
      await asAdmin(
        `insert into biography_book_structure (biography_id, user_id, dedication_content) values ($1, $2, 'dedica')`,
        [bio, U.author]
      );
      await asAdmin(`insert into person_events (biography_id, event_type, date_as_given) values ($1, 'birth', '1950')`, [bio]);
      await asAdmin(`insert into person_relations (biography_id, relation_code, related_name_as_written) values ($1, 'parent', 'Anna')`, [bio]);
      await asAdmin(
        `insert into biography_media (biography_id, user_id, file_url, caption, layout) values ($1, $2, 'https://x/f.jpg', 'didascalia', 'full-page')`,
        [bio, U.author]
      );
      await asAdmin(`set session_replication_role = origin`);
    }
  }

  const TABLES: Array<{
    table: string;
    insert: string;
    insertParams: (bio: string) => unknown[];
    update: string;
  }> = [
    {
      table: 'biography_sections',
      insert: `insert into biography_sections (biography_id, section_key, section_name, content) values ($1, 'family', 'Famiglia', 'nuovo')`,
      insertParams: (bio) => [bio],
      update: `update biography_sections set content = 'riscritto' where biography_id = $1`,
    },
    {
      table: 'biography_book_structure',
      insert: `insert into biography_book_structure (biography_id, user_id, dedication_content) values ($1, '${U.author}', 'nuova dedica')`,
      insertParams: (bio) => [bio],
      update: `update biography_book_structure set dedication_content = 'riscritta' where biography_id = $1`,
    },
    {
      table: 'person_events',
      insert: `insert into person_events (biography_id, event_type, date_as_given) values ($1, 'death', '2020')`,
      insertParams: (bio) => [bio],
      update: `update person_events set date_as_given = '1999' where biography_id = $1`,
    },
    {
      table: 'person_relations',
      insert: `insert into person_relations (biography_id, relation_code, related_name_as_written) values ($1, 'sibling', 'Luca')`,
      insertParams: (bio) => [bio],
      update: `update person_relations set related_name_as_written = 'Altro' where biography_id = $1`,
    },
    {
      table: 'biography_media',
      insert: `insert into biography_media (biography_id, user_id, file_url, caption, layout) values ($1, '${U.author}', 'https://x/nuova.jpg', 'nuova', 'full-page')`,
      insertParams: (bio) => [bio],
      update: `update biography_media set caption = 'didascalia cambiata' where biography_id = $1`,
    },
  ];

  for (const t of TABLES) {
    describe(t.table, () => {
      it.each(BIOGRAPHY_STATUS_VALUES.map((s) => [s]))('stato %s: inserimento, modifica, cancellazione', async (status) => {
        await seedChildren();
        const bio = BIO_BY_STATUS[status];
        const writable = WRITABLE.has(status);
        const del = `delete from ${t.table} where biography_id = $1`;

        const insertErr = await errorOf(() => asAuthor(t.insert, t.insertParams(bio)));
        const updateErr = await errorOf(() => asAuthor(`${t.update} returning id`, [bio]));
        const deleteErr = await errorOf(() => asAuthor(`${del} returning id`, [bio]));

        if (writable) {
          expect(insertErr).toBeNull();
          expect(updateErr).toBeNull();
          expect(deleteErr).toBeNull();
        } else if (status === 'removed') {
          // La scheda madre è invisibile all'autore: l'inserimento è respinto, update e delete non toccano righe.
          expect(insertErr).toContain('author_text_locked');
        } else {
          expect(insertErr).toContain('author_text_locked');
          expect(updateErr).toContain('author_text_locked');
          expect(deleteErr).toContain('author_text_locked');
        }
      });

      it('ruolo di servizio e script scrivono in ogni stato', async () => {
        await seedChildren();
        for (const bio of [BIO.published, BIO.underReview, BIO.lockedPending]) {
          expect(await errorOf(() => asService(t.insert, t.insertParams(bio)))).toBeNull();
          expect(await errorOf(() => asService(t.update, [bio]))).toBeNull();
        }
      });

      it('un altro utente non scrive nella scheda altrui', async () => {
        await seedChildren();
        const err = await errorOf(() =>
          asOther(t.insert.replace(U.author, U.other), t.insertParams(BIO.draft))
        );
        expect(err).toContain('author_text_locked');
      });

      it('non sposta una riga su una scheda bloccata', async () => {
        await seedChildren();
        const err = await errorOf(() =>
          asAuthor(`update ${t.table} set biography_id = $1 where biography_id = $2`, [BIO.published, BIO.draft])
        );
        expect(err).toContain('author_text_locked');
      });
    });
  }
});

describe('cancellazioni a cascata', () => {
  it('l\'autore elimina una scheda in bozza con tutte le figlie', async () => {
    await asAdmin(`set session_replication_role = replica`);
    await asAdmin(`insert into biography_sections (biography_id, section_key, content) values ($1, 'childhood', 'x')`, [BIO.draft]);
    await asAdmin(`insert into person_events (biography_id, event_type) values ($1, 'birth')`, [BIO.draft]);
    await asAdmin(`insert into biography_media (biography_id, user_id, file_url) values ($1, $2, 'https://x/f.jpg')`, [BIO.draft, U.author]);
    await asAdmin(`set session_replication_role = origin`);

    const err = await errorOf(() => asAuthor(`delete from biographies where id = $1`, [BIO.draft]));
    expect(err).toBeNull();
    const [counts] = await asAdmin<{ n: string }>(
      `select (select count(*) from biography_sections where biography_id = $1)
            + (select count(*) from person_events where biography_id = $1)
            + (select count(*) from biography_media where biography_id = $1) as n`,
      [BIO.draft]
    );
    expect(Number(counts.n)).toBe(0);
  });
});
