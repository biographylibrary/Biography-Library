import type { jsPDF } from 'jspdf';

export interface ImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getNaturalImageSize(doc: jsPDF, imageData: string): { w: number; h: number } {
  const props = doc.getImageProperties(imageData);
  return { w: props.width, h: props.height };
}

/** Fit image inside a box preserving aspect ratio (letterbox). */
export function fitImageInBox(
  naturalW: number,
  naturalH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): ImageBox {
  if (naturalW <= 0 || naturalH <= 0 || boxW <= 0 || boxH <= 0) {
    return { x: boxX, y: boxY, w: boxW, h: boxH };
  }
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

export function addImageFitted(
  doc: jsPDF,
  imageData: string,
  format: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): ImageBox {
  const natural = getNaturalImageSize(doc, imageData);
  const fit = fitImageInBox(natural.w, natural.h, boxX, boxY, boxW, boxH);
  doc.addImage(imageData, format, fit.x, fit.y, fit.w, fit.h);
  return fit;
}
