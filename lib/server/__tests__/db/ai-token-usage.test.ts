import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CAP_COUNTED_PURPOSES, checkAuthorTokenCap, loadPeriodUsage } from '@/lib/ai/token-caps';
import { AI_PURPOSES } from '@/lib/ai/usage-recorder';
import type { AnyClient } from '@/lib/server/service-client';
import { U, as, createTestDb, errorOf, reseed } from './harness';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await reseed(db);
  await db.exec('update public.ai_author_token_limits set daily_tokens = null, weekly_tokens = null, monthly_tokens = null');
});

async function usage(userId: string, purpose: string, tokens: number, at: string) {
  await db.query(
    `insert into ai_token_usage (user_id, purpose, model, prompt_tokens, completion_tokens, total_tokens, created_at)
     values ($1, $2, 'm', $3, 0, $3, $4)`,
    [userId, purpose, tokens, at]
  );
}

/** Adattatore minimo con la stessa forma del client Supabase usata da token-caps. */
function dbAsServiceClient(): AnyClient {
  return {
    rpc: async (_name: string, args: { p_user_id: string; p_now: string; p_purposes: string[] }) => {
      const r = await db.query(`select * from ai_author_token_usage($1, $2, $3)`, [
        args.p_user_id,
        args.p_now,
        args.p_purposes,
      ]);
      return { data: r.rows, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            const r = await db.query('select daily_tokens, weekly_tokens, monthly_tokens from ai_author_token_limits');
            return { data: r.rows[0] ?? null, error: null };
          },
        }),
      }),
    }),
  } as unknown as AnyClient;
}

describe('ai_token_usage: chi legge e chi scrive', () => {
  it('l\'utente legge solo le proprie righe, lo staff legge tutto', async () => {
    await usage(U.author, 'echo', 10, '2026-09-30T10:00:00Z');
    await usage(U.other, 'echo', 20, '2026-09-30T10:00:00Z');
    const own = await as(db, 'authenticated', U.author, 'select user_id from ai_token_usage');
    expect(own.map((r) => (r as { user_id: string }).user_id)).toEqual([U.author]);
    const all = await as(db, 'authenticated', U.staff, 'select user_id from ai_token_usage');
    expect(all).toHaveLength(2);
  });

  it('scrive solo il ruolo di servizio', async () => {
    const insert = `insert into ai_token_usage (user_id, purpose, total_tokens) values ($1, 'echo', 5)`;
    expect(await errorOf(() => as(db, 'authenticated', U.author, insert, [U.author]))).toBeTruthy();
    expect(await errorOf(() => as(db, 'anon', null, insert, [U.author]))).toBeTruthy();
    expect(await errorOf(() => as(db, 'service_role', null, insert, [U.author]))).toBeNull();
    const del = await errorOf(() => as(db, 'authenticated', U.author, 'delete from ai_token_usage'));
    expect(del).toBeTruthy();
  });

  it('ammette solo gli scopi previsti e l\'unità in coppia col valore', async () => {
    const bad = await errorOf(() =>
      as(db, 'service_role', null, `insert into ai_token_usage (user_id, purpose) values ($1, 'platform_guide')`, [U.author])
    );
    expect(bad).toBeTruthy();
    const unpaired = await errorOf(() =>
      as(db, 'service_role', null, `insert into ai_token_usage (user_id, purpose, usage_unit) values ($1, 'tts', 'characters')`, [U.author])
    );
    expect(unpaired).toBeTruthy();
    const ok = await errorOf(() =>
      as(db, 'service_role', null, `insert into ai_token_usage (user_id, purpose, usage_unit, usage_units) values ($1, 'tts', 'characters', 120)`, [U.author])
    );
    expect(ok).toBeNull();
    const bytes = await errorOf(() =>
      as(db, 'service_role', null, `insert into ai_token_usage (user_id, purpose, usage_unit, usage_units) values ($1, 'transcription', 'bytes', 48000)`, [U.author])
    );
    expect(bytes).toBeNull();
    const invented = await errorOf(() =>
      as(db, 'service_role', null, `insert into ai_token_usage (user_id, purpose, usage_unit, usage_units) values ($1, 'transcription', 'tokens', 10)`, [U.author])
    );
    expect(invented).toBeTruthy();
  });

  it('i valori della tabella coincidono con gli scopi del codice', async () => {
    for (const purpose of AI_PURPOSES) {
      const err = await errorOf(() =>
        as(db, 'service_role', null, `insert into ai_token_usage (user_id, purpose) values ($1, $2)`, [U.author, purpose])
      );
      expect(err, purpose).toBeNull();
    }
  });
});

