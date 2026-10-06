import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  COVER_MAX_SIDE_PX,
  GALLERY_MAX_SIDE_PX,
  JPEG_QUALITY,
  PhotoError,
  detectImageType,
  inspectPhoto,
  photoStoragePath,
  processPhoto,
} from '@/lib/server/photo-processing';

/**
 * Elaborazione delle foto prima di salvarle: lato lungo, orientamento, metadati (GPS compreso),
 * colore, trasparenza, tipo riconosciuto dal contenuto. Le immagini sono vere, fatte con sharp.
 */

const jpeg = (width: number, height: number, color = { r: 120, g: 90, b: 60 }) =>
  sharp({ create: { width, height, channels: 3, background: color } }).jpeg({ quality: 92 }).toBuffer();

/** Elenco dei segmenti APPn di un JPEG (E0 = JFIF, E1 = EXIF/XMP, E2 = profilo colore, ED = IPTC). */
function appSegments(buf: Buffer): number[] {
  const found: number[] = [];
  let i = 2;
  while (i + 4 <= buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // inizio dei dati: finiscono i segmenti
    if (marker >= 0xe0 && marker <= 0xef) found.push(marker);
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return found;
}

const longSide = (w: number, h: number) => Math.max(w, h);

describe('detectImageType (dal contenuto, non dall\'estensione)', () => {
  it('riconosce JPEG, PNG e WebP dai primi byte', async () => {
    expect(detectImageType(await jpeg(8, 8))).toBe('jpeg');
    expect(detectImageType(await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer())).toBe('png');
    expect(detectImageType(await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).webp().toBuffer())).toBe('webp');
  });

  it('riconosce i contenitori HEIC dalle marche ftyp', () => {
    for (const brand of ['heic', 'heix', 'hevc', 'mif1']) {
      const bytes = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftyp'), Buffer.from(brand), Buffer.alloc(12)]);
      expect(detectImageType(bytes), brand).toBe('heic');
    }
  });

  it('non accetta AVIF, GIF, PDF, HTML, testo né un file vuoto', () => {
    const avif = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypavif'), Buffer.alloc(12)]);
    expect(detectImageType(avif)).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a\u0001\u0000\u0001\u0000'))).toBeNull();
    expect(detectImageType(Buffer.from('%PDF-1.7\n'))).toBeNull();
    expect(detectImageType(Buffer.from('<html><body>ciao</body></html>'))).toBeNull();
    expect(detectImageType(Buffer.from('questo non è un\'immagine'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe('processPhoto: dimensioni', () => {
  it('riduce il lato lungo della galleria a 2560 pixel mantenendo le proporzioni', async () => {
    const out = await processPhoto(await jpeg(5000, 3000), 'gallery');
    expect([out.width, out.height]).toEqual([2560, 1536]);
    const meta = await sharp(out.data).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([2560, 1536, 'jpeg']);
    expect(longSide(out.width, out.height)).toBeLessThanOrEqual(GALLERY_MAX_SIDE_PX);
  });

  it('riduce anche una foto in piedi: il limite è sul lato lungo, qualunque sia', async () => {
    const out = await processPhoto(await jpeg(3000, 5000), 'gallery');
    expect([out.width, out.height]).toEqual([1536, 2560]);
  });

  it('per le copertine il lato lungo massimo è 3100 pixel (cover e cover_a5 sono entrambe «cover»)', async () => {
    const out = await processPhoto(await jpeg(5000, 3000), 'cover');
    expect([out.width, out.height]).toEqual([3100, 1860]);
    expect(longSide(out.width, out.height)).toBeLessThanOrEqual(COVER_MAX_SIDE_PX);
  });

  it('una foto già piccola non viene ingrandita, né in galleria né in copertina', async () => {
    const small = await jpeg(800, 600);
    for (const kind of ['gallery', 'cover'] as const) {
      const out = await processPhoto(small, kind);
      expect([out.width, out.height], kind).toEqual([800, 600]);
    }
  });

  it('una foto esattamente al limite resta com\'è, e una di un pixel oltre scende al limite', async () => {
    expect(await processPhoto(await jpeg(2560, 1000), 'gallery')).toMatchObject({ width: 2560, height: 1000 });
    expect(await processPhoto(await jpeg(2561, 1000), 'gallery')).toMatchObject({ width: 2560 });
  });

  it('registra la dimensione del file elaborato e di quello di partenza', async () => {
    const input = await jpeg(5000, 3000);
    const out = await processPhoto(input, 'gallery');
    expect(out.originalBytes).toBe(input.length);
    expect(out.bytes).toBe(out.data.length);
    expect(out.inputType).toBe('jpeg');
  });
});

describe('processPhoto: metadati e orientamento', () => {
  const withGps = async () =>
    sharp({ create: { width: 400, height: 300, channels: 3, background: '#789' } })
      .withExif({
        IFD0: { Make: 'Telefono di prova', Software: 'test' },
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '44/1 24/1 0/1',
          GPSLongitudeRef: 'E',
          GPSLongitude: '8/1 55/1 0/1',
        },
      })
      .jpeg()
      .toBuffer();

  it('la foto di partenza ha davvero EXIF con posizione, e quella salvata non ne ha nessuno', async () => {
    const input = await withGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    expect(appSegments(input)).toContain(0xe1); // APP1: EXIF

    const out = await processPhoto(input, 'gallery');
    expect((await sharp(out.data).metadata()).exif).toBeUndefined();
    expect(appSegments(out.data)).not.toContain(0xe1);
    // Nel file non resta traccia dei testi scritti nell'EXIF.
    expect(out.data.includes(Buffer.from('Telefono di prova'))).toBe(false);
    expect(out.data.includes(Buffer.from('Exif'))).toBe(false);
    expect((await inspectPhoto(out.data)).hasMetadata).toBe(false);
  });

  it('nel JPEG salvato non ci sono segmenti di metadati: né EXIF, né profilo colore, né IPTC', async () => {
    const out = await processPhoto(await withGps(), 'cover');
    const apps = appSegments(out.data);
    for (const forbidden of [0xe1, 0xe2, 0xed]) expect(apps).not.toContain(forbidden);
  });

  it('applica l\'orientamento EXIF ai pixel prima di toglierlo: una foto «di lato» esce in piedi', async () => {
    // 300x100: metà sinistra rossa, metà destra blu, con orientamento 6 (da ruotare di 90° in senso orario).
    const left = await sharp({ create: { width: 150, height: 100, channels: 3, background: '#f00' } }).png().toBuffer();
    const right = await sharp({ create: { width: 150, height: 100, channels: 3, background: '#00f' } }).png().toBuffer();
    const sideways = await sharp({ create: { width: 300, height: 100, channels: 3, background: '#000' } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 150, top: 0 }])
      .jpeg({ quality: 95 })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(sideways).metadata()).orientation).toBe(6);

    const out = await processPhoto(sideways, 'gallery');
    expect([out.width, out.height]).toEqual([100, 300]); // in piedi
    const meta = await sharp(out.data).metadata();
    expect(meta.orientation).toBeUndefined();
    // Dopo la rotazione oraria la metà sinistra (rossa) è in alto e la destra (blu) in basso.
    const { data, info } = await sharp(out.data).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    const top = px(50, 20);
    const bottom = px(50, 280);
    expect(top[0]).toBeGreaterThan(200);
    expect(top[2]).toBeLessThan(60);
    expect(bottom[2]).toBeGreaterThan(200);
    expect(bottom[0]).toBeLessThan(60);
  });
});

describe('processPhoto: colore e trasparenza', () => {
  it('converte in sRGB un\'immagine con profilo Display P3: il verde puro non resta verde «P3»', async () => {
    // Il verde sRGB puro scritto in P3 ha valori diversi da (0,255,0): se il profilo venisse ignorato
    // dopo l'elaborazione si vedrebbero quei valori, che in sRGB sono un altro verde.
    const p3 = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .withIccProfile('p3')
      .png()
      .toBuffer();
    expect((await sharp(p3).metadata()).icc).toBeDefined();
    const out = await processPhoto(p3, 'gallery');
    const { data } = await sharp(out.data).raw().toBuffer({ resolveWithObject: true });
    const [r, g, b] = [data[0], data[1], data[2]];
    expect(g).toBeGreaterThan(240);
    expect(r).toBeLessThan(40);
    expect(b).toBeLessThan(40);
    expect((await sharp(out.data).metadata()).icc).toBeUndefined();
  });

  it('appiattisce su bianco la trasparenza di un PNG', async () => {
    const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    expect((await sharp(png).metadata()).hasAlpha).toBe(true);
    const out = await processPhoto(png, 'gallery');
    expect(out.inputType).toBe('png');
    const { data } = await sharp(out.data).raw().toBuffer({ resolveWithObject: true });
    expect(Array.from(data.subarray(0, 3)).every((v) => v >= 250)).toBe(true); // bianco, non nero
    expect((await sharp(out.data).metadata()).hasAlpha).toBe(false);
  });

  it('accetta anche WebP e salva sempre JPEG', async () => {
    const webp = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#468' } }).webp().toBuffer();
    const out = await processPhoto(webp, 'gallery');
    expect(out.inputType).toBe('webp');
    expect((await sharp(out.data).metadata()).format).toBe('jpeg');
  });

  it('salva JPEG progressivo con mozjpeg a qualità 85', async () => {
    const out = await processPhoto(await jpeg(1200, 800), 'gallery');
    const meta = await sharp(out.data).metadata();
    expect(meta.isProgressive).toBe(true);
    expect(JPEG_QUALITY).toBe(85);
    // Marcatore SOF2 (JPEG progressivo) nel file.
    expect(out.data.includes(Buffer.from([0xff, 0xc2]))).toBe(true);
  });
});

describe('processPhoto: file che non sono immagini valide', () => {
  it('rifiuta un file con estensione .jpg che in realtà è testo o HTML o PDF', async () => {
    for (const content of ['questo non è un\'immagine', '<html></html>', '%PDF-1.7\n1 0 obj']) {
      await expect(processPhoto(Buffer.from(content), 'gallery')).rejects.toMatchObject({ name: 'PhotoError', code: 'unsupported_type' });
    }
  });

  it('rifiuta un JPEG troncato o con i dati rovinati', async () => {
    const good = await jpeg(1200, 900);
    await expect(processPhoto(good.subarray(0, Math.floor(good.length / 2)), 'gallery')).rejects.toMatchObject({ code: 'corrupt_image' });
    const header = Buffer.concat([good.subarray(0, 40), Buffer.alloc(200, 0x11)]);
    await expect(processPhoto(header, 'gallery')).rejects.toBeInstanceOf(PhotoError);
  });

  it('un HEIC che la versione di sharp non decodifica dà un errore chiaro che chiede di salvare come JPEG', async () => {
    const fakeHeic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(200, 7)]);
    await expect(processPhoto(fakeHeic, 'gallery')).rejects.toMatchObject({ code: 'heic_unsupported' });
  });

  it('rifiuta un\'immagine che dichiara troppi pixel (bomba di decompressione) senza decodificarla', async () => {
    const crc = (buf: Buffer) => {
      let c = ~0;
      for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
      }
      return ~c >>> 0;
    };
    const chunk = (type: string, data: Buffer) => {
      const body = Buffer.concat([Buffer.from(type), data]);
      const out = Buffer.alloc(8 + data.length + 4);
      out.writeUInt32BE(data.length, 0);
      body.copy(out, 4);
      out.writeUInt32BE(crc(body), 8 + data.length);
      return out;
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(30000, 0); // 30000 x 30000 = 900 milioni di pixel
    ihdr.writeUInt32BE(30000, 4);
    ihdr.set([8, 2, 0, 0, 0], 8);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc(0))), chunk('IEND', Buffer.alloc(0))]);
    await expect(processPhoto(png, 'gallery')).rejects.toMatchObject({ code: 'too_many_pixels' });
  });
});

describe('photoStoragePath', () => {
  it('ha lo schema di prima (utente/biografia/nome unico) e finisce sempre con .jpg', () => {
    const a = photoStoragePath('user-1', 'bio-1');
    const b = photoStoragePath('user-1', 'bio-1');
    expect(a).toMatch(/^user-1\/bio-1\/\d+-[a-z0-9]+\.jpg$/);
    expect(a).not.toBe(b);
  });
});
