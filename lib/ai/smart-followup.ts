import { callAI } from './ai-client';
import type { BiographyNarrativeContext } from '@/lib/biography-narrative-context';
import { isMemorialNarrative } from '@/lib/biography-narrative-context';

function memorialPayload(narrative?: BiographyNarrativeContext): Record<string, string> {
  if (!narrative || !isMemorialNarrative(narrative)) return {};
  return {
    biographyType: 'memorial',
    subjectName: narrative.subjectName,
    writerName: narrative.writerName,
  };
}

export interface ConversationHistory {
  question: string;
  answer: string;
}

interface AnalysisResult {
  needsFollowUp: boolean;
  followUpQuestion: string | null;
  acknowledgment: string;
}

const fallbackAcknowledgments: Record<string, string[]> = {
  en: [
    'Thank you for sharing that.',
    'Those are meaningful memories.',
    'I appreciate you sharing those details.',
    'Thank you for opening up about that.',
    'Those are wonderful memories to preserve.',
  ],
  it: [
    'Grazie per aver condiviso questo.',
    'Sono ricordi molto significativi.',
    'Apprezzo che tu abbia condiviso questi dettagli.',
    'Grazie per esserti aperto su questo.',
    'Sono ricordi meravigliosi da conservare.',
  ],
  fr: [
    'Merci de partager cela.',
    'Ce sont des souvenirs significatifs.',
    'J\'apprécie que vous partagiez ces détails.',
    'Merci de vous ouvrir à ce sujet.',
    'Ce sont de beaux souvenirs à préserver.',
  ],
  de: [
    'Danke, dass Sie das geteilt haben.',
    'Das sind bedeutungsvolle Erinnerungen.',
    'Ich schätze es, dass Sie diese Details teilen.',
    'Danke, dass Sie sich darüber geöffnet haben.',
    'Das sind wunderbare Erinnerungen, die es zu bewahren gilt.',
  ],
};

function getFallbackAcknowledgment(language: string): string {
  const options = fallbackAcknowledgments[language] ?? fallbackAcknowledgments.en;
  return options[Math.floor(Math.random() * options.length)];
}

export async function analyzeAndRespond(
  answer: string,
  question: string,
  conversationHistory: ConversationHistory[],
  language: string,
  hasHadFollowUp: boolean,
  narrative?: BiographyNarrativeContext
): Promise<AnalysisResult> {
  try {
    const result = await callAI({
      action: 'analyze-answer',
      userAnswer: answer,
      originalQuestion: question,
      conversationHistory,
      language,
      ...memorialPayload(narrative),
    });

    return {
      needsFollowUp: result.needsFollowUp ?? false,
      followUpQuestion: result.followUpQuestion ?? null,
      acknowledgment: result.acknowledgment ?? getFallbackAcknowledgment(language),
    };
  } catch {
    return {
      needsFollowUp: false,
      followUpQuestion: null,
      acknowledgment: getFallbackAcknowledgment(language),
    };
  }
}
