import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';
import { sendWelcomeEmail } from '@/lib/server/email';

export async function POST(req: NextRequest) {
  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = body.userId;
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (cronSecret && bearer === cronSecret) {
    // internal/cron
  } else if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = buildServiceClient();
  const { data: profile, error: profileErr } = await service
    .from('profiles')
    .select('id, email, language, welcome_email_sent_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if ((profile as { welcome_email_sent_at?: string | null }).welcome_email_sent_at) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'already_sent' });
  }

  const email = (profile as { email?: string | null }).email;
  if (!email) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_email' });
  }

  const language = (profile as { language?: string | null }).language;

  try {
    await sendWelcomeEmail(email, language, userId);
    await service
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', userId);
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error('[welcome-email]', err);
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
  }
}
