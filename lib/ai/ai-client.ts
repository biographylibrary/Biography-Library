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
    if (
      freshSession?.access_token &&
      freshSession.expires_at &&
      freshSession.expires_at > Math.floor(Date.now() / 1000)
    ) {
      return freshSession.access_token;
    }

    throw new Error('SESSION_EXPIRED');
  }

  return session.access_token;
}

export async function callAI(body: Record<string, unknown>): Promise<any> {
  let token = await getValidToken();
  console.debug('[AI-CLIENT] token prefix sent:', token.slice(0, 20));
  let res = await doFetch(token, body);
  console.debug('[AI-CLIENT] HTTP status from Edge Function:', res.status);

  if (res.status === 401) {
    const errBody401 = await res.clone().json().catch(() => ({}));
    console.debug('[AI-CLIENT] 401 response body (first attempt):', JSON.stringify(errBody401));
    await new Promise(r => setTimeout(r, 500));
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    console.debug('[AI-CLIENT] refreshSession after 401 - error:', refreshError?.message ?? 'none', 'has token:', !!refreshed?.session?.access_token);
    if (refreshError || !refreshed.session?.access_token) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (
        currentSession?.access_token &&
        currentSession.expires_at &&
        currentSession.expires_at > Math.floor(Date.now() / 1000)
      ) {
        token = currentSession.access_token;
      } else {
        throw new Error('SESSION_EXPIRED');
      }
    } else {
      token = refreshed.session.access_token;
    }
    console.debug('[AI-CLIENT] retry token prefix:', token.slice(0, 20));
    res = await doFetch(token, body);
    console.debug('[AI-CLIENT] HTTP status after 401 retry:', res.status);

    if (res.status === 401) {
      const errBody = await res.json().catch(() => ({}));
      console.debug('[AI-CLIENT] 401 response body (retry):', JSON.stringify(errBody));
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
    console.debug('[AI-CLIENT] non-200 response body:', JSON.stringify(data));
    throw new Error(data.error || `AI request failed with status ${res.status}`);
  }

  return res.json();
}

function doFetch(token: string, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const action = typeof body.action === 'string' ? body.action : '';
  const timeoutMs =
    action === 'rewrite' ? 90_000 : action === 'grammar' ? 55_000 : 35_000;
  const clientTimeout = setTimeout(() => controller.abort(), timeoutMs);

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
