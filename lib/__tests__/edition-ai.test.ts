import { describe, expect, it } from 'vitest';
import {
  aiWritingToolsAvailableForBiography,
  isEditionBiography,
} from '@/lib/edition-ai';

describe('isEditionBiography', () => {
  it('è vera solo con translation_of non vuoto', () => {
    expect(isEditionBiography('orig-1')).toBe(true);
    expect(isEditionBiography(null)).toBe(false);
    expect(isEditionBiography(undefined)).toBe(false);
    expect(isEditionBiography('')).toBe(false);
  });
});

describe('aiWritingToolsAvailableForBiography', () => {
  it('è falsa sulle edizioni e vera sugli originali', () => {
    expect(aiWritingToolsAvailableForBiography({ translationOf: 'orig-1' })).toBe(false);
    expect(aiWritingToolsAvailableForBiography({ translationOf: null })).toBe(true);
    expect(aiWritingToolsAvailableForBiography({})).toBe(true);
  });
});
