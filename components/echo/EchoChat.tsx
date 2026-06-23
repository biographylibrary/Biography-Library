'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { streamAgentChat } from '@/lib/agents/agent-chat-client';
import type { EchoPageContext } from '@/lib/echo/echo-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EchoAvatar } from './EchoAvatar';
import type { EchoOrbState } from './EchoOrb';
import { EchoVoiceSession, speakEchoReply, stopEchoSpeech } from './EchoVoiceSession';
import type { EchoSpeechBackend } from '@/lib/echo/echo-playback';

export interface EchoChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export interface EchoChatProps {
  echoPage?: EchoPageContext;
  biographyId?: string;
  activeSection?: string;
  biographyMode?: 'sections' | 'freeflow';
  onboardingIncomplete?: boolean;
  className?: string;
  emptyState?: string;
  loadHistory?: boolean;
  showOrb?: boolean;
  orbSize?: 'sm' | 'md' | 'lg' | 'xl';
  voiceEnabled?: boolean;
  onDraftApplied?: (sectionKey: string) => void;
  onOnboardingEvent?: (event: { tool: string; data?: unknown }) => void;
}

export function EchoChat({
  echoPage = 'hub',
  biographyId,
  activeSection,
  biographyMode,
  onboardingIncomplete = false,
  className,
  emptyState,
  loadHistory = true,
  showOrb = true,
  orbSize = 'lg',
  voiceEnabled = true,
  onDraftApplied,
  onOnboardingEvent,
}: EchoChatProps) {
  const { session } = useAuth();
  const { language, t } = useTranslation();
  const [messages, setMessages] = useState<EchoChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [orbState, setOrbState] = useState<EchoOrbState>('idle');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!loadHistory || !session?.access_token) return;
    const params = new URLSearchParams({ agentType: 'echo' });
    if (biographyId) params.set('biographyId', biographyId);

    fetch(`/api/agents/threads/active?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.messages?.length) return;
        if (json.thread?.id) setThreadId(json.thread.id);
        setMessages(
          json.messages
            .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
            .map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
        );
      })
      .catch(() => {});
  }, [loadHistory, session?.access_token, biographyId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !session?.access_token || loading) return;

      setError(null);
      setLoading(true);
      setOrbState('thinking');
      stopEchoSpeech();

      const userMsg: EchoChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ]);
      setInput('');

      let fullReply = '';

      try {
        await streamAgentChat(
          {
            agentType: 'echo',
            message: trimmed,
            biographyId,
            activeSection,
            language,
            threadId,
            echoPage,
            onboardingIncomplete,
            accessToken: session.access_token,
          },
          (ev) => {
            if (ev.event === 'thread' && ev.data.threadId) {
              setThreadId(ev.data.threadId);
            }
            if (ev.event === 'token') {
              fullReply += ev.data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullReply, streaming: true } : m
                )
              );
            }
            if (ev.event === 'tool_result') {
              if (ev.data.tool === 'propose_draft' && ev.data.sectionKey) {
                onDraftApplied?.(ev.data.sectionKey);
              }
              onOnboardingEvent?.({ tool: ev.data.tool, data: ev.data });
            }
            if (ev.event === 'error') {
              setError(ev.data.message);
            }
          }
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullReply, streaming: false } : m
          )
        );

        if (voiceEnabled && fullReply) {
          let backend: EchoSpeechBackend = 'none';
          backend = await speakEchoReply(fullReply, language, {
            accessToken: session.access_token,
            onStart: () => setOrbState('speaking'),
            onEnd: () => setOrbState('idle'),
          });
          if (backend === 'none') setOrbState('idle');
        } else {
          setOrbState('idle');
        }
      } catch (err) {
        setOrbState('idle');
        setError(err instanceof Error ? err.message : t.echo.errorGeneric);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setLoading(false);
      }
    },
    [
      session,
      loading,
      biographyId,
      activeSection,
      language,
      threadId,
      echoPage,
      onboardingIncomplete,
      voiceEnabled,
      onDraftApplied,
      onOnboardingEvent,
      t.echo.errorGeneric,
    ]
  );

  const orbStatusText =
    orbState === 'listening'
      ? t.echo.statusListening
      : orbState === 'speaking'
        ? t.echo.statusSpeaking
        : orbState === 'thinking'
          ? t.echo.statusThinking
          : undefined;

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {showOrb && (
        <div className="flex justify-center py-4 shrink-0">
          <EchoAvatar state={orbState} size={orbSize} statusText={orbStatusText} />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-2 space-y-3">
        {messages.length === 0 && emptyState && (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyState}</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'text-sm rounded-lg px-3 py-2 max-w-[90%]',
              m.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-muted text-foreground'
            )}
          >
            <span className="whitespace-pre-wrap">{m.content}</span>
            {m.streaming && <Loader className="inline h-3 w-3 ml-1 animate-spin" />}
          </div>
        ))}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 pt-3 border-t mt-2 shrink-0">
        {voiceEnabled && (
          <EchoVoiceSession
            language={language}
            accessToken={session?.access_token}
            disabled={loading}
            onTranscript={(text) => void sendMessage(text)}
            onError={(msg) => setError(msg)}
            onOrbStateChange={(s) => {
              if (s === 'listening' || s === 'thinking') setOrbState(s);
              else if (orbState === 'listening' || orbState === 'thinking') setOrbState('idle');
            }}
          />
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
          placeholder={t.echo.inputPlaceholder}
          rows={2}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm min-h-[44px]"
          disabled={loading}
        />
        <Button
          type="button"
          size="icon"
          className="shrink-0 h-11 w-11"
          disabled={loading || !input.trim()}
          onClick={() => void sendMessage(input)}
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
