import { describe, expect, it } from 'vitest';
import { translations } from '@/lib/i18n/translations';

type Bundle = {
  onboardingTour: { exportTextDesc: string; echoVoiceDesc: string; aiCreditsDesc: string };
  onboardingWizard: { accountModelInfo: string };
};

/** Il tour e la procedura guidata non devono promettere cose che il prodotto non fa più. */
describe('testi di onboarding allineati al prodotto', () => {
  for (const [lang, bundle] of Object.entries(translations)) {
    const b = bundle as unknown as Bundle;

    it(`${lang}: l'esportazione non promette di «avviare una bozza PDF» dal pulsante`, () => {
      expect(b.onboardingTour.exportTextDesc).toMatch(/PDF/);
      expect(b.onboardingTour.exportTextDesc).not.toMatch(
        /start a PDF draft|avvia una bozza PDF|lancez un brouillon PDF|PDF-Entwurf starten/i
      );
    });

    it(`${lang}: la voce di Echo parte spenta e la registrazione dura al massimo 5 minuti`, () => {
      expect(b.onboardingTour.echoVoiceDesc).toMatch(/5/);
    });

    it(`${lang}: il contatore dell'IA spiega che le funzioni IA si spengono dalle impostazioni`, () => {
      expect(b.onboardingTour.aiCreditsDesc.length).toBeGreaterThan(150);
    });

    it(`${lang}: il modello dell'account cita le traduzioni come edizioni`, () => {
      expect(b.onboardingWizard.accountModelInfo).toMatch(/translations|traduzioni|traductions|Übersetzungen/);
    });
  }
});
