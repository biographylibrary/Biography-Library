import type { SupabaseClient } from '@supabase/supabase-js';
import { buildUtf8DocxBuffer } from '@/lib/export-server';
import {
  buildPermanencePlainText,
  type PermanenceExportBiography,
  type PermanenceExportEvent,
  type PermanenceExportRelation,
} from '@/lib/permanence-text-export';
import { umIdBaseUrl } from '@/lib/um-id-url';

type AnyClient = SupabaseClient<any, any, any>;

const BIO_SELECT = [
  'um_id',
  'schema_version',
  'record_language_tag',
  'record_script',
  'record_direction',
  'record_language_endonym',
  'name_as_written',
  'name_romanized',
  'title',
  'author_name',
  'subject_name',
  'biography_type',
  'published_at_iso',
  'published_um_year',
  'rights_statement_uri',
  'content_freeflow',
  'final_version',
  'biography_mode',
  'content',
  'status',
].join(', ');

export type PermanenceExportBundle = {
  bio: PermanenceExportBiography;
  events: PermanenceExportEvent[];
  relations: PermanenceExportRelation[];
};

export async function loadPermanenceExportBundle(
  svc: AnyClient,
  biographyId: string
): Promise<PermanenceExportBundle | null> {
  const [{ data: row, error }, { data: events }, { data: relations }] = await Promise.all([
    svc.from('biographies').select(BIO_SELECT).eq('id', biographyId).maybeSingle(),
    svc.from('person_events').select('*').eq('biography_id', biographyId),
    svc.from('person_relations').select('*').eq('biography_id', biographyId),
  ]);

  if (error || !row) return null;

  return {
    bio: row as unknown as PermanenceExportBiography,
    events: (events as PermanenceExportEvent[]) ?? [],
    relations: (relations as PermanenceExportRelation[]) ?? [],
  };
}

export function buildPermanenceStoredText(bundle: PermanenceExportBundle): string {
  return buildPermanencePlainText(
    bundle.bio,
    bundle.events,
    bundle.relations,
    undefined,
    umIdBaseUrl()
  );
}

/**
 * Writes biography.txt / biography.docx with the invariant permanence header
 * and updates export_txt_url / export_docx_url. Does not mint UM ids.
 */
export async function generateAndStorePermanenceTextExports(
  svc: AnyClient,
  biographyId: string
): Promise<{ txtUrl: string | null; docxUrl: string | null }> {
  const bundle = await loadPermanenceExportBundle(svc, biographyId);
  if (!bundle) {
    throw new Error(`Biography not found: ${biographyId}`);
  }

  const txtContent = buildPermanenceStoredText(bundle);
  const txtBytes = Buffer.from(txtContent, 'utf-8');
  const docxBuffer = await buildUtf8DocxBuffer(txtContent);

  const txtPath = `biography-exports/${biographyId}/biography.txt`;
  const docxPath = `biography-exports/${biographyId}/biography.docx`;

  const [txtUpload, docxUpload] = await Promise.all([
    svc.storage.from('biography-exports').upload(txtPath, txtBytes, {
      contentType: 'text/plain; charset=utf-8',
      upsert: true,
    }),
    svc.storage.from('biography-exports').upload(docxPath, docxBuffer, {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    }),
  ]);

  if (txtUpload.error) {
    throw new Error(`txt upload failed: ${txtUpload.error.message}`);
  }
  if (docxUpload.error) {
    throw new Error(`docx upload failed: ${docxUpload.error.message}`);
  }

  const { data: txtUrlData } = svc.storage.from('biography-exports').getPublicUrl(txtPath);
  const { data: docxUrlData } = svc.storage.from('biography-exports').getPublicUrl(docxPath);

  const txtUrl = txtUrlData?.publicUrl ?? null;
  const docxUrl = docxUrlData?.publicUrl ?? null;

  const { error: updateError } = await svc
    .from('biographies')
    .update({
      export_txt_url: txtUrl,
      export_docx_url: docxUrl,
    })
    .eq('id', biographyId);

  if (updateError) {
    throw new Error(`export url update failed: ${updateError.message}`);
  }

  return { txtUrl, docxUrl };
}
