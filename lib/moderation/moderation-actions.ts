import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications-service';
import { ModerationDecision } from './types';

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

export async function submitDecision(
  reportId: string,
  biographyId: string,
  authorId: string,
  decision: ModerationDecision,
  biographyStatus: 'published' | 'draft' | 'removed',
  notificationMessage: string,
  moderatorId: string,
): Promise<{ error: string | null }> {
  const { error: bioError } = await supabase
    .from('biographies')
    .update({ status: biographyStatus })
    .eq('id', biographyId);

  if (bioError) return { error: bioError.message };

  const { error: reportError } = await supabase
    .from('moderation_reports')
    .update({
      status: 'decided',
      decision,
      decided_by: moderatorId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) return { error: reportError.message };

  await createNotification(authorId, notificationMessage);

  return { error: null };
}

export async function saveModeratorNotes(reportId: string, notes: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('moderation_reports')
    .update({ moderator_notes: notes })
    .eq('id', reportId);

  return { error: error?.message ?? null };
}
