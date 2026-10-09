import type { SupabaseClient } from '@supabase/supabase-js';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import type { ModerationDecision } from '@/lib/moderation/types';
import type { BiographyDecisionPatch } from '@/lib/moderation/moderation-actions';
import { purgeAgentMemoryForBiography } from '@/lib/agents/purge-agent-memory';
import { notifyAuthorPublicationEmail } from '@/lib/server/email/publication-helpers';
import { writeModerationMessage } from '@/lib/server/moderation-register';
import { provisionalUntilOnFirstPublish, republicationClock } from '@/lib/provisional-window';
import { checkPublishGate, gatedPublish } from '@/lib/server/publication-fingerprint';

export type ModerationServerResult = {
  error: string | null;
  conflict?: boolean;
  claimed?: boolean;
  claimedByName?: string | null;
  /** Pubblicazione rifiutata dal confronto dell'impronta del testo. */
  blocked?: string;
};

/** Il browser dello staff manda la modifica da applicare: il server accetta solo queste colonne e questi stati. */
const DECISION_PATCH_KEYS = new Set([
  'status',
  'published_at',
  'revised_at',
  'provisional_until',
  'is_frozen',
  'frozen_at',
  'frozen_reason',
]);
const DECISION_PATCH_STATUSES = new Set(['published', 'draft', 'removed', 'revision_requested']);

function invalidDecisionPatch(patch: Record<string, unknown>): string | null {
  for (const key of Object.keys(patch)) {
    if (!DECISION_PATCH_KEYS.has(key)) return `Invalid patch column: ${key}`;
  }
  if (patch.status !== undefined && !DECISION_PATCH_STATUSES.has(String(patch.status))) {
    return `Invalid patch status: ${String(patch.status)}`;
  }
  return null;
}

async function insertNotification(
  client: SupabaseClient,
  userId: string,
  message: string,
): Promise<string | null> {
  if (!message.trim()) return null;
  const { error } = await client.from('user_notifications').insert({
    user_id: userId,
    message,
  });
  return error?.message ?? null;
}

