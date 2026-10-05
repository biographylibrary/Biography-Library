import { describe, expect, it } from 'vitest';
import { dedupePlaceHits, shouldSearchPlace, type PlaceSearchHit } from '@/lib/places';
import {
  emptyEventForm,
  withPlaceQuery,
  withPlaceSelection,
  type EventFormState,
  type PlaceSelection,
} from '@/lib/person-events';

/**
 * Finestra «I miei dati», campo del luogo (5 ottobre 2026): le località proposte si vedevano ma
 * non si potevano scegliere, e all'apertura si aprivano gli elenchi di tutti i campi già compilati.
 */

const GENOVA: PlaceSelection = {
  nameAsGiven: 'Genova',
  nameCurrent: 'Genova, Liguria, Italia',
  lat: 44.41,
  lon: 8.93,
  geonamesId: 3176959,
  wikidataQid: null,
};

const hit = (displayName: string, geonamesId: number | null = null): PlaceSearchHit => ({
  name: displayName.split(',')[0],
  displayName,
  lat: 0,
  lon: 0,
  geonamesId,
  wikidataQid: null,
  countryCode: null,
});

describe('shouldSearchPlace', () => {
  it('non cerca per un valore caricato dal salvataggio: l\'autore non ha scritto nulla', () => {
    expect(shouldSearchPlace('Genova', false, false)).toBe(false);
    expect(shouldSearchPlace('Lugano', true, false)).toBe(false);
  });

  it('non cerca quando un luogo è già stato scelto, anche se l\'autore ha scritto prima', () => {
    expect(shouldSearchPlace('Genova, Liguria, Italia', true, true)).toBe(false);
  });

  it('cerca quando l\'autore scrive e non ha un luogo scelto, da due caratteri in su', () => {
    expect(shouldSearchPlace('Ge', false, true)).toBe(true);
    expect(shouldSearchPlace('G', false, true)).toBe(false);
    expect(shouldSearchPlace('  ', false, true)).toBe(false);
  });
});

describe('dedupePlaceHits', () => {
  it('tiene una sola voce quando due hanno lo stesso nome mostrato (come «Genova, Liguria, Italia» due volte)', () => {
    const hits = [
      hit('Genova, Liguria, Italia', 1),
      hit('Genova, Liguria, Italia', 2),
      hit('Genova, Distretto, Italia', 3),
    ];
    expect(dedupePlaceHits(hits).map((h) => h.geonamesId)).toEqual([1, 3]);
  });

  it('non tocca un elenco senza doppioni e ne conserva l\'ordine', () => {
    const hits = [hit('Lugano, Ticino, Svizzera', 1), hit('Distretto di Lugano, Ticino, Svizzera', 2)];
    expect(dedupePlaceHits(hits)).toEqual(hits);
  });
});

describe('withPlaceQuery e withPlaceSelection', () => {
  it('scegliere un luogo imposta il luogo e il testo del campo in un colpo solo', () => {
    const form: EventFormState = { ...emptyEventForm(), placeQuery: 'Gen' };
    const next = withPlaceSelection(form, GENOVA);
    expect(next.place).toEqual(GENOVA);
    expect(next.placeQuery).toBe('Genova, Liguria, Italia');
  });

  it('scrivere nel campo cambia il testo e toglie il luogo già scelto', () => {
    const form: EventFormState = { ...emptyEventForm(), place: GENOVA, placeQuery: 'Genova, Liguria, Italia' };
    const next = withPlaceQuery(form, 'Genov');
    expect(next.placeQuery).toBe('Genov');
    expect(next.place).toBeNull();
  });

  it('svuotare il campo toglie testo e luogo insieme', () => {
    const form: EventFormState = { ...emptyEventForm(), place: GENOVA, placeQuery: 'Genova, Liguria, Italia' };
    expect(withPlaceQuery(form, '')).toMatchObject({ placeQuery: '', place: null });
  });

  it('non cambia gli altri campi del modulo né l\'originale', () => {
    const form: EventFormState = { ...emptyEventForm(), sourceNote: 'nota', confidence: 'certain' };
    const next = withPlaceSelection(form, GENOVA);
    expect(next.sourceNote).toBe('nota');
    expect(next.confidence).toBe('certain');
    expect(form.place).toBeNull();
  });

  it('perché il campo fa una sola modifica per gesto: due modifiche di seguito con la stessa copia vecchia si cancellano', () => {
    // Come nel modulo «Nascita»: lo stato si sostituisce per intero a partire da una copia fatta al disegno.
    const form: EventFormState = { ...emptyEventForm(), placeQuery: 'Genova' };
    let state = form;
    const setState = (next: EventFormState) => {
      state = next;
    };

    // Comportamento di prima: scegliere = onSelect(luogo) e poi onQueryChange(nome).
    setState({ ...form, place: GENOVA, placeQuery: 'Genova, Liguria, Italia' });
    setState({ ...form, placeQuery: 'Genova, Liguria, Italia' });
    expect(state.place).toBeNull(); // la scelta andava persa, e la ricerca ripartiva dal testo

    // Ora: una sola chiamata.
    state = form;
    setState(withPlaceSelection(form, GENOVA));
    expect(state.place).toEqual(GENOVA);
  });
});
