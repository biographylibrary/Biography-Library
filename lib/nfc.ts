/**
 * Normalizzazione Unicode NFC per ogni stringa in scrittura al database.
 * Senza NFC lo stesso nome da dispositivi diversi può divergere in byte.
 */

export function nfc(value: string): string {
  return value.normalize('NFC');
}

export function nfcTrim(value: string | null | undefined): string {
  return nfc((value ?? '').trim());
}

export function nfcNullable(value: string | null | undefined): string | null {
  const t = nfcTrim(value);
  return t.length > 0 ? t : null;
}
