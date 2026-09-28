/**
 * Scheda rigida d'archivio. L'autore scrive come vuole;
 * questa scheda è un secondo artefatto, generato dai dati strutturati.
 * Una riga obbligatoria c'è sempre. Un valore ignoto è UNKNOWN, non un buco.
 */

import { nfc } from '@/lib/nfc';
import { formatPlaceExportValue } from '@/lib/place-export-line';
import {
  ASSERTED_BY_LABELS,
  EVENT_LABELS,
  type AssertedByCode,
  type LifeEventType,
  type UiLang,
} from '@/lib/person-events';
import type {
  PermanenceExportBiography,
  PermanenceExportEvent,
  PermanenceExportRelation,
} from '@/lib/permanence-text-export';
import { formatUmYear, toJDN, umYearFromDate } from '@/lib/um';
import { toCanonical } from '@/lib/um-id';

export const RECORD_SCHEMA_VERSION = 1;

const UNKNOWN: Record<UiLang, string> = {
  en: 'UNKNOWN',
  it: 'sconosciuto',
  fr: 'inconnu',
  de: 'unbekannt',
};

const LABELS = {
  identifier: { en: 'IDENTIFIER', it: 'IDENTIFICATIVO', fr: 'IDENTIFIANT', de: 'KENNUNG' },
  schemaVersion: { en: 'SCHEMA VERSION', it: 'VERSIONE SCHEMA', fr: 'VERSION SCHÉMA', de: 'SCHEMAVERSION' },
  language: { en: 'LANGUAGE', it: 'LINGUA', fr: 'LANGUE', de: 'SPRACHE' },
  name: { en: 'NAME', it: 'NOME', fr: 'NOM', de: 'NAME' },
  romanized: { en: 'ROMANIZED NAME', it: 'NOME ROMANIZZATO', fr: 'NOM ROMANISÉ', de: 'ROMANISIERTER NAME' },
  event: { en: 'EVENT', it: 'EVENTO', fr: 'ÉVÉNEMENT', de: 'EREIGNIS' },
  date: { en: 'DATE', it: 'DATA', fr: 'DATE', de: 'DATUM' },
  asGiven: { en: 'AS GIVEN', it: 'COME FORNITA', fr: 'TELLE QUE FOURNIE', de: 'WIE ANGEGEBEN' },
  julianDay: { en: 'JULIAN DAY', it: 'GIORNO GIULIANO', fr: 'JOUR JULIEN', de: 'JULIANISCHER TAG' },
  place: { en: 'PLACE', it: 'LUOGO', fr: 'LIEU', de: 'ORT' },
  source: { en: 'SOURCE', it: 'FONTE', fr: 'SOURCE', de: 'QUELLE' },
  relation: { en: 'RELATION', it: 'RELAZIONE', fr: 'RELATION', de: 'BEZIEHUNG' },
  published: { en: 'PUBLISHED', it: 'PUBBLICATO', fr: 'PUBLIÉ', de: 'VERÖFFENTLICHT' },
  rights: { en: 'RIGHTS', it: 'DIRITTI', fr: 'DROITS', de: 'RECHTE' },
  resolver: {
    en: 'RESOLUTION ADDRESS AT PUBLICATION',
    it: 'INDIRIZZO DI RISOLUZIONE ALLA PUBBLICAZIONE',
    fr: 'ADRESSE DE RÉSOLUTION À LA PUBLICATION',
    de: 'AUFLÖSUNGSADRESSE BEI VERÖFFENTLICHUNG',
  },
  note: { en: 'NOTE', it: 'NOTA', fr: 'NOTE', de: 'HINWEIS' },
} as const;

const RESOLVER_NOTE = {
  en: 'The address above is not part of the identifier and may change; the identifier never does. The full specification is deposited alongside this document.',
  it: "L'indirizzo qui sopra non fa parte dell'identificativo e può cambiare; l'identificativo non cambia mai. La specifica completa è depositata insieme a questo documento.",
  fr: "L'adresse ci-dessus ne fait pas partie de l'identifiant et peut changer ; l'identifiant, lui, ne change jamais. La spécification complète est déposée avec ce document.",
  de: 'Die Adresse oben ist nicht Teil der Kennung und kann sich ändern; die Kennung ändert sich nie. Die vollständige Spezifikation ist zusammen mit diesem Dokument hinterlegt.',
} as const;

