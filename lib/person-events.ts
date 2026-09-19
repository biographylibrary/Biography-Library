/**
 * Tipi e helper per person_events (nascita/morte in v1).
 * Codice + etichetta leggibile nella lingua della scheda (principio 1).
 */

import { dateInputToEdtf, edtfToDateInput, type DateInputState } from '@/lib/date-input';
import { nfcNullable, nfcTrim } from '@/lib/nfc';

export type LifeEventType = 'birth' | 'death';

export type AssertedByCode =
  | 'self'
  | 'family'
  | 'document'
  | 'institution'
  | 'unknown';

export type ConfidenceCode = 'certain' | 'probable' | 'uncertain' | 'unknown';

export type PlaceSelection = {
  nameAsGiven: string;
  nameCurrent: string | null;
  lat: number | null;
  lon: number | null;
  geonamesId: number | null;
  wikidataQid: string | null;
};

export type EventFormState = {
  id: string | null;
  date: DateInputState;
  /** Forma originale libera (opzionale; se vuota usa asGiven da EDTF). */
  dateAsGivenFree: string;
  place: PlaceSelection | null;
  placeQuery: string;
  assertedBy: AssertedByCode;
  sourceNote: string;
  confidence: ConfidenceCode;
};

export const EMPTY_PLACE: PlaceSelection = {
  nameAsGiven: '',
  nameCurrent: null,
  lat: null,
  lon: null,
  geonamesId: null,
  wikidataQid: null,
};

export function emptyEventForm(): EventFormState {
  return {
    id: null,
    date: { precision: 'unknown', year: '', month: '', day: '' },
    dateAsGivenFree: '',
    place: null,
    placeQuery: '',
    assertedBy: 'unknown',
    sourceNote: '',
    confidence: 'unknown',
  };
}

/** Etichette evento in inglese (sempre nello export) e per lingua scheda. */
export const EVENT_LABELS: Record<
  LifeEventType,
  Record<'en' | 'it' | 'fr' | 'de', string>
> = {
  birth: { en: 'birth', it: 'nascita', fr: 'naissance', de: 'Geburt' },
  death: { en: 'death', it: 'morte', fr: 'décès', de: 'Tod' },
};

export const ASSERTED_BY_LABELS: Record<
  AssertedByCode,
  Record<'en' | 'it' | 'fr' | 'de', string>
> = {
  self: { en: 'the person', it: 'la persona stessa', fr: 'la personne elle-même', de: 'die Person selbst' },
  family: { en: 'family', it: 'un familiare', fr: 'un proche', de: 'ein Angehöriger' },
  document: { en: 'a document', it: 'un documento', fr: 'un document', de: 'ein Dokument' },
  institution: { en: 'an institution', it: 'un\'istituzione', fr: 'une institution', de: 'eine Institution' },
  unknown: { en: 'unknown', it: 'sconosciuto', fr: 'inconnu', de: 'unbekannt' },
};

export type UiLang = 'en' | 'it' | 'fr' | 'de';

export function eventLabel(type: LifeEventType, lang: UiLang): string {
  return EVENT_LABELS[type][lang] ?? EVENT_LABELS[type].en;
}

export function assertedByLabel(code: AssertedByCode, lang: UiLang): string {
  return ASSERTED_BY_LABELS[code][lang] ?? ASSERTED_BY_LABELS[code].en;
}

export type PersonEventRow = {
  id?: string;
  biography_id: string;
  event_type: LifeEventType;
  event_label: string;
  sequence: number;
  date_edtf: string | null;
  date_as_given: string | null;
  calendar_code: string | null;
  calendar_label: string | null;
  date_start_iso: string | null;
  date_end_iso: string | null;
  place_name_as_given: string | null;
  place_name_current: string | null;
  place_lat: number | null;
  place_lon: number | null;
  place_geonames_id: number | null;
  place_wikidata_qid: string | null;
  asserted_by: string | null;
  asserted_by_label: string | null;
  source_note: string | null;
  confidence: ConfidenceCode | null;
};

