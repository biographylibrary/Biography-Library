/** Scritture che il motore PDF copre con Noto Serif (Latn, Cyrl, Grek). */
export const PDF_COVERED_SCRIPTS = new Set(['Latn', 'Cyrl', 'Grek']);

export function isPdfScriptCovered(script: string | null | undefined): boolean {
  const code = script?.trim();
  if (!code) return true;
  return PDF_COVERED_SCRIPTS.has(code);
}
