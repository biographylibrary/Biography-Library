'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { streamAgentChat } from '@/lib/agents/agent-chat-client';
import type { EchoPageContext } from '@/lib/echo/echo-context';
import { useEcho } from '@/lib/echo/echo-context';
import type { EchoOrbState } from '@/components/echo/EchoOrb';
import { speakEchoReply, stopEchoSpeech } from '@/lib/echo/echo-playback';
import {
  getEchoVoiceOutputEnabled,
  setEchoVoiceOutputEnabled,
} from '@/lib/echo/echo-voice-prefs';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import {
  pickEchoIcebreakers,
  type EchoIcebreakerItem,
  type EchoIcebreakerTrigger,
} from '@/lib/echo/echo-icebreakers';
import { parseEchoMessageContent } from '@/lib/echo/echo-usage-guide';

export interface EchoChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  isUsageGuide?: boolean;
  pendingDraft?: { sectionKey: string; draftText: string };
  draftInserted?: boolean;
  applyingDraft?: boolean;
}

function mapStoredMessage(m: { id: string; role: string; content: string }): EchoChatMessage {
  const parsed = parseEchoMessageContent(m.content);
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: parsed.body,
    isUsageGuide: parsed.isUsageGuide,
  };
}

interface EchoChatContextValue {
  messages: EchoChatMessage[];
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  orbState: EchoOrbState;
  voiceOutputEnabled: boolean;
  toggleVoiceOutput: () => void;
  stopSpeaking: () => void;
  sendMessage: (text: string) => Promise<void>;
  reportOrbState: (state: EchoOrbState) => void;
  activeSectionLabel: string | null;
  dismissSectionLabel: () => void;
  icebreakers: EchoIcebreakerItem[];
  icebreakersVisible: boolean;
  scrollToMessageId: string | null;
  clearScrollToMessageId: () => void;
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  loadOlderMessages: () => Promise<void>;
  recallUsageGuide: () => void;
  canInsertInEditor: boolean;
  confirmInsertDraft: (messageId: string) => Promise<void>;
  dismissInsertDraft: (messageId: string) => void;
}

const EchoChatContext = createContext<EchoChatContextValue | null>(null);

export function useEchoChat(): EchoChatContextValue {
  const ctx = useContext(EchoChatContext);
  if (!ctx) {
    throw new Error('useEchoChat must be used within EchoChatProvider');
  }
  return ctx;
}

interface EchoChatProviderProps {
  children: ReactNode;
  echoPage: EchoPageContext;
  biographyId?: string;
  activeSection?: string;
  biographyMode?: 'sections' | 'freeflow';
  onboardingIncomplete?: boolean;
  onDraftApplied?: (sectionKey: string) => void;
  onSectionCompletionChanged?: (sectionKey: string, completed: boolean) => void;
  onOnboardingEvent?: (event: { tool: string; data?: unknown }) => void;
}

