import type { AgentType } from './models';

export type AgentStreamEvent =
  | { event: 'thread'; data: { threadId: string } }
  | { event: 'token'; data: { content: string } }
  | { event: 'tool_result'; data: { tool: string; sectionKey?: string; contentLength?: number } }
  | { event: 'done'; data: { threadId: string } }
  | { event: 'error'; data: { message: string } };

export async function streamAgentChat(
  params: {
    agentType: AgentType;
    message: string;
    biographyId?: string;
    activeSection?: string;
    language: string;
    threadId?: string;
    accessToken: string;
  },
  onEvent: (ev: AgentStreamEvent) => void
): Promise<void> {
  const res = await fetch('/api/agents/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      agentType: params.agentType,
      message: params.message,
      biographyId: params.biographyId,
      activeSection: params.activeSection,
      language: params.language,
      threadId: params.threadId,
    }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
  }

  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      if (!part.trim()) continue;
      let eventName = 'message';
      let dataStr = '';
      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        if (line.startsWith('data:')) dataStr = line.slice(5).trim();
      }
      if (!dataStr) continue;
      try {
        const data = JSON.parse(dataStr);
        onEvent({ event: eventName, data } as AgentStreamEvent);
      } catch {
        // skip
      }
    }
  }
}
