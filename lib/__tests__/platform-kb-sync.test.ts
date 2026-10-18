import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HELP_KB_SECTIONS, KB_LOCALES } from '@/lib/agents/kb/help-kb-sections';
import { HELP_KB_EN_SECTION_KEYS } from '@/lib/agents/kb/help-kb-sections.en.generated';
import { MANUAL_META } from '@/lib/help/manual-meta.generated';

const ROOT = path.resolve(__dirname, '../..');

function stripMarkersKeepInternal(body: string): string {
  return body
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (/^<!--\s*public-title:\s*.+?\s*-->$/.test(t)) return false;
      if (t === '<!-- internal -->' || t === '<!-- /internal -->') return false;
      return true;
    })
    .join('\n')
    .trim();
}

function parsePlatformKb(markdown: string) {
  const sections: { sourceKey: string; content: string }[] = [];
  const lines = markdown.split('\n');
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentKey) return;
    const content = stripMarkersKeepInternal(currentLines.join('\n'));
    if (content) sections.push({ sourceKey: currentKey, content });
    currentLines = [];
  };

  for (const line of lines) {
    const m = line.match(/^## ([a-z][a-z0-9_]*)$/);
    if (m) {
      flush();
      currentKey = m[1];
      continue;
    }
    if (currentKey) currentLines.push(line);
  }
  flush();
  return sections;
}

const LOCALE_MD: Record<(typeof KB_LOCALES)[number], string> = {
  en: path.join(ROOT, 'docs/PLATFORM_KB.md'),
  it: path.join(ROOT, 'docs/PLATFORM_KB.it.md'),
  fr: path.join(ROOT, 'docs/PLATFORM_KB.fr.md'),
  de: path.join(ROOT, 'docs/PLATFORM_KB.de.md'),
};

describe('PLATFORM_KB sync (4 lingue)', () => {
  it('ogni lingua ha le stesse chiavi EN', () => {
    for (const locale of KB_LOCALES) {
      const md = fs.readFileSync(LOCALE_MD[locale], 'utf8');
      const parsed = parsePlatformKb(md);
      expect(parsed.map((s) => s.sourceKey), locale).toEqual([...HELP_KB_EN_SECTION_KEYS]);
    }
  });

  it('includes account_and_biography_model and offline_manual', () => {
    const md = fs.readFileSync(LOCALE_MD.en, 'utf8');
    expect(md).toContain('## account_and_biography_model');
    expect(md).toContain('## offline_manual');
    expect(md).toMatch(/one biography/i);
  });

  it('ogni sezione ha un public-title in ogni lingua', () => {
    for (const locale of KB_LOCALES) {
      const md = fs.readFileSync(LOCALE_MD[locale], 'utf8');
      const keys = Array.from(md.matchAll(/^## ([a-z][a-z0-9_]*)$/gm)).map((m) => m[1]);
      for (const key of keys) {
        const idx = md.indexOf(`## ${key}`);
        const next = md.indexOf('\n## ', idx + 1);
        const block = next === -1 ? md.slice(idx) : md.slice(idx, next);
        expect(block, `${locale}:${key}`).toMatch(/<!--\s*public-title:\s*.+?\s*-->/);
      }
    }
  });

  it('HELP_KB_SECTIONS has all locales for each key', () => {
    for (const section of HELP_KB_SECTIONS) {
      for (const locale of KB_LOCALES) {
        expect(section.content[locale]?.length ?? 0).toBeGreaterThan(20);
      }
    }
  });

  it('generated EN file is in sync with markdown RAG content', () => {
    const enGen = fs.readFileSync(
      path.join(ROOT, 'lib/agents/kb/help-kb-sections.en.generated.ts'),
      'utf8'
    );
    const md = fs.readFileSync(LOCALE_MD.en, 'utf8');
    const parsed = parsePlatformKb(md);
    for (const { sourceKey, content } of parsed) {
      expect(enGen).toContain(JSON.stringify(sourceKey));
      expect(enGen).toContain(content.slice(0, 40));
    }
  });

  it('manual-meta elenca le quattro lingue', () => {
    expect(Object.keys(MANUAL_META.languages).sort()).toEqual(['de', 'en', 'fr', 'it']);
    for (const locale of KB_LOCALES) {
      expect(MANUAL_META.languages[locale].hash.length).toBe(64);
      expect(
        fs.existsSync(path.join(ROOT, 'public/help', `biography-library-manual.${locale}.md`))
      ).toBe(true);
    }
  });

  it('writing_modes EN mentions turn off AI features', () => {
    const section = HELP_KB_SECTIONS.find((s) => s.sourceKey === 'writing_modes');
    expect(section?.content.en).toMatch(/turn off AI features/i);
  });

  it('translations locales no longer say captions are unwritable', () => {
    const section = HELP_KB_SECTIONS.find((s) => s.sourceKey === 'translations');
    expect(section).toBeTruthy();
    for (const locale of ['it', 'fr', 'de'] as const) {
      const text = section!.content[locale];
      expect(text).not.toMatch(/non si possono ancora scrivere|pas encore saisissables|noch nicht schreibbar/i);
      expect(text).toMatch(/Foto|Photos|Fotos/);
    }
  });
});
