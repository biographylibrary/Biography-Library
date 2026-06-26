import { supabase } from '@/lib/supabase';
import { ModerationDecision, ModeratorNotes } from './types';

export type BiographyDecisionPatch = {
  status?: 'published' | 'draft' | 'removed';
  published_at?: string;
  is_frozen?: boolean;
  frozen_at?: string | null;
  frozen_reason?: string | null;
};

type ModerationApiPayload = {
  error?: string | null;
  conflict?: boolean;
  claimed?: boolean;
  claimedByName?: string | null;
};

async function moderationApiPost(body: Record<string, unknown>): Promise<{
  ok: boolean;
  payload: ModerationApiPayload;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { ok: false, payload: { error: 'Not authenticated' } };
  }

  const res = await fetch('/api/admin/moderation/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as ModerationApiPayload;
  if (!res.ok && !payload.error) {
    payload.error = res.status === 403 ? 'Forbidden' : 'Request failed';
  }
  return { ok: res.ok, payload };
}

export async function takeOwnership(reportId: string, _moderatorId: string): Promise<{ error: string | null }> {
  const { payload } = await moderationApiPost({ action: 'take_ownership', reportId });
  return { error: payload.error ?? null };
}

export type ClaimResult =
  | { claimed: true; error: null }
  | { claimed: false; claimedByName: string | null; error: null }
  | { claimed: false; claimedByName: null; error: string };

export async function claimReportReview(reportId: string, userId: string): Promise<ClaimResult> {
  const { ok, payload } = await moderationApiPost({ action: 'claim_review', reportId });
  if (payload.error) return { claimed: false, claimedByName: null, error: payload.error };
  if (!ok) return { claimed: false, claimedByName: null, error: 'Request failed' };
  if (payload.claimed) return { claimed: true, error: null };
  return { claimed: false, claimedByName: payload.claimedByName ?? null, error: null };
}

export async function freezeBiography(
  biographyId: string,
  reason = 'moderation_report',
): Promise<{ error: string | null }> {
  const { payload } = await moderationApiPost({ action: 'freeze', biographyId, reason });
  return { error: payload.error ?? null };
}

export async function submitDecision(
  reportId: string,
  biographyId: string,
  authorId: string,
  decision: ModerationDecision,
  bioPatch: BiographyDecisionPatch | null,
  notificationMessage: string,
  _moderatorId: string,
): Promise<{ error: string | null; conflict: boolean }> {
  const { payload } = await moderationApiPost({
    action: 'decide',
    reportId,
    biographyId,
    authorId,
    decision,
    bioPatch,
    notificationMessage,
  });

  return {
    error: payload.error ?? null,
    conflict: payload.conflict === true,
  };
}

export async function saveModeratorNotes(reportId: string, notes: string): Promise<{ error: string | null }> {
  const payload: ModeratorNotes = { text: notes };
  const { error } = await supabase
    .from('moderation_reports')
    .update({ moderator_notes: payload })
    .eq('id', reportId);

  return { error: error?.message ?? null };
}
