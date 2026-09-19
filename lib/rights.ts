/**
 * Licenze di contenuto per biografie pubbliche.
 * Decisione 3 settembre 2026: sceglie l'autore.
 * Predefinita: CC BY-NC-SA 4.0. Alternativa aperta: CC BY-SA 4.0.
 * I metadati restano CC0 indipendentemente dalla scelta (policy di export, non campo scheda).
 */

export const LICENSE_BY_NC_SA_4 =
  'https://creativecommons.org/licenses/by-nc-sa/4.0/' as const;
export const LICENSE_BY_SA_4 =
  'https://creativecommons.org/licenses/by-sa/4.0/' as const;

export type ContentLicenseUri =
  | typeof LICENSE_BY_NC_SA_4
  | typeof LICENSE_BY_SA_4;

export const DEFAULT_CONTENT_LICENSE: ContentLicenseUri = LICENSE_BY_NC_SA_4;

export const CONTENT_LICENSE_OPTIONS: ReadonlyArray<{
  uri: ContentLicenseUri;
  code: 'by-nc-sa' | 'by-sa';
}> = [
  { uri: LICENSE_BY_NC_SA_4, code: 'by-nc-sa' },
  { uri: LICENSE_BY_SA_4, code: 'by-sa' },
];

export function isContentLicenseUri(value: string | null | undefined): value is ContentLicenseUri {
  return value === LICENSE_BY_NC_SA_4 || value === LICENSE_BY_SA_4;
}
