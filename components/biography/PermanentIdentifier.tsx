'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toCanonical } from '@/lib/um-id';

/**
 * Identificativo permanente di una scheda: la stringa canonica, cliccabile
 * verso il risolutore, con un controllo che copia la stringa.
 *
 * Due scelte deliberate, entrambe dalla specifica §9.
 *
 * Il collegamento è relativo. L'indirizzo assoluto vive in `UM_ID_BASE_URL`,
 * che è server-only per non finire incorporata nel pacchetto al build; qui non
 * serve, perché il middleware serve `/id/...` su qualunque dominio e il lettore
 * arriva allo stesso risolutore senza attendere alcuna chiamata.
 *
 * Quel che si copia è l'identificativo, non l'indirizzo: la stringa è
 * l'identità e si cita così, il dominio è soltanto lo strumento con cui oggi la
 * si consulta e un domani può non esserci più.
 */
export function PermanentIdentifier({
  umId,
  label,
  copyLabel,
  copiedLabel,
}: {
  umId: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  let canonical: string;
  try {
    canonical = toCanonical(umId);
  } catch {
    // Identificativo malformato in archivio: si mostra com'è, senza collegamento.
    return (
      <p className="text-xs text-muted-foreground mt-2 not-prose">
        <span className="mr-1.5">{label}:</span>
        <span className="font-mono tracking-wide select-text">{umId.toUpperCase()}</span>
      </p>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy identifier:', err);
    }
  };

  return (
    <p className="text-xs text-muted-foreground mt-2 not-prose flex items-center flex-wrap gap-x-1.5 gap-y-1">
      <span>{label}:</span>
      <a
        href={`/id/${canonical}`}
        className="font-mono tracking-wide select-text underline underline-offset-2 decoration-dotted hover:text-foreground transition-colors"
        style={{ userSelect: 'text' }}
      >
        {canonical}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? copiedLabel : copyLabel}
        title={copied ? copiedLabel : copyLabel}
        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors"
      >
        {copied ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Copy className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </p>
  );
}
