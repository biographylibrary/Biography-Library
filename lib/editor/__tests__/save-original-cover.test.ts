import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadBiographyPhoto = vi.fn();
vi.mock('@/lib/client/biography-photo-upload', () => ({
  uploadBiographyPhoto: (...args: unknown[]) => uploadBiographyPhoto(...args),
}));

// Il browser non deve più toccare il bucket né la tabella da questo percorso: se lo facesse, il test fallisce.
vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy({}, { get: () => { throw new Error('saveOriginalCoverJpeg non deve usare il client Supabase del browser'); } }),
}));

import { saveOriginalCoverJpeg } from '@/lib/editor/save-original-cover';

const JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString('base64');

beforeEach(() => {
  uploadBiographyPhoto.mockReset();
});

describe('saveOriginalCoverJpeg', () => {
  it('manda l\'immagine al server come copertina e copertina A5 in una sola chiamata', async () => {
    uploadBiographyPhoto.mockResolvedValue({ ok: true, media: { id: 'm' }, medias: [] });
    await saveOriginalCoverJpeg({ biographyId: 'bio-1', userId: 'user-1', jpegBase64: JPEG_BASE64 });

    expect(uploadBiographyPhoto).toHaveBeenCalledTimes(1);
    const [biographyId, file, layouts] = uploadBiographyPhoto.mock.calls[0];
    expect(biographyId).toBe('bio-1');
    expect(layouts).toEqual(['cover', 'cover_a5']);
    expect((file as File).name).toBe('original-cover.jpg');
    expect((file as File).type).toBe('image/jpeg');
    expect(Array.from(new Uint8Array(await (file as File).arrayBuffer()))).toEqual([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  });

  it('se il server rifiuta, lancia, così il dialogo di importazione mostra l\'errore', async () => {
    uploadBiographyPhoto.mockResolvedValue({ ok: false, code: 'text_locked' });
    await expect(saveOriginalCoverJpeg({ biographyId: 'b', jpegBase64: JPEG_BASE64 })).rejects.toThrow('text_locked');
  });

  it('non richiede più l\'identificativo dell\'utente: lo ricava il server dal token', async () => {
    uploadBiographyPhoto.mockResolvedValue({ ok: true, media: {}, medias: [] });
    await expect(saveOriginalCoverJpeg({ biographyId: 'b', jpegBase64: JPEG_BASE64 })).resolves.toBeUndefined();
  });
});