export function EchoChatProvider({
  children,
  echoPage,
  biographyId,
  activeSection,
  biographyMode,
  onboardingIncomplete = false,
  onDraftApplied,
  onSectionCompletionChanged,
  onOnboardingEvent,
}: EchoChatProviderProps) {
  const { session } = useAuth();
  const { language, t } = useTranslation();
  const { setOrbState: setContextOrbState, bubbleOpen } = useEcho();

  const [messages, setMessages] = useState<EchoChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [orbState, setOrbState] = useState<EchoOrbState>('idle');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [activeSectionLabel, setActiveSectionLabel] = useState<string | null>(null);
  const [icebreakers, setIcebreakers] = useState<EchoIcebreakerItem[]>([]);
  const [icebreakersVisible, setIcebreakersVisible] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const prevSectionRef = useRef(activeSection);
  const lastSentSectionRef = useRef(activeSection);
  const lastIcebreakerUserCountRef = useRef(0);
  const prevBubbleOpenRef = useRef(false);
  const lastIcebreakerLinesRef = useRef<string[]>([]);
  const oldestLoadedAtRef = useRef<string | null>(null);

  const hasUserMessages = useCallback(
    (list: EchoChatMessage[]) => list.some((m) => m.role === 'user'),
    []
  );

  useEffect(() => {
    setVoiceOutputEnabled(getEchoVoiceOutputEnabled());
  }, []);

  useEffect(() => {
    prevSectionRef.current = activeSection;
    lastSentSectionRef.current = activeSection;
    setActiveSectionLabel(null);
  }, [biographyId]);

  useEffect(() => () => stopEchoSpeech(), []);

  const setOrb = useCallback(
    (state: EchoOrbState) => {
      setOrbState(state);
      setContextOrbState(state);
    },
    [setContextOrbState]
  );

  const stopSpeaking = useCallback(() => {
    stopEchoSpeech();
    setOrb('idle');
  }, [setOrb]);

  const toggleVoiceOutput = useCallback(() => {
    setVoiceOutputEnabled((prev) => {
      const next = !prev;
      setEchoVoiceOutputEnabled(next);
      if (!next) stopSpeaking();
      return next;
    });
  }, [stopSpeaking]);

  const dismissSectionLabel = useCallback(() => {
    setActiveSectionLabel(null);
  }, []);

  const reportOrbState = useCallback(
    (state: EchoOrbState) => {
      if (state === 'listening' || state === 'thinking') {
        setOrb(state);
      } else if (orbState === 'listening' || orbState === 'thinking') {
        setOrb('idle');
      }
    },
    [orbState, setOrb]
  );

  const sectionTitleFor = useCallback(
    (sectionKey?: string) => {
      if (!sectionKey) return '';
      return (
        t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] ||
        BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey)?.title ||
        sectionKey
      );
    },
    [t.sectionTitles]
  );

  const showIcebreakers = useCallback(
    (trigger: EchoIcebreakerTrigger) => {
      const items = pickEchoIcebreakers({
        echoPage,
        onboardingIncomplete,
        activeSectionTitle: sectionTitleFor(activeSection),
        trigger,
        t,
        exclude: lastIcebreakerLinesRef.current,
      });
      lastIcebreakerLinesRef.current = items
        .filter((item) => item.kind !== 'usage-guide')
        .map((item) => item.text);
      setIcebreakers(items);
      setIcebreakersVisible(items.length > 0);
    },
    [echoPage, onboardingIncomplete, activeSection, sectionTitleFor, t]
  );

  const hideIcebreakers = useCallback(() => {
    setIcebreakersVisible(false);
  }, []);

  const findUsageGuideMessage = useCallback(
    (list: EchoChatMessage[]) => {
      const flagged = list.find((m) => m.isUsageGuide);
      if (flagged) return flagged;
      const guideBody = t.echo.usageGuide.trim();
      if (!guideBody) return undefined;
      const snippet = guideBody.slice(0, 48);
      return list.find((m) => m.role === 'assistant' && m.content.includes(snippet));
    },
    [t.echo.usageGuide]
  );

  const recallUsageGuide = useCallback(() => {
    const existing = findUsageGuideMessage(messages);
    if (existing) {
      setScrollToMessageId(existing.id);
      return;
    }
    const guide: EchoChatMessage = {
      id: `usage-guide-${Date.now()}`,
      role: 'assistant',
      content: t.echo.usageGuide,
      isUsageGuide: true,
    };
    setMessages((prev) => [guide, ...prev]);
    setScrollToMessageId(guide.id);
  }, [messages, t.echo.usageGuide, findUsageGuideMessage]);

  const clearScrollToMessageId = useCallback(() => {
    setScrollToMessageId(null);
  }, []);

  const userMessageCount = useCallback(
    (list: EchoChatMessage[]) => list.filter((m) => m.role === 'user').length,
    []
  );

  const loadOlderMessages = useCallback(async () => {
    if (!session?.access_token || !threadId || !hasMoreOlder || loadingOlder) return;

    const before = oldestLoadedAtRef.current;
    if (!before) return;

    setLoadingOlder(true);
    try {
      const params = new URLSearchParams({
        before,
        limit: '50',
      });
      const res = await fetch(`/api/agents/threads/${threadId}/messages?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const json = await res.json();
      const older = (json.messages ?? [])
        .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
        .map((m: { id: string; role: string; content: string }) => mapStoredMessage(m));

      if (!older.length) {
        setHasMoreOlder(false);
        return;
      }

      setMessages((prev) => [...older, ...prev]);
      setHasMoreOlder(json.hasMoreOlder === true);
      if (json.oldestLoadedAt) {
        oldestLoadedAtRef.current = json.oldestLoadedAt;
      }
    } catch {
      // ignore
    } finally {
      setLoadingOlder(false);
    }
  }, [session?.access_token, threadId, hasMoreOlder, loadingOlder]);

  useEffect(() => {
    if (!session?.access_token) return;

    const params = new URLSearchParams({ agentType: 'echo', locale: language });
    if (biographyId) params.set('biographyId', biographyId);

    let cancelled = false;
    setHistoryLoading(true);

    fetch(`/api/agents/threads/active?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.thread?.id) setThreadId(json.thread.id);
        setHasMoreOlder(json?.hasMoreOlder === true);
        oldestLoadedAtRef.current = json?.oldestLoadedAt ?? null;
        if (json?.messages?.length) {
          setMessages(
            json.messages
              .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
              .map((m: { id: string; role: string; content: string }) => mapStoredMessage(m))
          );
        } else {
          setMessages([]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, biographyId, language]);

  useEffect(() => {
    if (historyLoading) return;
    if (!hasUserMessages(messages)) {
      showIcebreakers('initial');
      lastIcebreakerUserCountRef.current = 0;
    }
  }, [historyLoading, messages, showIcebreakers, hasUserMessages]);

  useEffect(() => {
    if (historyLoading) return;
    if (prevSectionRef.current === activeSection) return;
    if (!hasUserMessages(messages)) {
      prevSectionRef.current = activeSection;
      return;
    }

    const title = sectionTitleFor(activeSection);
    if (title) {
      setActiveSectionLabel(title);
    }
    showIcebreakers('section_change');
    prevSectionRef.current = activeSection;
  }, [activeSection, messages.length, sectionTitleFor, historyLoading, showIcebreakers]);

  useEffect(() => {
    if (!bubbleOpen || loading) {
      prevBubbleOpenRef.current = bubbleOpen;
      return;
    }
    const justOpened = bubbleOpen && !prevBubbleOpenRef.current;
    prevBubbleOpenRef.current = bubbleOpen;
    if (!justOpened || !hasUserMessages(messages)) return;

    const users = userMessageCount(messages);
    if (users - lastIcebreakerUserCountRef.current >= 2) {
      showIcebreakers('bubble_open');
      lastIcebreakerUserCountRef.current = users;
    }
  }, [bubbleOpen, loading, messages, showIcebreakers, userMessageCount]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !session?.access_token || loading) return;

      setError(null);
      setLoading(true);
      setOrb('thinking');
      stopEchoSpeech();
      setActiveSectionLabel(null);
      hideIcebreakers();

      const sectionTitle = sectionTitleFor(activeSection);
      let apiMessage = trimmed;
      if (
        echoPage === 'editor_sections' &&
        activeSection &&
        sectionTitle &&
        messages.length > 0 &&
        hasUserMessages(messages) &&
        lastSentSectionRef.current !== activeSection
      ) {
        apiMessage = `${t.echo.sectionSwitchPrefix.replace('{section}', sectionTitle)}\n\n${trimmed}`;
      }
      if (echoPage === 'editor_sections' && activeSection) {
        lastSentSectionRef.current = activeSection;
      }

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
      let streamOk = false;

      try {
        await streamAgentChat(
          {
            agentType: 'echo',
            message: apiMessage,
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
              if (
                ev.data.tool === 'propose_draft' &&
                ev.data.preview &&
                ev.data.draftText &&
                ev.data.sectionKey
              ) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          pendingDraft: {
                            sectionKey: ev.data.sectionKey!,
                            draftText: ev.data.draftText!,
                          },
                        }
                      : m
                  )
                );
              }
              if (
                ev.data.tool === 'complete_section' &&
                ev.data.sectionKey
              ) {
                onSectionCompletionChanged?.(ev.data.sectionKey, true);
              }
              if (
                ev.data.tool === 'reopen_section' &&
                ev.data.sectionKey
              ) {
                onSectionCompletionChanged?.(ev.data.sectionKey, false);
              }
              onOnboardingEvent?.({ tool: ev.data.tool, data: ev.data });
            }
            if (ev.event === 'error') {
              setError(ev.data.message);
            }
          }
        );

        streamOk = true;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullReply, streaming: false } : m
          )
        );

        const nextMessages = [
          ...messages,
          userMsg,
          { id: assistantId, role: 'assistant' as const, content: fullReply, streaming: false },
        ];
        const users = userMessageCount(nextMessages);
        if (users - lastIcebreakerUserCountRef.current >= 3) {
          showIcebreakers('after_reply');
          lastIcebreakerUserCountRef.current = users;
        }
      } catch (err) {
        setOrb('idle');
        setError(err instanceof Error ? err.message : t.echo.errorGeneric);
        setMessages((prev) => {
          const assistant = prev.find((m) => m.id === assistantId);
          if (assistant && (assistant.content.trim() || assistant.pendingDraft)) {
            return prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m
            );
          }
          return prev.filter((m) => m.id !== assistantId);
        });
      } finally {
        setLoading(false);
      }

      if (streamOk && fullReply && getEchoVoiceOutputEnabled()) {
        void speakEchoReply(fullReply, language, {
          accessToken: session.access_token,
          onStart: () => setOrb('speaking'),
          onEnd: () => setOrb('idle'),
        }).then((backend) => {
          if (backend === 'none') setOrb('idle');
        });
      } else if (streamOk) {
        setOrb('idle');
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
      voiceOutputEnabled,
      onDraftApplied,
      onSectionCompletionChanged,
      onOnboardingEvent,
      t.echo.errorGeneric,
      t.echo.sectionSwitchPrefix,
      setOrb,
      sectionTitleFor,
      hideIcebreakers,
      showIcebreakers,
      userMessageCount,
      hasUserMessages,
      messages,
    ]
  );

  const canInsertInEditor = Boolean(
    biographyId && (echoPage === 'editor_sections' || echoPage === 'editor_freeflow')
  );

  const dismissInsertDraft = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, pendingDraft: undefined } : m))
    );
  }, []);

  const confirmInsertDraft = useCallback(
    async (messageId: string) => {
      if (!session?.access_token || !biographyId) return;
      const target = messages.find((m) => m.id === messageId);
      if (!target?.pendingDraft) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, applyingDraft: true } : m
        )
      );

      try {
        const res = await fetch('/api/agents/echo/apply-draft', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            biographyId,
            sectionKey: target.pendingDraft.sectionKey,
            draftText: target.pendingDraft.draftText,
          }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json.error as string) || 'Failed to insert draft');
        }

        const sectionKey = target.pendingDraft.sectionKey;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, pendingDraft: undefined, draftInserted: true, applyingDraft: false }
              : m
          )
        );
        onDraftApplied?.(sectionKey);
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, applyingDraft: false } : m))
        );
        setError(err instanceof Error ? err.message : t.echo.errorGeneric);
      }
    },
    [session, biographyId, messages, onDraftApplied, t.echo.errorGeneric]
  );

  const value = useMemo(
    () => ({
      messages,
      loading,
      historyLoading,
      error,
      input,
      setInput,
      orbState,
      voiceOutputEnabled,
      toggleVoiceOutput,
      stopSpeaking,
      sendMessage,
      reportOrbState,
      activeSectionLabel,
      dismissSectionLabel,
      icebreakers,
      icebreakersVisible,
      scrollToMessageId,
      clearScrollToMessageId,
      hasMoreOlder,
      loadingOlder,
      loadOlderMessages,
      recallUsageGuide,
      canInsertInEditor,
      confirmInsertDraft,
      dismissInsertDraft,
    }),
    [
      messages,
      loading,
      historyLoading,
      error,
      input,
      orbState,
      voiceOutputEnabled,
      toggleVoiceOutput,
      stopSpeaking,
      sendMessage,
      reportOrbState,
      activeSectionLabel,
      dismissSectionLabel,
      icebreakers,
      icebreakersVisible,
      scrollToMessageId,
      clearScrollToMessageId,
      hasMoreOlder,
      loadingOlder,
      loadOlderMessages,
      recallUsageGuide,
      canInsertInEditor,
      confirmInsertDraft,
      dismissInsertDraft,
    ]
  );

  return <EchoChatContext.Provider value={value}>{children}</EchoChatContext.Provider>;
}
