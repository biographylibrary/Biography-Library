import { beforeEach, describe, expect, it } from 'vitest';
import { createFakeDb, type FakeDb } from '@/lib/server/__tests__/helpers/fake-supabase';
import {
  AI_FEATURES_DISABLED_ERROR,
  assertAiFeaturesEnabled,
} from '@/lib/server/require-ai-features';

let db: FakeDb;

beforeEach(() => {
  db = createFakeDb({
    profiles: [{ id: 'user-1', ai_features_enabled: true }],
  });
});

describe('assertAiFeaturesEnabled', () => {
  it('ok quando il flag è true', async () => {
    expect(await assertAiFeaturesEnabled(db.client, 'user-1')).toEqual({ ok: true });
  });

  it('403 ai_features_disabled quando il flag è false', async () => {
    db.tables.profiles[0].ai_features_enabled = false;
    expect(await assertAiFeaturesEnabled(db.client, 'user-1')).toEqual({
      ok: false,
      status: 403,
      error: AI_FEATURES_DISABLED_ERROR,
    });
  });

  it('prova di rottura: senza lettura del flag il gate non rifiuta', async () => {
    db.tables.profiles[0].ai_features_enabled = false;
    const gate = await assertAiFeaturesEnabled(db.client, 'user-1');
    // Se qualcuno rimuove il controllo sul flag, questo assert deve diventare rosso.
    expect(gate.ok).toBe(false);
    expect(gate).toMatchObject({ status: 403, error: AI_FEATURES_DISABLED_ERROR });
  });
});
