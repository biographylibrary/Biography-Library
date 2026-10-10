import { describe, expect, it } from 'vitest';
import {
  originalIsNewerThanEditionAlignment,
  originalVersionTimestamp,
} from '@/lib/edition-drift';

describe('originalIsNewerThanEditionAlignment', () => {
  it('senza original_version_at non c\'è avviso', () => {
    expect(
      originalIsNewerThanEditionAlignment({
        originalVersionAt: null,
        originalRevisedAt: '2026-02-01T00:00:00Z',
        originalPublishedAt: '2026-01-01T00:00:00Z',
      })
    ).toBe(false);
  });

  it('originale più recente di revised_at', () => {
    expect(
      originalIsNewerThanEditionAlignment({
        originalVersionAt: '2026-01-10T00:00:00Z',
        originalRevisedAt: '2026-02-01T00:00:00Z',
        originalPublishedAt: '2026-01-01T00:00:00Z',
      })
    ).toBe(true);
  });

  it('allineata alla versione attuale', () => {
    expect(
      originalIsNewerThanEditionAlignment({
        originalVersionAt: '2026-02-01T00:00:00Z',
        originalRevisedAt: '2026-02-01T00:00:00Z',
        originalPublishedAt: '2026-01-01T00:00:00Z',
      })
    ).toBe(false);
  });

  it('usa published_at se revised_at manca', () => {
    expect(
      originalIsNewerThanEditionAlignment({
        originalVersionAt: '2026-01-01T00:00:00Z',
        originalRevisedAt: null,
        originalPublishedAt: '2026-01-15T00:00:00Z',
      })
    ).toBe(true);
  });
});

describe('originalVersionTimestamp', () => {
  it('COALESCE(revised_at, published_at)', () => {
    expect(
      originalVersionTimestamp({ revised_at: '2026-02-01T00:00:00Z', published_at: '2026-01-01T00:00:00Z' })
    ).toBe('2026-02-01T00:00:00Z');
    expect(
      originalVersionTimestamp({ revised_at: null, published_at: '2026-01-01T00:00:00Z' })
    ).toBe('2026-01-01T00:00:00Z');
    expect(originalVersionTimestamp({ revised_at: null, published_at: null })).toBeNull();
  });
});
