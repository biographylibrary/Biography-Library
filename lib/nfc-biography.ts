import { nfc } from '@/lib/nfc';

/** NFC su titolo/nomi/testo biografia al salvataggio editor. */
export function nfcBiographyWriteFields(fields: {
  title?: string;
  subject_name?: string | null;
  author_name?: string | null;
  content_freeflow?: string | null;
  content?: Record<string, { text?: string } | undefined> | null;
  name_as_written?: string | null;
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
      fields.content_freeflow == null ? null : nfc(fields.content_freeflow);
  }
  if (fields.name_as_written !== undefined) {
    out.name_as_written =
      fields.name_as_written == null ? null : nfc(fields.name_as_written);
  }
  if (fields.content !== undefined && fields.content !== null) {
    const mapped: Record<string, { text: string }> = {};
    for (const [key, section] of Object.entries(fields.content)) {
      mapped[key] = {
        text: typeof section?.text === 'string' ? nfc(section.text) : '',
      };
    }
    out.content = mapped;
  }
  return out;
}
