import type { AnyClient } from '@/lib/server/service-client';

export type ReopenResult =
  | { ok: true; status: 'draft' }
  | {
      ok: false;
      httpStatus: 403 | 404 | 409 | 500;
      error: 'not_found' | 'forbidden' | 'invalid_status' | 'frozen' | 'chapter_cooldown_active' | 'update_failed';
      /** Solo per chapter_cooldown_active: da quando si può riaprire. */
      availableAt?: string;
    };

/**
 * Riapre una scheda pubblicata per scrivere un nuovo capitolo: da `published` torna
 * `draft`. Le colonne di stato le scrive solo il server, quindi passa da qui (non
 * dal browser). Il tempo di attesa fra due capitoli (365 giorni dall'ultima
 * pubblicazione, `next_chapter_available_at`) si controlla ADESSO, non alla
 * ripubblicazione: altrimenti l'autore scriverebbe un capitolo che non può
 * pubblicare, con la scheda già sparita dal catalogo.
 *
 * Limite noto: mentre scrive il nuovo capitolo la scheda non è più pubblicata, quindi
 * sparisce dal catalogo e dalla pagina pubblica. Si risolve nel blocco Markdown con una
 * copia di lavoro separata: la versione pubblicata resta online finché la nuova non
 * passa lo screening.
 */
export async function reopenPublishedBiography(
  service: AnyClient,
  params: { biographyId: string; userId: string; now?: Date }
): Promise<ReopenResult> {
  const now = params.now ?? new Date();
  const { data, error } = await service
    .from('biographies')
    .select('user_id, status, is_frozen, next_chapter_available_at')
    .eq('id', params.biographyId)
    .maybeSingle();
  if (error) return { ok: false, httpStatus: 500, error: 'update_failed' };

  const bio = data as {
    user_id?: string;
    status?: string;
    is_frozen?: boolean | null;
    next_chapter_available_at?: string | null;
  } | null;
  if (!bio) return { ok: false, httpStatus: 404, error: 'not_found' };
  if (bio.user_id !== params.userId) return { ok: false, httpStatus: 403, error: 'forbidden' };
  if (bio.is_frozen) return { ok: false, httpStatus: 409, error: 'frozen' };
  if (bio.status !== 'published') return { ok: false, httpStatus: 409, error: 'invalid_status' };

  if (bio.next_chapter_available_at && new Date(bio.next_chapter_available_at).getTime() > now.getTime()) {
    return {
      ok: false,
      httpStatus: 409,
      error: 'chapter_cooldown_active',
      availableAt: bio.next_chapter_available_at,
    };
  }

  // Race-safe: solo se è ancora pubblicata e di questo utente.
  const { data: moved, error: updateError } = await service
    .from('biographies')
    .update({ status: 'draft' })
    .eq('id', params.biographyId)
    .eq('user_id', params.userId)
    .eq('status', 'published')
    .select('id')
    .maybeSingle();
  if (updateError) return { ok: false, httpStatus: 500, error: 'update_failed' };
  if (!moved) return { ok: false, httpStatus: 409, error: 'invalid_status' };

  return { ok: true, status: 'draft' };
}
