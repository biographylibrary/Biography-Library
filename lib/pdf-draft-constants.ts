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

/**
 * Solo le bozze della fase «revisione PDF» (stato `pdf_draft`) si contano: la rotta
 * `record-pdf-draft` rifiuta con 400 ogni altro stato. Il PDF scaricato in stato «bozza» serve a
 * controllare l'impaginazione e non è un giro.
 */
export function shouldRecordPdfDraft(status: string | null | undefined): boolean {
  return status === 'pdf_draft';
}
