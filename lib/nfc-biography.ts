import { nfc } from '@/lib/nfc';
import { storedToArchiveMarkdown } from '@/lib/archive-markdown';

/** NFC + Markdown d’archivio su titolo/nomi/testo biografia al salvataggio editor. */
export function nfcBiographyWriteFields(fields: {
  title?: string;
  subject_name?: string | null;
  author_name?: string | null;
  content_freeflow?: string | null;
  content?: Record<string, { text?: string } | undefined> | null;
  name_as_written?: string | null;
  final_version?: string | null;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields.title !== undefined) out.title = nfc(fields.title);
  if (fields.subject_name !== undefined) {
    out.subject_name =
      fields.subject_name == null ? null : nfc(fields.subject_name);
  }
  if (fields.author_name !== undefined) {
    out.author_name =
      fields.author_name == null ? null : nfc(fields.author_name);
  }
  if (fields.content_freeflow !== undefined) {
    out.content_freeflow =
      fields.content_freeflow == null
        ? null
        : storedToArchiveMarkdown(fields.content_freeflow);
  }
  if (fields.name_as_written !== undefined) {
    out.name_as_written =
      fields.name_as_written == null ? null : nfc(fields.name_as_written);
  }
  if (fields.final_version !== undefined) {
    out.final_version =
      fields.final_version == null
        ? null
        : storedToArchiveMarkdown(fields.final_version);
  }
  if (fields.content !== undefined && fields.content !== null) {
    const mapped: Record<string, unknown> = {};
    for (const [key, section] of Object.entries(fields.content)) {
      mapped[key] = {
        ...section,
        text: typeof section?.text === 'string' ? storedToArchiveMarkdown(section.text) : '',
      };
    }
    out.content = mapped;
  }
  return out;
}
