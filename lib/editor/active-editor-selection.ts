export type EditorTarget = {
  selectedText: string;
  blockText: string;
};

const emptyTarget = (): EditorTarget => ({ selectedText: '', blockText: '' });

let readTarget: () => EditorTarget = emptyTarget;

export function registerActiveEditorTarget(reader: () => EditorTarget): () => void {
  readTarget = reader;
  return () => {
    if (readTarget === reader) readTarget = emptyTarget;
  };
}

export function readActiveEditorTarget(): EditorTarget {
  try {
    return readTarget() ?? emptyTarget();
  } catch {
    return emptyTarget();
  }
}

/**
 * Il brano scelto per il controllo grammaticale si ricorda, e le correzioni si applicano solo lì.
 * `mark` ricorda la selezione di adesso; `replace` cambia la prima occorrenza dentro quel brano.
 */
export type SelectionReplacer = {
  mark: () => void;
  replace: (original: string, replacement: string) => boolean;
};

let replacer: SelectionReplacer | null = null;

export function registerSelectionReplacer(next: SelectionReplacer): () => void {
  replacer = next;
  return () => {
    if (replacer === next) replacer = null;
  };
}

export function markSelectionForReplacement(): void {
  try {
    replacer?.mark();
  } catch {
    /* nessun editor pronto */
  }
}

/** Vero se la correzione è stata applicata dentro il brano scelto. */
export function replaceInMarkedSelection(original: string, replacement: string): boolean {
  try {
    return replacer?.replace(original, replacement) ?? false;
  } catch {
    return false;
  }
}
