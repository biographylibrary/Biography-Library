import type { Language } from '@/lib/i18n/translations';

type ChatHistoryItem = { role: string; content: string };

function historyToQaPairs(
  history: ChatHistoryItem[]
): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  let pendingQuestion = '';
  for (const m of history) {
    if (m.role === 'assistant') pendingQuestion = m.content;
    else if (m.role === 'user' && pendingQuestion) {
      pairs.push({ question: pendingQuestion, answer: m.content });
      pendingQuestion = '';
    }
  }
  return pairs;
}

/** Coach fallback via Supabase Edge (same path as grammar/prompts — works when Jelastic Infomaniak fails). */
export async function askCoachViaEdge(params: {
  message: string;
  sectionTitle: string;
  language: Language;
  history?: ChatHistoryItem[];
}): Promise<string> {
  const { callAI } = await import('@/lib/ai/ai-client');
  const history = params.history ?? [];
  const lastQuestion =
    [...history].reverse().find((m) => m.role === 'assistant')?.content ||
    `What would you like to share about ${params.sectionTitle}?`;

  const result = await callAI({
    action: 'analyze-answer',
    userAnswer: params.message,
    originalQuestion: lastQuestion,
    conversationHistory: historyToQaPairs(history),
    language: params.language,
  });

  const reply = [result.acknowledgment, result.followUpQuestion].filter(Boolean).join('\n\n');
  if (!reply.trim()) throw new Error('Empty coach response');
  return reply;
}