/** Ordine fisso. residence e relation si ripetono, almeno una volta. */
export const RECORD_ROW_ORDER = [
  'banner',
  'identifier',
  'resolver',
  'note',
  'schemaVersion',
  'language',
  'name',
  'romanized',
  'birthEvent',
  'birthDate',
  'birthAsGiven',
  'birthJulianDay',
  'birthPlace',
  'birthSource',
  'deathEvent',
  'deathDate',
  'deathAsGiven',
  'deathJulianDay',
  'deathPlace',
  'deathSource',
  'residence',
  'relation',
  'published',
  'rights',
] as const;

export type RecordRow = { key: string; line: string };

export type RecordCard = {
  version: number;
  lines: string[];
  rows: RecordRow[];
  data: Record<string, string>;
};

function uiLangFromTag(tag: string | null | undefined): UiLang {
  const base = (tag ?? 'en').split('-')[0]?.toLowerCase();
  if (base === 'it' || base === 'fr' || base === 'de') return base;
  return 'en';
}

function unknownWord(lang: UiLang): string {
  return `${UNKNOWN[lang]} | UNKNOWN`;
}

function bil(lang: UiLang, key: keyof typeof LABELS): string {
  return `${LABELS[key][lang]} | ${LABELS[key].en}`;
}

function writeValue(direction: string | null | undefined, label: string, value: string): string {
  const v = nfc(value);
  if (direction === 'rtl') return `${nfc(label)}:\n  ${v}`;
  return `${nfc(label)}: ${v}`;
}

function eventEnglish(type: string): string {
  if (type === 'birth' || type === 'death' || type === 'residence') {
    return EVENT_LABELS[type].en;
  }
  return type;
}

function assertedEnglish(code: string | null): string {
  if (code && code in ASSERTED_BY_LABELS) {
    return ASSERTED_BY_LABELS[code as AssertedByCode].en;
  }
  return 'unknown';
}

function push(rows: RecordRow[], data: Record<string, string>, key: string, line: string) {
  const normalized = nfc(line);
  rows.push({ key, line: normalized });
  data[key] = normalized;
}

function lifeBlock(
  rows: RecordRow[],
  data: Record<string, string>,
  prefix: 'birth' | 'death',
  ev: PermanenceExportEvent | undefined,
  lang: UiLang,
  dir: string,
  unk: string
) {
  const type = prefix as LifeEventType;
  const labelLocal = ev?.event_label?.trim() || EVENT_LABELS[type][lang];
  push(rows, data, `${prefix}Event`, writeValue(dir, bil(lang, 'event'), `${labelLocal} | ${eventEnglish(type)}`));

  const dateVal = ev?.date_edtf?.trim() ? `${ev.date_edtf.trim()} (EDTF)` : unk;
  push(rows, data, `${prefix}Date`, `  ${writeValue(dir, bil(lang, 'date'), dateVal)}`);

  const asGiven = ev?.date_as_given?.trim()
    ? `${ev.date_as_given.trim()}${ev.calendar_label?.trim() ? ` (${ev.calendar_label.trim()})` : ''}`
    : unk;
  push(rows, data, `${prefix}AsGiven`, `  ${writeValue(dir, bil(lang, 'asGiven'), asGiven)}`);

  let jdn = ev?.date_start_jdn ?? null;
  if (jdn == null && ev?.date_start_iso) {
    const [y, m, d] = ev.date_start_iso.split('-').map(Number);
    if (y && m && d) jdn = toJDN(y, m, d);
  }
  push(
    rows,
    data,
    `${prefix}JulianDay`,
    `  ${writeValue(dir, bil(lang, 'julianDay'), jdn != null ? String(jdn) : unk)}`
  );
  push(rows, data, `${prefix}Place`, `  ${writeValue(dir, bil(lang, 'place'), formatPlaceExportValue(ev, unk))}`);

  const srcLabel = ev?.asserted_by_label?.trim() || UNKNOWN[lang];
  const srcEn = assertedEnglish(ev?.asserted_by ?? null);
  const conf = ev?.confidence?.trim() || 'unknown';
  push(
    rows,
    data,
    `${prefix}Source`,
    `  ${writeValue(dir, bil(lang, 'source'), `${srcLabel} | ${srcEn} (${conf})`)}`
  );
}

