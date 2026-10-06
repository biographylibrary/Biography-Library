import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

/**
 * POST /api/biography/[id]/media: il browser manda la foto al server, che la controlla, la elabora
 * e la scrive nel bucket con il ruolo di servizio. Il database e il bucket sono finti; le
 * immagini e l'elaborazione sono veri.
 */

const getAuthenticatedUser = vi.fn();

type Row = Record<string, unknown>;
const state: {
  resolved: string | null;
  profile: Row | null;
  bio: Row | null;
  galleryRows: { display_order: number | null }[];
  coverRows: { id: string; file_url: string }[];
  uploadError: { message: string } | null;
  insertError: { message: string } | null;
  /** Se impostato, l'inserimento numero N (da 1) fallisce con insertError, gli altri riescono. */
  insertFailsAtCall: number | null;
} = {
  resolved: 'bio-1',
  profile: null,
  bio: null,
  galleryRows: [],
  coverRows: [],
  uploadError: null,
  insertError: null,
  insertFailsAtCall: null,
};

const uploads: { bucket: string; path: string; data: Buffer; opts: Row }[] = [];
const removed: string[][] = [];
const inserted: Row[] = [];
const deletedIds: unknown[] = [];

function builder(table: string) {
  let op: 'select' | 'insert' | 'delete' = 'select';
  let payload: Row = {};
  let cols = '';
  const filters: Record<string, unknown> = {};
  const b: Record<string, unknown> = {
    select(c?: string) {
      cols = c ?? '';
      return b;
    },
    insert(p: Row) {
      op = 'insert';
      payload = p;
      return b;
    },
    delete() {
      op = 'delete';
      return b;
    },
    eq(k: string, v: unknown) {
      filters[k] = v;
      return b;
    },
    in(k: string, v: unknown) {
      filters[k] = v;
      return b;
    },
    not() {
      return b;
    },
    maybeSingle: async () => ({
      data: table === 'profiles' ? state.profile : table === 'biographies' ? state.bio : null,
      error: null,
    }),
    single: async () => {
      if (op === 'insert') {
        const call = inserted.length + 1;
        if (state.insertError && (state.insertFailsAtCall === null || state.insertFailsAtCall === call)) {
          return { data: null, error: state.insertError };
        }
        const row = { id: `media-new-${call}`, ...payload };
        inserted.push(row);
        return { data: row, error: null };
      }
      return { data: null, error: null };
    },
    // `await builder`: select di più righe, o delete.
    then(resolve: (v: unknown) => unknown) {
      if (op === 'delete') {
        deletedIds.push(filters.id);
        return resolve({ error: null });
      }
      if (table === 'biography_media' && cols.includes('display_order')) return resolve({ data: state.galleryRows, error: null });
      if (table === 'biography_media' && cols.includes('file_url')) return resolve({ data: state.coverRows, error: null });
      return resolve({ data: [], error: null });
    },
  };
  return b;
}

vi.mock('@/lib/server/onboarding-api-auth', () => ({
  getAuthenticatedUser: (req: unknown) => getAuthenticatedUser(req),
}));

