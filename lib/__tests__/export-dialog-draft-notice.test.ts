import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/i18n/translations';
import { shouldRecordPdfDraft } from '@/lib/pdf-draft-constants';

/** Il dialogo di esportazione promette una bozza solo quando la bozza viene davvero registrata. */
describe('dialogo di esportazione: avviso sulla bozza PDF', () => {
  it('la bozza si registra solo nello stato pdf_draft', () => {
    expect(shouldRecordPdfDraft('pdf_draft')).toBe(true);
    for (const status of ['draft', 'review', 'published', null, undefined]) {
      expect(shouldRecordPdfDraft(status)).toBe(false);
    }
  });

  for (const [lang, bundle] of Object.entries(translations)) {
    it(`${lang}: il testo per gli altri stati non promette una bozza salvata`, () => {
      const d = (bundle as { exportDialog: { pdfLayoutProofNotice: string; draftIterationNone: string } }).exportDialog;
      expect(d.pdfLayoutProofNotice.length).toBeGreaterThan(20);
      expect(d.pdfLayoutProofNotice).not.toBe(d.draftIterationNone);
      expect(d.pdfLayoutProofNotice).not.toMatch(/creerai|will create|créera|erstellt/i);
    });
  }
});