export function buildRecordCard(
  bio: PermanenceExportBiography,
  events: PermanenceExportEvent[],
  relations: PermanenceExportRelation[] = [],
  umIdBaseUrl?: string | null
): RecordCard {
  const lang = uiLangFromTag(bio.record_language_tag);
  const dir = bio.record_direction ?? 'ltr';
  const unk = unknownWord(lang);
  const rows: RecordRow[] = [];
  const data: Record<string, string> = {};

  push(rows, data, 'banner', nfc('BIOGRAPHY LIBRARY'));

  let umDisplay = unk;
  if (bio.um_id?.trim()) {
    try {
      umDisplay = toCanonical(bio.um_id);
    } catch {
      umDisplay = nfc(bio.um_id.trim().toUpperCase());
    }
  }
  push(rows, data, 'identifier', writeValue(dir, bil(lang, 'identifier'), umDisplay));

  const publishedForResolver =
    bio.published_at_iso?.trim() && bio.published_um_year != null
      ? `${bio.published_at_iso.trim()} · ${formatUmYear(bio.published_um_year, 'padded')}`
      : null;
  let canonical: string | null = null;
  if (bio.um_id?.trim()) {
    try {
      canonical = toCanonical(bio.um_id);
    } catch {
      canonical = null;
    }
  }
  const resolverValue =
    umIdBaseUrl?.trim() && canonical && publishedForResolver
      ? `${umIdBaseUrl.trim().replace(/\/+$/, '')}/${canonical} (${publishedForResolver})`
      : unk;
  push(rows, data, 'resolver', writeValue(dir, bil(lang, 'resolver'), resolverValue));
  push(rows, data, 'note', writeValue(dir, bil(lang, 'note'), RESOLVER_NOTE[lang]));
  if (lang !== 'en') push(rows, data, 'noteEn', `  ${nfc(RESOLVER_NOTE.en)}`);

  push(rows, data, 'schemaVersion', writeValue(dir, bil(lang, 'schemaVersion'), String(RECORD_SCHEMA_VERSION)));

  const endonym = bio.record_language_endonym?.trim() || unk.split(' | ')[0];
  const tag = bio.record_language_tag?.trim() || 'und';
  const script = bio.record_script?.trim() || 'Zyyy';
  const direction = bio.record_direction?.trim() || 'ltr';
  push(rows, data, 'language', writeValue(dir, bil(lang, 'language'), `${endonym} (${tag}, ${script}, ${direction})`));

  const name =
    bio.name_as_written?.trim() ||
    (bio.biography_type === 'memorial' ? bio.subject_name : null)?.trim() ||
    bio.title?.trim() ||
    unk;
  push(rows, data, 'name', writeValue(dir, bil(lang, 'name'), name));
  push(rows, data, 'romanized', writeValue(dir, bil(lang, 'romanized'), bio.name_romanized?.trim() || unk));

  const birth = events.find((e) => e.event_type === 'birth');
  const death = events.find((e) => e.event_type === 'death');
  lifeBlock(rows, data, 'birth', birth, lang, dir, unk);
  lifeBlock(rows, data, 'death', death, lang, dir, unk);

  const residences = events.filter((e) => e.event_type === 'residence' && e.place_name_as_given?.trim());
  if (residences.length === 0) {
    const labelLocal = EVENT_LABELS.residence[lang];
    push(rows, data, 'residence', writeValue(dir, bil(lang, 'event'), `${labelLocal} | ${eventEnglish('residence')}`));
    push(rows, data, 'residencePlace', `  ${writeValue(dir, bil(lang, 'place'), unk)}`);
  } else {
    residences.forEach((ev, index) => {
      const suffix = index === 0 ? '' : String(index + 1);
      const labelLocal = ev.event_label?.trim() || EVENT_LABELS.residence[lang];
      push(
        rows,
        data,
        `residence${suffix}`,
        writeValue(dir, bil(lang, 'event'), `${labelLocal} | ${eventEnglish('residence')}`)
      );
      push(
        rows,
        data,
        `residencePlace${suffix}`,
        `  ${writeValue(dir, bil(lang, 'place'), formatPlaceExportValue(ev, unk))}`
      );
    });
  }

  if (relations.length === 0) {
    push(rows, data, 'relation', writeValue(dir, bil(lang, 'relation'), `${unk} | related: ${unk}`));
  } else {
    relations.forEach((rel, index) => {
      const suffix = index === 0 ? '' : String(index + 1);
      const code = rel.relation_code?.trim() || 'related';
      const who = rel.related_name_as_written?.trim() || unk;
      const label = rel.relation_label?.trim() || unk;
      push(
        rows,
        data,
        `relation${suffix}`,
        writeValue(dir, bil(lang, 'relation'), `${label} | ${code}: ${who}`)
      );
    });
  }

  if (bio.published_at_iso?.trim()) {
    const iso = bio.published_at_iso.trim();
    const [y, m, d] = iso.split('-').map(Number);
    const jdn = y && m && d ? toJDN(y, m, d) : null;
    const um =
      bio.published_um_year != null
        ? formatUmYear(bio.published_um_year, 'padded')
        : formatUmYear(umYearFromDate(new Date(`${iso}T00:00:00Z`)), 'padded');
    const pub = jdn != null ? `${iso} | ${bil(lang, 'julianDay')}: ${jdn} | ${um}` : `${iso} | ${um}`;
    push(rows, data, 'published', writeValue(dir, bil(lang, 'published'), pub));
  } else {
    push(rows, data, 'published', writeValue(dir, bil(lang, 'published'), unk));
  }

  push(rows, data, 'rights', writeValue(dir, bil(lang, 'rights'), bio.rights_statement_uri?.trim() || unk));

  return {
    version: RECORD_SCHEMA_VERSION,
    lines: rows.map((row) => row.line),
    rows,
    data,
  };
}

