import { describe, expect, it } from 'vitest';
import { isDraftApplied, mergeOrphanedDraftMessages } from '@/lib/echo/echo-thread-pending-drafts';

describe('mergeOrphanedDraftMessages', () => {
  it('moves pendingDraft from empty tool row onto the following acknowledgment message', () => {
    const draft = { sectionKey: 'childhood', draftText: 'Era piccolo...' };
    const merged = mergeOrphanedDraftMessages([
      { id: 'a-tool', role: 'assistant', content: '', pendingDraft: draft },
      {
        id: 'a-text',
        role: 'assistant',
        content: 'Ho preparato una bozza che puoi rivedere e inserire qui sotto.',
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: 'a-text',
      pendingDraft: draft,
    });
  });

  it('keeps standalone assistant messages unchanged', () => {
    const messages = [{ id: 'a-1', role: 'assistant', content: 'Ciao' }];
    expect(mergeOrphanedDraftMessages(messages)).toEqual(messages);
  });
});

describe('proposta già inserita dopo il ricaricamento', () => {
  it('si riconosce anche quando la proposta è mostrata dal messaggio di conferma che la segue', () => {
    const draft = { sectionKey: 'freeflow', draftText: 'La sua bicicletta aveva un campanello.' };
    const [shown] = mergeOrphanedDraftMessages([
      { id: 'riga-strumento', role: 'assistant', content: '', pendingDraft: draft },
      { id: 'riga-conferma', role: 'assistant', content: 'Ho aggiunto la frase dopo il paragrafo su Zio Piero.' },
    ]);
    // Il pulsante ricorda l'identificativo della proposta (quello della riga con lo strumento).
    expect(isDraftApplied(shown, new Set(['riga-strumento']))).toBe(true);
    expect(isDraftApplied(shown, new Set(['riga-conferma']))).toBe(true);
    expect(isDraftApplied(shown, new Set(['altra-riga']))).toBe(false);
    expect(isDraftApplied(shown, new Set())).toBe(false);
  });

  it('senza unione vale l\'identificativo del messaggio', () => {
    expect(isDraftApplied({ id: 'a-1' }, new Set(['a-1']))).toBe(true);
    expect(isDraftApplied({ id: 'a-1' }, new Set())).toBe(false);
  });
});
