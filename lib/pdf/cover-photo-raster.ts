function coverBase64ToDataUri(base64: string, coverFormat: string): string {
  const f = coverFormat.toUpperCase();
  const sub =
    f === 'PNG' ? 'png' : f === 'WEBP' ? 'webp' : f === 'GIF' ? 'gif' : 'jpeg';
  return `data:image/${sub};base64,${base64}`;
}

function clipRoundedRect(
  ctx: CanvasRenderingContext2D,
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

/** Cover-crop into a rounded rectangle — browser path (jsPDF clip is unreliable). */
export async function rasterizeCoverPhotoRoundedBrowser(
  coverBase64: string,
  coverFormat: string,
  imgDims: { width: number; height: number },
  outputWidthPx: number,
  outputHeightPx: number,
  cornerRadiusPx: number
): Promise<{ dataUrl: string; format: 'PNG' }> {
  const uri = coverBase64ToDataUri(coverBase64, coverFormat);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('cover image decode failed'));
    im.src = uri;
  });

  const imgW = img.naturalWidth || imgDims.width || 1;
  const imgH = img.naturalHeight || imgDims.height || 1;
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

  const canvas = document.createElement('canvas');
  canvas.width = outputWidthPx;
  canvas.height = outputHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas ctx');

  clipRoundedRect(ctx, outputWidthPx, outputHeightPx, cornerRadiusPx);
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outputWidthPx, outputHeightPx);
  return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG' };
}
