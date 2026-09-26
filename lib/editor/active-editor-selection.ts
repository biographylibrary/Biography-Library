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
