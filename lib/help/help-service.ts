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

export async function askHelpBot(
  question: string,
  language: HelpLanguage = 'en',
  accessToken: string
): Promise<HelpResponse> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const endpoint = `${supabaseUrl}/functions/v1/help-assistant`;

  console.debug('[HelpChatbot] Sending request — Authorization header attached, token length:', accessToken.length);

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

  console.debug('[HelpChatbot] Response status:', res.status);

  if (res.status === 401) {
    console.warn('[HelpChatbot] 401 from edge function — token rejected');
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
      console.error('[HelpChatbot] Edge function error body:', errJson);
    } catch {
      /* ignore parse errors */
    }
    throw new Error(apiError || `Request failed with status ${res.status}`);
  }

  let json: { answer?: string; confidence?: 'high' | 'low'; error?: string };
  try {
    json = await res.json();
  } catch {
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  if (json.error) {
    console.error('[HelpChatbot] Edge function returned error in 200 body:', json.error);
    throw new Error(json.error);
  }

  if (!json.answer || json.answer.trim().length < 10) {
    return { answer: FALLBACK_MESSAGES[language], confidence: 'low' };
  }

  return {
    answer: json.answer.trim(),
    confidence: json.confidence ?? 'high',
  };
}
