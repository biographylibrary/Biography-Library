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

describe('site legal pages', () => {
  it('carries the March 2026 site text in four languages', () => {
    for (const doc of ['privacy', 'terms', 'cookies'] as const) {
      for (const language of ['it', 'en', 'fr', 'de'] as const) {
        const blocks = siteLegal[doc][language];
        expect(blocks[0]).toEqual({ kind: 'title', text: titles[doc][language] });
        expect(blocks.some((block) => block.kind === 'heading')).toBe(true);
        expect(blocks.some((block) => block.text === 'Unisciti')).toBe(false);
      }
    }
    expect(siteLegal.privacy.it.some((block) => block.text.includes('Marzo 2026'))).toBe(true);
  });
});
