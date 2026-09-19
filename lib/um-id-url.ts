/** Base URL canonica per gli identificativi UM (senza slash finale). */
export function umIdBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_UM_ID_BASE_URL?.replace(/\/$/, '') ||
    'https://id.biographylibrary.org'
  );
}

export function umIdCanonicalUrl(canonicalUmId: string): string {
  return `${umIdBaseUrl()}/${canonicalUmId}`;
}
