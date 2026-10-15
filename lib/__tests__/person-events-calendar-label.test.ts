import { describe, expect, it } from 'vitest';
import {
  buildEventRow,
  CALENDAR_LABELS,
  emptyEventForm,
  type UiLang,
} from '@/lib/person-events';

describe('buildEventRow calendar_label', () => {
  it('writes gregorian calendar_label in the record language', () => {
    const langs: UiLang[] = ['en', 'it', 'fr', 'de'];
    for (const recordLang of langs) {
      const form = emptyEventForm();
      form.date = { precision: 'year', year: '1950', month: '', day: '' };
      const row = buildEventRow({
        biographyId: 'bio-1',
        type: 'birth',
        form,
        recordLang,
      });
      expect(row.calendar_code).toBe('gregorian');
      expect(row.calendar_label).toBe(CALENDAR_LABELS.gregorian[recordLang]);
    }
  });

  it('leaves calendar_label null when there is no date', () => {
    const row = buildEventRow({
      biographyId: 'bio-1',
      type: 'birth',
      form: emptyEventForm(),
      recordLang: 'it',
    });
    expect(row.calendar_code).toBeNull();
    expect(row.calendar_label).toBeNull();
  });
});
