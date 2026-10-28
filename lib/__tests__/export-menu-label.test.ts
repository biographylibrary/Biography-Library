import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/i18n/translations';

/** La voce di menu apre l'esportazione sia del PDF sia del testo: l'etichetta deve dirlo. */
describe('voce di menu dell\'esportazione', () => {
  for (const [lang, bundle] of Object.entries(translations)) {
    const b = bundle as { notesAndTodos: { exportText: string } };
    it(`${lang}: l'etichetta cita il PDF`, () => {
      expect(b.notesAndTodos.exportText).toMatch(/PDF/);
    });
  }
});
