import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithAgentAuth = vi.fn();
vi.mock('@/lib/auth-token', () => ({
  fetchWithAgentAuth: (...args: unknown[]) => fetchWithAgentAuth(...args),
}));

import { PHOTO_UPLOAD_MAX_BYTES, uploadBiographyPhoto } from '@/lib/client/biography-photo-upload';

const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'foto.jpg', { type: 'image/jpeg' });
const respond = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  fetchWithAgentAuth.mockReset();
});

describe('uploadBiographyPhoto', () => {
  it('manda il file e il layout al server con una richiesta multipart, e restituisce la riga', async () => {
    fetchWithAgentAuth.mockResolvedValue(respond(201, { media: { id: 'm1' }, medias: [{ id: 'm1' }] }));
    const result = await uploadBiographyPhoto('bio 1', file, 'two-vertical');
    expect(result).toEqual({ ok: true, media: { id: 'm1' }, medias: [{ id: 'm1' }] });

    const [url, init] = fetchWithAgentAuth.mock.calls[0];
    expect(url).toBe('/api/biography/bio%201/media');
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.get('layout')).toBe('two-vertical');
    expect((form.get('file') as File).name).toBe('foto.jpg');
  });

  it('per le copertine unisce i layout con la virgola', async () => {
    fetchWithAgentAuth.mockResolvedValue(respond(201, { media: { id: 'm1' } }));
    const result = await uploadBiographyPhoto('b', file, ['cover', 'cover_a5']);
    expect((fetchWithAgentAuth.mock.calls[0][1].body as FormData).get('layout')).toBe('cover,cover_a5');
    expect(result).toMatchObject({ ok: true, medias: [{ id: 'm1' }] });
  });

  it('traduce i rifiuti del server in codici, con il massimo quando c\'è', async () => {
    const cases: [number, Record<string, unknown>, string][] = [
      [413, { error: 'file_too_large' }, 'file_too_large'],
      [409, { error: 'gallery_limit', max: 15 }, 'gallery_limit'],
      [415, { error: 'unsupported_type' }, 'unsupported_type'],
      [415, { error: 'heic_unsupported' }, 'heic_unsupported'],
      [422, { error: 'corrupt_image' }, 'corrupt_image'],
      [409, { error: 'text_locked' }, 'text_locked'],
      [403, { error: 'biography_frozen' }, 'biography_frozen'],
      [403, { error: 'forbidden' }, 'upload_failed'],
      [500, { error: 'insert_failed' }, 'upload_failed'],
    ];
    for (const [status, body, code] of cases) {
      fetchWithAgentAuth.mockResolvedValue(respond(status, body));
      const result = await uploadBiographyPhoto('b', file, 'full-page');
      expect(result, String(body.error)).toMatchObject({ ok: false, code });
    }
    fetchWithAgentAuth.mockResolvedValue(respond(409, { error: 'gallery_limit', max: 15 }));
    expect(await uploadBiographyPhoto('b', file, 'full-page')).toEqual({ ok: false, code: 'gallery_limit', max: 15 });
  });

  it('un 413 senza JSON (un proxy davanti al server) vale «file troppo grande»', async () => {
    fetchWithAgentAuth.mockResolvedValue({ ok: false, status: 413, json: async () => { throw new Error('no json'); } });
    expect(await uploadBiographyPhoto('b', file, 'full-page')).toEqual({ ok: false, code: 'file_too_large' });
  });

  it('se la richiesta non parte (rete, sessione scaduta) non lancia: restituisce un errore', async () => {
    fetchWithAgentAuth.mockImplementation(async () => {
      throw new Error('Authentication required');
    });
    expect(await uploadBiographyPhoto('b', file, 'full-page')).toEqual({ ok: false, code: 'upload_failed' });
  });

  it('il limite del browser è lo stesso del server: 20 MB', () => {
    expect(PHOTO_UPLOAD_MAX_BYTES).toBe(20 * 1024 * 1024);
  });
});
