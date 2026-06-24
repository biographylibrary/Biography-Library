/** Internal cap on watermarked PDF draft exports per biography (not shown in UI). */
export const PDF_DRAFT_MAX_ITERATION = 30;

/** Show a soft warning in the export dialog from this count onward. */
export const PDF_DRAFT_WARN_ITERATION = 27;

export function isPdfDraftLimitReached(iteration: number | null | undefined): boolean {
  return (iteration ?? 0) >= PDF_DRAFT_MAX_ITERATION;
}

export function shouldShowPdfDraftWarning(iteration: number | null | undefined): boolean {
  return (iteration ?? 0) >= PDF_DRAFT_WARN_ITERATION && !isPdfDraftLimitReached(iteration);
}
