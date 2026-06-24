export type MemoryMessageRow = {
  role: string;
  content: string;
  tool_calls?: unknown;
  created_at: string;
};

export type ThreadMemoryFacts = {
  currentFocus?: { sectionKey?: string; topic?: string };
  people?: { name: string; relation?: string }[];
  preferences?: { tone?: string; language?: string };
  openThreads?: string[];
  decisions?: string[];
};

export function filterToolNoise(
  rows: MemoryMessageRow[],
  keepRecentUserTurns = 3
): MemoryMessageRow[] {
  let usersSeen = 0;
  let cutoffIndex = 0;

  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].role === 'user') {
      usersSeen += 1;
      if (usersSeen >= keepRecentUserTurns) {
        cutoffIndex = i;
        break;
      }
    }
  }

  return rows.filter((row, index) => {
    if (index >= cutoffIndex) return true;
    if (row.role === 'tool') return false;
    if (row.role === 'assistant' && row.tool_calls && !row.content.trim()) return false;
    return row.role === 'user' || row.role === 'assistant';
  });
}

export function formatAgentMemoryBlock(
  rollingSummary: string | null | undefined,
  facts: ThreadMemoryFacts
): string {
  const parts: string[] = [];

  if (rollingSummary?.trim()) {
    parts.push(`Conversation summary:\n${rollingSummary.trim()}`);
  }

  const factLines: string[] = [];
  if (facts.currentFocus?.sectionKey || facts.currentFocus?.topic) {
    const focus = [
      facts.currentFocus.sectionKey ? `section=${facts.currentFocus.sectionKey}` : null,
      facts.currentFocus.topic ? `topic=${facts.currentFocus.topic}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    factLines.push(`Current focus: ${focus}`);
  }
  if (facts.people?.length) {
    factLines.push(
      `People mentioned: ${facts.people.map((p) => `${p.name}${p.relation ? ` (${p.relation})` : ''}`).join('; ')}`
    );
  }
  if (facts.preferences?.tone || facts.preferences?.language) {
    const prefs = [
      facts.preferences.tone ? `tone=${facts.preferences.tone}` : null,
      facts.preferences.language ? `language=${facts.preferences.language}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    factLines.push(`Preferences: ${prefs}`);
  }
  if (facts.openThreads?.length) {
    factLines.push(`Open threads: ${facts.openThreads.join('; ')}`);
  }
  if (facts.decisions?.length) {
    factLines.push(`Past decisions: ${facts.decisions.join('; ')}`);
  }

  if (factLines.length) {
    parts.push(`Structured memory:\n${factLines.join('\n')}`);
  }

  if (!parts.length) return '';
  return `\n\n## Conversation memory\n${parts.join('\n\n')}\n`;
}

export function splitMessagesForCompression(
  allRows: MemoryMessageRow[],
  keepRecent: number
): { toCompress: MemoryMessageRow[]; toKeep: MemoryMessageRow[] } {
  const conversational = allRows.filter((r) => r.role === 'user' || r.role === 'assistant');
  if (conversational.length <= keepRecent) {
    return { toCompress: [], toKeep: allRows };
  }

  const keepConversational = conversational.slice(-keepRecent);
  const firstKeepAt = keepConversational[0]?.created_at;
  if (!firstKeepAt) {
    return { toCompress: [], toKeep: allRows };
  }

  return {
    toCompress: allRows.filter((r) => r.created_at < firstKeepAt),
    toKeep: allRows.filter((r) => r.created_at >= firstKeepAt),
  };
}

export function parseCompressionResponse(
  raw: string,
  maxSummaryChars: number
): { summary: string; facts: ThreadMemoryFacts } | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      facts?: ThreadMemoryFacts;
    };
    if (!parsed.summary?.trim()) return null;
    return {
      summary: parsed.summary.trim().slice(0, maxSummaryChars),
      facts: parsed.facts ?? {},
    };
  } catch {
    return null;
  }
}
