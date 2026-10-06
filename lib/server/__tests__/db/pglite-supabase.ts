import type { PGlite } from '@electric-sql/pglite';
import type { AnyClient } from '@/lib/server/service-client';
import { as } from './harness';

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'neq'; col: string; val: unknown }
  | { kind: 'is'; col: string; val: null };

function bindValue(v: unknown): { sql: string; value: unknown } {
  if (v != null && typeof v === 'object') {
    return { sql: '::jsonb', value: JSON.stringify(v) };
  }
  return { sql: '', value: v };
}

/**
 * Adattatore minimo supabase-js → PGlite (service_role) per i test di conversione.
 */
export function pgliteServiceClient(db: PGlite): AnyClient {
  const run = <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
    as<T>(db, 'service_role', null, sql, params);

  function builder(table: string) {
    const filters: Filter[] = [];
    let mode: 'select' | 'insert' | 'update' = 'select';
    let columns = '*';
    let returning = '*';
    let patch: Record<string, unknown> | null = null;
    let insertPayload: Record<string, unknown> | Record<string, unknown>[] | null = null;
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;

    const finish = async (): Promise<{
      data: Record<string, unknown>[] | null;
      error: { message: string; code?: string } | null;
    }> => {
      try {
        if (mode === 'insert') {
          const rows = Array.isArray(insertPayload)
            ? insertPayload
            : [insertPayload as Record<string, unknown>];
          const inserted: Record<string, unknown>[] = [];
          for (const row of rows) {
            const keys = Object.keys(row);
            const binds = keys.map((k) => bindValue(row[k]));
            const cols = keys.join(', ');
            const placeholders = binds.map((b, i) => `$${i + 1}${b.sql}`).join(', ');
            try {
              const out = await run(
                `insert into ${table} (${cols}) values (${placeholders}) returning ${returning}`,
                binds.map((b) => b.value)
              );
              inserted.push(...out);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              if (/duplicate key|unique constraint|23505/i.test(msg)) {
                return { data: null, error: { message: msg, code: '23505' } };
              }
              throw e;
            }
          }
          return { data: inserted, error: null };
        }

        if (mode === 'update') {
          const keys = Object.keys(patch ?? {});
          const binds = keys.map((k) => bindValue((patch as Record<string, unknown>)[k]));
          const sets = keys.map((k, i) => `${k} = $${i + 1}${binds[i].sql}`).join(', ');
          const values = binds.map((b) => b.value);
          const parts: string[] = [];
          const whereParams: unknown[] = [];
          for (const f of filters) {
            if (f.kind === 'is') {
              parts.push(`${f.col} is null`);
              continue;
            }
            whereParams.push(f.val);
            const idx = values.length + whereParams.length;
            parts.push(f.kind === 'eq' ? `${f.col} = $${idx}` : `${f.col} <> $${idx}`);
          }
          const where = parts.length ? ` where ${parts.join(' and ')}` : '';
          const out = await run(`update ${table} set ${sets}${where} returning *`, [
            ...values,
            ...whereParams,
          ]);
          return { data: out, error: null };
        }

        const parts: string[] = [];
        const params: unknown[] = [];
        for (const f of filters) {
          if (f.kind === 'is') {
            parts.push(`${f.col} is null`);
            continue;
          }
          params.push(f.val);
          parts.push(
            f.kind === 'eq' ? `${f.col} = $${params.length}` : `${f.col} <> $${params.length}`
          );
        }
        const where = parts.length ? ` where ${parts.join(' and ')}` : '';
        let sql = `select ${columns} from ${table}${where}`;
        if (orderCol) sql += ` order by ${orderCol} ${orderAsc ? 'asc' : 'desc'}`;
        if (limitN != null) sql += ` limit ${limitN}`;
        const out = await run(sql, params);
        return { data: out, error: null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    const chain: Record<string, unknown> = {};
    chain.select = (cols: string) => {
      if (mode === 'insert' || mode === 'update') {
        returning = cols;
        return chain;
      }
      mode = 'select';
      columns = cols;
      return chain;
    };
    chain.insert = (row: Record<string, unknown> | Record<string, unknown>[]) => {
      mode = 'insert';
      insertPayload = row;
      returning = '*';
      return chain;
    };
    chain.update = (p: Record<string, unknown>) => {
      mode = 'update';
      patch = p;
      return chain;
    };
    chain.eq = (col: string, val: unknown) => {
      filters.push({ kind: 'eq', col, val });
      return chain;
    };
    chain.neq = (col: string, val: unknown) => {
      filters.push({ kind: 'neq', col, val });
      return chain;
    };
    chain.is = (col: string, val: unknown) => {
      if (val !== null) throw new Error('pglite adapter: .is supports only null');
      filters.push({ kind: 'is', col, val: null });
      return chain;
    };
    chain.order = (col: string, opts?: { ascending?: boolean }) => {
      orderCol = col;
      orderAsc = opts?.ascending !== false;
      return chain;
    };
    chain.limit = (n: number) => {
      limitN = n;
      return chain;
    };
    chain.maybeSingle = async () => {
      const res = await finish();
      if (res.error) return { data: null, error: res.error };
      return { data: res.data?.[0] ?? null, error: null };
    };
    chain.single = chain.maybeSingle;
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      finish().then((res) => resolve({ data: res.data, error: res.error }), reject);
    return chain;
  }

  return { from: (table: string) => builder(table) } as unknown as AnyClient;
}
