import { describe, expect, it } from 'vitest';
import { shouldRecordPdfDraft } from '@/lib/pdf-draft-constants';

describe('registrazione della bozza PDF', () => {
  it('si registra solo nella fase di revisione PDF', () => {
    expect(shouldRecordPdfDraft('pdf_draft')).toBe(true);
  });

  it('non si registra in stato «bozza» né negli altri stati (la rotta risponderebbe 400)', () => {
    for (const status of ['draft', 'final_version', 'under_review', 'published', '', null, undefined]) {
      expect(shouldRecordPdfDraft(status as string | null | undefined)).toBe(false);
    }
  });
});
