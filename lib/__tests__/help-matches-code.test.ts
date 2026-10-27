import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GRAMMAR_DAILY_LIMIT, GRAMMAR_WEEKLY_LIMIT } from '@/lib/ai/grammar-limits';
import { ECHO_MAX_RECORDING_SECONDS, ECHO_RECORDING_WARNING_SECONDS } from '@/lib/echo/recording-limits';
import { BOOK_PART_DEFS } from '@/lib/book-parts';
import { MANUAL_META } from '@/lib/help/manual-meta.generated';

/**
 * La guida (Echo e manuale da scaricare nascono dalla stessa fonte, docs/PLATFORM_KB*.md) deve dire
 * ciò che l'app fa davvero. Qui ogni numero e ogni voce di menu che la guida cita è legato al codice:
 * se cambia il codice senza la guida, o la guida in una sola lingua, la verifica automatica fallisce.
 * Per aggiornare la guida: modifica i quattro file in docs/ e lancia `npm run kb:sync`.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const LOCALES = ['en', 'it', 'fr', 'de'] as const;
type Locale = (typeof LOCALES)[number];
const SOURCE: Record<Locale, string> = {
  en: 'docs/PLATFORM_KB.md',
  it: 'docs/PLATFORM_KB.it.md',
  fr: 'docs/PLATFORM_KB.fr.md',
  de: 'docs/PLATFORM_KB.de.md',
};
const MANUAL: Record<Locale, string> = {
  en: 'public/help/biography-library-manual.en.md',
  it: 'public/help/biography-library-manual.it.md',
  fr: 'public/help/biography-library-manual.fr.md',
  de: 'public/help/biography-library-manual.de.md',
};

function sections(locale: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  let key: string | null = null;
  for (const line of read(SOURCE[locale]).split('\n')) {
    const m = line.match(/^## ([a-z][a-z0-9_]*)$/);
    if (m) {
      key = m[1];
      out[key] = '';
    } else if (key) out[key] += `${line}\n`;
  }
  return out;
}

const KB = Object.fromEntries(LOCALES.map((l) => [l, sections(l)])) as Record<Locale, Record<string, string>>;
const WHOLE = Object.fromEntries(LOCALES.map((l) => [l, read(SOURCE[l])])) as Record<Locale, string>;

describe('la guida dice gli stessi numeri in tutte le lingue', () => {
  // «1» si scrive spesso a parole («prima pagina», «première page»): si confrontano gli altri numeri.
  const numbersOf = (text: string) =>
    Array.from(new Set(text.replace(/<!--[\s\S]*?-->/g, '').match(/\d+(?:[.,]\d+)?/g) ?? []))
      .filter((n) => n !== '1')
      .sort();

  for (const key of Object.keys(KB.en)) {
    it(`sezione ${key}`, () => {
      const reference = numbersOf(KB.en[key]);
      for (const locale of LOCALES) {
        expect({ locale, numbers: numbersOf(KB[locale][key]) }).toEqual({ locale, numbers: reference });
      }
    });
  }

  it('la versione è la stessa nei quattro file e nel manuale scaricabile', () => {
    const versions = LOCALES.map((l) => WHOLE[l].match(/^Version:\s*([\d.]+)\s*—\s*([\d-]+)/m)?.slice(1, 3).join(' '));
    expect(new Set(versions).size).toBe(1);
    expect(versions[0]).toBe(`${MANUAL_META.version} ${MANUAL_META.date}`);
    for (const locale of LOCALES) {
      expect(read(MANUAL[locale])).toContain(String(MANUAL_META.version));
    }
  });
});

describe('la guida e il codice dicono lo stesso', () => {
  it('registrazione vocale: durata massima e avviso, in tutte le lingue', () => {
    const minutes = String(ECHO_MAX_RECORDING_SECONDS / 60);
    const warning = String(ECHO_RECORDING_WARNING_SECONDS);
    for (const locale of LOCALES) {
      const text = KB[locale].conversation_mode;
      expect(text).toContain('REC');
      expect(text.match(/\d+/g)).toEqual(expect.arrayContaining([minutes, warning]));
    }
  });

  it('controllo grammaticale: limiti giornaliero e settimanale', () => {
    for (const locale of LOCALES) {
      const numbers = KB[locale].ai_tools.match(/\d+/g) ?? [];
      expect(numbers).toEqual(expect.arrayContaining([String(GRAMMAR_DAILY_LIMIT), String(GRAMMAR_WEEKLY_LIMIT)]));
    }
  });

  it('importazione: 5 MB per i testi e 30 MB per i PDF, come nell\'app', () => {
    const textMax = Number(read('lib/text-import-parser.ts').match(/MAX_FILE_SIZE = (\d+) \* 1024 \* 1024/)?.[1]);
    const dialogPdf = Number(read('components/editor/import-text-dialog.tsx').match(/MAX_PDF_BYTES = (\d+) \* 1024 \* 1024/)?.[1]);
    const routePdf = Number(read('app/api/import/pdf/route.ts').match(/MAX_PDF_BYTES = (\d+) \* 1024 \* 1024/)?.[1]);
    expect(dialogPdf).toBe(routePdf);
    for (const locale of LOCALES) {
      const numbers = KB[locale].import_export.match(/\d+/g) ?? [];
      expect(numbers).toEqual(expect.arrayContaining([String(textMax), String(routePdf)]));
    }
  });

  it('esportazione: i formati offerti sono PDF, Word e testo, come dice la guida', () => {
    const dialog = read('components/export/AdvancedExportDialog.tsx');
    expect(dialog).toMatch(/type ExportFormat = 'pdf-b5-standard' \| 'txt' \| 'docx';/);
    const words: Record<Locale, RegExp[]> = {
      en: [/PDF/, /Word/, /plain text/],
      it: [/PDF/, /Word/, /testo/],
      fr: [/PDF/, /Word/, /texte/],
      de: [/PDF/, /Word/, /Text/],
    };
    for (const locale of LOCALES) {
      for (const re of words[locale]) expect(KB[locale].import_export).toMatch(re);
    }
  });
});

describe('ogni voce del menu Strumenti è nella guida', () => {
  const sidebar = read('components/editor/section-sidebar.tsx');
  const toolIds = Array.from(sidebar.matchAll(/data-tour-id="([a-z-]+)"/g)).map((m) => m[1]);

  it('le voci del menu sono quelle che la guida conosce (se ne aggiungi una, aggiorna la guida)', () => {
    expect(toolIds.filter((id) => id !== 'chapter-title-btn')).toEqual(
      expect.arrayContaining([
        'import-btn',
        'export-pdf-btn',
        'editor-tools-btn',
        'text-language-btn',
        'translate-btn',
        'privacy-btn',
        'permanence-btn',
        'notes-btn',
        'photos-btn',
        'book-structure-btn',
        'review-publication-btn',
        'delete-edition-btn',
      ])
    );
    const known = new Set([
      'import-btn', 'export-pdf-btn', 'editor-tools-btn', 'text-language-btn', 'translate-btn',
      'privacy-btn', 'permanence-btn', 'notes-btn', 'photos-btn', 'book-structure-btn',
      'review-publication-btn', 'delete-edition-btn',
      // Il titolo della biografia (clic per rinominare): sta nel menu a sinistra, non negli Strumenti.
      'book-title-btn',
    ]);
    const unknown = toolIds.filter((id) => !known.has(id));
    expect(unknown).toEqual([]);
  });

  const MENTIONS: Record<Locale, Array<[string, RegExp]>> = {
    en: [
      ['import', /Import text/], ['export', /Export/], ['lingua', /Language of the text/],
      ['visibilità', /Visibility/], ['dati', /My details/], ['note', /notes/i],
      ['foto', /photos/i], ['struttura', /book structure/i], ['revisione', /review and publication/i],
    ],
    it: [
      ['import', /Importa testo/], ['export', /Esporta/], ['lingua', /Lingua del testo/],
      ['visibilità', /Visibilità/], ['dati', /I miei dati/], ['note', /note/i],
      ['foto', /foto/i], ['struttura', /struttura del libro/i], ['revisione', /revisione e pubblicazione/i],
    ],
    fr: [
      ['import', /Importer du texte/], ['export', /Exporter/], ['lingua', /Langue du texte/],
      ['visibilità', /Visibilité/], ['dati', /Mes données/], ['note', /notes/i],
      ['foto', /photos/i], ['struttura', /structure du livre/i], ['revisione', /révision et publication/i],
    ],
    de: [
      ['import', /Text importieren/], ['export', /Exportieren/], ['lingua', /Sprache des Textes/],
      ['visibilità', /Sichtbarkeit/], ['dati', /Meine Angaben/], ['note', /Notizen/i],
      ['foto', /Fotos/i], ['struttura', /Buchstruktur/i], ['revisione', /Überprüfung und Veröffentlichung/i],
    ],
  };

  for (const locale of LOCALES) {
    it(`editor_interface in ${locale} nomina ogni voce`, () => {
      for (const [name, re] of MENTIONS[locale]) {
        expect({ locale, name, found: re.test(KB[locale].editor_interface) }).toEqual({ locale, name, found: true });
      }
    });
  }

  it('la traduzione e la lingua del testo hanno una sezione e un menu in ogni lingua', () => {
    for (const locale of LOCALES) {
      expect(KB[locale].translations).toMatch(/Strumenti|Tools|Outils|Werkzeuge/);
    }
  });
});

describe('il manuale scaricabile è la guida di Echo, senza le parti interne', () => {
  for (const locale of LOCALES) {
    it(`${locale}: stesso testo pubblico, nessuna nota interna`, () => {
      const manual = read(MANUAL[locale]);
      const publicTitles = Array.from(WHOLE[locale].matchAll(/<!--\s*public-title:\s*(.+?)\s*-->/g)).map((m) => m[1]);
      expect(publicTitles.length).toBeGreaterThanOrEqual(10);
      for (const title of publicTitles) expect(manual).toContain(title);
      expect(manual).not.toContain('<!-- internal -->');
      expect(manual).not.toContain('npm run kb:sync');
    });
  }

  it('la frase sulla registrazione vocale arriva anche nel manuale da scaricare', () => {
    expect(read(MANUAL.it)).toContain('fino a 5 minuti');
    expect(read(MANUAL.en)).toContain('up to 5 minutes');
    expect(read(MANUAL.fr)).toContain('jusqu\'à 5 minutes');
    expect(read(MANUAL.de)).toContain('bis zu 5 Minuten');
  });
});

describe('struttura del libro: le parti nella guida sono quelle del codice', () => {
  const NAMES: Record<Locale, { front: RegExp[]; back: RegExp[] }> = {
    en: { front: [/Dedication/, /Epigraph/, /Preface/], back: [/Epilogue/, /Acknowledgements/, /Credits/] },
    it: { front: [/Dedica/, /Epigrafe/, /Prefazione/], back: [/Epilogo/, /Ringraziamenti/, /Crediti/] },
    fr: { front: [/Dédicace/, /Épigraphe/, /Préface/], back: [/Épilogue/, /Remerciements/, /Crédits/] },
    de: { front: [/Widmung/, /Epigraph/, /Vorwort/], back: [/Epilog/, /Danksagung/, /Credits/] },
  };

  it('tre parti prima e tre dopo il testo', () => {
    expect(BOOK_PART_DEFS.filter((p) => p.matter === 'front').map((p) => p.key)).toEqual([
      'dedication',
      'epigraph',
      'preface',
    ]);
    expect(BOOK_PART_DEFS.filter((p) => p.matter === 'back').map((p) => p.key)).toEqual([
      'epilogue',
      'acknowledgements',
      'specific_credits',
    ]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: la guida nomina tutte e sei le parti`, () => {
      const text = KB[locale].book_structure_photos;
      for (const re of [...NAMES[locale].front, ...NAMES[locale].back]) expect(text).toMatch(re);
    });
  }
});
