import { describe, expect, it } from 'vitest';
import { erasePriorContent } from '@/lib/server/erase-prior-content';

describe('erasePriorContent', () => {
  it('clears the five stores and keeps the destroyed version in index.json', async () => {
    const calls: { table?: string; op: string; payload?: unknown; bucket?: string; path?: string }[] = [];
    let uploaded = '';

    function chain(table: string) {
      let op = 'select';
      let payload: unknown;
      const api: Record<string, unknown> = {
        select() {
          op = 'select';
          return api;
        },
        update(value: unknown) {
          op = 'update';
          payload = value;
          return api;
        },
        delete() {
          op = 'delete';
          return api;
        },
        insert(value: unknown) {
          calls.push({ table, op: 'insert', payload: value });
          return { error: null };
        },
        eq() {
          return api;
        },
        order() {
          return api;
        },
        limit() {
          return api;
        },
        maybeSingle: async () => {
          if (table === 'biographies') {
            return {
              data: {
                id: 'bio-1',
                um_id: 'UM-0000-K3NQ-7FX2-MVP4',
                user_id: 'author',
                record_language_tag: 'it',
                content_language: 'it',
              },
              error: null,
            };
          }
          if (table === 'moderation_reports') {
            return { data: { id: 'report-1', assigned_to: 'staff', reporter_id: 'reporter' }, error: null };
          }
          return { data: null, error: null };
        },
        then(resolve: (value: unknown) => void) {
          calls.push({ table, op, payload });
          if (table === 'archive_package_versions' && op === 'select') {
            resolve({
              data: [
                {
                  version_number: 1,
                  generated_at: '2026-09-01T00:00:00.000Z',
                  manifest_sha256: 'a'.repeat(64),
                  reason: 'publication',
                  status: 'stored',
                },
              ],
              error: null,
            });
            return;
          }
          resolve({ data: null, error: null });
        },
      };
      return api;
    }

    const svc = {
      from: (table: string) => chain(table),
      storage: {
        from: (bucket: string) => ({
          list: async () => ({ data: [{ name: 'biography.md', id: 'file-1' }], error: null }),
          remove: async (keys: string[]) => {
            calls.push({ op: 'remove', bucket, payload: keys });
            return { error: null };
          },
          upload: async (path: string, body: Buffer) => {
            uploaded = body.toString('utf8');
            calls.push({ op: 'upload', bucket, path });
            return { error: null };
          },
        }),
      },
    };

    const result = await erasePriorContent(svc as never, 'bio-1', 'data_protection');
    expect(result.removed).toEqual([
      'archive/v1',
      'content_html_legacy',
      'revision_history',
      'export_pdf',
      'biography_chunks',
    ]);
    expect(calls.some((call) => call.bucket === 'archive' && call.op === 'remove')).toBe(true);
    expect(calls.some((call) => call.table === 'biographies' && call.op === 'update' && (call.payload as { content_html_legacy?: null }).content_html_legacy === null)).toBe(true);
    expect(calls.some((call) => call.table === 'biography_sections' && call.op === 'update')).toBe(true);
    expect(calls.some((call) => call.bucket === 'biography-exports' && call.op === 'remove')).toBe(true);
    expect(calls.some((call) => call.table === 'biography_chunks' && call.op === 'delete')).toBe(true);
    expect(calls.some((call) => call.table === 'moderation_messages' && call.op === 'insert')).toBe(true);
    const index = JSON.parse(uploaded) as { versions: { status: string; reason: string }[] };
    expect(index.versions[0]).toMatchObject({ status: 'destroyed', reason: 'data_protection' });
    expect(calls.some((call) => Array.isArray(call.payload) && (call.payload as string[]).some((key) => key.endsWith('/v1/biography.md')))).toBe(true);
  });
});