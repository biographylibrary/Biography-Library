import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications-service';
import { ModerationDecision, ModeratorNotes } from './types';

export type BiographyDecisionPatch = {
  status?: 'published' | 'draft' | 'removed';
  published_at?: string;
  is_frozen?: boolean;
  frozen_at?: string | null;
  frozen_reason?: string | null;
};

export async function takeOwnership(reportId: string, moderatorId: string): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
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

export type ClaimResult =
  | { claimed: true; error: null }
  | { claimed: false; claimedByName: string | null; error: null }
  | { claimed: false; claimedByName: null; error: string };

export async function claimReportReview(reportId: string, userId: string): Promise<ClaimResult> {
  const { data, error } = await supabase
    .from('moderation_reports')
    .update({ reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', reportId)
    .or(`reviewed_by.is.null,reviewed_by.eq.${userId}`)
    .select('id')
    .maybeSingle();

  if (error) return { claimed: false, claimedByName: null, error: error.message };
  if (data) return { claimed: true, error: null };

  const { data: existing } = await supabase
    .from('moderation_reports')
    .select('reviewed_by')
    .eq('id', reportId)
    .maybeSingle();

  const reviewerId = existing?.reviewed_by ?? null;
  let claimedByName: string | null = null;
  if (reviewerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', reviewerId)
      .maybeSingle();
    claimedByName = profile?.name ?? null;
  }

  return { claimed: false, claimedByName, error: null };
}

export async function freezeBiography(
  biographyId: string,
  reason = 'moderation_report',
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('biographies')
    .update({
      is_frozen: true,
      frozen_at: now,
      frozen_reason: reason,
    })
    .eq('id', biographyId);

  return { error: error?.message ?? null };
}

/** Match reports assigned via assigned_moderator_id or legacy assigned_to only. */
function reportAssignedToModeratorFilter(moderatorId: string) {
  return `assigned_moderator_id.eq.${moderatorId},and(assigned_moderator_id.is.null,assigned_to.eq.${moderatorId})`;
}

export async function submitDecision(
  reportId: string,
  biographyId: string,
  authorId: string,
  decision: ModerationDecision,
  bioPatch: BiographyDecisionPatch | null,
  notificationMessage: string,
  moderatorId: string,
): Promise<{ error: string | null; conflict: boolean }> {
  const claim = await claimReportReview(reportId, moderatorId);
  if (!claim.claimed && claim.error === null) {
    return { error: null, conflict: true };
  }
  if (claim.error) return { error: claim.error, conflict: false };

  // Backfill assigned_moderator_id when only assigned_to was set (legacy rows).
  await supabase
    .from('moderation_reports')
    .update({ assigned_moderator_id: moderatorId })
    .eq('id', reportId)
    .is('assigned_moderator_id', null)
    .eq('assigned_to', moderatorId);

  const { data: updated, error: reportError } = await supabase
    .from('moderation_reports')
    .update({
      status: 'decided',
      decision,
      decided_by: moderatorId,
      decided_at: new Date().toISOString(),
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq('id', reportId)
    .or(reportAssignedToModeratorFilter(moderatorId))
    .in('status', ['in_review', 'assigned'])
    .select('id')
    .maybeSingle();

  if (reportError) return { error: reportError.message, conflict: false };
  if (!updated) return { error: null, conflict: true };

  if (bioPatch && Object.keys(bioPatch).length > 0) {
    const { error: bioError } = await supabase
      .from('biographies')
      .update(bioPatch)
      .eq('id', biographyId);

    if (bioError) return { error: bioError.message, conflict: false };
  }

  if (notificationMessage.trim()) {
    await createNotification(authorId, notificationMessage);
  }

  return { error: null, conflict: false };
}

export async function saveModeratorNotes(reportId: string, notes: string): Promise<{ error: string | null }> {
  const payload: ModeratorNotes = { text: notes };
  const { error } = await supabase
    .from('moderation_reports')
    .update({ moderator_notes: payload })
    .eq('id', reportId);

  return { error: error?.message ?? null };
}
