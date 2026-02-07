const AI_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;

export interface AnalyzeResponse {
  needsFollowUp: boolean;
  followUpQuestion?: string;
  acknowledgment: string;
}

export interface ConversationHistory {
  question: string;
  answer: string;
}

const SKIP_PHRASES = {
  en: ['don\'t remember', 'can\'t remember', 'prefer not to say', 'rather not', 'skip'],
  it: ['non ricordo', 'non mi ricordo', 'preferisco non dirlo', 'preferirei non', 'salta'],
  fr: ['ne me souviens pas', 'préfère ne pas dire', 'je ne sais pas', 'passer'],
  de: ['erinnere mich nicht', 'möchte nicht sagen', 'lieber nicht', 'überspringen'],
};

function detectSkipPhrase(answer: string, language: string): boolean {
  const phrases = SKIP_PHRASES[language as keyof typeof SKIP_PHRASES] || SKIP_PHRASES.en;
  const lowerAnswer = answer.toLowerCase();
  return phrases.some(phrase => lowerAnswer.includes(phrase));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

async function callAiFunction(
  token: string,
  body: Record<string, any>
): Promise<any> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
  }

  if (res.status === 503) {
    throw new Error('AI service is not configured yet.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('AI request failed:', { status: res.status, statusText: res.statusText, data });
    const errorMsg = data.error || `AI request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function analyzeAndRespond(
  token: string,
  userAnswer: string,
  originalQuestion: string,
  conversationHistory: ConversationHistory[],
  language: string,
  hasHadFollowUp: boolean = false
): Promise<AnalyzeResponse> {
  if (detectSkipPhrase(userAnswer, language)) {
    const acknowledgments = {
      en: 'I understand. Let\'s move on.',
      it: 'Capisco. Passiamo avanti.',
      fr: 'Je comprends. Continuons.',
      de: 'Ich verstehe. Machen wir weiter.',
    };

    return {
      needsFollowUp: false,
      acknowledgment: acknowledgments[language as keyof typeof acknowledgments] || acknowledgments.en,
    };
  }

  if (hasHadFollowUp) {
    const acknowledgments = {
      en: 'Thank you for sharing that.',
      it: 'Grazie per aver condiviso questo.',
      fr: 'Merci d\'avoir partagé cela.',
      de: 'Danke, dass Sie das geteilt haben.',
    };

    return {
      needsFollowUp: false,
      acknowledgment: acknowledgments[language as keyof typeof acknowledgments] || acknowledgments.en,
    };
  }

  const wordCount = countWords(userAnswer);

  if (wordCount >= 80) {
    const acknowledgments = {
      en: 'Thank you for that wonderful detail.',
      it: 'Grazie per tutti questi dettagli.',
      fr: 'Merci pour tous ces détails.',
      de: 'Vielen Dank für die Details.',
    };

    return {
      needsFollowUp: false,
      acknowledgment: acknowledgments[language as keyof typeof acknowledgments] || acknowledgments.en,
    };
  }

  try {
    const result = await callAiFunction(token, {
      action: 'analyze-answer',
      userAnswer,
      originalQuestion,
      conversationHistory: conversationHistory.slice(-3),
      language,
    });

    console.log('Smart follow-up result:', result);

    if (!result || typeof result !== 'object') {
      console.error('Invalid result format:', result);
      throw new Error('Invalid response format from AI service');
    }

    return {
      needsFollowUp: result.needsFollowUp || false,
      followUpQuestion: result.followUpQuestion,
      acknowledgment: result.acknowledgment || 'Grazie per aver condiviso questo.',
    };
  } catch (error) {
    console.error('Failed to analyze answer:', error);

    const fallbackAcknowledgments = {
      en: 'Thank you for sharing that.',
      it: 'Grazie per aver condiviso questo.',
      fr: 'Merci d\'avoir partagé cela.',
      de: 'Danke, dass Sie das geteilt haben.',
    };

    return {
      needsFollowUp: false,
      acknowledgment: fallbackAcknowledgments[language as keyof typeof fallbackAcknowledgments] || fallbackAcknowledgments.en,
    };
  }
}
