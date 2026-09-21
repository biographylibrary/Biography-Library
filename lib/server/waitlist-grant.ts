import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyGrantTarget, GRANT_ACCESS_BATCH_SIZE } from '@/lib/waitlist';
import { sendTemplateEmail } from '@/lib/server/email';

type AnyClient = SupabaseClient<any, any, any>;

export type GrantAccessResult = {
  granted: string[];
  skippedActive: string[];
  skipped: string[];
  failed: { id: string; error: string }[];
};

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * waitlist → active, one short update per id, then Resend in sequence.
 * Already-active ids are skipped (idempotent). Does not mint UM ids.
 */
export async function grantWaitlistAccess(params: {
  service: AnyClient;
  userIds: string[];
  performedBy: string;
  sendEmail?: typeof sendTemplateEmail;
}): Promise<GrantAccessResult> {
  const unique = Array.from(new Set(params.userIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) {
    return { granted: [], skippedActive: [], skipped: [], failed: [] };
  }
  if (unique.length > GRANT_ACCESS_BATCH_SIZE) {
    throw new Error(`At most ${GRANT_ACCESS_BATCH_SIZE} ids per request`);
  }

  const send = params.sendEmail ?? sendTemplateEmail;
  const granted: string[] = [];
  const skippedActive: string[] = [];
  const skipped: string[] = [];
  const failed: { id: string; error: string }[] = [];
  const grantedAt = new Date().toISOString();

  for (const id of unique) {
    try {
      const { data: target, error: readErr } = await params.service
        .from('profiles')
        .select('id, email, language, account_status, role')
        .eq('id', id)
        .maybeSingle();

      if (readErr || !target) {
        failed.push({ id, error: 'not_found' });
        continue;
      }

      const status = (target as { account_status?: string }).account_status;
      const kind = classifyGrantTarget(status);
      if (kind === 'skip_active') {
        skippedActive.push(id);
        continue;
      }
      if (kind === 'skip_other') {
        skipped.push(id);
        continue;
      }

      const { data: updated, error: upErr } = await params.service
        .from('profiles')
        .update({
          account_status: 'active',
          waitlist_granted_at: grantedAt,
        })
        .eq('id', id)
        .eq('account_status', 'waitlist')
        .select('id, email, language')
        .maybeSingle();

      if (upErr) {
        failed.push({ id, error: upErr.message });
        continue;
      }
      if (!updated) {
        skippedActive.push(id);
        continue;
      }

      const email = (updated as { email?: string | null }).email;
      const language = (updated as { language?: string | null }).language;

      await params.service.from('admin_action_log').insert({
        performed_by: params.performedBy,
        action_type: 'waitlist_grant_access',
        target_type: 'user',
        target_id: id,
        details: { email },
      });

      if (email) {
        await send({
          to: email,
          templateId: 'waitlist_access_granted',
          locale: language,
          idempotencyKey: `waitlist-grant/${id}`,
        });
        await sleep(120);
      }

      granted.push(id);
    } catch (e) {
      failed.push({ id, error: e instanceof Error ? e.message : 'unknown' });
    }
  }

  return { granted, skippedActive, skipped, failed };
}
