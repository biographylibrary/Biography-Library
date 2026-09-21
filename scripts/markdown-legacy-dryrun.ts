/**
 * Conversione HTML → Markdown d’archivio, prima in prova.
 *
 * Uso:
 *   npm run markdown:legacy -- --dry-run
 *   npm run markdown:legacy -- --apply
 *
 * --dry-run non scrive nulla. Stampa il rapporto e lo salva in
 * reports/markdown-legacy-dryrun.json (non va in git).
 *
 * --apply copia l’HTML in content_html_legacy e scrive il Markdown.
 * Non tocca una scheda pubblicata se c’è perdita di testo o di formattazione.
 * Non applica mai una perdita di testo, neanche sulle bozze.
 * Non tocca um_identifiers.
 *
 * Richiede .env.local con NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 * La colonna content_html_legacy deve esistere prima di --apply.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  BOOK_TEXT_FIELDS,
  assessFields,
  collectContentFields,
  convertedContent,
  decideApply,
  htmlSnapshotFields,
  type ApplyDecision,
  type StoredField,
} from '@/lib/archive-markdown-legacy';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';

function loadEnv(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('Manca .env.local');
    process.exit(1);
  }
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const dryRun = process.argv.includes('--dry-run');
const apply = process.argv.includes('--apply');

if (dryRun === apply) {
  console.error('Passa uno solo tra --dry-run e --apply');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

type BioRow = {
  id: string;
  slug: string | null;
  title: string | null;
  um_id: string | null;
  status: string | null;
  content: unknown;
  content_freeflow: string | null;
  final_version: string | null;
  content_html_legacy: { fields?: Record<string, string> } | null;
};

type SectionRow = {
  id: string;
  biography_id: string;
  section_key: string | null;
  content: string | null;
};

type BookRow = {
  biography_id: string;
} & Record<(typeof BOOK_TEXT_FIELDS)[number], string | null>;

type ReportRow = {
  id: string;
  um_id: string | null;
  slug: string | null;
  title: string | null;
  status: string | null;
  decision: ApplyDecision;
  fields: { path: string; kind: string; unsupported: string[] }[];
};

async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<T[]> {
  const pageSize = 500;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function bookFields(book: BookRow | undefined): StoredField[] {
  if (!book) return [];
  return BOOK_TEXT_FIELDS.map((name) => ({
    path: `book.${name}`,
    value: book[name],
  }));
}

async function main(): Promise<void> {
  const supabase = createClient(url as string, key as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [bios, sections, books] = await Promise.all([
    fetchAll<BioRow>(
      supabase,
      'biographies',
      apply
        ? 'id, slug, title, um_id, status, content, content_freeflow, final_version, content_html_legacy'
        : 'id, slug, title, um_id, status, content, content_freeflow, final_version'
    ),
    fetchAll<SectionRow>(
      supabase,
      'biography_sections',
      'id, biography_id, section_key, content'
    ),
    fetchAll<BookRow>(
      supabase,
      'biography_book_structure',
      ['biography_id', ...BOOK_TEXT_FIELDS].join(', ')
    ),
  ]);

  const sectionsByBio = new Map<string, SectionRow[]>();
  for (const section of sections) {
    const list = sectionsByBio.get(section.biography_id) ?? [];
    list.push(section);
    sectionsByBio.set(section.biography_id, list);
  }
  const bookByBio = new Map(books.map((book) => [book.biography_id, book]));

  const report: ReportRow[] = [];
  const counts = {
    biographies: bios.length,
    unchanged: 0,
    convert: 0,
    manual_review: 0,
  };

  let applied = 0;
  let failed = 0;

  for (const bio of bios) {
    const sectionRows = sectionsByBio.get(bio.id) ?? [];
    const fields: StoredField[] = [
      ...collectContentFields(bio.content),
      { path: 'content_freeflow', value: bio.content_freeflow },
      { path: 'final_version', value: bio.final_version },
      ...sectionRows.map((section) => ({
        path: `sections.${section.section_key || section.id}`,
        value: section.content,
      })),
      ...bookFields(bookByBio.get(bio.id)),
    ];
    const assessment = assessFields(fields);
    const decision = decideApply(bio.status, assessment);
    counts[decision === 'skip_unchanged' ? 'unchanged' : decision] += 1;

    if (decision !== 'skip_unchanged') {
      report.push({
        id: bio.id,
        um_id: bio.um_id,
        slug: bio.slug,
        title: bio.title,
        status: bio.status,
        decision,
        fields: assessment.fields
          .filter((field) => field.kind !== 'empty' && field.kind !== 'markdown')
          .map((field) => ({
            path: field.path,
            kind: field.kind,
            unsupported: field.unsupported,
          })),
      });
      console.log(
        [decision, bio.status ?? '-', bio.um_id ?? '(senza UM)', bio.title ?? bio.id].join('  ')
      );
    }

    if (!apply || decision !== 'convert') continue;

    try {
      const snapshot = htmlSnapshotFields(fields);
      const previous = bio.content_html_legacy?.fields ?? {};
      const merged = { ...snapshot, ...previous };
      const book = bookByBio.get(bio.id);
      const bookUpdate: Record<string, string> = {};
      if (book) {
        for (const name of BOOK_TEXT_FIELDS) {
          const value = book[name];
          if (typeof value === 'string' && value.trim()) {
            bookUpdate[name] = storedToArchiveMarkdown(value);
          }
        }
      }

      const { error: bioError } = await supabase
        .from('biographies')
        .update({
          content: convertedContent(bio.content),
          content_freeflow:
            bio.content_freeflow == null
              ? null
              : storedToArchiveMarkdown(bio.content_freeflow),
          final_version:
            bio.final_version == null ? null : storedToArchiveMarkdown(bio.final_version),
          content_html_legacy: {
            captured_at: new Date().toISOString(),
            fields: merged,
          },
        })
        .eq('id', bio.id);
      if (bioError) throw new Error(bioError.message);

      for (const section of sectionRows) {
        if (!section.content?.trim()) continue;
        const { error } = await supabase
          .from('biography_sections')
          .update({ content: storedToArchiveMarkdown(section.content) })
          .eq('id', section.id);
        if (error) throw new Error(error.message);
      }

      if (book && Object.keys(bookUpdate).length > 0) {
        const { error } = await supabase
          .from('biography_book_structure')
          .update(bookUpdate)
          .eq('biography_id', bio.id);
        if (error) throw new Error(error.message);
      }

      applied += 1;
      console.log(`scritta  ${bio.slug || bio.id}`);
    } catch (e) {
      failed += 1;
      console.error(`errore  ${bio.slug || bio.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  const outDir = resolve(process.cwd(), 'reports');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'markdown-legacy-dryrun.json');
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        mode: dryRun ? 'dry-run' : 'apply',
        counts,
        applied,
        failed,
        rows: report,
      },
      null,
      2
    )
  );

  console.log('');
  console.log(
    `Schede ${counts.biographies}. Invariate ${counts.unchanged}. Convertibili ${counts.convert}. Da rivedere a mano ${counts.manual_review}.`
  );
  console.log(`Rapporto: ${outPath}`);
  if (dryRun) {
    console.log('Prova soltanto. Nessuna scheda è stata modificata.');
  } else {
    console.log(`Scritte ${applied}. Errori ${failed}.`);
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
