import type { SupabaseClient } from '@supabase/supabase-js';

type AnyClient = SupabaseClient<any, any, any>;

export async function writeModerationMessage(
  svc: AnyClient,
  params: {
    reportId: string;
    senderId: string;
    recipientId?: string | null;
    message: string;
    internal?: boolean;
  },
): Promise<void> {
  const { error } = await svc.from('moderation_messages').insert({
    report_id: params.reportId,
    sender_id: params.senderId,
    recipient_id: params.recipientId ?? null,
    is_internal: params.internal ?? false,
    message: params.message,
  });
  if (error) throw new Error(error.message);
}
