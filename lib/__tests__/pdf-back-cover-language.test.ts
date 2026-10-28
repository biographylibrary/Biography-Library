import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { resolvePdfTranslations } from '@/lib/pdf-export';
import { translations } from '@/lib/i18n/translations';
import { buildPermanenceHeaderLines } from '@/lib/permanence-text-export';

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

describe('blocco dei dati di permanenza nella lingua del libro', () => {
  const base = {
    um_id: 'um0000k3nq7fx2mvp4',
    schema_version: 2,
    record_script: 'Latn',
    record_direction: 'ltr',
    record_language_endonym: null,
    name_as_written: 'Maria Rossi',
    name_romanized: null,
    title: 'Maria Rossi',
    author_name: 'Maria Rossi',
    subject_name: null,
    biography_type: 'autobiography',
    published_at_iso: '2026-09-03',
    published_um_year: 0,
    rights_statement_uri: null,
  } as const;
  const header = (tag: string) =>
    buildPermanenceHeaderLines({ ...base, record_language_tag: tag }, [], [], 'https://id.biographylibrary.org');

  it.each([
    ['en', 'IDENTIFIER:', 'PUBLISHED:', 'RESOLUTION ADDRESS AT PUBLICATION:', 'LANGUAGE:', 'NAME:'],
    ['it', 'IDENTIFICATIVO | IDENTIFIER:', 'PUBBLICATO | PUBLISHED:', 'INDIRIZZO DI RISOLUZIONE ALLA PUBBLICAZIONE | RESOLUTION', 'LINGUA | LANGUAGE:', 'NOME | NAME:'],
    ['fr', 'IDENTIFIANT | IDENTIFIER:', 'PUBLIÉ | PUBLISHED:', 'ADRESSE DE RÉSOLUTION À LA PUBLICATION | RESOLUTION', 'LANGUE | LANGUAGE:', 'NOM | NAME:'],
    ['de', 'KENNUNG | IDENTIFIER:', 'VERÖFFENTLICHT | PUBLISHED:', 'AUFLÖSUNGSADRESSE BEI VERÖFFENTLICHUNG | RESOLUTION', 'SPRACHE | LANGUAGE:', 'NAME:'],
  ])('%s: etichette tradotte', (tag, ...expected) => {
    const text = header(tag).join('\n');
    for (const e of expected) expect(text).toContain(e);
  });

  it.each(['es', 'ja', 'es-MX'])('%s: etichette e nota in inglese, mai in italiano', (tag) => {
    const text = header(tag).join('\n');
    expect(text).toContain('IDENTIFIER:');
    expect(text).toContain('The address above is not part of the identifier');
    expect(text).not.toMatch(/IDENTIFICATIVO|PUBBLICATO|NOTA:/);
  });

  it.each(['es', 'ja'])('%s: crediti del retro in inglese', (tag) => {
    expect(resolvePdfTranslations(tag)).toEqual(resolvePdfTranslations('en'));
  });
});
