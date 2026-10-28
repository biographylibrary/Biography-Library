import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/i18n/translations';

/** Il dialogo di revisione non deve rimandare a voci che non esistono. */
describe('dialogo Revisione e pubblicazione', () => {
  const NON_ESISTONO = [/Revisione Finale con IA/i, /Final Review with AI/i, /Révision finale avec IA/i, /Abschließende Überprüfung mit KI/i];

  for (const [lang, bundle] of Object.entries(translations)) {
    it(`${lang}: il suggerimento dell'invio rapido rimanda a un passaggio che c'è`, () => {
      const hint = (bundle as { editor: { publicationLegacySubmitHint: string } }).editor.publicationLegacySubmitHint;
      for (const gone of NON_ESISTONO) expect(hint).not.toMatch(gone);
      // Il passaggio 1 del dialogo è la preparazione della versione finale: il suggerimento lo cita.
      expect(hint).toMatch(/1/);
    });
  }
});
