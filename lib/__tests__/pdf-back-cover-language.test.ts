import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { resolvePdfTranslations } from '@/lib/pdf-export';
import { translations } from '@/lib/i18n/translations';

describe('testi fissi del PDF nella lingua del libro', () => {
  it('il retro di copertina di un\'edizione inglese è in inglese, non nella lingua dell\'interfaccia', () => {
    const en = resolvePdfTranslations('en');
    expect(en.backCoverDescription).toBe(translations.en.exportDialog.backCoverDescription);
    expect(en.backCoverDescription).toMatch(/^This biography was managed with Biography Library/);
    expect(en.backCoverDescription).not.toBe(translations.it.exportDialog.backCoverDescription);
  });

  it.each(['it', 'fr', 'de'] as const)('%s usa le sue traduzioni', (lang) => {
    const d = translations[lang].exportDialog;
    const r = resolvePdfTranslations(lang);
    expect(r.backCoverDescription).toBe(d.backCoverDescription);
    expect(r.backCoverPropertyStatement).toBe(d.backCoverPropertyStatement);
    expect(r.backCoverAiStatement).toBe(d.backCoverAiStatement);
    expect(r.backCoverFooter).toBe(d.backCoverFooter);
  });

  it('i tag regionali e le lingue non coperte si riducono alla base o all\'inglese', () => {
    expect(resolvePdfTranslations('it-CH')).toEqual(resolvePdfTranslations('it'));
    expect(resolvePdfTranslations('pt-BR')).toEqual(resolvePdfTranslations('en'));
    expect(resolvePdfTranslations(undefined)).toEqual(resolvePdfTranslations('en'));
  });
});