describe('tetti: periodi di calendario nel fuso Europe/Zurich', () => {
  const NOW = '2026-09-30T12:00:00Z'; // 14:00 a Zurigo

  async function seedPeriods() {
    await usage(U.author, 'echo', 100, '2026-09-30T10:00:00Z'); // oggi
    await usage(U.author, 'grammar', 50, '2026-09-29T21:59:59Z'); // ieri 23:59:59 a Zurigo, stessa settimana
    await usage(U.author, 'echo', 1000, '2026-09-27T21:59:59Z'); // domenica 23:59:59, settimana scorsa, stesso mese
    await usage(U.author, 'echo', 10000, '2026-08-31T21:59:59Z'); // 31 agosto 23:59:59, mese scorso
    await usage(U.other, 'echo', 777, '2026-09-30T10:00:00Z'); // un altro autore
  }

  it('somma giorno, settimana e mese di calendario, non finestre mobili', async () => {
    await seedPeriods();
    const [row] = (await db.query(`select * from ai_author_token_usage($1, $2)`, [U.author, NOW])).rows as Array<
      Record<string, unknown>
    >;
    expect(Number(row.daily_tokens)).toBe(100);
    expect(Number(row.weekly_tokens)).toBe(150);
    expect(Number(row.monthly_tokens)).toBe(1150);
  });

  it('indica quando ogni periodo si riapre (mezzanotte di Zurigo)', async () => {
    const [row] = (await db.query(`select * from ai_author_token_usage($1, $2)`, [U.author, NOW])).rows as Array<
      Record<string, string | Date>
    >;
    const iso = (v: string | Date) => new Date(v).toISOString();
    expect(iso(row.daily_resets_at)).toBe('2026-09-30T22:00:00.000Z'); // 1 ottobre 00:00 CEST
    expect(iso(row.weekly_resets_at)).toBe('2026-10-04T22:00:00.000Z'); // lunedì 5 ottobre 00:00 CEST
    expect(iso(row.monthly_resets_at)).toBe('2026-09-30T22:00:00.000Z'); // 1 ottobre 00:00 CEST
  });

  it('regge il cambio all\'ora solare (il giorno del 25 ottobre dura 25 ore)', async () => {
    const [row] = (await db.query(`select * from ai_author_token_usage($1, $2)`, [U.author, '2026-10-25T12:00:00Z'])).rows as Array<
      Record<string, string | Date>
    >;
    expect(new Date(row.daily_resets_at).toISOString()).toBe('2026-10-25T23:00:00.000Z'); // 26 ottobre 00:00 CET
  });

  it('conta solo echo e grammar: screening, preprint_check, embedding e memory_compression non entrano mai', async () => {
    await usage(U.author, 'echo', 10, '2026-09-30T10:00:00Z');
    await usage(U.author, 'grammar', 5, '2026-09-30T10:00:00Z');
    for (const purpose of ['screening', 'preprint_check', 'embedding', 'memory_compression']) {
      await usage(U.author, purpose, 1_000_000, '2026-09-30T10:00:00Z');
    }
    await db.query(
      `insert into ai_token_usage (user_id, purpose, usage_unit, usage_units, created_at) values ($1, 'tts', 'characters', 900000, '2026-09-30T10:00:00Z')`,
      [U.author]
    );
    const [row] = (await db.query(`select * from ai_author_token_usage($1, $2)`, [U.author, NOW])).rows as Array<
      Record<string, unknown>
    >;
    expect(Number(row.daily_tokens)).toBe(15);
    expect(Number(row.monthly_tokens)).toBe(15);
  });

  it('l\'elenco predefinito della funzione è quello del codice', async () => {
    expect([...CAP_COUNTED_PURPOSES]).toEqual(['echo', 'grammar']);
    await usage(U.author, 'echo', 10, '2026-09-30T10:00:00Z');
    await usage(U.author, 'screening', 99, '2026-09-30T10:00:00Z');
    const withDefault = (await db.query(`select daily_tokens from ai_author_token_usage($1, $2)`, [U.author, NOW])).rows[0] as {
      daily_tokens: string;
    };
    const withCode = (
      await db.query(`select daily_tokens from ai_author_token_usage($1, $2, $3)`, [U.author, NOW, [...CAP_COUNTED_PURPOSES]])
    ).rows[0] as { daily_tokens: string };
    expect(Number(withDefault.daily_tokens)).toBe(10);
    expect(withCode.daily_tokens).toBe(withDefault.daily_tokens);
  });

  it('se total_tokens manca, somma prompt e completion', async () => {
    await db.query(
      `insert into ai_token_usage (user_id, purpose, prompt_tokens, completion_tokens, created_at) values ($1, 'echo', 30, 12, '2026-09-30T10:00:00Z')`,
      [U.author]
    );
    const [row] = (await db.query(`select daily_tokens from ai_author_token_usage($1, $2)`, [U.author, NOW])).rows as Array<{
      daily_tokens: string;
    }>;
    expect(Number(row.daily_tokens)).toBe(42);
  });
});

