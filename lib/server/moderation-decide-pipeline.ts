import type { SupabaseClient } from '@supabase/supabase-js';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import type { ModerationDecision } from '@/lib/moderation/types';
import type { BiographyDecisionPatch } from '@/lib/moderation/moderation-actions';

export type ModerationServerResult = {
  error: string | null;
  conflict?: boolean;
  claimed?: boolean;
  claimedByName?: string | null;
};

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
  reason = 'moderation_report',
): Promise<ModerationServerResult> {
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

  const claim = await serverClaimReportReview(reportId, moderatorId);
  if (!claim.claimed && claim.error === null) {
    return { error: null, conflict: true, claimed: false, claimedByName: claim.claimedByName };
  }
  if (claim.error) return { error: claim.error, conflict: false };

  const service = buildServiceClient();
  const now = new Date().toISOString();

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

  if (bioPatch && Object.keys(bioPatch).length > 0) {
    const { error: bioError } = await service
      .from('biographies')
      .update(bioPatch)
      .eq('id', biographyId);

    if (bioError) return { error: bioError.message, conflict: false };
  }

  const notifyError = await insertNotification(service, authorId, notificationMessage);
  if (notifyError) return { error: notifyError, conflict: false };

  return { error: null, conflict: false };
}
