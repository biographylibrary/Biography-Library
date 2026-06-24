import Hypher from 'hypher';
import enUs from 'hyphenation.en-us';
import it from 'hyphenation.it';
import de from 'hyphenation.de';
import fr from 'hyphenation.fr';

const PATTERNS: Record<string, object> = {
  en: enUs,
  it,
  de,
  fr,
};

const instances = new Map<string, Hypher>();

/** Map biography `content_language` to a supported hyphenation pattern. */
export function normalizePdfLanguage(code: string | undefined | null): string {
  const base = (code ?? 'en').toLowerCase().split(/[-_]/)[0];
  return base in PATTERNS ? base : 'en';
}

export function getHypher(language: string): Hypher {
  const key = normalizePdfLanguage(language);
  let instance = instances.get(key);
  if (!instance) {
    instance = new Hypher(PATTERNS[key]);
    instances.set(key, instance);
  }
  return instance;
}

/** Split a word into hyphenation syllables; returns `[word]` when no break is found. */
export function hyphenateWordSyllables(word: string, language: string): string[] {
  const leading = word.match(/^[^\p{L}\p{N}]+/u)?.[0] ?? '';
  const trailing = word.match(/[^\p{L}\p{N}]+$/u)?.[0] ?? '';
  const core = word.slice(leading.length, word.length - trailing.length);
  if (!core) return [word];

  try {
    const parts = getHypher(language).hyphenate(core);
    if (!parts || parts.length <= 1) return [word];
    parts[0] = leading + parts[0];
    parts[parts.length - 1] = parts[parts.length - 1] + trailing;
    return parts;
  } catch {
    return [word];
  }
}
