import { setCoverPhotoRasterizer, setLogoMarkRasterizer } from '@/lib/pdf-export';
import { rasterizeCoverPhotoRoundedNode } from '@/lib/server/raster-cover-photo';
import { rasterBlLogoMarkPngDataUrl } from '@/lib/server/raster-bl-logo';

setCoverPhotoRasterizer(async (coverBase64, outputWidthPx, outputHeightPx, cornerRadiusPx) => {
  const pngBuf = await rasterizeCoverPhotoRoundedNode(
    coverBase64,
    outputWidthPx,
    outputHeightPx,
    cornerRadiusPx
  );
  return {
    dataUrl: `data:image/png;base64,${pngBuf.toString('base64')}`,
    format: 'PNG',
  };
});

setLogoMarkRasterizer(async () => {
  const dataUrl = await rasterBlLogoMarkPngDataUrl(512);
  return { dataUrl, format: 'PNG' };
});
