import { describe, expect, it } from 'vitest';
import { availableLanguageBases, occupiedLanguageTags } from '@/lib/edition-languages';

describe('occupiedLanguageTags / availableLanguageBases', () => {
  it('esclude originale ed edizioni', () => {
    const occupied = occupiedLanguageTags({
      originalTag: 'it',
      editionTags: ['en', 'fr-CH'],
    });
    expect(occupied.has('it')).toBe(true);
    expect(occupied.has('en')).toBe(true);
    expect(occupied.has('fr-CH')).toBe(true);
    expect(availableLanguageBases(['it', 'en', 'fr', 'de', 'es'], occupied)).toEqual(['de', 'es']);
  });
});
