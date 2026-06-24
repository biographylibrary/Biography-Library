'use client';

interface EchoDraftInsertPromptProps {
  prompt: string;
  preview: string;
  confirmLabel: string;
  dismissLabel: string;
  insertedLabel?: string;
  applying?: boolean;
  inserted?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function EchoDraftInsertPrompt({
  prompt,
  preview,
  confirmLabel,
  dismissLabel,
  insertedLabel,
  applying = false,
  inserted = false,
  onConfirm,
  onDismiss,
}: EchoDraftInsertPromptProps) {
  if (inserted && insertedLabel) {
    return (
      <p className="mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground/70 italic">
        {insertedLabel}
      </p>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
      <p className="text-xs text-muted-foreground/65 italic">{prompt}</p>
      <p className="text-xs text-muted-foreground/50 italic line-clamp-4 whitespace-pre-wrap">
        «{preview}»
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <button
          type="button"
          disabled={applying}
          onClick={onConfirm}
          className="text-foreground/75 italic font-medium hover:text-foreground hover:underline underline-offset-2 disabled:opacity-50"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={onDismiss}
          className="text-muted-foreground/60 italic hover:text-muted-foreground hover:underline underline-offset-2 disabled:opacity-50"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
