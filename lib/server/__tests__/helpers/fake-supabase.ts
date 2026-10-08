import type { AnyClient } from '@/lib/server/service-client';

/**
 * Base dati finta in memoria con la parte di supabase-js che il server usa:
 * from().select/insert/update/delete con eq, neq, in, is, not, order, limit,
 * maybeSingle, single. Serve ai test dei percorsi di pubblicazione, dove contano
 * i dati che si leggono e si scrivono, non il modo in cui la chiamata è composta.
 * Non sostituisce le prove sul database vero (banco PGlite in db/).
 */
export type Row = Record<string, unknown>;

export interface FakeDbOptions {
  /** Restituisce un errore per far fallire un update (per esempio l'attesa fra capitoli). */
  failUpdate?: (table: string, patch: Row, row: Row) => { message: string } | null;
  failInsert?: (table: string, row: Row) => { message: string } | null;
  /** Chiamata a ogni update riuscito, nell'ordine in cui avvengono. */
  onUpdate?: (table: string, patch: Row, row: Row) => void;
}

export interface FakeDb {
  client: AnyClient;
  tables: Record<string, Row[]>;
  /** Tutte le scritture nell'ordine: utile per verificare "prima questo, poi quello". */
  log: Array<{ op: 'insert' | 'update' | 'delete'; table: string; data: Row }>;
}

let counter = 0;

export function createFakeDb(seed: Record<string, Row[]> = {}, options: FakeDbOptions = {}): FakeDb {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
  const log: FakeDb['log'] = [];

  const rowsOf = (table: string): Row[] => (tables[table] ??= []);

  function builder(table: string) {
    type Filter = (row: Row) => boolean;
    const filters: Filter[] = [];
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row | Row[] | null = null;
    let orderBy: { col: string; asc: boolean } | null = null;
    let max: number | null = null;
    let wantsRows = false;
    let headOnly = false;

    const chain: Record<string, unknown> = {};

    const matching = () => rowsOf(table).filter((r) => filters.every((f) => f(r)));

    function run(): {
      data: Row[] | null;
      error: { message: string } | null;
      count: number | null;
    } {
      if (op === 'insert') {
        const inserted: Row[] = [];
        for (const item of Array.isArray(payload) ? payload : [payload as Row]) {
          const row: Row = {
            id: `${table}-${++counter}`,
            created_at: new Date(Date.UTC(2026, 8, 30, 0, 0, 0, counter)).toISOString(),
            ...item,
          };
          const err = options.failInsert?.(table, row) ?? null;
          if (err) return { data: null, error: err, count: null };
          rowsOf(table).push(row);
          log.push({ op: 'insert', table, data: row });
          inserted.push(row);
        }
        return { data: inserted, error: null, count: inserted.length };
      }
      if (op === 'update') {
        const hit = matching();
        for (const row of hit) {
          const err = options.failUpdate?.(table, payload as Row, row) ?? null;
          if (err) return { data: null, error: err, count: null };
        }
        for (const row of hit) {
          Object.assign(row, payload as Row);
          log.push({ op: 'update', table, data: { ...(payload as Row), id: row.id } });
          options.onUpdate?.(table, payload as Row, row);
        }
        return { data: hit, error: null, count: hit.length };
      }
      if (op === 'delete') {
        const hit = matching();
        tables[table] = rowsOf(table).filter((r) => !hit.includes(r));
        for (const row of hit) log.push({ op: 'delete', table, data: row });
        return { data: hit, error: null, count: hit.length };
      }
      let out = matching();
      const count = out.length;
      if (orderBy) {
        const { col, asc } = orderBy;
        out = [...out].sort((a, b) => {
          const x = String(a[col] ?? '');
          const y = String(b[col] ?? '');
          return asc ? x.localeCompare(y) : y.localeCompare(x);
        });
      }
      if (max != null) out = out.slice(0, max);
      return { data: headOnly ? [] : out, error: null, count };
    }

    chain.select = (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      wantsRows = true;
      headOnly = opts?.head === true;
      return chain;
    };
    chain.insert = (rows: Row | Row[]) => {
      op = 'insert';
      payload = rows;
      return chain;
    };
    chain.update = (patch: Row) => {
      op = 'update';
      payload = patch;
      return chain;
    };
    chain.delete = () => {
      op = 'delete';
      return chain;
    };
    chain.eq = (col: string, val: unknown) => (filters.push((r) => r[col] === val), chain);
    chain.neq = (col: string, val: unknown) => (filters.push((r) => r[col] !== val), chain);
    chain.in = (col: string, vals: unknown[]) => (filters.push((r) => vals.includes(r[col])), chain);
    chain.is = (col: string, val: unknown) => (filters.push((r) => (r[col] ?? null) === val), chain);
    chain.not = (col: string, _op: string, val: unknown) => (filters.push((r) => (r[col] ?? null) !== val), chain);
    chain.gte = (col: string, val: unknown) => (
      filters.push((r) => String(r[col] ?? '') >= String(val)),
      chain
    );
    chain.or = () => chain;
    chain.order = (col: string, opts?: { ascending?: boolean }) => {
      orderBy = { col, asc: opts?.ascending !== false };
      return chain;
    };
    chain.limit = (n: number) => {
      max = n;
      return chain;
    };
    const single = async () => {
      const res = run();
      return { data: res.data?.[0] ?? null, error: res.error, count: res.count };
    };
    chain.maybeSingle = single;
    chain.single = single;
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      const res = run();
      const value =
        wantsRows || op === 'select'
          ? res
          : { data: null, error: res.error, count: res.count };
      return Promise.resolve(value).then(resolve, reject);
    };
    return chain;
  }

  const client = {
    from: (table: string) => builder(table),
    rpc: async (_name: string, _args?: Record<string, unknown>) => ({ data: true, error: null }),
  } as unknown as AnyClient;

  return { client, tables, log };
}
