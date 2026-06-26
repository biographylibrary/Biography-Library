import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile } from 'fs/promises';
import path from 'path';

let cachedPngDataUrl: string | null = null;

/** Raster BL shield logo from `public/logo-black.svg` (server PDF back cover). */
export async function rasterBlLogoMarkPngDataUrl(outputWidthPx = 512): Promise<string> {
  if (cachedPngDataUrl) return cachedPngDataUrl;

  const svgPath = path.join(process.cwd(), 'public', 'logo-black.svg');
  const svg = await readFile(svgPath, 'utf8');
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const img = await loadImage(dataUrl);
  const w = outputWidthPx;
  const h = Math.round(w * (img.height / img.width));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  cachedPngDataUrl = canvas.toDataURL('image/png');
  return cachedPngDataUrl;
}
