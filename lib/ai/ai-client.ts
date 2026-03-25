import { supabase } from '@/lib/supabase';
import { AiLimitError } from './ai-provider';

const AI_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getValidToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('SESSION_EXPIRED');
  }

  const expiresAt = session.expires_at ?? 0;
  const nowSecs = Math.floor(Date.now() / 1000);
  const isExpiredOrExpiringSoon = expiresAt - nowSecs < 300;

  if (isExpiredOrExpiringSoon) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }

    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (freshSession?.access_token) {
      return freshSession.access_token;
    }

    throw new Error('SESSION_EXPIRED');
  }

  return session.access_token;
}

export async function callAI(body: Record<string, unknown>): Promise<any> {
  let token = await getValidToken();
  let res = await doFetch(token, body);

  if (res.status === 401) {
    await new Promise(r => setTimeout(r, 500));
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error('SESSION_EXPIRED');
    }
    token = refreshed.session.access_token;
    res = await doFetch(token, body);

    if (res.status === 401) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody?.error === 'TOKEN_EXPIRED') {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    if (data.limitType === 'daily' || data.limitType === 'weekly') {
      throw new AiLimitError(
        data.limitType,
        data.resetAt,
        data.dailyLimit ?? 40,
        data.weeklyLimit ?? 200
      );
    }
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }

  if (res.status === 503) {
    throw new Error('AI service is not configured yet.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI request failed with status ${res.status}`);
  }

  return res.json();
}

function doFetch(token: string, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const clientTimeout = setTimeout(() => controller.abort(), 35000);

  return fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .catch((err) => {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI_TIMEOUT');
      }
      throw err;
    })
    .finally(() => {
      clearTimeout(clientTimeout);
    });
}
