/**
 * Fatti di vita per le uscite di un'edizione: letti dall'originale,
 * etichette standard adattate alla lingua dell'edizione.
 * Nessun accesso al database in questo modulo (tranne il caricatore sotto).
 */

import {
  ASSERTED_BY_LABELS,
  EVENT_LABELS,
  type AssertedByCode,
  type LifeEventType,
} from '@/lib/person-events';
import { RELATION_CODE_LABELS, type RelationCode } from '@/lib/person-relations';
import type {
  PermanenceExportEvent,
  PermanenceExportRelation,
} from '@/lib/permanence-text-export';
import { nfc } from '@/lib/nfc';
import { uiLangFromTag } from '@/lib/text-ui-lang';

export type LifeFactsBiographyRef = {
  id: string;
  translation_of?: string | null;
  record_language_tag?: string | null;
};

/** Per un'edizione: id dell'originale; altrimenti id della riga. */
export function lifeFactsSourceId(row: LifeFactsBiographyRef): string {
  const of = row.translation_of;
  if (typeof of === 'string' && of.trim()) return of;
  return row.id;
}

function labelEqualsStandard(actual: string | null | undefined, standard: string): boolean {
  const a = nfc((actual ?? '').trim()).toLowerCase();
  const b = nfc(standard.trim()).toLowerCase();
  return a.length > 0 && a === b;
}

function isLifeEventType(value: string): value is LifeEventType {
  return value === 'birth' || value === 'death' || value === 'residence';
}

function isAssertedByCode(value: string | null | undefined): value is AssertedByCode {
  return (
    value === 'self' ||
    value === 'family' ||
    value === 'document' ||
    value === 'institution' ||
    value === 'unknown'
  );
}

function isRelationCode(value: string | null | undefined): value is RelationCode {
  return (
    value === 'parent' ||
    value === 'child' ||
    value === 'sibling' ||
    value === 'spouse' ||
    value === 'other'
  );
}

/**
 * Copia eventi e relazioni; se le lingue UI differiscono, sostituisce solo le
 * etichette standard (event_label, asserted_by_label, relation_label).
 * Testo dell'autore e ogni altro campo restano invariati.
 */
export function adaptLifeFactsForEdition(input: {
  events: PermanenceExportEvent[];
  relations: PermanenceExportRelation[];
  originalTag: string | null | undefined;
  editionTag: string | null | undefined;
}): { events: PermanenceExportEvent[]; relations: PermanenceExportRelation[] } {
  const from = uiLangFromTag(input.originalTag);
  const to = uiLangFromTag(input.editionTag);

  if (from === to) {
    return {
      events: input.events.map((e) => ({ ...e })),
      relations: input.relations.map((r) => ({ ...r })),
    };
  }

  const events = input.events.map((ev) => {
    const next = { ...ev };
    if (isLifeEventType(ev.event_type)) {
      const standardFrom = EVENT_LABELS[ev.event_type][from];
      if (labelEqualsStandard(ev.event_label, standardFrom)) {
        next.event_label = EVENT_LABELS[ev.event_type][to];
      }
    }
    if (isAssertedByCode(ev.asserted_by)) {
      const standardFrom = ASSERTED_BY_LABELS[ev.asserted_by][from];
      if (labelEqualsStandard(ev.asserted_by_label, standardFrom)) {
        next.asserted_by_label = ASSERTED_BY_LABELS[ev.asserted_by][to];
      }
    }
    return next;
  });

  const relations = input.relations.map((rel) => {
    const next = { ...rel };
    if (isRelationCode(rel.relation_code)) {
      const standardFrom = RELATION_CODE_LABELS[rel.relation_code][from];
      if (labelEqualsStandard(rel.relation_label, standardFrom)) {
        next.relation_label = RELATION_CODE_LABELS[rel.relation_code][to];
      }
    }
    return next;
  });

  return { events, relations };
}

type ListResult = { data: unknown; error: unknown };

type MaybeSingleResult = { data: unknown; error: unknown };

export type LifeFactsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => PromiseLike<ListResult> & {
        maybeSingle?: () => PromiseLike<MaybeSingleResult>;
      };
    };
  };
};

/** Errore se i fatti di vita dell'originale non si riescono a leggere. */
export class EditionLifeFactsUnavailableError extends Error {
  constructor(message = 'edition_life_facts_unavailable') {
    super(message);
    this.name = 'EditionLifeFactsUnavailableError';
  }
}

/**
 * Un solo punto di lettura: originale → i suoi eventi/relazioni;
 * edizione → quelli di translation_of, etichette adattate.
 */
export async function loadLifeFactsForExport(
  client: LifeFactsClient,
  row: LifeFactsBiographyRef
): Promise<{ events: PermanenceExportEvent[]; relations: PermanenceExportRelation[] }> {
  const sourceId = lifeFactsSourceId(row);
  const translationOf =
    typeof row.translation_of === 'string' && row.translation_of.trim()
      ? row.translation_of
      : null;

  const [eventsRes, relationsRes] = await Promise.all([
    client.from('person_events').select('*').eq('biography_id', sourceId),
    client.from('person_relations').select('*').eq('biography_id', sourceId),
  ]);

  if (eventsRes.error || relationsRes.error) {
    throw new EditionLifeFactsUnavailableError();
  }

  const events = (eventsRes.data as PermanenceExportEvent[] | null) ?? [];
  const relations = (relationsRes.data as PermanenceExportRelation[] | null) ?? [];

  if (!translationOf) {
    return { events, relations };
  }

  let originalTag: string | null = null;
  try {
    const tagged = client.from('biographies').select('record_language_tag').eq('id', translationOf);
    if (typeof tagged.maybeSingle !== 'function') {
      throw new EditionLifeFactsUnavailableError();
    }
    const { data, error } = await tagged.maybeSingle();
    if (error || !data) {
      throw new EditionLifeFactsUnavailableError();
    }
    originalTag =
      typeof (data as { record_language_tag?: string | null }).record_language_tag === 'string'
        ? (data as { record_language_tag: string }).record_language_tag
        : null;
  } catch (err) {
    if (err instanceof EditionLifeFactsUnavailableError) throw err;
    throw new EditionLifeFactsUnavailableError();
  }

  return adaptLifeFactsForEdition({
    events,
    relations,
    originalTag,
    editionTag: row.record_language_tag,
  });
}
