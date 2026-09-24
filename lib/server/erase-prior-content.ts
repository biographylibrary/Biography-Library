import type { SupabaseClient } from '@supabase/supabase-js';
import { eraseNotice, versionToErase, type StoredVersion } from '@/lib/erase-prior-content';
import { buildIndexJson, type ArchiveVersionEntry } from '@/lib/archive-package';
import { toCanonical } from '@/lib/um-id';

type AnyClient = SupabaseClient<any, any, any>;

const EXPORT_KEYS = ['final.pdf', 'biography.txt', 'biography.docx', 'listing-cover.jpg'];

async function listKeys(svc: AnyClient, prefix: string): Promise<string[]> {
  const { data, error } = await svc.storage.from('archive').list(prefix);
  if (error || !data) return [];
  const keys: string[] = [];
  for (const item of data) {
    if (!item.name) continue;
    const path = `${prefix}/${item.name}`;
    if (item.id == null) {
      keys.push(...(await listKeys(svc, path)));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

export async function erasePriorContent(
  svc: AnyClient,
  biographyId: string,
  reason: 'data_protection'
): Promise<{ removed: string[]; version: number | null }> {
  if (reason !== 'data_protection') {
    throw new Error('erasePriorContent only runs for data_protection');
  }

  const { data: bio, error: bioError } = await svc
    .from('biographies')
    .select('id, um_id, user_id, record_language_tag, content_language')
    .eq('id', biographyId)
    .maybeSingle();
  if (bioError || !bio) throw new Error(bioError?.message || 'Biography not found');

  const { data: report } = await svc
    .from('moderation_reports')
    .select('id, assigned_to, reporter_id')
    .eq('biography_id', biographyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!report?.id) throw new Error('No moderation report to record the erasure');

  const senderId = (report.assigned_to as string | null) || (bio.user_id as string);
  const removed: string[] = [];

  const { data: versionRows } = await svc
    .from('archive_package_versions')
    .select('version_number, generated_at, manifest_sha256, reason, status')
    .eq('biography_id', biographyId);

  const versions = (versionRows ?? []) as {
    version_number: number;
    generated_at: string;
    manifest_sha256: string;
    reason: ArchiveVersionEntry['reason'];
    status: StoredVersion['status'];
  }[];
  const target = versionToErase(
    versions.map((row) => ({ version: row.version_number, status: row.status }))
  );

  if (target != null && bio.um_id) {
    const canonical = toCanonical(bio.um_id as string);
    const prefix = `${canonical}/v${target}`;
    const keys = await listKeys(svc, prefix);
    if (keys.length > 0) {
      const { error } = await svc.storage.from('archive').remove(keys);
      if (error) throw new Error(error.message);
    }
    const entries: ArchiveVersionEntry[] = versions.map((row) => ({
      version: row.version_number,
      generated_at: row.generated_at,
      manifest_sha256: row.manifest_sha256,
      reason: row.version_number === target ? 'data_protection' : row.reason,
      status: row.version_number === target ? 'destroyed' : row.status,
    }));
    const index = buildIndexJson(canonical, entries);
    const { error: indexErr } = await svc.storage.from('archive').upload(
      `${canonical}/index.json`,
      Buffer.from(index, 'utf8'),
      { contentType: 'application/json', upsert: true }
    );
    if (indexErr) throw new Error(indexErr.message);
    const { error: rowErr } = await svc
      .from('archive_package_versions')
      .update({ status: 'destroyed', reason: 'data_protection' })
      .eq('biography_id', biographyId)
      .eq('version_number', target);
    if (rowErr) throw new Error(rowErr.message);
    removed.push(`archive/v${target}`);
  }

  const { error: legacyErr } = await svc
    .from('biographies')
    .update({ content_html_legacy: null })
    .eq('id', biographyId);
  if (legacyErr) throw new Error(legacyErr.message);
  removed.push('content_html_legacy');

  const { error: historyErr } = await svc
    .from('biography_sections')
    .update({ revision_history: [] })
    .eq('biography_id', biographyId);
  if (historyErr) throw new Error(historyErr.message);
  removed.push('revision_history');

  const exportKeys = EXPORT_KEYS.map((name) => `biography-exports/${biographyId}/${name}`);
  const { error: exportErr } = await svc.storage.from('biography-exports').remove(exportKeys);
  if (exportErr) throw new Error(exportErr.message);
  const { error: urlErr } = await svc
    .from('biographies')
    .update({
      final_pdf_url: null,
      export_txt_url: null,
      export_docx_url: null,
      listing_cover_url: null,
    })
    .eq('id', biographyId);
  if (urlErr) throw new Error(urlErr.message);
  removed.push('export_pdf');

  const { error: chunkErr } = await svc.from('biography_chunks').delete().eq('biography_id', biographyId);
  if (chunkErr) throw new Error(chunkErr.message);
  removed.push('biography_chunks');

  const lang = ((bio.record_language_tag as string | null) || (bio.content_language as string | null) || 'en')
    .split('-')[0]
    .toLowerCase();
  const { error: msgErr } = await svc.from('moderation_messages').insert({
    report_id: report.id,
    sender_id: senderId,
    recipient_id: (report.reporter_id as string | null) ?? null,
    is_internal: false,
    message: eraseNotice(lang, removed),
  });
  if (msgErr) throw new Error(msgErr.message);

  return { removed, version: target };
}