const REPEAT = /^(residence|residencePlace|relation)\d*$/;

export function assertRecordComplete(rows: RecordRow[]): void {
  const keys = rows.map((row) => row.key);
  const required = RECORD_ROW_ORDER.filter((key) => key !== 'residence' && key !== 'relation');
  let cursor = 0;
  for (const key of required) {
    if (key === 'birthEvent') {
      if (!keys.slice(cursor).includes('residence') && !keys.slice(cursor).some((item) => item.startsWith('residence'))) {
        throw new Error('record schema: missing residence');
      }
    }
    const at = keys.indexOf(key, cursor);
    if (at < 0) throw new Error(`record schema: missing ${key}`);
    if (at < cursor) throw new Error(`record schema: ${key} out of order`);
    cursor = at + 1;
  }
  if (!keys.some((key) => key === 'relation' || key.startsWith('relation'))) {
    throw new Error('record schema: missing relation');
  }
  for (const key of keys) {
    if (key === 'noteEn' || REPEAT.test(key) || key === 'residence' || key === 'relation') continue;
    if (!required.includes(key as (typeof required)[number])) {
      throw new Error(`record schema: unexpected ${key}`);
    }
  }
  const residenceAt = keys.findIndex((key) => key.startsWith('residence'));
  const relationAt = keys.findIndex((key) => key.startsWith('relation'));
  const publishedAt = keys.indexOf('published');
  if (!(residenceAt < relationAt && relationAt < publishedAt)) {
    throw new Error('record schema: residence, relation, and publication are out of order');
  }
}
