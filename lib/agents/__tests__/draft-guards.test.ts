import { describe, expect, it } from 'vitest';
import { claimsTextInserted, lastAssistantOfferedInsertion, plainApology } from '@/lib/agents/draft-guards';

describe('claimsTextInserted: il modello dice di aver inserito, in quattro lingue', () => {
  const claims = [
    'Sostituzione effettuata. Ora il testo è pulito, senza ripetizioni e in ordine logico.',
    'Procedo subito alla sostituzione.',
    'Sto inviando ora la bozza che include il ricordo.',
    'Riprovo immediatamente a inviare il testo.',
    'Controlla tra un istante: dovrebbe apparire il tasto per l\'inserimento.',
    'Dovresti vedere il testo completo pronto per essere inserito.',
    'Ho inserito il ricordo prima delle piramidi.',
    "I've inserted the memory before the pyramids.",
    'The replacement is done.',
    "J'ai inséré le souvenir avant les pyramides.",
    'Ich habe das Erlebnis vor den Pyramiden eingefügt.',
  ];
  for (const text of claims) it(`riconosce: ${text.slice(0, 50)}`, () => expect(claimsTextInserted(text)).toBe(true));

  const notClaims = [
    'Ti sembra che rispecchi bene il ricordo? Se sì, posso aggiungerlo subito.',
    'Il pulsante Inserisci compare sotto la proposta: cliccalo se ti piace.',
    'Il PDF si scarica da Esporta nel menu a sinistra.',
    'Hai inserito un titolo di capitolo? Non lo vedo nel testo.',
  ];
  for (const text of notClaims) it(`lascia stare: ${text.slice(0, 50)}`, () => expect(claimsTextInserted(text)).toBe(false));
});

describe('lastAssistantOfferedInsertion', () => {
  it('vero se l\'ultima risposta offriva di aggiungere testo', () => {
    expect(
      lastAssistantOfferedInsertion([
        { role: 'user', content: 'aggiungi' },
        { role: 'assistant', content: 'Se sì, posso aggiungerlo subito prima della parte delle piramidi.' },
      ])
    ).toBe(true);
  });

  it('falso se l\'ultima risposta aveva già chiamato lo strumento (la scheda c\'è)', () => {
    expect(
      lastAssistantOfferedInsertion([
        {
          role: 'assistant',
          content: 'Posso aggiungerlo?',
          tool_calls: [{ id: 'x', type: 'function', function: { name: 'propose_draft', arguments: '{}' } }],
        },
        { role: 'tool', content: '{}', tool_call_id: 'x' },
      ])
    ).toBe(false);
  });

  it('falso per una domanda che non riguarda il testo', () => {
    expect(
      lastAssistantOfferedInsertion([{ role: 'assistant', content: 'Vuoi che ti spieghi come scaricare il manuale?' }])
    ).toBe(false);
  });

  it('falso senza risposte precedenti', () => {
    expect(lastAssistantOfferedInsertion([])).toBe(false);
  });
});

describe('plainApology: una scusa è «mi scuso»', () => {
  it('toglie gli avverbi enfatici in italiano', () => {
    expect(plainApology('Mi scuso profondamente per l\'errore.')).toBe('Mi scuso per l\'errore.');
    expect(plainApology('Mi scuso sinceramente. Ora sistemo.')).toBe('Mi scuso. Ora sistemo.');
    expect(plainApology('Sentitamente mi scuso per il disagio.')).toBe('mi scuso per il disagio.');
    expect(plainApology('Mi scuso di cuore.')).toBe('Mi scuso.');
  });

  it('toglie gli avverbi in inglese, francese e tedesco', () => {
    expect(plainApology('I deeply apologize for the mistake.')).toBe('I apologize for the mistake.');
    expect(plainApology('I apologize sincerely.')).toBe('I apologize.');
    expect(plainApology("Je m'excuse profondément.")).toBe("Je m'excuse.");
    expect(plainApology('Ich entschuldige mich vielmals.')).toBe('Ich entschuldige mich.');
  });

  it('non tocca il resto del testo né le scuse già semplici', () => {
    expect(plainApology('Mi scuso. Ora lo sistemo.')).toBe('Mi scuso. Ora lo sistemo.');
    expect(plainApology('Il testo è profondamente cambiato.')).toBe('Il testo è profondamente cambiato.');
  });
});
