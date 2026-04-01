import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications-service';
import { ModerationDecision, ModeratorNotes } from './types';

export async function takeOwnership(reportId: string, moderatorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('moderation_reports')
    .update({
      status: 'in_review',
      assigned_moderator_id: moderatorId,
      assigned_at: new Date().toISOString(),
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

export async function submitDecision(
  reportId: string,
  biographyId: string,
  authorId: string,
  decision: ModerationDecision,
  biographyStatus: 'published' | 'draft' | 'removed',
  notificationMessage: string,
  moderatorId: string,
): Promise<{ error: string | null; conflict: boolean }> {
  const { error: bioError } = await supabase
    .from('biographies')
    .update({ status: biographyStatus })
    .eq('id', biographyId);

  if (bioError) return { error: bioError.message, conflict: false };

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
    .eq('reviewed_by', moderatorId)
    .select('id')
    .maybeSingle();

  if (reportError) return { error: reportError.message, conflict: false };
  if (!updated) return { error: null, conflict: true };

  await createNotification(authorId, notificationMessage);

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
