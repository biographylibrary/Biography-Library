import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HELP_KB_SECTIONS, KB_LOCALES } from '@/lib/agents/kb/help-kb-sections';
import { HELP_KB_EN_SECTION_KEYS } from '@/lib/agents/kb/help-kb-sections.en.generated';

const ROOT = path.resolve(__dirname, '../..');
const MD_PATH = path.join(ROOT, 'docs/PLATFORM_KB.md');

function parsePlatformKb(markdown: string) {
  const sections: { sourceKey: string; content: string }[] = [];
  const lines = markdown.split('\n');
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentKey) return;
    const content = currentLines.join('\n').trim();
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

describe('PLATFORM_KB.md sync', () => {
  it('markdown sections match generated EN keys', () => {
    const md = fs.readFileSync(MD_PATH, 'utf8');
    const parsed = parsePlatformKb(md);
    expect(parsed.length).toBeGreaterThanOrEqual(10);
    expect(parsed.map((s) => s.sourceKey)).toEqual([...HELP_KB_EN_SECTION_KEYS]);
  });

  it('includes account_and_biography_model section', () => {
    const md = fs.readFileSync(MD_PATH, 'utf8');
    expect(md).toContain('## account_and_biography_model');
    expect(md).toMatch(/one biography/i);
  });

  it('HELP_KB_SECTIONS has all locales for each key', () => {
    for (const section of HELP_KB_SECTIONS) {
      for (const locale of KB_LOCALES) {
        expect(section.content[locale]?.length ?? 0).toBeGreaterThan(20);
      }
    }
  });

  it('generated files are in sync with markdown', () => {
    const enGen = fs.readFileSync(
      path.join(ROOT, 'lib/agents/kb/help-kb-sections.en.generated.ts'),
      'utf8'
    );
    const md = fs.readFileSync(MD_PATH, 'utf8');
    const parsed = parsePlatformKb(md);
    for (const { sourceKey, content } of parsed) {
      expect(enGen).toContain(JSON.stringify(sourceKey));
      expect(enGen).toContain(content.slice(0, 40));
    }
  });
});
