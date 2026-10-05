// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PlaceSearchField } from '@/components/editor/permanence/PlaceSearchField';
import { withPlaceQuery, withPlaceSelection, type PlaceSelection } from '@/lib/person-events';

/**
 * Campo del luogo dentro la finestra «I miei dati» (segnalato il 5 ottobre 2026): le proposte si
 * vedevano ma non si potevano scegliere, e all'apertura si aprivano da sole. La finestra è una
 * Dialog modale di Radix, che mentre è aperta imposta `pointer-events: none` sul body: un elenco
 * disegnato fuori dal contenuto della finestra non riceve i clic, e user-event lo rileva.
 */

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } },
}));

const RESULTS = [
  { name: 'Genova', displayName: 'Genova, Liguria, Italia', lat: 44.4, lon: 8.9, geonamesId: 3176959, wikidataQid: null, countryCode: 'IT' },
  { name: 'Genova', displayName: 'Genova, Liguria, Italia', lat: 44.4, lon: 8.9, geonamesId: 3176960, wikidataQid: null, countryCode: 'IT' },
  { name: 'Genova', displayName: 'Genova, Provincia di Genova, Italia', lat: 44.4, lon: 8.9, geonamesId: 3176961, wikidataQid: null, countryCode: 'IT' },
];

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ results: RESULTS }) }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Come il modulo «Nascita»: lo stato del modulo si sostituisce per intero partendo dalla copia
 * fatta al disegno (`setForm(withPlace…(form, …))`), non con un aggiornamento funzionale.
 */
function Harness({ initialQuery = '', initialPlace = null }: { initialQuery?: string; initialPlace?: PlaceSelection | null }) {
  const [form, setForm] = useState({ place: initialPlace, placeQuery: initialQuery });
  return (
    <>
      <PlaceSearchField
        query={form.placeQuery}
        selected={form.place}
        onQueryChange={(q) => setForm(withPlaceQuery(form, q))}
        onSelect={(p) => setForm(withPlaceSelection(form, p))}
        label="Luogo di nascita"
        placeholder="Cerca un luogo"
        hint="suggerimento"
        clearLabel="Svuota"
        lang="it"
      />
      <output data-testid="scelto">{form.place ? String(form.place.geonamesId) : 'nessuno'}</output>
    </>
  );
}

function inDialog(ui: React.ReactNode) {
  return render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>I miei dati</DialogTitle>
        {ui}
      </DialogContent>
    </Dialog>
  );
}

// Il campo e le proposte si cercano con quello che l'autore vede (segnaposto, testo dei pulsanti),
// non con attributi del componente: così le stesse prove valgono anche per la versione precedente.
const input = () => screen.getByPlaceholderText('Cerca un luogo') as HTMLInputElement;
const proposals = () => screen.queryAllByRole('button', { name: /^Genova/ });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('PlaceSearchField dentro una finestra modale', () => {
  it('all\'apertura non cerca e non apre nessun elenco per un valore già compilato', async () => {
    inDialog(<Harness initialQuery="Genova" />);
    await sleep(600);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(proposals()).toHaveLength(0);
    expect(input().value).toBe('Genova');
  });

  it('scrivendo parte la ricerca e le proposte compaiono dentro la finestra, senza voci doppie', async () => {
    const user = userEvent.setup();
    inDialog(<Harness />);
    await user.type(input(), 'Gen');
    await screen.findByRole('button', { name: 'Genova, Liguria, Italia' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('q=Gen');
    expect(proposals().map((o) => o.textContent)).toEqual([
      'Genova, Liguria, Italia',
      'Genova, Provincia di Genova, Italia',
    ]);
    // Sta dentro il contenuto della finestra: è quello che resta cliccabile.
    expect(screen.getByRole('dialog').contains(proposals()[0])).toBe(true);
  });

  it('un clic su una proposta la sceglie: il campo si riempie, la scelta resta, l\'elenco si chiude e non riparte la ricerca', async () => {
    const user = userEvent.setup();
    inDialog(<Harness />);
    await user.type(input(), 'Gen');
    const option = await screen.findByRole('button', { name: 'Genova, Provincia di Genova, Italia' });
    // user-event rifiuta il clic se l'elemento (o un suo antenato) ha pointer-events: none.
    await user.click(option);
    expect(input().value).toBe('Genova, Provincia di Genova, Italia');
    expect(screen.getByTestId('scelto').textContent).toBe('3176961');
    expect(proposals()).toHaveLength(0);
    fetchMock.mockClear();
    await sleep(600);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(proposals()).toHaveLength(0);
  });

  it('la X svuota testo e scelta insieme', async () => {
    const user = userEvent.setup();
    inDialog(<Harness />);
    await user.type(input(), 'Gen');
    await user.click(await screen.findByRole('button', { name: 'Genova, Liguria, Italia' }));
    expect(screen.getByTestId('scelto').textContent).toBe('3176959');
    await user.click(screen.getByRole('button', { name: 'Svuota' }));
    expect(input().value).toBe('');
    expect(screen.getByTestId('scelto').textContent).toBe('nessuno');
  });

  it('dopo una scelta il campo si lascia modificare: il testo scritto resta e la scelta cade', async () => {
    const user = userEvent.setup();
    inDialog(<Harness />);
    await user.type(input(), 'Gen');
    await user.click(await screen.findByRole('button', { name: 'Genova, Liguria, Italia' }));
    await user.type(input(), 'x');
    expect(input().value).toBe('Genova, Liguria, Italiax');
    expect(screen.getByTestId('scelto').textContent).toBe('nessuno');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('un valore già scelto e caricato dal salvataggio non apre nessun elenco nemmeno al clic nel campo', async () => {
    const user = userEvent.setup();
    const saved: PlaceSelection = { nameAsGiven: 'Lugano', nameCurrent: 'Lugano, Ticino, Svizzera', lat: 46, lon: 8.9, geonamesId: 2659836, wikidataQid: null };
    inDialog(<Harness initialQuery="Lugano, Ticino, Svizzera" initialPlace={saved} />);
    await user.click(input());
    await sleep(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(proposals()).toHaveLength(0);
    expect(screen.getByTestId('scelto').textContent).toBe('2659836');
  });
});
