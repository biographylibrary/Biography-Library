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
 * --apply: per ogni scheda (a) copia l’HTML in biography_source_html_legacy
 * (ON CONFLICT DO NOTHING, solo se è davvero HTML), (b) scrive il Markdown,
 * (c) se pubblicata registra in publication_records una riga di screening
 * «conversione di formato». Non legge né scrive content_html_legacy.
 * Prima le bozze (poi controllo testo semplice), poi le pubblicate.
 * Si ferma al primo errore. Rieseguibile senza effetti doppi.
 *
 * Richiede .env.local con NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  BOOK_TEXT_FIELDS,
  assessFields,
  decideApply,
  type ApplyDecision,
} from '@/lib/archive-markdown-legacy';
import {
  applyMarkdownConversionToBiography,
  assessBiographyConversion,
  collectBiographyFields,
  type BiographyConversionRow,
  type BookRow,
  type SectionRow,
  verifyPlainTextIdentity,
} from '@/lib/server/markdown-format-conversion';

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

async function main(): Promise<void> {
  const supabase = createClient(url as string, key as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [bios, sections, books] = await Promise.all([
    fetchAll<BiographyConversionRow>(
      supabase,
      'biographies',
      'id, slug, title, um_id, status, content, content_freeflow, final_version'
    ),
    fetchAll<SectionRow>(
      supabase,
      'biography_sections',
      'id, biography_id, section_key, content, revision_history'
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
    fields_total: 0,
    fields_unchanged: 0,
    fields_convert: 0,
    fields_manual_review: 0,
    revision_history_entries: 0,
    revision_history_html: 0,
    revision_history_convert: 0,
    revision_history_manual_review: 0,
  };

  type WorkItem = {
    bio: BiographyConversionRow;
    decision: ApplyDecision;
    fields: ReturnType<typeof collectBiographyFields>;
  };
  const work: WorkItem[] = [];

  for (const bio of bios) {
    const sectionRows = sectionsByBio.get(bio.id) ?? [];
    const fields = collectBiographyFields(bio, sectionRows, bookByBio.get(bio.id));
    const assessment = assessFields(fields);
    for (const field of assessment.fields) {
      if (field.kind === 'empty') continue;
      counts.fields_total += 1;
      if (field.kind === 'markdown') counts.fields_unchanged += 1;
      else if (field.kind === 'text_loss') counts.fields_manual_review += 1;
      else counts.fields_convert += 1;
      if (field.path.startsWith('revision_history.')) {
        counts.revision_history_entries += 1;
        if (field.kind === 'clean' || field.kind === 'formatting_loss' || field.kind === 'text_loss') {
          counts.revision_history_html += 1;
        }
        if (field.kind === 'text_loss') counts.revision_history_manual_review += 1;
        else if (field.kind === 'clean' || field.kind === 'formatting_loss') {
          counts.revision_history_convert += 1;
        }
      }
    }
    const decision = decideApply(bio.status, assessment);
    counts[decision === 'skip_unchanged' ? 'unchanged' : decision] += 1;
    work.push({ bio, decision, fields });

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
  }

  let applied = 0;
  let failed = 0;
  let skipped = 0;

  if (apply) {
    const drafts = work.filter((w) => w.bio.status !== 'published');
    const published = work.filter((w) => w.bio.status === 'published');

    const runOne = async (item: WorkItem): Promise<void> => {
      if (item.decision === 'skip_unchanged') {
        skipped += 1;
        return;
      }
      if (item.decision === 'manual_review') {
        throw new Error(`manual_review:${item.bio.slug || item.bio.id}`);
      }
      verifyPlainTextIdentity(item.fields);
      const result = await applyMarkdownConversionToBiography(
        supabase,
        item.bio,
        sectionsByBio.get(item.bio.id) ?? [],
        bookByBio.get(item.bio.id)
      );
      if (result === 'converted') {
        applied += 1;
        console.log(`scritta  ${item.bio.slug || item.bio.id}`);
      } else {
        skipped += 1;
      }
    };

    try {
      for (const item of drafts) {
        await runOne(item);
      }
      console.log('Controllo testo semplice e Markdown sulle bozze convertite…');
      for (const item of drafts) {
        if (item.decision !== 'convert') continue;
        verifyPlainTextIdentity(item.fields);
        const { data, error } = await supabase
          .from('biographies')
          .select('id, slug, title, um_id, status, content, content_freeflow, final_version')
          .eq('id', item.bio.id)
          .maybeSingle();
        if (error || !data) throw new Error(`draft_reread_failed:${error?.message ?? item.bio.id}`);
        const { data: secs, error: sErr } = await supabase
          .from('biography_sections')
          .select('id, biography_id, section_key, content, revision_history')
          .eq('biography_id', item.bio.id);
        if (sErr) throw new Error(sErr.message);
        const { data: book, error: bErr } = await supabase
          .from('biography_book_structure')
          .select(['biography_id', ...BOOK_TEXT_FIELDS].join(', '))
          .eq('biography_id', item.bio.id)
          .maybeSingle();
        if (bErr) throw new Error(bErr.message);
        const after = assessBiographyConversion(
          data as BiographyConversionRow,
          (secs ?? []) as SectionRow[],
          (book as BookRow | null) ?? undefined
        );
        if (after.decision !== 'skip_unchanged') {
          throw new Error(`draft_still_html:${item.bio.id}`);
        }
      }
      console.log('Bozze ok. Conversione pubblicate…');
      for (const item of published) {
        await runOne(item);
      }
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`errore  ${msg}`);
      const mismatch = /^legacy_content_mismatch:([^:]+)/.exec(msg);
      if (mismatch) {
        const bio = bios.find((b) => b.id === mismatch[1]);
        console.error(
          `Copia HTML in biography_source_html_legacy diversa dal testo attuale. Scheda: ${
            bio?.slug || bio?.um_id || mismatch[1]
          } (${mismatch[1]}). Conversione interrotta.`
        );
      }
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
        skipped,
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
  console.log(
    `Campi non vuoti ${counts.fields_total}: già Markdown ${counts.fields_unchanged}, convertibili ${counts.fields_convert}, non convertibili ${counts.fields_manual_review}.`
  );
  console.log(
    `revision_history: voci ${counts.revision_history_entries}, HTML ${counts.revision_history_html}, convertibili ${counts.revision_history_convert}, non convertibili ${counts.revision_history_manual_review}.`
  );
  console.log(`Rapporto: ${outPath}`);
  if (dryRun) {
    console.log('Prova soltanto. Nessuna scheda è stata modificata.');
  } else {
    console.log(`Scritte ${applied}. Saltate ${skipped}. Errori ${failed}.`);
  }
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
