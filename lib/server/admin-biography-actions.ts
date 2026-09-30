import { provisionalUntilOnFirstPublish } from '@/lib/provisional-window';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';
import type { AnyClient } from '@/lib/server/service-client';

/**
 * Scritture dello staff sulle colonne riservate di `biographies` (stato,
 * congelamento, presa in carico). Prima le faceva il browser con la sessione
 * dello staff; dopo la migrazione 20260930120000 le colonne riservate si
 * scrivono solo dal server (ruolo di servizio), quindi passano da qui.
 */
export type AdminBiographyAction =
  | 'claim_review'
  | 'approve'
  | 'reject'
  | 'freeze'
  | 'unfreeze'
  | 'force_publish'
  | 'set_draft'
  | 'remove'
  | 'restore';

export const ADMIN_BIOGRAPHY_ACTIONS: readonly AdminBiographyAction[] = [
  'claim_review',
  'approve',
  'reject',
  'freeze',
  'unfreeze',
  'force_publish',
  'set_draft',
  'remove',
  'restore',
];

export interface AdminBiographyActionResult {
  error: string | null;
  status?: string;
}

export async function applyAdminBiographyAction(
  service: AnyClient,
  params: { biographyId: string; action: AdminBiographyAction; actorId: string; now?: Date }
): Promise<AdminBiographyActionResult> {
  const { biographyId, action, actorId } = params;
  const nowIso = (params.now ?? new Date()).toISOString();
  let patch: Record<string, unknown>;

  switch (action) {
    case 'claim_review':
      patch = { reviewed_by: actorId, reviewed_at: nowIso };
      break;
    case 'approve':
      patch = { status: 'published', published_at: nowIso, reviewed_by: null, reviewed_at: null };
      break;
    case 'reject':
      patch = { status: 'draft', reviewed_by: null, reviewed_at: null };
      break;
    case 'freeze':
      patch = { is_frozen: true, frozen_at: nowIso, frozen_reason: 'admin_action' };
      break;
    case 'unfreeze':
      patch = { is_frozen: false, frozen_at: null, frozen_reason: null };
      break;
    case 'set_draft':
    case 'restore':
      patch = { status: 'draft' };
      break;
    case 'remove':
      patch = { status: 'removed' };
      break;
    case 'force_publish': {
      const { data } = await service
        .from('biographies')
        .select('published_at, biography_type')
        .eq('id', biographyId)
        .maybeSingle();
      const row = data as { published_at: string | null; biography_type: string | null } | null;
      if (!row) return { error: 'Biography not found' };
      patch = { status: 'published' };
      if (!row.published_at) {
        patch.published_at = nowIso;
        const until = provisionalUntilOnFirstPublish(row.biography_type, nowIso);
        if (until) patch.provisional_until = until;
      }
      break;
    }
    default:
      return { error: 'Unknown action' };
  }

  const { error } = await service.from('biographies').update(patch).eq('id', biographyId);
  if (error) return { error: error.message };

  // Pubblicazione riuscita: si cancella la memoria di Echo di questa biografia.
  if (patch.status === 'published') {
    try {
      await purgeAgentMemoryForBiography(service, biographyId);
    } catch (err) {
      console.error('[admin-biography-actions] purgeAgentMemory failed:', err);
    }
  }
  return { error: null, status: typeof patch.status === 'string' ? patch.status : undefined };
}
