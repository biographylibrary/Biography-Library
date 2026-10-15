import type { SupabaseClient } from '@supabase/supabase-js';
import {
  archiveFolder,
  buildArchiveEditionsMeta,
  buildBiographyMarkdown,
  buildRecordArchiveFiles,
  RECORD_SCHEMA_VERSION,
  buildIndexJson,
  buildManifestText,
  decideArchiveDeposit,
  editionMarkdownPath,
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

export class ArchiveVersionConflictError extends Error {
  constructor(message = 'archive_version_conflict') {
    super(message);
    this.name = 'ArchiveVersionConflictError';
  }
}

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
): Promise<{
  files: ArchiveFile[];
  captions: { path: string; caption: string }[];
  mediaPaths: { id: string; path: string }[];
}> {
  const files: ArchiveFile[] = [];
  const captions: { path: string; caption: string }[] = [];
  const mediaPaths: { id: string; path: string }[] = [];
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
      mediaPaths.push({ id: row.id, path });
    } catch {
      continue;
    }
  }
  return { files, captions, mediaPaths };
}

type PublishedEditionRow = {
  id: string;
  record_language_tag: string | null;
  published_at: string | null;
};

async function loadPublishedEditions(svc: AnyClient, originalId: string): Promise<PublishedEditionRow[]> {
  const { data, error } = await svc
    .from('biographies')
    .select('id, record_language_tag, published_at')
    .eq('translation_of', originalId)
    .eq('status', 'published')
    .order('record_language_tag', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublishedEditionRow[]).filter(
    (row) => typeof row.record_language_tag === 'string' && row.record_language_tag.trim()
  );
}

async function loadEditionCaptions(
  svc: AnyClient,
  editionId: string
): Promise<Map<string, string>> {
  const { data, error } = await svc
    .from('biography_edition_captions')
    .select('media_id, caption')
    .eq('biography_id', editionId);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { media_id: string; caption: string | null }[]) {
    map.set(row.media_id, row.caption ?? '');
  }
  return map;
}

