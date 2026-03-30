import { supabase } from '@/lib/supabase';

export type HelpLanguage = 'en' | 'it' | 'fr' | 'de';

export interface HelpResponse {
  answer: string;
  confidence: 'high' | 'low';
}

const FALLBACK_MESSAGES: Record<HelpLanguage, string> = {
  en: "I'm not sure about that. For detailed guidance, please check the FAQ or contact support.",
  it: "Non sono sicuro di questo. Per una guida dettagliata, consulta le FAQ o contatta il supporto.",
  fr: "Je ne suis pas sûr de cela. Pour des instructions détaillées, veuillez consulter la FAQ ou contacter le support.",
  de: "Ich bin mir dabei nicht sicher. Ausführliche Anleitungen finden Sie in den FAQ oder beim Support.",
};

async function getValidAccessToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const isExpiredOrNearExpiry = expiresAt - nowSec < 60;

  if (isExpiredOrNearExpiry) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed?.session) return null;
    return refreshed.session.access_token;
  }

  return session.access_token;
}

export async function askHelpBot(
  question: string,
  language: HelpLanguage = 'en'
): Promise<HelpResponse> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    console.warn('[HelpChatbot] No valid access token — user may not be logged in or session expired');
    throw new Error('SESSION_EXPIRED');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const endpoint = `${supabaseUrl}/functions/v1/help-assistant`;

  console.debug('[HelpChatbot] Sending request with Authorization header attached');

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Apikey': anonKey,
      },
      body: JSON.stringify({ question: trimmed, language }),
    });
  } catch (networkErr) {
    console.error('[HelpChatbot] Network error:', networkErr);
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  if (res.status === 401) {
    console.warn('[HelpChatbot] 401 from edge function — session expired');
    throw new Error('SESSION_EXPIRED');
  }

  if (res.status === 429) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }

  if (!res.ok) {
    let apiError = '';
    try {
      const errJson = await res.json();
      apiError = errJson?.error ?? '';
    } catch {
      /* ignore parse errors */
    }
    console.error('[HelpChatbot] Edge function error:', res.status, apiError);
    throw new Error(apiError || `Request failed with status ${res.status}`);
  }

  let json: { answer?: string; confidence?: 'high' | 'low'; error?: string };
  try {
    json = await res.json();
  } catch {
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  if (json.error || !json.answer || json.answer.trim().length < 10) {
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  return {
    answer: json.answer.trim(),
    confidence: json.confidence ?? 'high',
  };
}