describe('tetti: il blocco e la riapertura', () => {
  const NOW = new Date('2026-09-30T12:00:00Z');
  const NEXT_DAY = new Date('2026-10-01T10:00:00Z');

  it('con i tetti disattivati (nulli) non blocca mai', async () => {
    await usage(U.author, 'echo', 99_000_000, '2026-09-30T10:00:00Z');
    const decision = await checkAuthorTokenCap(dbAsServiceClient(), U.author, { isStaff: false, now: NOW });
    expect(decision).toEqual({ allowed: true });
  });

  it('blocca quando il tetto giornaliero è superato e si riapre il giorno dopo', async () => {
    await db.exec('update ai_author_token_limits set daily_tokens = 100');
    await usage(U.author, 'echo', 100, '2026-09-30T10:00:00Z');

    const blocked = await checkAuthorTokenCap(dbAsServiceClient(), U.author, { isStaff: false, now: NOW });
    expect(blocked).toMatchObject({ allowed: false, period: 'day', limit: 100, used: 100 });
    expect(blocked.allowed === false && new Date(blocked.resetsAt).toISOString()).toBe('2026-09-30T22:00:00.000Z');

    const reopened = await checkAuthorTokenCap(dbAsServiceClient(), U.author, { isStaff: false, now: NEXT_DAY });
    expect(reopened).toEqual({ allowed: true });
  });

  it('blocca sul tetto settimanale e su quello mensile, e si riapre con il periodo successivo', async () => {
    await db.exec('update ai_author_token_limits set weekly_tokens = 150, monthly_tokens = 1000');
    await usage(U.author, 'echo', 100, '2026-09-30T10:00:00Z');
    await usage(U.author, 'grammar', 50, '2026-09-29T21:59:59Z');

    const weekly = await checkAuthorTokenCap(dbAsServiceClient(), U.author, { isStaff: false, now: NOW });
    expect(weekly).toMatchObject({ allowed: false, period: 'week', used: 150 });

    const nextWeek = await checkAuthorTokenCap(dbAsServiceClient(), U.author, {
      isStaff: false,
      now: new Date('2026-10-05T10:00:00Z'),
    });
    expect(nextWeek).toEqual({ allowed: true });

    await usage(U.author, 'echo', 2000, '2026-09-10T10:00:00Z');
    const monthly = await checkAuthorTokenCap(dbAsServiceClient(), U.author, {
      isStaff: false,
      now: new Date('2026-10-05T10:00:00Z'),
    });
    expect(monthly).toEqual({ allowed: true }); // ottobre è un altro mese
    const september = await checkAuthorTokenCap(dbAsServiceClient(), U.author, { isStaff: false, now: NOW });
    expect(september).toMatchObject({ allowed: false });
  });

  it('screening e controllo finale non contano: con il tetto esaurito l\'autore può comunque pubblicare', async () => {
    await db.exec('update ai_author_token_limits set daily_tokens = 100');
    await usage(U.author, 'screening', 5_000_000, '2026-09-30T10:00:00Z');
    await usage(U.author, 'preprint_check', 5_000_000, '2026-09-30T10:00:00Z');
    await usage(U.author, 'embedding', 5_000_000, '2026-09-30T10:00:00Z');
    await usage(U.author, 'memory_compression', 5_000_000, '2026-09-30T10:00:00Z');
    const decision = await checkAuthorTokenCap(dbAsServiceClient(), U.author, { isStaff: false, now: NOW });
    expect(decision).toEqual({ allowed: true });
    const usageNow = await loadPeriodUsage(dbAsServiceClient(), U.author, NOW);
    expect(usageNow.daily).toBe(0);
  });

  it('lo staff è esente dal tetto', async () => {
    await db.exec('update ai_author_token_limits set daily_tokens = 1');
    await usage(U.staff, 'echo', 10_000, '2026-09-30T10:00:00Z');
    const decision = await checkAuthorTokenCap(dbAsServiceClient(), U.staff, { isStaff: true, now: NOW });
    expect(decision).toEqual({ allowed: true });
  });
});
