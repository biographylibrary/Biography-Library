import { describe, expect, it } from 'vitest';
import { resolveEditionViewAlternates } from '@/lib/edition-view-metadata';
import type { EditionAlternateRow } from '@/lib/edition-alternates';

type Row = EditionAlternateRow;

function makeClient(opts: {
  byId?: Record<string, Row | null>;
  bySlug?: Record<string, Row | null>;
  group?: Row[];
}) {
  const eqCalls: Array<{ column: string; value: string }> = [];
  const orFilters: string[] = [];

  function chainForLookup(kind: 'id' | 'slug') {
    const state = { column: '', value: '' };
    return {
      eq(column: string, value: string) {
        state.column = column;
        state.value = value;
        return this;
      },
      async maybeSingle() {
        if (kind === 'id' || state.column === 'id') {
          return { data: opts.byId?.[state.value] ?? null, error: null };
        }
        return { data: opts.bySlug?.[state.value] ?? null, error: null };
      },
    };
  }

  function chainForGroup() {
    const filters: Array<{ column: string; value: string }> = [];
    const api = {
      or(filter: string) {
        orFilters.push(filter);
        return this;
      },
      eq(column: string, value: string) {
        eqCalls.push({ column, value });
        filters.push({ column, value });
        return this;
      },
      then(resolve: (v: { data: Row[]; error: null }) => unknown) {
        return Promise.resolve({ data: opts.group ?? [], error: null }).then(resolve);
      },
    };
    return api;
  }

  let selectCount = 0;
  return {
    eqCalls,
    orFilters,
    client: {
      from() {
        return {
          select() {
            selectCount += 1;
            if (selectCount === 1) {
              // First select is the single-row lookup; eq decides id vs slug.
              const lookup = {
                eq(column: string, value: string) {
                  if (column === 'id') return chainForLookup('id').eq(column, value);
                  return chainForLookup('slug').eq(column, value);
                },
              };
              return lookup;
            }
            return chainForGroup();
          },
        };
      },
    },
  };
}

const publishedOriginal: Row = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'vita',
  record_language_tag: 'it',
  translation_of: null,
  status: 'published',
  visibility: 'public',
};

const publishedFr: Row = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'vita-fr',
  record_language_tag: 'fr',
  translation_of: publishedOriginal.id,
  status: 'published',
  visibility: 'public',
};

describe('resolveEditionViewAlternates', () => {
  it('returns null without throwing when the row is missing', async () => {
    const { client } = makeClient({ byId: {} });
    await expect(
      resolveEditionViewAlternates(client as never, publishedOriginal.id, 'https://app.example')
    ).resolves.toBeNull();
  });

  it('returns null when the row is not public', async () => {
    const { client } = makeClient({
      byId: {
        [publishedOriginal.id]: {
          ...publishedOriginal,
          visibility: 'private',
        },
      },
    });
    await expect(
      resolveEditionViewAlternates(client as never, publishedOriginal.id, 'https://app.example')
    ).resolves.toBeNull();
  });

  it('returns null for an unknown slug', async () => {
    const { client } = makeClient({ bySlug: {} });
    await expect(
      resolveEditionViewAlternates(client as never, 'does-not-exist', 'https://app.example')
    ).resolves.toBeNull();
  });

  it('queries the group with status published and visibility public', async () => {
    const { client, eqCalls, orFilters } = makeClient({
      byId: { [publishedOriginal.id]: publishedOriginal },
      group: [publishedOriginal, publishedFr],
    });
    const result = await resolveEditionViewAlternates(
      client as never,
      publishedOriginal.id,
      'https://app.example'
    );
    expect(orFilters[0]).toContain(`id.eq.${publishedOriginal.id}`);
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        { column: 'status', value: 'published' },
        { column: 'visibility', value: 'public' },
      ])
    );
    expect(result?.languages?.['x-default']).toBe(
      'https://app.example/biography/vita/view'
    );
    expect(result?.canonical).toBe('https://app.example/biography/vita/view');
  });
});
