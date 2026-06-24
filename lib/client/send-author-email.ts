import { supabase } from '@/lib/supabase';
import type { EmailTemplateId } from '@/lib/server/email';

export async function sendAuthorEmailFromClient(params: {
  userId: string;
  email?: string | null;
  templateId: EmailTemplateId;
  biographyId?: string;
  vars?: Record<string, string>;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await fetch('/api/email/send-author', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });
}
