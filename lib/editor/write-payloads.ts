import { nfcBiographyWriteFields } from '@/lib/nfc-biography';

/**
 * Le scritture che l'editor fa su `biographies` con la sessione dell'autore.
 * Stanno qui, e non dentro i componenti, per due motivi: sono il contratto fra
 * l'interfaccia e il trigger guard del database (nessuna colonna riservata al
 * server, stato solo fra draft, sections_complete e final_version) e i test le
 * riusano così come sono, senza ricopiarle a mano.
 */

type SaveFields = Parameters<typeof nfcBiographyWriteFields>[0];

/** Salvataggio automatico del foglio (funzioni `save` e `flushEditorSave`). */
export function buildEditorSavePayload(params: {
  fields: SaveFields;
  isMemorial: boolean;
  visibility: string;
  biographyMode: string;
}): Record<string, unknown> {
  return {
    ...nfcBiographyWriteFields(params.fields),
    ...(params.isMemorial ? {} : { subject_name: null }),
    visibility: params.visibility,
    biography_mode: params.biographyMode,
  };
}

/** Riapre una sezione completata: lo stato torna a draft. */
export const REOPEN_SECTION_PAYLOAD = { status: 'draft', completed_at: null } as const;

/** Segna il libro come completo o lo riapre (`handleMarkComplete`). */
export function buildMarkCompletePayload(
  currentStatus: string,
  now: string
): { status: 'sections_complete' | 'draft'; completed_at: string | null } {
  const status = currentStatus === 'sections_complete' ? 'draft' : 'sections_complete';
  return { status, completed_at: status === 'sections_complete' ? now : null };
}

/** Collegamento di condivisione generato dal browser. */
export function buildShareTokenPayload(token: string): { share_token: string } {
  return { share_token: token };
}

/** Scelta della licenza alla pubblicazione (o passaggio a licenza più aperta). */
export function buildLicenseChoicePayload(params: {
  licenseUri: string;
  now: string;
  authorName: string | null | undefined;
  isUpgrade: boolean;
}): Record<string, unknown> {
  const update: Record<string, unknown> = {
    rights_statement_uri: params.licenseUri,
    rights_chosen_at: params.now,
    rights_holder: params.authorName?.trim() || null,
  };
  if (!params.isUpgrade) {
    update.visibility = 'public';
  }
  return update;
}

/** Testo finale combinato: `final_version` e stato `final_version`. */
export function buildFinalVersionPayload(
  text: string,
  narrativeOrder?: string[]
): Record<string, unknown> {
  return {
    final_version: text,
    ...(narrativeOrder ? { narrative_order: narrativeOrder } : {}),
    status: 'final_version',
  };
}

/**
 * Riga di `biography_media` per una foto caricata. `dimensions` è scritto solo dal server dopo
 * l'elaborazione (rotta `/api/biography/[id]/media`): larghezza e altezza del file salvato, la sua
 * dimensione e quella del file di partenza.
 */
export function buildMediaInsertPayload(params: {
  biographyId: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  layout: string;
  displayOrder: number;
  dimensions?: { width: number; height: number; bytes: number; originalBytes: number };
}) {
  return {
    biography_id: params.biographyId,
    user_id: params.userId,
    file_url: params.fileUrl,
    file_name: params.fileName,
    caption: '',
    layout: params.layout,
    display_order: params.displayOrder,
    ...(params.dimensions
      ? {
          width: params.dimensions.width,
          height: params.dimensions.height,
          bytes: params.dimensions.bytes,
          original_bytes: params.dimensions.originalBytes,
        }
      : {}),
  };
}
