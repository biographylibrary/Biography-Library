import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { executeCoachTool } from '@/lib/agents/tools/coach-tools';
import { replacePassageExists } from '@/lib/echo/apply-draft';

/**
 * Caso segnalato il 5 ottobre 2026: all'autore che chiedeva di cancellare una frase Echo ha
 * mostrato la scheda «Sostituisco un pezzo del testo», ma al clic su «Sostituisci» l'app
 * rispondeva «Non ho trovato quel pezzo nel foglio». Il pezzo da cercare (918 caratteri)
 * non era un passaggio continuo del documento: il modello aveva unito l'inizio di un
 * paragrafo con la fine di un altro. Ora il controllo si fa prima di mostrare la scheda.
 */

const P1 =
  'Il primo ricordo nitido è una casa bianca in mezzo al verde. Per poterlo fare servì più di un anno. questo è un testo di prova Fu in quel contesto che iniziai la scuola, in un ambiente alieno. Ero terrorizzato.';
const P2 = 'Conservo ancora il ricordo della mensa e delle gelatine colorate che mi davano la nausea.';
const P3 =
  'Quel bambino ha lasciato un\'impronta profonda, tra la prima e la quinta elementare, e sento ancora l\'eco di quelle "scuole sballate" in ogni cosa.';
const DOC = [P1, P2, P3].join('\n\n');

function clientWith(row: Record<string, unknown> | null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: row, error }));
  const from = vi.fn(() => chain);
  return { client: { from } as unknown as SupabaseClient, from };
}

const ctx = (client: SupabaseClient) => ({
  serviceClient: client,
  userId: 'user-1',
  biographyId: 'bio-1',
  deferDraftApply: true,
});

const call = (client: SupabaseClient, args: Record<string, unknown>) =>
  executeCoachTool('propose_draft', JSON.stringify({ sectionKey: 'freeflow', ...args }), ctx(client));

describe('propose_draft: il pezzo da sostituire deve esistere nel testo salvato', () => {
  it('rifiuta un pezzo fatto unendo punti diversi del documento, e non mostra nessuna scheda', async () => {
    const { client } = clientWith({ content_freeflow: DOC, content: {} });
    // Inizio del primo paragrafo + fine del terzo, come nel caso segnalato.
    const stitched = `questo è un testo di prova Fu in quel contesto che iniziai la scuola, ${'tra la prima e la quinta elementare, e sento ancora l\'eco di quelle "scuole sballate" in ogni cosa.'}`;
    const result = await call(client, {
      replaceText: stitched,
      draftText: 'Fu in quel contesto che iniziai la scuola, in un ambiente alieno. Ero terrorizzato.',
    });
    expect(result.event).toBeUndefined();
    const body = JSON.parse(result.content);
    expect(body.preview).toBeUndefined();
    expect(body.error).toContain('replaceText was not found');
    // L'errore dice al modello che cosa fare per riprovare.
    expect(body.error).toContain('read_section');
    expect(body.error).toContain('ONE continuous passage');
  });

  it('accetta un pezzo breve e esatto: per cancellare una frase si sostituisce il passaggio con se stesso senza di essa', async () => {
    const { client } = clientWith({ content_freeflow: DOC, content: {} });
    const result = await call(client, {
      replaceText: 'questo è un testo di prova Fu in quel contesto',
      draftText: 'Fu in quel contesto',
    });
    expect(result.event).toMatchObject({
      tool: 'propose_draft',
      preview: true,
      replaceText: 'questo è un testo di prova Fu in quel contesto',
      draftText: 'Fu in quel contesto',
    });
    expect(JSON.parse(result.content)).toMatchObject({ ok: true, preview: true });
  });

  it('accetta anche un pezzo che differisce dal documento solo per gli spazi', async () => {
    const { client } = clientWith({ content_freeflow: 'Una frase con  due spazi\ne un a capo, poi altro.', content: {} });
    const result = await call(client, {
      replaceText: 'frase con due spazi e un a capo',
      draftText: 'frase corretta',
    });
    expect(result.event).toMatchObject({ preview: true });
  });

  it('accetta un pezzo che differisce solo per apostrofi, virgolette, trattini o segni di markdown', async () => {
    const { client } = clientWith({
      content_freeflow: 'Sento ancora l\u2019eco di quelle \u201Cscuole sballate\u201D \u2014 ogni giorno.',
      content: {},
    });
    const result = await call(client, {
      replaceText: 'l\'eco di quelle "scuole sballate" - ogni giorno',
      draftText: 'il ricordo di quelle scuole',
    });
    expect(result.event).toMatchObject({ preview: true });
  });

  it('con «sostituisci tutte le occorrenze» il pezzo deve comunque esistere', async () => {
    const { client } = clientWith({ content_freeflow: DOC, content: {} });
    const missing = await call(client, { replaceText: '—', draftText: ', ', replaceAll: true });
    expect(missing.event).toBeUndefined();
    expect(JSON.parse(missing.content).error).toContain('replaceText was not found');

    const present = clientWith({ content_freeflow: 'Ciao — mondo — fine', content: {} });
    const ok = await call(present.client, { replaceText: ' — ', draftText: ', ', replaceAll: true });
    expect(ok.event).toMatchObject({ preview: true, replaceAll: true });
  });

  it('non controlla nulla (e non legge il database) quando si propone solo testo nuovo', async () => {
    const { client, from } = clientWith({ content_freeflow: DOC, content: {} });
    const result = await call(client, { draftText: 'Un nuovo paragrafo da aggiungere.' });
    expect(result.event).toMatchObject({ preview: true });
    expect(from).not.toHaveBeenCalled();
  });

  it('se il documento non si può leggere lascia decidere all\'applicazione, come prima', async () => {
    const missing = clientWith(null);
    const a = await call(missing.client, { replaceText: 'qualsiasi cosa', draftText: 'altro' });
    expect(a.event).toMatchObject({ preview: true });

    const failing = clientWith(null, { message: 'boom' });
    const b = await call(failing.client, { replaceText: 'qualsiasi cosa', draftText: 'altro' });
    expect(b.event).toMatchObject({ preview: true });
  });
});

describe('replacePassageExists', () => {
  it('legge content_freeflow per il foglio unico e la sezione per le altre chiavi', async () => {
    const { client } = clientWith({
      content_freeflow: 'Testo del foglio.',
      content: { childhood: { text: 'Testo dell\'infanzia.', todo: false, audioTranscript: '' } },
    });
    const place = { replaceText: 'Testo del foglio.' };
    expect(await replacePassageExists(client, 'u', 'b', 'freeflow', 'Nuovo.', place)).toBe(true);
    expect(await replacePassageExists(client, 'u', 'b', 'freeflow', 'Nuovo.', { replaceText: 'Testo dell\'infanzia.' })).toBe(false);
    expect(await replacePassageExists(client, 'u', 'b', 'childhood', 'Nuovo.', { replaceText: 'Testo dell\'infanzia.' })).toBe(true);
    expect(await replacePassageExists(client, 'u', 'b', 'childhood', 'Nuovo.', place)).toBe(false);
  });

  it('restituisce null senza controllare quando manca la scheda o la chiave non è valida', async () => {
    const { client, from } = clientWith({ content_freeflow: 'x', content: {} });
    expect(await replacePassageExists(client, 'u', '', 'freeflow', 'y', { replaceText: 'x' })).toBeNull();
    expect(await replacePassageExists(client, 'u', 'b', 'non-esiste', 'y', { replaceText: 'x' })).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
