/**
 * Relazioni familiari/sociali: relation_label è autorevole; relation_code è orientativo.
 */

import { nfcNullable, nfcTrim } from '@/lib/nfc';
import { assertedByLabel, type AssertedByCode, type ConfidenceCode, type UiLang } from '@/lib/person-events';

export type RelationCode =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'other';

export type RelationFormState = {
  id: string | null;
  relationCode: RelationCode;
  relationLabel: string;
  relatedName: string;
  relatedUmId: string;
  assertedBy: AssertedByCode;
  sourceNote: string;
  confidence: ConfidenceCode;
};

export const RELATION_CODE_LABELS: Record<
  RelationCode,
  Record<UiLang, string>
> = {
  parent: { en: 'parent', it: 'genitore', fr: 'parent', de: 'Elternteil' },
  child: { en: 'child', it: 'figlio/a', fr: 'enfant', de: 'Kind' },
  sibling: { en: 'sibling', it: 'fratello/sorella', fr: 'frère/sœur', de: 'Geschwister' },
  spouse: { en: 'spouse', it: 'coniuge', fr: 'conjoint', de: 'Ehepartner' },
  other: { en: 'other', it: 'altro', fr: 'autre', de: 'andere' },
};

export function emptyRelationForm(lang: UiLang = 'en'): RelationFormState {
  return {
    id: null,
    relationCode: 'other',
    relationLabel: RELATION_CODE_LABELS.other[lang],
    relatedName: '',
    relatedUmId: '',
    assertedBy: 'unknown',
    sourceNote: '',
    confidence: 'unknown',
  };
}

export function relationRowToForm(row: {
  id: string;
  relation_code?: string | null;
  relation_label: string;
  related_name_as_written?: string | null;
  related_um_id?: string | null;
  asserted_by?: string | null;
  source_note?: string | null;
  confidence?: string | null;
}): RelationFormState {
  const code = (['parent', 'child', 'sibling', 'spouse', 'other'] as const).includes(
    row.relation_code as RelationCode
  )
    ? (row.relation_code as RelationCode)
    : 'other';
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
    relationCode: code,
    relationLabel: row.relation_label,
    relatedName: row.related_name_as_written ?? '',
    relatedUmId: row.related_um_id ?? '',
    assertedBy: asserted,
    sourceNote: row.source_note ?? '',
    confidence,
  };
}

export function buildRelationRow(params: {
  biographyId: string;
  form: RelationFormState;
  recordLang: UiLang;
}): Record<string, unknown> {
  const { biographyId, form, recordLang } = params;
  const label = nfcTrim(form.relationLabel) || RELATION_CODE_LABELS[form.relationCode][recordLang];
  return {
    biography_id: biographyId,
    relation_code: form.relationCode,
    relation_label: label,
    direction: 'from-subject',
    related_um_id: nfcNullable(form.relatedUmId),
    related_name_as_written: nfcNullable(form.relatedName),
    related_name_romanized: null,
    valid_from_edtf: null,
    valid_to_edtf: null,
    asserted_by: form.assertedBy,
    asserted_by_label: assertedByLabel(form.assertedBy, recordLang),
    source_note: nfcNullable(form.sourceNote),
    confidence: form.confidence,
  };
}

export function relationHasData(form: RelationFormState): boolean {
  return Boolean(
    nfcTrim(form.relatedName) ||
      nfcTrim(form.relationLabel) ||
      (form.assertedBy && form.assertedBy !== 'unknown') ||
      nfcTrim(form.sourceNote)
  );
}
