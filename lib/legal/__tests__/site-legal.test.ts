import { describe, expect, it } from 'vitest';
import { siteLegal } from '@/lib/legal/site-legal';

const titles = {
  privacy: {
    it: 'Informativa sulla privacy',
    en: 'Privacy Policy',
    fr: 'Politique de confidentialité',
    de: 'Datenschutzerklärung',
  },
  terms: {
    it: 'Termini di Servizio',
    en: 'Terms of Service',
    fr: "Conditions d'utilisation",
    de: 'Nutzungsbedingungen',
  },
  cookies: {
    it: 'Informativa sui Cookie',
    en: 'Cookie Policy',
    fr: 'Politique en matière de cookies',
    de: 'Cookie-Richtlinie',
  },
} as const;

const LANGUAGES = ['it', 'en', 'fr', 'de'] as const;

function fullText(doc: 'privacy' | 'terms' | 'cookies', lang: (typeof LANGUAGES)[number]): string {
  return siteLegal[doc][lang].map((b) => b.text).join('\n');
}

describe('site legal pages', () => {
  it('carries the site text in four languages', () => {
    for (const doc of ['privacy', 'terms', 'cookies'] as const) {
      for (const language of LANGUAGES) {
        const blocks = siteLegal[doc][language];
        expect(blocks[0]).toEqual({ kind: 'title', text: titles[doc][language] });
        expect(blocks.some((block) => block.kind === 'heading')).toBe(true);
        expect(blocks.some((block) => block.text === 'Unisciti')).toBe(false);
      }
    }
    expect(siteLegal.privacy.it.some((block) => block.text.includes('28 settembre 2026'))).toBe(true);
    expect(siteLegal.terms.it.some((block) => block.text.includes('versione 1 finale'))).toBe(true);
    expect(siteLegal.cookies.it.some((block) => block.text.includes('app.biographylibrary.org'))).toBe(true);
    expect(siteLegal.privacy.it.some((block) => block.text.includes('Nei primi 30 giorni'))).toBe(true);
    expect(JSON.stringify(siteLegal.cookies)).not.toContain('wordpress_logged_in');
  });

  it('privacy e termini non contengono le affermazioni false rimosse (in tutte le 4 lingue)', () => {
    const forbidden = [
      // vecchio limite 30 immagini
      /\b30\s+(images|immagini|Bilder)\b/i,
      // vecchio limite 5 MB per file
      /\b5\s*(megabytes?|mégaoctets?|Megabyte|MB|Mo)\b/i,
      // vecchio tetto mensile IA affermato come esistente
      /\b(daily and monthly use limits|limiti di utilizzo giornalieri e mensili|limites d’usage quotidiennes et mensuelles|tägliche und monatliche Nutzungsgrenzen)\b/i,
      // W3C Verifiable Credentials
      /W3C|Verifiable Credentials/i,
      // vecchia voce di traduzione automatica dell'assistente
      /Translates the biography|Traduce la biografia|Traduit la biographie|Übersetzt die Biografie/,
    ];

    for (const doc of ['privacy', 'terms'] as const) {
      for (const lang of LANGUAGES) {
        const text = fullText(doc, lang);
        for (const pattern of forbidden) {
          expect(text, `${doc}.${lang} non deve contenere ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });

  it('termini in tutte le 4 lingue riportano i numeri corretti (15 foto, 20 MB, 40/giorno e 200/settimana UTC, UM)', () => {
    for (const lang of LANGUAGES) {
      const termsText = fullText('terms', lang);
      expect(termsText, `terms.${lang} 15 gallery photos`).toMatch(
        /\b15\s+(gallery photos|foto in galleria|photos de galerie|Galeriefotos)\b/
      );
      expect(termsText, `terms.${lang} 20 MB`).toMatch(
        /\b20\s+(megabytes|megabyte|mégaoctets|Megabyte)\b/
      );
      expect(termsText, `terms.${lang} 40/day UTC`).toMatch(/\b40\b[\s\S]{0,40}\bUTC\b/);
      expect(termsText, `terms.${lang} 200/week UTC`).toMatch(/\b200\b[\s\S]{0,40}\bUTC\b/);
      expect(termsText, `terms.${lang} UM identifier`).toMatch(/\bUM\b/);
    }
  });

  it('privacy in tutte le 4 lingue copre memoria Echo, ai_token_usage, rimozione metadati foto, assenza traduzione automatica e controllo finale', () => {
    for (const lang of LANGUAGES) {
      const privacyText = fullText('privacy', lang);
      expect(privacyText, `privacy.${lang} ai_token_usage`).toContain('`ai_token_usage`');
      expect(privacyText, `privacy.${lang} Echo`).toContain('Echo');
      expect(privacyText, `privacy.${lang} support@biographylibrary.org`).toContain(
        'support@biographylibrary.org'
      );
    }
    expect(fullText('privacy', 'en')).toContain('does not machine-translate biographies');
    expect(fullText('privacy', 'it')).toContain('non traduce le biografie in automatico');
    expect(fullText('privacy', 'fr')).toContain('ne traduit pas les biographies automatiquement');
    expect(fullText('privacy', 'de')).toContain('übersetzt Biografien nicht maschinell');
  });
});