vi.mock('@/lib/server/service-client', () => ({
  buildServiceClient: () => ({
    from: (table: string) => builder(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, data: Buffer, opts: Row) => {
          uploads.push({ bucket, path, data, opts });
          return { error: state.uploadError };
        },
        remove: async (paths: string[]) => {
          removed.push(paths);
          return { error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/biography-photos/${path}` },
        }),
      }),
    },
  }),
}));

vi.mock('@/lib/server/biography-view-access', () => ({
  resolveBiographyId: async () => state.resolved,
}));

import { POST } from '@/app/api/biography/[id]/media/route';
import { MAX_BIOGRAPHY_GALLERY_PHOTOS } from '@/lib/biography-media-constants';
import { MAX_UPLOAD_BYTES } from '@/lib/server/photo-processing';

const BIO_ID = 'bio-1';

const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 90, g: 120, b: 150 } } }).jpeg({ quality: 90 }).toBuffer();

function upload(
  file: Buffer | Blob | string | null,
  fields: Record<string, string> = {},
  headers: Record<string, string> = {},
  fileName = 'foto.jpg'
) {
  const form = new FormData();
  if (typeof file === 'string') {
    form.set('file', file); // un campo di testo, non un file
  } else if (file !== null) {
    form.set('file', new Blob([file as BlobPart]), fileName);
  }
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new NextRequest(`http://localhost/api/biography/${BIO_ID}/media`, {
    method: 'POST',
    headers: { authorization: 'Bearer jwt', ...headers },
    body: form,
  });
}

const call = (req: NextRequest) => POST(req, { params: { id: BIO_ID } });

beforeEach(() => {
  vi.clearAllMocks();
  uploads.length = 0;
  removed.length = 0;
  inserted.length = 0;
  deletedIds.length = 0;
  getAuthenticatedUser.mockResolvedValue({ user: { id: 'owner-1' } });
  state.resolved = BIO_ID;
  state.profile = { account_status: 'active' };
  state.bio = { user_id: 'owner-1', status: 'draft', is_frozen: false };
  state.galleryRows = [];
  state.coverRows = [];
  state.uploadError = null;
  state.insertError = null;
  state.insertFailsAtCall = null;
});

const nothingWritten = () => {
  expect(uploads).toHaveLength(0);
  expect(inserted).toHaveLength(0);
};

describe('POST /api/biography/[id]/media: chi può caricare', () => {
  it('rifiuta chi non è autenticato', async () => {
    getAuthenticatedUser.mockResolvedValue({ error: 'Authentication required', status: 401 });
    const res = await call(upload(await jpeg(100, 100)));
    expect(res.status).toBe(401);
    nothingWritten();
  });

  it('rifiuta chi non è proprietario della biografia, anche se è autenticato', async () => {
    state.bio = { user_id: 'someone-else', status: 'draft', is_frozen: false };
    const res = await call(upload(await jpeg(100, 100)));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden');
    nothingWritten();
  });

  it('rifiuta un account non attivo (lista d\'attesa o sospeso)', async () => {
    for (const account_status of ['waitlist', 'suspended']) {
      state.profile = { account_status };
      const res = await call(upload(await jpeg(100, 100)));
      expect(res.status, account_status).toBe(403);
      expect((await res.json()).error).toBe('account_not_active');
    }
    nothingWritten();
  });

  it('rifiuta una biografia congelata', async () => {
    state.bio = { user_id: 'owner-1', status: 'draft', is_frozen: true };
    const res = await call(upload(await jpeg(100, 100)));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('biography_frozen');
    nothingWritten();
  });

  it('rifiuta una biografia in uno stato in cui il testo non si scrive (pubblicata, in revisione)', async () => {
    for (const status of ['published', 'under_review', 'locked_pending_screening', 'removed']) {
      state.bio = { user_id: 'owner-1', status, is_frozen: false };
      const res = await call(upload(await jpeg(100, 100)));
      expect(res.status, status).toBe(409);
      expect((await res.json()).error).toBe('text_locked');
    }
    nothingWritten();
  });

  it('accetta gli stati di lavoro, bozza PDF compresa', async () => {
    for (const status of ['draft', 'sections_complete', 'final_version', 'pdf_draft', 'revision_requested']) {
      state.bio = { user_id: 'owner-1', status, is_frozen: false };
      const res = await call(upload(await jpeg(300, 200)));
      expect(res.status, status).toBe(201);
    }
  });

  it('risponde 404 se la biografia non esiste', async () => {
    state.resolved = null;
    expect((await call(upload(await jpeg(100, 100)))).status).toBe(404);
    state.resolved = BIO_ID;
    state.bio = null;
    expect((await call(upload(await jpeg(100, 100)))).status).toBe(404);
    nothingWritten();
  });
});

describe('POST /api/biography/[id]/media: limiti', () => {
  it(`rifiuta la foto numero ${MAX_BIOGRAPHY_GALLERY_PHOTOS + 1} di galleria`, async () => {
    state.galleryRows = Array.from({ length: MAX_BIOGRAPHY_GALLERY_PHOTOS }, (_, i) => ({ display_order: i }));
    const res = await call(upload(await jpeg(300, 200)));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'gallery_limit', max: 15 });
    nothingWritten();
  });

  it('accetta la quindicesima, e il suo ordine segue l\'ultima', async () => {
    state.galleryRows = Array.from({ length: MAX_BIOGRAPHY_GALLERY_PHOTOS - 1 }, (_, i) => ({ display_order: i * 2 }));
    const res = await call(upload(await jpeg(300, 200)));
    expect(res.status).toBe(201);
    expect(inserted[0]).toMatchObject({ layout: 'full-page', display_order: (MAX_BIOGRAPHY_GALLERY_PHOTOS - 2) * 2 + 1 });
  });

  it('le copertine non contano per il limite: con la galleria piena si può cambiare la copertina', async () => {
    state.galleryRows = Array.from({ length: MAX_BIOGRAPHY_GALLERY_PHOTOS }, (_, i) => ({ display_order: i }));
    const res = await call(upload(await jpeg(300, 200), { layout: 'cover' }));
    expect(res.status).toBe(201);
  });

  it('rifiuta un file oltre 20 MB', async () => {
    const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0xff);
    const res = await call(upload(big));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: 'file_too_large', maxBytes: 20 * 1024 * 1024 });
    nothingWritten();
  });

  it('rifiuta un corpo dichiarato oltre 20 MB prima ancora di leggerlo', async () => {
    const res = await call(upload(await jpeg(100, 100), {}, { 'content-length': String(MAX_UPLOAD_BYTES + 2 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    nothingWritten();
  });
});

describe('POST /api/biography/[id]/media: il file', () => {
  it('rifiuta un file «.jpg» che non è un\'immagine (testo, HTML, PDF), e non scrive nulla', async () => {
    for (const content of ["non sono un'immagine", '<html><script>alert(1)</script></html>', '%PDF-1.7 1 0 obj']) {
      const res = await call(upload(Buffer.from(content), {}, {}, 'foto.jpg'));
      expect(res.status, content).toBe(415);
      expect((await res.json()).error).toBe('unsupported_type');
    }
    nothingWritten();
  });

  it('rifiuta un\'immagine danneggiata', async () => {
    const good = await jpeg(1200, 900);
    const res = await call(upload(good.subarray(0, Math.floor(good.length / 2))));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('corrupt_image');
    nothingWritten();
  });

  it('un HEIC che il server non decodifica dà un messaggio chiaro, non un errore generico', async () => {
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(200, 7)]);
    const res = await call(upload(heic, {}, {}, 'IMG_0001.HEIC'));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe('heic_unsupported');
    nothingWritten();
  });

  it('rifiuta una richiesta senza file, con un layout sconosciuto o che non è un modulo', async () => {
    const noFile = await call(upload(null, { layout: 'full-page' }));
    expect(noFile.status).toBe(400);
    expect((await noFile.json()).error).toBe('file_missing');

    const fileAsText = await call(upload('testo al posto del file'));
    expect(fileAsText.status).toBe(400);

    const badLayout = await call(upload(await jpeg(100, 100), { layout: 'diagonale' }));
    expect(badLayout.status).toBe(400);
    expect((await badLayout.json()).error).toBe('invalid_layout');

    const json = new NextRequest(`http://localhost/api/biography/${BIO_ID}/media`, {
      method: 'POST',
      headers: { authorization: 'Bearer jwt', 'content-type': 'application/json' },
      body: JSON.stringify({ file: 'x' }),
    });
    expect((await call(json)).status).toBe(400);
    nothingWritten();
  });
});

describe('POST /api/biography/[id]/media: copertina «originale» (cover e cover_a5 insieme)', () => {
  it('un file, scritto una volta, e due righe che lo usano: una per layout', async () => {
    const res = await call(upload(await jpeg(5000, 3000), { layout: 'cover,cover_a5' }, {}, 'original-cover.jpg'));
    expect(res.status).toBe(201);
    expect(uploads).toHaveLength(1);
    expect(inserted.map((r) => r.layout)).toEqual(['cover', 'cover_a5']);
    expect(new Set(inserted.map((r) => r.file_url)).size).toBe(1);
    expect(inserted.every((r) => r.file_name === 'original-cover.jpg')).toBe(true);
    const body = await res.json();
    expect(body.medias).toHaveLength(2);
    expect(body.media).toMatchObject({ layout: 'cover' });
    // Copertina: lato lungo fino a 3100 pixel.
    const meta = await sharp(uploads[0].data).metadata();
    expect([meta.width, meta.height]).toEqual([3100, 1860]);
  });

  it('toglie le righe e il file delle due copertine di prima, ma solo a scrittura riuscita', async () => {
    state.coverRows = [
      { id: 'old-cover', file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/owner-1/bio-1/vecchia1.jpg' },
      { id: 'old-a5', file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/owner-1/bio-1/vecchia2.jpg' },
    ];
    const res = await call(upload(await jpeg(600, 400), { layout: 'cover,cover_a5' }));
    expect(res.status).toBe(201);
    expect(deletedIds).toEqual([['old-cover', 'old-a5']]);
    expect(removed).toContainEqual(['owner-1/bio-1/vecchia1.jpg', 'owner-1/bio-1/vecchia2.jpg']);
  });

  it('se la seconda riga non si scrive annulla tutto: toglie la prima riga e il file e lascia le copertine di prima', async () => {
    state.coverRows = [{ id: 'old-cover', file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/owner-1/bio-1/vecchia.jpg' }];
    state.insertError = { message: 'boom' };
    state.insertFailsAtCall = 2;
    const res = await call(upload(await jpeg(600, 400), { layout: 'cover,cover_a5' }));
    expect(res.status).toBe(500);
    expect(deletedIds).toEqual([['media-new-1']]); // la riga già scritta si toglie, non quelle di prima
    expect(removed).toEqual([[uploads[0].path]]);
  });

  it('un layout ripetuto conta una volta, e non si mescolano copertina e galleria', async () => {
    expect((await call(upload(await jpeg(300, 200), { layout: 'cover,cover' }))).status).toBe(201);
    expect(inserted).toHaveLength(1);
    for (const layout of ['full-page,cover', 'two-vertical,three-mixed', 'cover,diagonale', ',']) {
      const res = await call(upload(await jpeg(300, 200), { layout }));
      expect(res.status, layout).toBe(400);
      expect((await res.json()).error).toBe('invalid_layout');
    }
    expect(inserted).toHaveLength(1);
  });
});

describe('POST /api/biography/[id]/media: la foto salvata', () => {
  const withGps = () =>
    sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 200, g: 100, b: 50 } } })
      .withExif({
        IFD0: { Make: 'Telefono di prova' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '44/1 24/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '8/1 55/1 0/1' },
      })
      .jpeg({ quality: 90 })
      .toBuffer();

  it('è un JPEG senza metadati (niente GPS), con il lato lungo entro 2560 pixel', async () => {
    const input = await withGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const res = await call(upload(input));
    expect(res.status).toBe(201);
    expect(uploads).toHaveLength(1);

    const saved = uploads[0].data;
    const meta = await sharp(saved).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(saved.includes(Buffer.from('Exif'))).toBe(false);
    expect(saved.includes(Buffer.from('Telefono di prova'))).toBe(false);
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(2560);
    expect([meta.width, meta.height]).toEqual([2560, 1920]);
  });

  it('non ingrandisce una foto piccola', async () => {
    const res = await call(upload(await jpeg(800, 600)));
    expect(res.status).toBe(201);
    const meta = await sharp(uploads[0].data).metadata();
    expect([meta.width, meta.height]).toEqual([800, 600]);
  });

  it('per una copertina il lato lungo massimo è 3100 pixel', async () => {
    const res = await call(upload(await jpeg(5000, 3000), { layout: 'cover_a5' }));
    expect(res.status).toBe(201);
    const meta = await sharp(uploads[0].data).metadata();
    expect([meta.width, meta.height]).toEqual([3100, 1860]);
  });

  it('scrive nel bucket con lo schema di percorso di prima e salva la riga con le dimensioni vere', async () => {
    const input = await withGps();
    const res = await call(upload(input, { layout: 'two-vertical' }, {}, 'Vacanza 2019.JPG'));
    expect(res.status).toBe(201);

    expect(uploads[0].bucket).toBe('biography-photos');
    expect(uploads[0].path).toMatch(/^owner-1\/bio-1\/\d+-[a-z0-9]+\.jpg$/);
    expect(uploads[0].opts).toMatchObject({ contentType: 'image/jpeg', upsert: false });

    const meta = await sharp(uploads[0].data).metadata();
    const row = inserted[0];
    expect(row).toMatchObject({
      biography_id: 'bio-1',
      user_id: 'owner-1',
      file_name: 'Vacanza 2019.JPG',
      layout: 'two-vertical',
      caption: '',
      width: meta.width,
      height: meta.height,
      bytes: uploads[0].data.length,
      original_bytes: input.length,
    });
    expect(String(row.file_url)).toBe(`https://x.supabase.co/storage/v1/object/public/biography-photos/${uploads[0].path}`);
    expect((await res.json()).media).toMatchObject({ id: 'media-new-1', layout: 'two-vertical' });
  });

  it('la copertina nuova sostituisce la vecchia: riga e file di prima si tolgono solo a caricamento riuscito', async () => {
    state.coverRows = [{ id: 'old-cover', file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/owner-1/bio-1/vecchia.png' }];
    const res = await call(upload(await jpeg(600, 400), { layout: 'cover' }));
    expect(res.status).toBe(201);
    expect(deletedIds).toEqual([['old-cover']]);
    expect(removed).toContainEqual(['owner-1/bio-1/vecchia.png']);
  });

  it('se il bucket rifiuta la scrittura non crea la riga e non toglie la copertina di prima', async () => {
    state.coverRows = [{ id: 'old-cover', file_url: 'https://x.supabase.co/storage/v1/object/public/biography-photos/owner-1/bio-1/vecchia.png' }];
    state.uploadError = { message: 'boom' };
    const res = await call(upload(await jpeg(600, 400), { layout: 'cover' }));
    expect(res.status).toBe(502);
    expect(inserted).toHaveLength(0);
    expect(deletedIds).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });

  it('se la riga non si scrive toglie il file appena caricato, e il limite del database vale come difesa', async () => {
    state.insertError = { message: 'boom' };
    const res = await call(upload(await jpeg(300, 200)));
    expect(res.status).toBe(500);
    expect(removed).toEqual([[uploads[0].path]]);

    removed.length = 0;
    state.insertError = { message: 'A biography may have at most 15 gallery photos.' };
    const limited = await call(upload(await jpeg(300, 200)));
    expect(limited.status).toBe(409);
    expect((await limited.json()).error).toBe('gallery_limit');
    expect(removed).toEqual([[uploads[1].path]]);
  });
});
