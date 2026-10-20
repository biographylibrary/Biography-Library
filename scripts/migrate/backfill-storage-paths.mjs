#!/usr/bin/env node
/**
 * Derive bucket-relative paths from absolute file_url / export URLs.
 *
 * Default: dry-run (writes report only). Does NOT alter the live DB unless
 * --apply is passed AND MIGRATE_ALLOW_APPLY=1 (safety).
 *
 * After the schema adds storage_path (and export path columns), --apply can
 * UPDATE rows. Until then dry-run documents what the backfill would write.
 *
 * Usage:
 *   MIGRATE_SOURCE_URL=… MIGRATE_SOURCE_SERVICE_KEY=…
 *   node scripts/migrate/backfill-storage-paths.mjs
 *   MIGRATE_ALLOW_APPLY=1 node scripts/migrate/backfill-storage-paths.mjs --apply
 */
import { sourceClient, ensureDumpDir, writeJson, pathFromStoredUrl } from './lib.mjs';

const apply = process.argv.includes('--apply');
const allow = process.env.MIGRATE_ALLOW_APPLY === '1';
if (apply && !allow) {
  console.error('Refusing --apply without MIGRATE_ALLOW_APPLY=1');
  process.exit(1);
}

const supabase = sourceClient();
const dumpDir = ensureDumpDir();

const mediaPlan = [];
{
  const { data, error } = await supabase.from('biography_media').select('id, file_url');
  if (error) throw error;
  for (const row of data ?? []) {
    const path = pathFromStoredUrl(row.file_url, 'biography-photos');
    mediaPlan.push({
      id: row.id,
      file_url: row.file_url,
      storage_path: path,
      ok: Boolean(path),
    });
  }
}

const exportFields = [
  ['final_pdf_url', 'biography-exports', 'final_pdf_path'],
  ['export_txt_url', 'biography-exports', 'export_txt_path'],
  ['export_docx_url', 'biography-exports', 'export_docx_path'],
];

const bioPlan = [];
{
  const { data, error } = await supabase
    .from('biographies')
    .select('id, final_pdf_url, export_txt_url, export_docx_url');
  if (error) throw error;
  for (const row of data ?? []) {
    const entry = { id: row.id, paths: {} };
    for (const [col, bucket, pathCol] of exportFields) {
      const raw = row[col];
      if (!raw || !String(raw).trim()) {
        entry.paths[pathCol] = null;
        continue;
      }
      entry.paths[pathCol] = pathFromStoredUrl(raw, bucket);
      entry.paths[`${pathCol}_from`] = raw;
    }
    bioPlan.push(entry);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  mode: apply ? 'apply' : 'dry-run',
  note:
    'storage_path / export_*_path columns must exist before --apply updates. ' +
    'Until the migration lands, use this report to design the schema and runtime helpers.',
  media: {
    total: mediaPlan.length,
    ok: mediaPlan.filter((r) => r.ok).length,
    failed: mediaPlan.filter((r) => !r.ok),
    sample: mediaPlan.filter((r) => r.ok).slice(0, 5),
  },
  biographies_exports: {
    total: bioPlan.length,
    with_any_path: bioPlan.filter((b) =>
      Object.values(b.paths).some((v) => typeof v === 'string' && v.length)
    ).length,
    sample: bioPlan.slice(0, 3),
  },
};

if (apply) {
  const { data: cols, error: colErr } = await supabase
    .from('biography_media')
    .select('storage_path')
    .limit(1);
  if (colErr && /storage_path|column/i.test(colErr.message)) {
    console.error('Column biography_media.storage_path missing — cannot apply yet.');
    writeJson(dumpDir, 'backfill-storage-paths.json', { ...report, apply_error: colErr.message });
    process.exit(1);
  }
  void cols;

  let updated = 0;
  for (const row of mediaPlan) {
    if (!row.ok) continue;
    const { error } = await supabase
      .from('biography_media')
      .update({ storage_path: row.storage_path })
      .eq('id', row.id);
    if (error) {
      console.error(`media ${row.id}: ${error.message}`);
    } else updated += 1;
  }
  report.media.updated = updated;
  console.log(`Updated storage_path on ${updated} biography_media rows`);
}

writeJson(dumpDir, 'backfill-storage-paths.json', report);
console.log(
  JSON.stringify(
    {
      dumpDir,
      mode: report.mode,
      media_ok: report.media.ok,
      media_failed: report.media.failed.length,
      bios: report.biographies_exports.with_any_path,
    },
    null,
    2
  )
);
