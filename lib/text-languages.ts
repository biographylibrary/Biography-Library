/**
 * Lingua del testo di un'edizione (BCP 47).
 * Distinta dalla lingua dell'interfaccia, che resta en/it/fr/de.
 *
 * L'elenco è ISO 639-1 più le lingue minori chieste per gli autori
 * (gsw, lij, lmo, fur, nap, vec). Romansh (rm) e sardo (sc) sono già in 639-1.
 */

const ISO_639_1 = `
aa ab ae af ak am an ar as av ay az
ba be bg bh bi bm bn bo br bs
ca ce ch co cr cs cu cv cy
da de dv dz
ee el en eo es et eu
fa ff fi fj fo fr fy
ga gd gl gn gu gv
ha he hi ho hr ht hu hy hz
ia id ie ig ii ik io is it iu
ja jv
ka kg ki kj kk kl km kn ko kr ks ku kv kw ky
la lb lg li ln lo lt lu lv
mg mh mi mk ml mn mr ms mt my
na nb nd ne ng nl nn no nr nv ny
oc oj om or os
pa pi pl ps pt
qu
rm rn ro ru rw
sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw
ta te tg th ti tk tl tn to tr ts tt tw ty
ug uk ur uz
ve vi vo
wa wo
xh
yi yo
za zh zu
`.trim().split(/\s+/);

/** Lingue oltre ISO 639-1 che un autore può voler usare. */
const MINORITY = ['fur', 'gsw', 'lij', 'lmo', 'nap', 'vec'] as const;

const BASES = new Set<string>([...ISO_639_1, ...MINORITY]);

export const TEXT_LANGUAGE_BASES: readonly string[] = Array.from(BASES).sort();

const RTL_SCRIPTS = new Set(['Adlm', 'Arab', 'Hebr', 'Mand', 'Nkoo', 'Rohg', 'Syrc', 'Thaa']);

function canonicalLocales(tag: string): string[] {
  const intl = Intl as typeof Intl & {
    getCanonicalLocales?: (locales: string | readonly string[]) => string[];
  };
  if (typeof intl.getCanonicalLocales !== 'function') {
    throw new Error('Intl.getCanonicalLocales is unavailable');
  }
  return intl.getCanonicalLocales(tag);
}

export type TextLanguageIdentity = {
  tag: string;
  script: string;
  direction: 'ltr' | 'rtl';
  endonym: string;
};

export function isTextLanguageBase(code: string): boolean {
  return BASES.has(code.toLowerCase());
}

/**
 * Forma canonica (`Intl.getCanonicalLocales`).
 * Il sottotag regionale è facoltativo (`pt-BR`). Rifiuta basi fuori elenco.
 */
export function canonicalizeTextLanguage(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  let canonical: string;
  try {
    const locales = canonicalLocales(raw);
    canonical = locales[0];
  } catch {
    return null;
  }
  if (!canonical) return null;
  const [base, region, extra] = canonical.split('-');
  if (!base || !BASES.has(base.toLowerCase())) return null;
  if (extra) return null;
  if (region && !/^[A-Z]{2}$/.test(region) && !/^[A-Z][a-z]{3}$/.test(region)) return null;
  return region ? `${base}-${region}` : base;
}

export function textLanguageIdentity(input: string | null | undefined): TextLanguageIdentity | null {
  const tag = canonicalizeTextLanguage(input);
  if (!tag) return null;
  let script = 'Zyyy';
  try {
    const maximized = new Intl.Locale(tag).maximize();
    if (maximized.script) script = maximized.script;
  } catch {
    script = 'Zyyy';
  }
  const direction = RTL_SCRIPTS.has(script) ? 'rtl' : 'ltr';
  let endonym = tag;
  try {
    endonym = new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? tag;
  } catch {
    endonym = tag;
  }
  return { tag, script, direction, endonym };
}

export function textLanguageLabels(
  tag: string,
  uiLanguage: string
): { own: string; inUi: string } {
  const own = safeDisplayName(tag, tag);
  const inUi = safeDisplayName(uiLanguage, tag);
  return { own, inUi };
}

function safeDisplayName(locale: string, tag: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/** Vero se il nome cercato, in una delle quattro lingue dell'interfaccia, nella lingua stessa o come codice, corrisponde. */
export function textLanguageMatchesQuery(tag: string, query: string, uiLanguages: readonly string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (tag.toLowerCase() === q || tag.toLowerCase().startsWith(`${q}-`) || tag.split('-')[0] === q) return true;
  const own = textLanguageLabels(tag, tag).own.toLowerCase();
  if (own.includes(q)) return true;
  for (const ui of uiLanguages) {
    if (textLanguageLabels(tag, ui).inUi.toLowerCase().includes(q)) return true;
  }
  return false;
}
