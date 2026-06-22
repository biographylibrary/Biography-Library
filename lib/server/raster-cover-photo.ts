import { createCanvas, loadImage } from '@napi-rs/canvas';

function clipRoundedRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(1, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.quadraticCurveTo(w, 0, w, radius);
  ctx.lineTo(w, h - radius);
  ctx.quadraticCurveTo(w, h, w - radius, h);
  ctx.lineTo(radius, h);
  ctx.quadraticCurveTo(0, h, 0, h - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
}

/** Cover-crop into a rounded rectangle (server-side PDF cover photo). */
export async function rasterizeCoverPhotoRoundedNode(
  coverBase64: string,
  outputWidthPx: number,
  outputHeightPx: number,
  cornerRadiusPx: number
): Promise<Buffer> {
  const buf = Buffer.from(coverBase64.replace(/\s/g, ''), 'base64');
  const img = await loadImage(buf);
  const imgW = img.width;
  const imgH = img.height;
  const slotAspect = outputWidthPx / outputHeightPx;
  const imgAspect = imgW / imgH;

  let cropW: number;
  let cropH: number;
  let sx: number;
  let sy: number;
  if (imgAspect > slotAspect) {
    cropH = imgH;
    cropW = imgH * slotAspect;
    sx = (imgW - cropW) / 2;
    sy = 0;
  } else {
    cropW = imgW;
    cropH = imgW / slotAspect;
    sx = 0;
    sy = (imgH - cropH) / 2;
  }

  const canvas = createCanvas(outputWidthPx, outputHeightPx);
  const ctx = canvas.getContext('2d');
  clipRoundedRect(ctx, outputWidthPx, outputHeightPx, cornerRadiusPx);
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outputWidthPx, outputHeightPx);
  return canvas.toBuffer('image/png');
}
