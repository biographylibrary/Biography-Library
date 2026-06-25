'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { streamAgentChat } from '@/lib/agents/agent-chat-client';
import type { AgentType } from '@/lib/agents/models';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export interface AgentChatProps {
  agentType: AgentType;
  biographyId?: string;
  activeSection?: string;
  className?: string;
  emptyState?: string;
  loadHistory?: boolean;
  /** Coach chat: retry via ai-assistant edge if agent stream fails */
  fallbackToCoachEdge?: boolean;
  sectionTitle?: string;
  onDraftApplied?: (sectionKey: string) => void;
  onThreadId?: (threadId: string) => void;
}

export function AgentChat({
  agentType,
  biographyId,
  activeSection,
  className,
  emptyState,
  loadHistory = false,
  fallbackToCoachEdge = false,
  sectionTitle,
  onDraftApplied,
  onThreadId,
}: AgentChatProps) {
  const { session } = useAuth();
  const { language, t } = useTranslation();
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!loadHistory || !session?.access_token) return;

    const params = new URLSearchParams({ agentType });
    if (biographyId) params.set('biographyId', biographyId);

    fetch(`/api/agents/threads/active?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.messages?.length) return;
        if (json.thread?.id) {
          setThreadId(json.thread.id);
          onThreadId?.(json.thread.id);
        }
        setMessages(
          json.messages
            .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
            .filter((m: { content: string }) => m.content?.trim())
            .map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
        );
      })
      .catch(() => {
        /* ignore */
      });
  }, [loadHistory, session?.access_token, agentType, biographyId, onThreadId]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !session?.access_token) return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: trimmed },
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setError(null);
    setLoading(true);

    const priorHistory = messages
      .filter((m) => m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const tryEdgeFallback = async (): Promise<boolean> => {
      if (!session?.access_token) return false;

      if (
        fallbackToCoachEdge &&
        agentType === 'biography_coach' &&
        activeSection &&
        sectionTitle
      ) {
        try {
          const { askCoachViaEdge } = await import('@/lib/agents/agent-edge-fallback');
          const reply = await askCoachViaEdge({
            message: trimmed,
            sectionTitle,
            language,
            history: priorHistory,
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: reply, streaming: false } : m
            )
          );
          setError(null);
          return true;
        } catch {
          return false;
        }
      }

      return false;
    };

    try {
      let streamFailed = false;
      let receivedTokens = false;
      await streamAgentChat(
        {
          agentType,
          message: trimmed,
          biographyId,
          activeSection,
          language,
          threadId,
          accessToken: session.access_token,
        },
        (ev) => {
          if (ev.event === 'thread') {
            setThreadId(ev.data.threadId);
            onThreadId?.(ev.data.threadId);
          }
          if (ev.event === 'token') {
            receivedTokens = true;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + ev.data.content }
                  : m
              )
            );
          }
          if (ev.event === 'tool_result' && ev.data.tool === 'propose_draft' && ev.data.sectionKey) {
            onDraftApplied?.(ev.data.sectionKey);
          }
          if (ev.event === 'error') {
            streamFailed = true;
            setError(ev.data.message);
          }
        }
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );

      if (streamFailed || !receivedTokens) {
        const recovered = await tryEdgeFallback();
        if (!recovered && (streamFailed || !receivedTokens)) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          if (!streamFailed) setError('Request failed');
        }
      }
    } catch (err) {
      const recovered = await tryEdgeFallback();
      if (!recovered) {
        const msg = err instanceof Error ? err.message : 'Request failed';
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    session,
    agentType,
    biographyId,
    activeSection,
    language,
    threadId,
    fallbackToCoachEdge,
    sectionTitle,
    onDraftApplied,
    onThreadId,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      <div className="flex-1 overflow-y-auto space-y-3 p-3">
        {messages.length === 0 && emptyState && (
          <p className="text-sm text-muted-foreground">{emptyState}</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'rounded-lg px-3 py-2 text-sm max-w-[90%] whitespace-pre-wrap',
              m.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-muted text-foreground'
            )}
          >
            {m.content}
            {m.streaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-middle" />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-sm text-destructive px-3 pb-2" role="alert">
          {error}
        </p>
      )}

      <div className="border-t p-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={loading || !session}
          placeholder={t.helpChatbot.placeholder}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm min-h-[44px]"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void handleSend()}
          disabled={loading || !input.trim() || !session}
          aria-label="Send"
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setMessages([]);
            setThreadId(undefined);
            setError(null);
          }}
          disabled={loading}
          aria-label="Clear"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
