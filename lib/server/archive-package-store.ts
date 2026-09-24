import type { SupabaseClient } from '@supabase/supabase-js';
import {
  archiveFolder,
  buildBiographyMarkdown,
  buildIndexJson,
  buildManifestText,
  decideArchiveDeposit,
  sha256Hex,
  type ArchiveFile,
  type ArchiveReason,
  type ArchiveVersionEntry,
} from '@/lib/archive-package';
import { provisionalUntilOnFirstPublish } from '@/lib/provisional-window';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';
import { loadPermanenceExportBundle } from '@/lib/server/permanence-stored-exports';
import { umIdBaseUrl } from '@/lib/um-id-url';
import { toCanonical } from '@/lib/um-id';

type AnyClient = SupabaseClient<any, any, any>;

const BUCKET = 'archive';

function bodyMarkdown(bio: {
  final_version?: string | null;
  content_freeflow?: string | null;
  content?: unknown;
  biography_mode?: string | null;
}): string {
  if (bio.final_version?.trim()) return storedToArchiveMarkdown(bio.final_version);
  if (bio.biography_mode === 'freeflow' || bio.content_freeflow?.trim()) {
    return storedToArchiveMarkdown(bio.content_freeflow || '');
  }
  if (bio.content && typeof bio.content === 'object') {
    return Object.values(bio.content as Record<string, { text?: string }>)
      .map((section) => storedToArchiveMarkdown(section?.text || ''))
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

async function downloadMedia(
  rows: { id: string; file_url: string; file_name: string | null; caption: string | null }[]
): Promise<{ files: ArchiveFile[]; captions: { path: string; caption: string }[] }> {
  const files: ArchiveFile[] = [];
  const captions: { path: string; caption: string }[] = [];
  for (const row of rows) {
    if (!row.file_url) continue;
    try {
      const res = await fetch(row.file_url);
      if (!res.ok) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      const safeName = (row.file_name || `${row.id}.bin`).replace(/[^\w.\-]+/g, '_');
      const path = `media/${row.id}-${safeName}`;
      files.push({ path, bytes });
      captions.push({ path, caption: row.caption || '' });
    } catch {
      continue;
    }
  }
  return { files, captions };
}

export async function syncArchivePackage(
  svc: AnyClient,
  biographyId: string,
  reason: ArchiveReason
): Promise<{ deposited: boolean; version: number | null }> {
  const { data: bio, error } = await svc
    .from('biographies')
    .select('id, um_id, biography_type, published_at, provisional_until, status')
    .eq('id', biographyId)
    .maybeSingle();
  if (error || !bio?.um_id) return { deposited: false, version: null };
  if (bio.status !== 'published') return { deposited: false, version: null };

  const biographyType = bio.biography_type === 'memorial' ? 'memorial' : 'autobiography';
  let provisionalUntil = (bio.provisional_until as string | null) ?? null;

  if (biographyType === 'memorial' && reason === 'publication' && bio.published_at && !provisionalUntil) {
    provisionalUntil = provisionalUntilOnFirstPublish('memorial', bio.published_at as string);
    await svc.from('biographies').update({ provisional_until: provisionalUntil }).eq('id', biographyId);
  }

  const { data: versionRows } = await svc
    .from('archive_package_versions')
    .select('version_number, generated_at, manifest_sha256, reason, status')
    .eq('biography_id', biographyId);

  const existing = (versionRows ?? []) as unknown as {
    version_number: number;
    generated_at: string;
    manifest_sha256: string;
    reason: ArchiveVersionEntry['reason'];
    status: ArchiveVersionEntry['status'];
  }[];
  const decision = decideArchiveDeposit({
    biographyType,
    provisionalUntil,
    now: new Date(),
    existingVersions: existing.map((row) => row.version_number),
    reason,
  });
  if (!decision.deposit) return { deposited: false, version: null };

  const bundle = await loadPermanenceExportBundle(svc, biographyId);
  if (!bundle) return { deposited: false, version: null };

  const { data: mediaRows } = await svc
    .from('biography_media')
    .select('id, file_url, file_name, caption')
    .eq('biography_id', biographyId);
  const media = await downloadMedia(
    (mediaRows ?? []) as { id: string; file_url: string; file_name: string | null; caption: string | null }[]
  );

  const generatedAt = new Date().toISOString();
  const canonical = toCanonical(bio.um_id as string);
  const biographyMd = buildBiographyMarkdown({
    bio: bundle.bio,
    events: bundle.events,
    relations: bundle.relations,
    bodyMarkdown: bodyMarkdown(bundle.bio as Parameters<typeof bodyMarkdown>[0]),
    umIdBaseUrl: umIdBaseUrl(),
  });
  const metadata = {
    um_id: canonical,
    version: decision.version,
    generated_at: generatedAt,
    reason,
    spec: '1.0',
    biography_type: biographyType,
    provisional_until: provisionalUntil,
    captions: media.captions,
  };
  const files: ArchiveFile[] = [
    { path: 'biography.md', bytes: Buffer.from(biographyMd, 'utf8') },
    { path: 'metadata.json', bytes: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, 'utf8') },
    ...media.files,
  ];
  const manifest = buildManifestText({
    generatedAt,
    files: files.map((file) => ({ path: file.path, sha256: sha256Hex(file.bytes) })),
  });
  const manifestHash = sha256Hex(manifest);
  const versionDir = `${canonical}/v${decision.version}`;

  for (const file of files) {
    const { error: upErr } = await svc.storage.from(BUCKET).upload(`${versionDir}/${file.path}`, file.bytes, {
      contentType: file.path.endsWith('.json')
        ? 'application/json'
        : file.path.endsWith('.md')
          ? 'text/markdown; charset=utf-8'
          : 'application/octet-stream',
      upsert: false,
    });
    if (upErr) throw new Error(upErr.message);
  }
  const { error: manifestErr } = await svc.storage.from(BUCKET).upload(
    `${versionDir}/MANIFEST.txt`,
    Buffer.from(manifest, 'utf8'),
    { contentType: 'text/plain; charset=utf-8', upsert: false }
  );
  if (manifestErr) throw new Error(manifestErr.message);

  const entry: ArchiveVersionEntry = {
    version: decision.version,
    generated_at: generatedAt,
    manifest_sha256: manifestHash,
    reason,
    status: 'stored',
  };
  const previous: ArchiveVersionEntry[] = existing.map((row) => ({
    version: row.version_number,
    generated_at: row.generated_at,
    manifest_sha256: row.manifest_sha256,
    reason: row.reason,
    status: row.status,
  }));
  const index = buildIndexJson(canonical, [...previous, entry]);
  const { error: indexErr } = await svc.storage.from(BUCKET).upload(`${canonical}/index.json`, Buffer.from(index, 'utf8'), {
    contentType: 'application/json',
    upsert: true,
  });
  if (indexErr) throw new Error(indexErr.message);

  const { error: rowErr } = await svc.from('archive_package_versions').insert({
    biography_id: biographyId,
    um_id: canonical,
    version_number: decision.version,
    generated_at: generatedAt,
    manifest_sha256: manifestHash,
    reason,
    status: 'stored',
  });
  if (rowErr) throw new Error(rowErr.message);

  return { deposited: true, version: decision.version };
}

export async function syncDueArchivePackages(svc: AnyClient): Promise<{ checked: number; deposited: number }> {
  const { data, error } = await svc
    .from('biographies')
    .select('id, biography_type')
    .eq('status', 'published');
  if (error) throw new Error(error.message);
  let deposited = 0;
  for (const row of data ?? []) {
    const reason: ArchiveReason =
      row.biography_type === 'memorial' ? 'provisional_expired' : 'publication';
    const result = await syncArchivePackage(svc, row.id as string, reason);
    if (result.deposited) deposited += 1;
  }
  return { checked: (data ?? []).length, deposited };
}

export { archiveFolder };
