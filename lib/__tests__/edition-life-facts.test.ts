import { describe, expect, it } from 'vitest';
import {
  adaptLifeFactsForEdition,
  lifeFactsSourceId,
} from '@/lib/edition-life-facts';
import { buildRecordCard } from '@/lib/record-schema';
import type {
  PermanenceExportBiography,
  PermanenceExportEvent,
  PermanenceExportRelation,
} from '@/lib/permanence-text-export';

const VALID_UM = 'um0000k3nq7fx2mvp4';

function birthIt(): PermanenceExportEvent {
  return {
    event_type: 'birth',
    event_label: 'nascita',
    date_edtf: '1948-03-14',
    date_as_given: '14 marzo 1948',
    calendar_label: 'gregoriano',
    date_start_iso: '1948-03-14',
    date_start_jdn: 2432635,
    place_name_as_given: 'Roma',
    place_lat: 41.9,
    place_lon: 12.5,
    asserted_by: 'self',
    asserted_by_label: 'la persona stessa',
    confidence: 'certain',
  };
}

function parentIt(): PermanenceExportRelation {
  return {
    relation_code: 'parent',
    relation_label: 'genitore',
    related_name_as_written: 'Anna',
  };
}

function customGrandmother(): PermanenceExportRelation {
  return {
    relation_code: 'other',
    relation_label: 'nonna paterna',
    related_name_as_written: 'Maria',
  };
}

describe('lifeFactsSourceId', () => {
  it('edizione → translation_of; originale → id', () => {
    expect(lifeFactsSourceId({ id: 'ed-1', translation_of: 'orig-1' })).toBe('orig-1');
    expect(lifeFactsSourceId({ id: 'orig-1', translation_of: null })).toBe('orig-1');
    expect(lifeFactsSourceId({ id: 'orig-1' })).toBe('orig-1');
  });
});

describe('adaptLifeFactsForEdition', () => {
  it('italiano → inglese: etichette standard; personalizzata resta', () => {
    const events = [birthIt()];
    const relations = [parentIt(), customGrandmother()];
    const out = adaptLifeFactsForEdition({
      events,
      relations,
      originalTag: 'it',
      editionTag: 'en',
    });
    expect(out.events[0]!.event_label).toBe('birth');
    expect(out.events[0]!.asserted_by_label).toBe('the person');
    expect(out.relations[0]!.relation_label).toBe('parent');
    expect(out.relations[1]!.relation_label).toBe('nonna paterna');
    expect(out.events[0]!.date_edtf).toBe('1948-03-14');
    expect(out.events[0]!.place_name_as_given).toBe('Roma');
    expect(out.relations[0]!.related_name_as_written).toBe('Anna');
  });

  it('stessa lingua: copie identiche, nessun cambiamento di etichetta', () => {
    const events = [birthIt()];
    const relations = [parentIt()];
    const out = adaptLifeFactsForEdition({
      events,
      relations,
      originalTag: 'it',
      editionTag: 'it-CH',
    });
    expect(out.events[0]!.event_label).toBe('nascita');
    expect(out.relations[0]!.relation_label).toBe('genitore');
    expect(out.events).not.toBe(events);
    expect(out.relations).not.toBe(relations);
  });

  it('spagnolo (UI = en) da italiano: etichette inglesi', () => {
    const out = adaptLifeFactsForEdition({
      events: [birthIt()],
      relations: [parentIt()],
      originalTag: 'it',
      editionTag: 'es',
    });
    expect(out.events[0]!.event_label).toBe('birth');
    expect(out.events[0]!.asserted_by_label).toBe('the person');
    expect(out.relations[0]!.relation_label).toBe('parent');
  });

  it('non modifica gli ingressi', () => {
    const events = [birthIt()];
    const relations = [parentIt(), customGrandmother()];
    const snapshot = structuredClone({ events, relations });
    adaptLifeFactsForEdition({
      events,
      relations,
      originalTag: 'it',
      editionTag: 'en',
    });
    expect(events).toEqual(snapshot.events);
    expect(relations).toEqual(snapshot.relations);
  });

  it('campi diversi dalle etichette restano uguali all\'ingresso', () => {
    const ev = birthIt();
    const out = adaptLifeFactsForEdition({
      events: [ev],
      relations: [],
      originalTag: 'it',
      editionTag: 'en',
    }).events[0]!;
    const { event_label: _el, asserted_by_label: _ab, ...restOut } = out;
    const { event_label: _el2, asserted_by_label: _ab2, ...restIn } = ev;
    expect(restOut).toEqual(restIn);
  });

  it('prova di rottura: etichetta personalizzata non va sostituita', () => {
    const out = adaptLifeFactsForEdition({
      events: [],
      relations: [customGrandmother()],
      originalTag: 'it',
      editionTag: 'en',
    });
    expect(out.relations[0]!.relation_label).toBe('nonna paterna');
    expect(out.relations[0]!.relation_label).not.toBe('other');
  });
});

describe('buildRecordCard con fatti adattati di un\'edizione', () => {
  it('nascita con valori, identificativo originale, lingua en', () => {
    const adapted = adaptLifeFactsForEdition({
      events: [birthIt()],
      relations: [parentIt()],
      originalTag: 'it',
      editionTag: 'en',
    });
    const bio: PermanenceExportBiography = {
      um_id: VALID_UM,
      schema_version: 2,
      record_language_tag: 'en',
      record_script: 'Latn',
      record_direction: 'ltr',
      record_language_endonym: 'English',
      name_as_written: 'Maria Rossi',
      name_romanized: null,
      title: 'Maria Rossi',
      author_name: 'Maria Rossi',
      subject_name: null,
      biography_type: 'autobiography',
      published_at_iso: '2026-10-01',
      published_um_year: 0,
      rights_statement_uri: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    };
    const card = buildRecordCard(bio, adapted.events, adapted.relations);
    expect(card.data.identifier).toMatch(/UM-0000-K3NQ-7FX2-MVP4/);
    expect(card.data.language).toMatch(/\ben\b/i);
    expect(card.data.birthDate).not.toMatch(/UNKNOWN/);
    expect(card.data.birthEvent).toMatch(/birth/i);
    expect(card.data.birthDate).toContain('1948-03-14');
  });
});
