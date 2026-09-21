/**
 * Export testo semplice UTF-8 per supporti fisici.
 * Intestazione chiave|valore in ordine fisso; campi mancanti = parola "sconosciuto"/UNKNOWN.
 * NFC su ogni stringa. RTL: valore a capo con rientro.
 */

import { saveAs } from 'file-saver';
import { nfc } from '@/lib/nfc';
import { formatUmYear, formatDateWithUmYear, toJDN, umYearFromDate } from '@/lib/um';
import { toCanonical } from '@/lib/um-id';
import { stripHtmlTags } from '@/lib/export-utils';
import {
  ASSERTED_BY_LABELS,
  EVENT_LABELS,
  type AssertedByCode,
  type LifeEventType,
  type UiLang,
} from '@/lib/person-events';

const UNKNOWN: Record<UiLang, string> = {
  en: 'UNKNOWN',
  it: 'sconosciuto',
  fr: 'inconnu',
  de: 'unbekannt',
};

const LABELS = {
  identifier: { en: 'IDENTIFIER', it: 'IDENTIFICATIVO', fr: 'IDENTIFIANT', de: 'KENNUNG' },
  schemaVersion: {
    en: 'SCHEMA VERSION',
    it: 'VERSIONE SCHEMA',
    fr: 'VERSION SCHÉMA',
    de: 'SCHEMAVERSION',
  },
  language: { en: 'LANGUAGE', it: 'LINGUA', fr: 'LANGUE', de: 'SPRACHE' },
  name: { en: 'NAME', it: 'NOME', fr: 'NOM', de: 'NAME' },
  romanized: {
    en: 'ROMANIZED NAME',
    it: 'NOME ROMANIZZATO',
    fr: 'NOM ROMANISÉ',
    de: 'ROMANISIERTER NAME',
  },
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

/**
 * Nota che accompagna l'indirizzo di risoluzione. Specifica §9: la stringa è
 * l'identificativo, il dominio è soltanto lo strumento con cui oggi la si
 * consulta. Chi legge fra cent'anni e trova l'indirizzo morto deve capire che a
 * mancare è il servizio, non l'identità.
 */
const RESOLVER_NOTE = {
  en: 'The address above is not part of the identifier and may change; the identifier never does. The full specification is deposited alongside this document.',
  it: "L'indirizzo qui sopra non fa parte dell'identificativo e può cambiare; l'identificativo non cambia mai. La specifica completa è depositata insieme a questo documento.",
  fr: "L'adresse ci-dessus ne fait pas partie de l'identifiant et peut changer ; l'identifiant, lui, ne change jamais. La spécification complète est déposée avec ce document.",
  de: 'Die Adresse oben ist nicht Teil der Kennung und kann sich ändern; die Kennung ändert sich nie. Die vollständige Spezifikation ist zusammen mit diesem Dokument hinterlegt.',
} as const;

export type PermanenceExportEvent = {
  event_type: string;
  event_label: string;
  date_edtf: string | null;
  date_as_given: string | null;
  calendar_label: string | null;
  date_start_iso: string | null;
  date_start_jdn: number | null;
  place_name_as_given: string | null;
  place_lat: number | string | null;
  place_lon: number | string | null;
  asserted_by: string | null;
  asserted_by_label: string | null;
  confidence: string | null;
};

export type PermanenceExportRelation = {
  relation_code: string | null;
  relation_label: string;
  related_name_as_written: string | null;
};

export type PermanenceExportBiography = {
  um_id: string | null;
  schema_version: number | null;
  record_language_tag: string | null;
  record_script: string | null;
  record_direction: string | null;
  record_language_endonym: string | null;
  name_as_written: string | null;
  name_romanized: string | null;
  title: string;
  author_name: string | null;
  subject_name: string | null;
  biography_type: string | null;
  published_at_iso: string | null;
  published_um_year: number | null;
  rights_statement_uri: string | null;
  content_freeflow?: string | null;
  final_version?: string | null;
  biography_mode?: string | null;
  content?: Record<string, { text: string }>;
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
  if (direction === 'rtl') {
    return `${nfc(label)}:\n  ${v}`;
  }
  return `${nfc(label)}: ${v}`;
}

/**
 * Righe dell'indirizzo di risoluzione: l'indirizzo datato, e la nota che lo
 * distingue dall'identità (specifica §9).
 *
 * Senza data di pubblicazione non si emette nulla. Un indirizzo scritto al
 * presente e non datato comunica l'opposto di quel che serve, cioè che sia
 * permanente quanto l'identificativo; chi lo trova morto fra cent'anni deve
 * poter capire che a mancare è il servizio, non l'identità.
 */
/** Forma canonica dell'identificativo, o null se assente o malformato. */
function canonicalUmId(umId: string | null | undefined): string | null {
  if (!umId?.trim()) return null;
  try {
    return toCanonical(umId);
  } catch {
    return null;
  }
}

function resolverLines(
  lang: UiLang,
  direction: string | null | undefined,
  umIdBaseUrl: string | null | undefined,
  canonicalUmId: string | null,
  publishedLabel: string | null
): string[] {
  if (!umIdBaseUrl?.trim() || !canonicalUmId || !publishedLabel?.trim()) return [];
  const url = `${umIdBaseUrl.trim().replace(/\/+$/, '')}/${canonicalUmId}`;
  const out = [
    writeValue(direction, bil(lang, 'resolver'), `${url} (${publishedLabel})`),
    writeValue(direction, bil(lang, 'note'), RESOLVER_NOTE[lang]),
  ];
  if (lang !== 'en') out.push(`  ${nfc(RESOLVER_NOTE.en)}`);
  return out;
}

function fmtCoord(n: number | string | null | undefined): string | null {
  if (n === null || n === undefined || n === '') return null;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(6);
}

function eventEnglish(type: string): string {
  if (type === 'birth' || type === 'death') {
    return EVENT_LABELS[type as LifeEventType].en;
  }
  return type;
}

function assertedEnglish(code: string | null): string {
  if (code && code in ASSERTED_BY_LABELS) {
    return ASSERTED_BY_LABELS[code as AssertedByCode].en;
  }
  return 'unknown';
}

function buildBodyText(bio: PermanenceExportBiography, sectionBodies?: string[]): string {
  if (bio.final_version?.trim()) {
    return stripHtmlTags(bio.final_version);
  }
  if (bio.biography_mode === 'freeflow' || bio.content_freeflow?.trim()) {
    return stripHtmlTags(bio.content_freeflow || '');
  }
  if (sectionBodies && sectionBodies.length > 0) {
    return sectionBodies.map((s) => stripHtmlTags(s)).join('\n\n');
  }
  if (bio.content) {
    return Object.values(bio.content)
      .map((c) => stripHtmlTags(c?.text || ''))
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

/**
 * Costruisce le sole righe di intestazione invariante (senza corpo).
 */
export function buildPermanenceHeaderLines(
  bio: PermanenceExportBiography,
  events: PermanenceExportEvent[],
  relations: PermanenceExportRelation[] = [],
  umIdBaseUrl?: string | null
): string[] {
  const lang = uiLangFromTag(bio.record_language_tag);
  const dir = bio.record_direction ?? 'ltr';
  const unk = unknownWord(lang);
  const lines: string[] = [];

  lines.push(nfc('BIOGRAPHY LIBRARY'));

  let umDisplay = unk;
  if (bio.um_id?.trim()) {
    try {
      umDisplay = toCanonical(bio.um_id);
    } catch {
      umDisplay = nfc(bio.um_id.trim().toUpperCase());
    }
  }
  lines.push(writeValue(dir, bil(lang, 'identifier'), umDisplay));

  // Forma neutra rispetto alla lingua: ISO piu' anno UM, come il resto dell'intestazione.
  const publishedForResolver =
    bio.published_at_iso?.trim() && bio.published_um_year != null
      ? `${bio.published_at_iso.trim()} · ${formatUmYear(bio.published_um_year, 'padded')}`
      : null;
  lines.push(
    ...resolverLines(lang, dir, umIdBaseUrl, canonicalUmId(bio.um_id), publishedForResolver)
  );

  lines.push(
    writeValue(dir, bil(lang, 'schemaVersion'), String(bio.schema_version ?? 2))
  );

  const endonym = bio.record_language_endonym?.trim() || unk.split(' | ')[0];
  const tag = bio.record_language_tag?.trim() || 'und';
  const script = bio.record_script?.trim() || 'Zyyy';
  const direction = bio.record_direction?.trim() || 'ltr';
  lines.push(
    writeValue(dir, bil(lang, 'language'), `${endonym} (${tag}, ${script}, ${direction})`)
  );

  const name =
    bio.name_as_written?.trim() ||
    (bio.biography_type === 'memorial' ? bio.subject_name : null)?.trim() ||
    bio.title?.trim() ||
    unk;
  lines.push(writeValue(dir, bil(lang, 'name'), name));

  const romanized = bio.name_romanized?.trim() || unk;
  lines.push(writeValue(dir, bil(lang, 'romanized'), romanized));

  const orderedEvents = [...events].sort((a, b) => {
    const order = (t: string) => (t === 'birth' ? 0 : t === 'death' ? 1 : 2);
    return order(a.event_type) - order(b.event_type);
  });

  const ensureTypes: LifeEventType[] = ['birth', 'death'];
  for (const type of ensureTypes) {
    const ev = orderedEvents.find((e) => e.event_type === type);
    const labelLocal = ev?.event_label?.trim() || EVENT_LABELS[type][lang];
    lines.push(
      writeValue(dir, bil(lang, 'event'), `${labelLocal} | ${eventEnglish(type)}`)
    );

    const dateVal = ev?.date_edtf?.trim() ? `${ev.date_edtf.trim()} (EDTF)` : unk;
    lines.push(`  ${writeValue(dir, bil(lang, 'date'), dateVal)}`);

    if (ev?.date_as_given?.trim()) {
      const cal = ev.calendar_label?.trim() ? ` (${ev.calendar_label.trim()})` : '';
      lines.push(
        `  ${writeValue(dir, bil(lang, 'asGiven'), `${ev.date_as_given.trim()}${cal}`)}`
      );
    }

    let jdn = ev?.date_start_jdn ?? null;
    if (jdn == null && ev?.date_start_iso) {
      const [y, m, d] = ev.date_start_iso.split('-').map(Number);
      if (y && m && d) jdn = toJDN(y, m, d);
    }
    lines.push(
      `  ${writeValue(dir, bil(lang, 'julianDay'), jdn != null ? String(jdn) : unk)}`
    );

    const placeName = ev?.place_name_as_given?.trim();
    const lat = fmtCoord(ev?.place_lat);
    const lon = fmtCoord(ev?.place_lon);
    let placeVal = unk;
    if (placeName && lat && lon) {
      // Recurring pattern: name | latitude | longitude | datum. WGS 84 is
      // what GeoNames and Nominatim emit; six decimal places match numeric(9,6).
      placeVal = `${placeName} | ${lat} | ${lon} (WGS 84)`;
    } else if (placeName) {
      placeVal = placeName;
    }
    lines.push(`  ${writeValue(dir, bil(lang, 'place'), placeVal)}`);

    const srcLabel = ev?.asserted_by_label?.trim() || UNKNOWN[lang];
    const srcEn = assertedEnglish(ev?.asserted_by ?? null);
    const conf = ev?.confidence?.trim() || 'unknown';
    lines.push(
      `  ${writeValue(dir, bil(lang, 'source'), `${srcLabel} | ${srcEn} (${conf})`)}`
    );
  }

  for (const rel of relations) {
    const code = rel.relation_code?.trim() || 'related';
    const who = rel.related_name_as_written?.trim() || unk;
    lines.push(
      writeValue(
        dir,
        bil(lang, 'relation'),
        `${rel.relation_label.trim()} | ${code}: ${who}`
      )
    );
  }

  if (bio.published_at_iso?.trim()) {
    const iso = bio.published_at_iso.trim();
    const [y, m, d] = iso.split('-').map(Number);
    const jdn = y && m && d ? toJDN(y, m, d) : null;
    const um =
      bio.published_um_year != null
        ? formatUmYear(bio.published_um_year, 'padded')
        : formatUmYear(umYearFromDate(new Date(`${iso}T00:00:00Z`)), 'padded');
    const pub =
      jdn != null
        ? `${iso} | ${bil(lang, 'julianDay')}: ${jdn} | ${um}`
        : `${iso} | ${um}`;
    lines.push(writeValue(dir, bil(lang, 'published'), pub));
  } else {
    lines.push(writeValue(dir, bil(lang, 'published'), unk));
  }

  lines.push(
    writeValue(dir, bil(lang, 'rights'), bio.rights_statement_uri?.trim() || unk)
  );

  return lines.map((l) => nfc(l));
}

/**
 * Colophon breve: pubblicazione in doppia notazione + identificativo UM.
 * `yearWord` = Anno / Year / An / Jahr (da i18n, non hardcodato qui).
 */
export function buildColophonLines(
  bio: PermanenceExportBiography,
  yearWord: string,
  locale = 'en',
  umIdBaseUrl?: string | null
): string[] {
  const lang = uiLangFromTag(bio.record_language_tag);
  const unk = unknownWord(lang);
  const lines: string[] = [nfc('BIOGRAPHY LIBRARY'), ''];

  let published = unk;
  if (bio.published_at_iso?.trim()) {
    const iso = bio.published_at_iso.trim();
    try {
      const dual = formatDateWithUmYear(iso, locale, 'day', yearWord);
      const umPadded =
        bio.published_um_year != null
          ? formatUmYear(bio.published_um_year, 'padded')
          : formatUmYear(umYearFromDate(new Date(`${iso}T00:00:00Z`)), 'padded');
      published = `${dual} · ${umPadded}`;
    } catch {
      published = iso;
    }
  }
  lines.push(writeValue('ltr', bil(lang, 'published'), published));

  let umDisplay = unk;
  if (bio.um_id?.trim()) {
    try {
      umDisplay = toCanonical(bio.um_id);
    } catch {
      umDisplay = nfc(bio.um_id.trim().toUpperCase());
    }
  }
  lines.push(writeValue('ltr', bil(lang, 'identifier'), umDisplay));
  lines.push(
    ...resolverLines(
      lang,
      'ltr',
      umIdBaseUrl,
      canonicalUmId(bio.um_id),
      published === unk ? null : published
    )
  );

  if (bio.rights_statement_uri?.trim()) {
    lines.push(writeValue('ltr', bil(lang, 'rights'), bio.rights_statement_uri.trim()));
  }

  return lines.map((l) => nfc(l));
}

/**
 * Costruisce il documento testo semplice completo (intestazione + corpo).
 */
export function buildPermanencePlainText(
  bio: PermanenceExportBiography,
  events: PermanenceExportEvent[],
  relations: PermanenceExportRelation[] = [],
  sectionBodies?: string[],
  umIdBaseUrl?: string | null
): string {
  const lines = buildPermanenceHeaderLines(bio, events, relations, umIdBaseUrl);
  lines.push('---');
  const body = nfc(buildBodyText(bio, sectionBodies).trim());
  if (body) lines.push(body);
  return lines.join('\n') + '\n';
}

export async function downloadPermanencePlainText(
  bio: PermanenceExportBiography,
  events: PermanenceExportEvent[],
  relations: PermanenceExportRelation[] = [],
  sectionBodies?: string[],
  umIdBaseUrl?: string | null
): Promise<void> {
  const text = buildPermanencePlainText(bio, events, relations, sectionBodies, umIdBaseUrl);
  const date = new Date().toISOString().split('T')[0];
  const base = (bio.name_as_written || bio.title || 'biography')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${base || 'biography'}_${date}.txt`);
}