/**
 * Deposita una versione del pacchetto dell'ORIGINALE.
 * Per `edition_published` il chiamante passa sempre l'id dell'originale.
 */
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

  const publishedEditions = await loadPublishedEditions(svc, biographyId);
  const editionFiles: ArchiveFile[] = [];
  const editionMetas: NonNullable<ReturnType<typeof buildArchiveEditionsMeta>> = [];

  for (const edition of publishedEditions) {
    const tag = edition.record_language_tag!.trim();
    const editionBundle = await loadPermanenceExportBundle(svc, edition.id);
    if (!editionBundle) {
      throw new Error(`edition_bundle_unavailable:${edition.id}`);
    }
    const md = buildBiographyMarkdown({
      bio: editionBundle.bio,
      events: editionBundle.events,
      relations: editionBundle.relations,
      bodyMarkdown: bodyMarkdown(editionBundle.bio as Parameters<typeof bodyMarkdown>[0]),
      umIdBaseUrl: umIdBaseUrl(),
      bookParts: editionBundle.bookParts,
    });
    const file = editionMarkdownPath(tag);
    editionFiles.push({ path: file, bytes: Buffer.from(md, 'utf8') });

    const captionMap = await loadEditionCaptions(svc, edition.id);
    editionMetas.push({
      language_tag: tag,
      file,
      published_at: edition.published_at,
      captions: media.mediaPaths.map(({ id, path }) => ({
        path,
        caption: captionMap.has(id) ? captionMap.get(id)! : '',
      })),
    });
  }

  // generatedAt dopo la lettura delle edizioni (identità dei byte senza edizioni invariata
  // a parità di istante: senza edizioni il punto è subito dopo media + elenco vuoto).
  const generatedAt = new Date().toISOString();
  const canonical = toCanonical(bio.um_id as string);
  const biographyMd = buildBiographyMarkdown({
    bio: bundle.bio,
    events: bundle.events,
    relations: bundle.relations,
    bodyMarkdown: bodyMarkdown(bundle.bio as Parameters<typeof bodyMarkdown>[0]),
    umIdBaseUrl: umIdBaseUrl(),
    bookParts: bundle.bookParts,
  });
  const editionsMeta = buildArchiveEditionsMeta(editionMetas);
  const metadata: Record<string, unknown> = {
    um_id: canonical,
    version: decision.version,
    generated_at: generatedAt,
    reason,
    spec: '1.0',
    biography_type: biographyType,
    provisional_until: provisionalUntil,
    captions: media.captions,
  };
  if (editionsMeta) {
    metadata.editions = editionsMeta;
  }
  const recordFiles = buildRecordArchiveFiles({
    bio: bundle.bio,
    events: bundle.events,
    relations: bundle.relations,
    umIdBaseUrl: umIdBaseUrl(),
  });
  const files: ArchiveFile[] = [
    { path: 'biography.md', bytes: Buffer.from(biographyMd, 'utf8') },
    ...editionFiles,
    ...recordFiles,
    { path: 'metadata.json', bytes: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, 'utf8') },
    ...media.files,
  ];
  const manifest = buildManifestText({
    generatedAt,
    files: files.map((file) => ({ path: file.path, sha256: sha256Hex(file.bytes) })),
  });
  const manifestHash = sha256Hex(manifest);
  const versionDir = `${canonical}/v${decision.version}`;

  // Guardia contro depositi concorrenti: restringe la corsa, non la elimina (vedi PROGETTO.md).
  const { data: recheckRows, error: recheckErr } = await svc
    .from('archive_package_versions')
    .select('version_number')
    .eq('biography_id', biographyId);
  if (recheckErr) throw new Error(recheckErr.message);
  const recheckVersions = ((recheckRows ?? []) as { version_number: number }[]).map(
    (row) => row.version_number
  );
  if (recheckVersions.some((n) => n >= decision.version)) {
    throw new ArchiveVersionConflictError();
  }
  const { data: listed, error: listErr } = await svc.storage.from(BUCKET).list(versionDir);
  if (listErr) throw new Error(listErr.message);
  if ((listed ?? []).length > 0) {
    throw new ArchiveVersionConflictError();
  }

  for (const file of files) {
    const { error: upErr } = await svc.storage.from(BUCKET).upload(`${versionDir}/${file.path}`, file.bytes, {
      contentType: file.path.endsWith('.json')
        ? 'application/json'
        : file.path.endsWith('.md')
          ? 'text/markdown; charset=utf-8'
          : file.path.endsWith('.txt')
            ? 'text/plain; charset=utf-8'
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
    record_schema_version: RECORD_SCHEMA_VERSION,
    um_spec_version: '1.0',
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

export async function syncDueArchivePackages(svc: AnyClient): Promise<{
  checked: number;
  deposited: number;
  failed: string[];
}> {
  const { data, error } = await svc
    .from('biographies')
    .select('id, biography_type, translation_of, published_at')
    .eq('status', 'published');
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as {
    id: string;
    biography_type: string | null;
    translation_of: string | null;
    published_at: string | null;
  }[];
  const originals = rows.filter((row) => !row.translation_of);
  const editions = rows.filter(
    (row) => typeof row.translation_of === 'string' && row.translation_of.trim()
  );

  const checkedIds = new Set<string>();
  let deposited = 0;
  const failedIds = new Set<string>();

  for (const row of originals) {
    checkedIds.add(row.id);
    const reason: ArchiveReason =
      row.biography_type === 'memorial' ? 'provisional_expired' : 'publication';
    try {
      const result = await syncArchivePackage(svc, row.id, reason);
      if (result.deposited) deposited += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[archive-packages] sync failed', row.id, message);
      failedIds.add(row.id);
    }
  }

  // Passata di sicurezza: edizioni pubblicate dopo l'ultima versione del pacchetto.
  const originalsWithVersions = new Set<string>();
  const latestGenerated = new Map<string, string>();
  for (const original of originals) {
    const { data: versions, error: vErr } = await svc
      .from('archive_package_versions')
      .select('version_number, generated_at')
      .eq('biography_id', original.id);
    if (vErr) throw new Error(vErr.message);
    const list = (versions ?? []) as { version_number: number; generated_at: string }[];
    if (list.length === 0) continue;
    originalsWithVersions.add(original.id);
    const latest = list.reduce((a, b) => (a.version_number >= b.version_number ? a : b));
    latestGenerated.set(original.id, latest.generated_at);
  }

  const pendingOriginals = new Set<string>();
  for (const edition of editions) {
    const originalId = edition.translation_of!;
    if (!originalsWithVersions.has(originalId)) continue;
    const publishedAt = edition.published_at;
    if (!publishedAt) continue;
    const generatedAt = latestGenerated.get(originalId);
    if (!generatedAt) continue;
    if (new Date(publishedAt).getTime() > new Date(generatedAt).getTime()) {
      pendingOriginals.add(originalId);
    }
  }

  for (const originalId of Array.from(pendingOriginals)) {
    checkedIds.add(originalId);
    try {
      const result = await syncArchivePackage(svc, originalId, 'edition_published');
      if (result.deposited) deposited += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[archive-packages] sync failed', originalId, message);
      failedIds.add(originalId);
    }
  }

  return {
    checked: checkedIds.size,
    deposited,
    failed: Array.from(failedIds),
  };
}

export { archiveFolder };
