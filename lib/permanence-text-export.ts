/**
 * Export testo semplice UTF-8 per supporti fisici.
 * Intestazione chiave|valore in ordine fisso; campi mancanti = parola "sconosciuto"/UNKNOWN.
 * NFC su ogni stringa. RTL: valore a capo con rientro.
 */

import { saveAs } from 'file-saver';
import { nfc } from '@/lib/nfc';
import { formatPlaceExportValue } from '@/lib/place-export-line';
import { buildRecordCard } from '@/lib/record-schema';

export { formatPlaceExportValue };
import { formatUmYear, formatDateWithUmYear, toJDN, umYearFromDate } from '@/lib/um';
import { toCanonical } from '@/lib/um-id';
import { stripHtmlTags } from '@/lib/export-utils';
import { type UiLang } from '@/lib/person-events';
import { uiLangFromTag } from '@/lib/text-ui-lang';
import { formatBookPartsPlainText, type BookPart } from '@/lib/book-parts';

export { uiLangFromTag } from '@/lib/text-ui-lang';

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
  place_geonames_id?: number | string | null;
  place_wikidata_qid?: string | null;
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
  return buildRecordCard(bio, events, relations, umIdBaseUrl).lines;
}

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
 * Con `bookParts`, le parti front vanno dopo `---` e prima del corpo; le back dopo.
 * Senza parti (assenti o vuote) l'output è identico a prima.
 */
export function buildPermanencePlainText(
  bio: PermanenceExportBiography,
  events: PermanenceExportEvent[],
  relations: PermanenceExportRelation[] = [],
  sectionBodies?: string[],
  umIdBaseUrl?: string | null,
  bookParts?: { front: BookPart[]; back: BookPart[] } | null
): string {
  const lines = buildPermanenceHeaderLines(bio, events, relations, umIdBaseUrl);
  lines.push('---');
  const tag = bio.record_language_tag;
  const front =
    bookParts?.front?.length ? formatBookPartsPlainText(bookParts.front, tag) : '';
  const body = nfc(buildBodyText(bio, sectionBodies).trim());
  const back =
    bookParts?.back?.length ? formatBookPartsPlainText(bookParts.back, tag) : '';
  const segments = [front, body, back].filter((s) => s.length > 0);
  if (segments.length) lines.push(segments.join('\n\n'));
  return lines.join('\n') + '\n';
}

export async function downloadPermanencePlainText(
  bio: PermanenceExportBiography,
  events: PermanenceExportEvent[],
  relations: PermanenceExportRelation[] = [],
  sectionBodies?: string[],
  umIdBaseUrl?: string | null,
  bookParts?: { front: BookPart[]; back: BookPart[] } | null
): Promise<void> {
  const text = buildPermanencePlainText(
    bio,
    events,
    relations,
    sectionBodies,
    umIdBaseUrl,
    bookParts
  );
  const date = new Date().toISOString().split('T')[0];
  const base = (bio.name_as_written || bio.title || 'biography')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${base || 'biography'}_${date}.txt`);
}