export async function serverClaimReportReview(
  reportId: string,
  userId: string,
): Promise<ModerationServerResult> {
  const service = buildServiceClient();
  const { data, error } = await service
    .from('moderation_reports')
    .update({ reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', reportId)
    .or(`reviewed_by.is.null,reviewed_by.eq.${userId}`)
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message, claimed: false };
  if (data) return { error: null, claimed: true };

  const { data: existing } = await service
    .from('moderation_reports')
    .select('reviewed_by')
    .eq('id', reportId)
    .maybeSingle();

  const reviewerId = (existing as { reviewed_by?: string } | null)?.reviewed_by ?? null;
  let claimedByName: string | null = null;
  if (reviewerId) {
    const { data: profile } = await service
      .from('profiles')
      .select('name')
      .eq('id', reviewerId)
      .maybeSingle();
    claimedByName = (profile as { name?: string } | null)?.name ?? null;
  }

  return { error: null, claimed: false, claimedByName };
}

export async function serverTakeOwnership(
  reportId: string,
  moderatorId: string,
): Promise<ModerationServerResult> {
  const service = buildServiceClient();
  const now = new Date().toISOString();
  const { error } = await service
    .from('moderation_reports')
    .update({
      status: 'in_review',
      assigned_moderator_id: moderatorId,
      assigned_to: moderatorId,
      assigned_at: now,
      reviewed_by: moderatorId,
      reviewed_at: now,
    })
    .eq('id', reportId);

  return { error: error?.message ?? null };
}

export async function serverFreezeBiography(
  biographyId: string,
  reason = 'admin_action',
): Promise<ModerationServerResult> {
  if (reason !== 'death' && reason !== 'admin_action') {
    return { error: 'Freeze reason must be death or admin_action' };
  }
  const service = buildServiceClient();
  const now = new Date().toISOString();
  const { error } = await service
    .from('biographies')
    .update({
      is_frozen: true,
      frozen_at: now,
      frozen_reason: reason,
    })
    .eq('id', biographyId);

  return { error: error?.message ?? null };
}

export async function serverSubmitDecision(params: {
  reportId: string;
  biographyId: string;
  authorId: string;
  decision: ModerationDecision;
  bioPatch: BiographyDecisionPatch | null;
  notificationMessage: string;
  moderatorId: string;
}): Promise<ModerationServerResult> {
  const {
    reportId,
    biographyId,
    authorId,
    decision,
    bioPatch,
    notificationMessage,
    moderatorId,
  } = params;

  if (bioPatch) {
    const invalid = invalidDecisionPatch(bioPatch as Record<string, unknown>);
    if (invalid) return { error: invalid, conflict: false };
  }

  const claim = await serverClaimReportReview(reportId, moderatorId);
  if (!claim.claimed && claim.error === null) {
    return { error: null, conflict: true, claimed: false, claimedByName: claim.claimedByName };
  }
  if (claim.error) return { error: claim.error, conflict: false };

  const service = buildServiceClient();
  const now = new Date().toISOString();

  // Prima di chiudere il rapporto: se la decisione pubblica, il testo deve essere
  // quello che lo screening ha esaminato (altrimenti si rilancia lo screening o si
  // usa la pubblicazione forzata, che lascia traccia).
  if (bioPatch?.status === 'published') {
    const pre = await checkPublishGate(service, { biographyId, mode: 'human_approval' });
    if (!pre.ok) return { error: pre.message, conflict: false, blocked: pre.code };
  }

  const { data: updated, error: reportError } = await service
    .from('moderation_reports')
    .update({
      status: 'decided',
      decision,
      decided_by: moderatorId,
      decided_at: now,
      reviewed_by: null,
      reviewed_at: null,
      assigned_moderator_id: moderatorId,
      assigned_to: moderatorId,
    })
    .eq('id', reportId)
    .in('status', ['unassigned', 'assigned', 'in_review'])
    .select('id')
    .maybeSingle();

  if (reportError) return { error: reportError.message, conflict: false };
  if (!updated) return { error: null, conflict: true };

  let republication = false;
  if (bioPatch && Object.keys(bioPatch).length > 0) {
    const patch: Record<string, unknown> = { ...bioPatch };
    if (patch.status === 'published') {
      const { data: current } = await service
        .from('biographies')
        .select('status, biography_type, published_at, provisional_until, translation_of')
        .eq('id', biographyId)
        .maybeSingle();
      const row = current as {
        status?: string;
        biography_type?: string | null;
        published_at?: string | null;
        provisional_until?: string | null;
        translation_of?: string | null;
      } | null;
      if (row?.translation_of) {
        const { editionMayPublish } = await import('@/lib/server/edition-publish');
        const { data: original } = await service
          .from('biographies')
          .select('status')
          .eq('id', row.translation_of)
          .maybeSingle();
        if (!editionMayPublish({
          translationOf: row.translation_of,
          originalStatus: (original as { status?: string } | null)?.status ?? null,
        })) {
          return { error: 'original_not_published', conflict: false };
        }
      }
      if (row?.status === 'revision_pending_review') {
        delete patch.published_at;
        if (row.translation_of) {
          patch.revised_at = now;
        } else {
          Object.assign(patch, republicationClock(row.biography_type, now));
        }
        republication = true;
      } else if (!row?.translation_of && row?.biography_type === 'memorial' && !row.provisional_until && typeof patch.published_at === 'string') {
        const until = provisionalUntilOnFirstPublish('memorial', patch.published_at);
        if (until) patch.provisional_until = until;
      }
    }
    if (patch.status === 'published') {
      const published = await gatedPublish(
        service,
        { biographyId, mode: 'human_approval', actorId: moderatorId },
        async () => {
          const { error: updateError } = await service.from('biographies').update(patch).eq('id', biographyId);
          return updateError ? updateError.message : null;
        }
      );
      if (!published.ok) {
        return published.blocked
          ? { error: published.message, conflict: false, blocked: published.code }
          : { error: published.error, conflict: false };
      }
    } else {
      const { error: bioError } = await service.from('biographies').update(patch).eq('id', biographyId);
      if (bioError) return { error: bioError.message, conflict: false };
    }
    if (patch.status === 'published') {
      // Pubblicazione (o ripubblicazione) riuscita: si cancella la memoria di Echo.
      try {
        await purgeAgentMemoryForBiography(service, biographyId);
      } catch (err) {
        console.error('[moderation-decide] purgeAgentMemory failed (non-blocking)', err);
      }
    }
    if (republication) {
      try {
        const { syncArchivePackage } = await import('@/lib/server/archive-package-store');
        await syncArchivePackage(service, biographyId, 'republication');
      } catch (err) {
        console.error('[moderation-decide] archive package failed (non-blocking)', err);
      }
    }
  }

  const notifyError = await insertNotification(service, authorId, notificationMessage);
  if (notifyError) return { error: notifyError, conflict: false };

  if (bioPatch?.status === 'revision_requested') {
    const { error: clockErr } = await service
      .from('moderation_reports')
      .update({ author_revision_requested_at: now })
      .eq('id', reportId);
    if (clockErr) return { error: clockErr.message, conflict: false };
    try {
      await notifyAuthorPublicationEmail({
        client: service,
        authorId,
        biographyId,
        templateId: 'report_revision_requested',
        vars: { reviewerMessage: notificationMessage },
        notificationMessage: notificationMessage || 'A revision was requested. You have 30 days.',
      });
    } catch (err) {
      console.error('[moderation-decide] revision email', err);
    }
  }

  try {
    await writeModerationMessage(service, {
      reportId,
      senderId: moderatorId,
      recipientId: authorId,
      message: `Decision ${decision}. Biography status: ${bioPatch?.status ?? 'unchanged'}. ${notificationMessage}`.trim(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'register failed';
    return { error: message, conflict: false };
  }

  return { error: null, conflict: false };
}
