/**
 * Pacchetto d'archivio archive/{UM}/v{N}/.
 * Il manifesto elenca le impronte degli altri file e non la propria.
 */

import { createHash } from 'crypto';
import { nfc } from '@/lib/nfc';
import { toCanonical } from '@/lib/um-id';
import {
  buildPermanencePlainText,
  type PermanenceExportBiography,
  type PermanenceExportEvent,
  type PermanenceExportRelation,
} from '@/lib/permanence-text-export';

export const UM_SPEC_VERSION = '1.0';

export type ArchiveReason = 'publication' | 'provisional_expired' | 'republication' | 'data_protection';
export type ArchiveVersionStatus = 'stored' | 'destroyed';

export type ArchiveVersionEntry = {
  version: number;
  generated_at: string;
  manifest_sha256: string;
  reason: ArchiveReason;
  status: ArchiveVersionStatus;
};

export type ArchiveFile = {
  path: string;
  bytes: Buffer;
};

export function sha256Hex(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function archiveFolder(umId: string): string {
  return `archive/${toCanonical(umId)}`;
}

export function buildBiographyMarkdown(input: {
  bio: PermanenceExportBiography;
  events: PermanenceExportEvent[];
  relations: PermanenceExportRelation[];
  bodyMarkdown: string;
  umIdBaseUrl?: string | null;
}): string {
  const headerBio: PermanenceExportBiography = {
    ...input.bio,
    final_version: null,
    content_freeflow: null,
    content: undefined,
    biography_mode: 'freeflow',
  };
  const header = buildPermanencePlainText(
    headerBio,
    input.events,
    input.relations,
    undefined,
    input.umIdBaseUrl
  );
  const body = nfc(input.bodyMarkdown.trim());
  return body ? `${header}${body}\n` : header;
}

export function buildManifestText(input: {
  generatedAt: string;
  files: { path: string; sha256: string }[];
}): string {
  const lines = [
    `UM SPEC ${UM_SPEC_VERSION}`,
    `GENERATED ${input.generatedAt}`,
    ...input.files
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((file) => `${file.path} ${file.sha256}`),
  ];
  return `${lines.join('\n')}\n`;
}

export function buildIndexJson(umId: string, versions: ArchiveVersionEntry[]): string {
  return `${JSON.stringify({ um_id: toCanonical(umId), versions }, null, 2)}\n`;
}

export function decideArchiveDeposit(input: {
  biographyType: 'autobiography' | 'memorial';
  provisionalUntil: string | null;
  now: Date;
  existingVersions: number[];
  reason: ArchiveReason;
}): { deposit: boolean; version: number } {
  const next = input.existingVersions.length
    ? Math.max(...input.existingVersions) + 1
    : 1;
  const windowOpen =
    input.biographyType === 'memorial' &&
    input.provisionalUntil != null &&
    new Date(input.provisionalUntil).getTime() > input.now.getTime();

  if (input.reason === 'publication') {
    if (input.biographyType !== 'autobiography') return { deposit: false, version: next };
    if (input.existingVersions.length > 0) return { deposit: false, version: next };
    return { deposit: true, version: 1 };
  }

  if (input.reason === 'data_protection') return { deposit: false, version: next };

  if (input.reason === 'provisional_expired') {
    if (input.biographyType !== 'memorial') return { deposit: false, version: next };
    if (windowOpen || input.provisionalUntil == null) return { deposit: false, version: next };
    if (input.existingVersions.length > 0) return { deposit: false, version: next };
    return { deposit: true, version: 1 };
  }

  if (windowOpen) return { deposit: false, version: next };
  if (input.existingVersions.length === 0) return { deposit: false, version: next };
  return { deposit: true, version: next };
}
