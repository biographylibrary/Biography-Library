import { describe, expect, it } from 'vitest';
import { mergeOrphanedDraftMessages } from '@/lib/echo/echo-thread-pending-drafts';

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