export function buildEventRow(params: {
  biographyId: string;
  type: LifeEventType;
  form: EventFormState;
  recordLang: UiLang;
  existingId?: string | null;
}): PersonEventRow {
  const { biographyId, type, form, recordLang, existingId } = params;
  const derived = dateInputToEdtf(form.date);
  const freeAsGiven = nfcNullable(form.dateAsGivenFree);
  const asGiven = freeAsGiven ?? derived.asGiven;

  const placeName =
    nfcNullable(form.place?.nameAsGiven) ??
    nfcNullable(form.placeQuery) ??
    null;

  return {
    ...(existingId || form.id ? { id: existingId || form.id || undefined } : {}),
    biography_id: biographyId,
    event_type: type,
    event_label: eventLabel(type, recordLang),
    sequence: type === 'birth' ? 0 : 1,
    date_edtf: derived.edtf,
    date_as_given: asGiven,
    calendar_code: derived.edtf ? 'gregorian' : null,
    calendar_label:
      derived.edtf
        ? ({ en: 'Gregorian', it: 'gregoriano', fr: 'grégorien', de: 'gregorianisch' } as const)[
            recordLang
          ]
        : null,
    date_start_iso: derived.startIso,
    date_end_iso: derived.endIso,
    place_name_as_given: placeName,
    place_name_current: nfcNullable(form.place?.nameCurrent) ?? placeName,
    place_lat: form.place?.lat ?? null,
    place_lon: form.place?.lon ?? null,
    place_geonames_id: form.place?.geonamesId ?? null,
    place_wikidata_qid: nfcNullable(form.place?.wikidataQid),
    asserted_by: form.assertedBy,
    asserted_by_label: assertedByLabel(form.assertedBy, recordLang),
    source_note: nfcNullable(form.sourceNote),
    confidence: form.confidence,
  };
}

export function rowToForm(row: {
  id: string;
  date_edtf?: string | null;
  date_as_given?: string | null;
  place_name_as_given?: string | null;
  place_name_current?: string | null;
  place_lat?: number | string | null;
  place_lon?: number | string | null;
  place_geonames_id?: number | null;
  place_wikidata_qid?: string | null;
  asserted_by?: string | null;
  source_note?: string | null;
  confidence?: string | null;
}): EventFormState {
  const date = edtfToDateInput(row.date_edtf, row.date_as_given);
  const lat =
    row.place_lat === null || row.place_lat === undefined
      ? null
      : Number(row.place_lat);
  const lon =
    row.place_lon === null || row.place_lon === undefined
      ? null
      : Number(row.place_lon);
  const hasPlace = Boolean(row.place_name_as_given?.trim());
  const asserted = (['self', 'family', 'document', 'institution', 'unknown'] as const).includes(
    row.asserted_by as AssertedByCode
  )
    ? (row.asserted_by as AssertedByCode)
    : 'unknown';
  const confidence = (['certain', 'probable', 'uncertain', 'unknown'] as const).includes(
    row.confidence as ConfidenceCode
  )
    ? (row.confidence as ConfidenceCode)
    : 'unknown';

  return {
    id: row.id,
    date,
    dateAsGivenFree:
      row.date_as_given && row.date_as_given !== row.date_edtf
        ? nfcTrim(row.date_as_given)
        : '',
    place: hasPlace
      ? {
          nameAsGiven: nfcTrim(row.place_name_as_given),
          nameCurrent: nfcNullable(row.place_name_current),
          lat: Number.isFinite(lat) ? lat : null,
          lon: Number.isFinite(lon) ? lon : null,
          geonamesId: row.place_geonames_id ?? null,
          wikidataQid: row.place_wikidata_qid ?? null,
        }
      : null,
    placeQuery: hasPlace ? nfcTrim(row.place_name_as_given) : '',
    assertedBy: asserted,
    sourceNote: row.source_note ?? '',
    confidence,
  };
}
