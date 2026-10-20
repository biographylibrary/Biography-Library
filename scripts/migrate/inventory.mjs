#!/usr/bin/env node
/**
 * Read-only inventory of a Supabase project (users, media URL patterns, storage).
 * Usage: MIGRATE_SOURCE_URL=… MIGRATE_SOURCE_SERVICE_KEY=… node scripts/migrate/inventory.mjs
 */
import { sourceClient, ensureDumpDir, writeJson, pathFromStoredUrl, BUCKETS } from './lib.mjs';

const supabase = sourceClient();
const dumpDir = ensureDumpDir();

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return { table, error: error.message };
  return { table, count };
}

async function listUsersSummary() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const users = data.users ?? [];
  const demo = users.filter((u) => (u.email ?? '').endsWith('@biographylibrary.test'));
  const keep = users.filter((u) => !(u.email ?? '').endsWith('@biographylibrary.test'));
  return {
    total: users.length,
    demo_biographylibrary_test: demo.map((u) => u.email),
    keep: keep.map((u) => ({ email: u.email, id: u.id, last_sign_in_at: u.last_sign_in_at })),
  };
}

async function mediaUrlStats() {
  const { data, error } = await supabase.from('biography_media').select('id, file_url');
  if (error) throw error;
  const rows = data ?? [];
  let withHost = 0;
  let relative = 0;
  let parseFail = 0;
  for (const r of rows) {
    const p = pathFromStoredUrl(r.file_url, 'biography-photos');
    if (!p) parseFail += 1;
    else if (String(r.file_url).startsWith('https://')) withHost += 1;
    else relative += 1;
  }
  return { total: rows.length, absolute_https: withHost, already_relative: relative, unparseable: parseFail };
}

async function bioExportUrlStats() {
  const { data, error } = await supabase
    .from('biographies')
    .select('id, final_pdf_url, export_txt_url, export_docx_url, listing_cover_url');
  if (error) throw error;
  const rows = data ?? [];
  const stat = (field) => {
    let n = 0;
    let abs = 0;
    for (const r of rows) {
      const v = r[field];
      if (v && String(v).trim()) {
        n += 1;
        if (String(v).startsWith('https://')) abs += 1;
      }
    }
    return { non_null: n, absolute_https: abs };
  };
  return {
    final_pdf_url: stat('final_pdf_url'),
    export_txt_url: stat('export_txt_url'),
    export_docx_url: stat('export_docx_url'),
    listing_cover_url: stat('listing_cover_url'),
  };
}

async function listStorageObjects(bucket) {
  const out = [];
  async function walk(prefix = '') {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(`${bucket} list ${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        out.push({
          bucket,
          name: full,
          updated_at: item.updated_at,
          metadata: item.metadata ?? null,
        });
      } else {
        await walk(full);
      }
    }
  }
  await walk('');
  return out;
}

const tables = [
  'profiles',
  'biographies',
  'biography_media',
  'biography_sections',
  'um_identifiers',
  'archive_package_versions',
];

const report = {
  generated_at: new Date().toISOString(),
  source_url: process.env.MIGRATE_SOURCE_URL,
  table_counts: [],
  users: null,
  media_urls: null,
  export_urls: null,
  storage: {},
};

for (const t of tables) {
  report.table_counts.push(await countTable(t));
}
report.users = await listUsersSummary();
report.media_urls = await mediaUrlStats();
report.export_urls = await bioExportUrlStats();

for (const bucket of BUCKETS) {
  try {
    const objects = await listStorageObjects(bucket);
    report.storage[bucket] = { object_count: objects.length, objects };
  } catch (e) {
    report.storage[bucket] = { error: String(e.message || e) };
  }
}

writeJson(dumpDir, 'inventory.json', report);
console.log(
  JSON.stringify(
    {
      dumpDir,
      users: {
        total: report.users.total,
        demo: report.users.demo_biographylibrary_test.length,
        keep: report.users.keep.length,
      },
      media_urls: report.media_urls,
      storage_counts: Object.fromEntries(
        Object.entries(report.storage).map(([k, v]) => [k, v.object_count ?? v.error])
      ),
    },
    null,
    2
  )
);
