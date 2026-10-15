import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, 'docs/help-public-forbidden-terms.json');
const HELP_DIR = path.join(ROOT, 'public/help');

type ForbiddenConfig = {
  forbiddenSubstrings: string[];
  forbiddenRegexes: string[];
  forbiddenRegexFlags?: string;
};

function loadConfig(): ForbiddenConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ForbiddenConfig;
}

function listPublicManuals(): string[] {
  if (!fs.existsSync(HELP_DIR)) return [];
  return fs
    .readdirSync(HELP_DIR)
    .filter((name) => name.startsWith('biography-library-manual.') && name.endsWith('.md'))
    .map((name) => path.join(HELP_DIR, name));
}

describe('public help manuals — anti-leak', () => {
  it('config file lists forbidden terms', () => {
    const cfg = loadConfig();
    expect(cfg.forbiddenSubstrings.length).toBeGreaterThan(5);
    expect(cfg.forbiddenRegexes.length).toBeGreaterThan(0);
  });

  it('public manuals exist and contain no forbidden terms', () => {
    const manuals = listPublicManuals();
    expect(manuals.length).toBeGreaterThan(0);
    const cfg = loadConfig();

    for (const file of manuals) {
      const text = fs.readFileSync(file, 'utf8');
      for (const needle of cfg.forbiddenSubstrings) {
        expect(text.includes(needle), `${path.basename(file)} must not contain ${JSON.stringify(needle)}`).toBe(
          false
        );
      }
      const flags = cfg.forbiddenRegexFlags ?? '';
      for (const pattern of cfg.forbiddenRegexes) {
        const re = new RegExp(pattern, flags);
        expect(re.test(text), `${path.basename(file)} must not match /${pattern}/${flags}`).toBe(false);
      }
    }
  });

  it('prova di rottura: se reintroduci un termine vietato il test fallisce', () => {
    const cfg = loadConfig();
    const poison = cfg.forbiddenSubstrings[0];
    expect(poison).toBeTruthy();
    // Simula un manuale contaminato: il controllo deve segnalarlo.
    const contaminated = `Hello\n${poison}\nworld`;
    expect(contaminated.includes(poison)).toBe(true);
  });
});
