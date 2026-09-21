/**
 * Rigenera PDF, txt e docx già prodotti con intestazione di permanenza
 * (identificativo UM, indirizzo di risoluzione, luogo con WGS 84).
 *
 * Non conia UM, non tocca um_identifiers, non cambia published_at.
 *
 * Uso:
 *   npm run exports:regenerate -- --dry-run
 *   npm run exports:regenerate -- --apply
 *
 * Richiede .env.local con NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * UM_ID_BASE_URL.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local');
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
  console.error('Pass exactly one of --dry-run or --apply');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  um_id: string | null;
  status: string | null;
  biography_type: string | null;
  content_language: string | null;
  record_language_tag: string | null;
  final_pdf_url: string | null;
  export_txt_url: string | null;
  export_docx_url: string | null;
  listing_cover_url: string | null;
};

async function main(): Promise<void> {
  const { umIdBaseUrl } = await import('@/lib/um-id-url');
  const { resolveRecordLanguageTag } = await import('@/lib/record-language');
  const { generateUploadFinalPdf } = await import('@/lib/server/final-pdf-artifacts');
  const { generateAndStorePermanenceTextExports } = await import(
    '@/lib/server/permanence-stored-exports'
  );

  let baseUrl: string;
  try {
    baseUrl = umIdBaseUrl();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const supabase = createClient(url as string, key as string, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('biographies')
    .select(
      'id, slug, title, um_id, status, biography_type, content_language, record_language_tag, final_pdf_url, export_txt_url, export_docx_url, listing_cover_url'
    )
    .or('final_pdf_url.not.is.null,export_txt_url.not.is.null,export_docx_url.not.is.null')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];

  console.log(`UM_ID_BASE_URL=${baseUrl}`);
  console.log(`Found ${rows.length} biographies with existing export artifacts`);
  console.log('');

  for (const row of rows) {
    console.log(
      [
        row.id,
        row.slug ?? '-',
        row.um_id ?? '(no um_id)',
        row.status ?? '-',
        row.final_pdf_url ? 'pdf' : '',
        row.export_txt_url ? 'txt' : '',
        row.export_docx_url ? 'docx' : '',
      ]
        .filter((part, i) => i < 4 || part)
        .join('  ')
    );
  }

  if (dryRun) {
    console.log('');
    console.log('Dry-run only. Re-run with --apply to overwrite storage objects.');
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    const label = row.slug || row.id;
    try {
      await generateAndStorePermanenceTextExports(supabase, row.id);
      if (row.final_pdf_url) {
        const lang = resolveRecordLanguageTag(row);
        const artifacts = await generateUploadFinalPdf(supabase, row.id, lang);
        const update: Record<string, string | null> = {
          final_pdf_url: artifacts.finalPdfUrl,
        };
        if (artifacts.listingCoverUrl) {
          update.listing_cover_url = artifacts.listingCoverUrl;
        }
        const { error: pdfUpdateError } = await supabase
          .from('biographies')
          .update(update)
          .eq('id', row.id);
        if (pdfUpdateError) {
          throw new Error(pdfUpdateError.message);
        }
      }
      ok += 1;
      console.log(`ok  ${label}`);
    } catch (e) {
      failed += 1;
      console.error(`fail ${label}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('');
  console.log(`Done. ok=${ok} fail=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
