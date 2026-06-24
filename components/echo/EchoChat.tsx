'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useEchoChat } from '@/lib/echo/echo-chat-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EchoAvatar } from './EchoAvatar';
import { EchoVoiceSession } from './EchoVoiceSession';
import { EchoMessageContent } from './EchoMessageContent';
import {
  EchoSpeakingBanner,
  EchoStopSpeakingButton,
  EchoVoiceOutputButton,
} from './EchoSpeechControls';
import { EchoIcebreakers } from './EchoIcebreakers';
import { EchoDraftInsertPrompt } from './EchoDraftInsertPrompt';

export type { EchoChatMessage } from '@/lib/echo/echo-chat-context';

export interface EchoChatProps {
  className?: string;
  emptyState?: string;
  loadHistory?: boolean;
  showOrb?: boolean;
  orbSize?: 'sm' | 'md' | 'lg' | 'xl';
  voiceEnabled?: boolean;
  compact?: boolean;
}

export function EchoChat({
  className,
  emptyState,
  showOrb = true,
  orbSize = 'lg',
  voiceEnabled = true,
  compact = false,
}: EchoChatProps) {
  const { session } = useAuth();
  const { language, t } = useTranslation();
  const {
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
    activeSectionLabel,
    dismissSectionLabel,
    reportOrbState,
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
  } = useEchoChat();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suppressAutoScrollUntilRef = useRef(0);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const streaming = messages.some((m) => m.streaming);
    el.scrollTo({
      top: el.scrollHeight,
      behavior: streaming ? 'auto' : 'smooth',
    });
  }, [messages]);

  const scrollGuideIntoView = useCallback((messageId: string) => {
    const container = scrollContainerRef.current;
    const el = document.getElementById(`echo-message-${messageId}`);
    if (!container || !el) return false;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + (elRect.top - containerRect.top) - 8,
      behavior: 'smooth',
    });
    return true;
  }, []);

  useEffect(() => {
    if (scrollToMessageId) return;
    if (Date.now() < suppressAutoScrollUntilRef.current) return;
    const frame = requestAnimationFrame(() => scrollToBottom());
    return () => cancelAnimationFrame(frame);
  }, [messages, loading, historyLoading, icebreakersVisible, scrollToBottom, scrollToMessageId]);

  useEffect(() => {
    if (!scrollToMessageId) return;

    suppressAutoScrollUntilRef.current = Date.now() + 1500;
    setHighlightMessageId(scrollToMessageId);

    let attempts = 0;
    let highlightTimer: ReturnType<typeof setTimeout> | undefined;

    const tryScroll = () => {
      attempts += 1;
      if (scrollGuideIntoView(scrollToMessageId)) {
        clearScrollToMessageId();
        highlightTimer = setTimeout(() => setHighlightMessageId(null), 2000);
        return;
      }
      if (attempts < 8) {
        requestAnimationFrame(tryScroll);
      } else {
        clearScrollToMessageId();
      }
    };

    const frame = requestAnimationFrame(tryScroll);
    return () => {
      cancelAnimationFrame(frame);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [scrollToMessageId, clearScrollToMessageId, scrollGuideIntoView]);

  const orbStatusText =
    orbState === 'listening'
      ? t.echo.statusListening
      : orbState === 'speaking'
        ? t.echo.statusSpeaking
        : orbState === 'thinking'
          ? t.echo.statusThinking
          : undefined;

  const icebreakersBlock = icebreakersVisible ? (
    <EchoIcebreakers
      hint={t.echo.icebreakerHint}
      guideHint={t.echo.icebreakerGuideHint}
      items={icebreakers}
      onSelect={(line) => void sendMessage(line)}
      onRecallUsageGuide={recallUsageGuide}
      centered={!!emptyState}
    />
  ) : null;

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {showOrb && !compact && (
        <div className="flex justify-center py-4 shrink-0">
          <EchoAvatar state={orbState} size={orbSize} statusText={orbStatusText} />
        </div>
      )}

      {compact && showOrb && (
        <div className="flex items-center gap-2 px-1 py-1.5 shrink-0 border-b border-border/40">
          <EchoAvatar state={orbState} size="sm" />
          {orbStatusText && (
            <span className="text-xs text-muted-foreground truncate">{orbStatusText}</span>
          )}
        </div>
      )}

      {activeSectionLabel && !compact && (
        <div className="mx-2 mb-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50 text-xs text-muted-foreground shrink-0 flex items-center justify-between gap-2">
          <span>
            {t.echo.activeSectionContext.replace('{section}', activeSectionLabel)}
          </span>
          <button
            type="button"
            className="text-[10px] uppercase tracking-wide hover:text-foreground shrink-0"
            onClick={dismissSectionLabel}
          >
            {t.common.close}
          </button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto px-2 pt-1 pb-1 space-y-2',
          compact ? 'max-h-24' : 'space-y-3'
        )}
      >
        {historyLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {hasMoreOlder && !historyLoading && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
              disabled={loadingOlder}
              onClick={() => void loadOlderMessages()}
            >
              {loadingOlder ? t.echo.loadingOlderMessages : t.echo.loadOlderMessages}
            </button>
          </div>
        )}
        {!historyLoading && messages.length === 0 && !compact && (
          <div className={cn('space-y-1', emptyState ? 'py-6' : 'py-3')}>
            {emptyState && (
              <p className="text-sm text-muted-foreground text-center">{emptyState}</p>
            )}
            {icebreakersBlock}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            id={`echo-message-${m.id}`}
            className={cn(
              'text-sm rounded-lg px-3 py-2 max-w-[90%] scroll-mt-1',
              m.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : m.isUsageGuide
                  ? cn(
                      'mr-auto border border-border/50 bg-primary/5 text-foreground',
                      highlightMessageId === m.id && 'bg-primary/10'
                    )
                  : 'mr-auto bg-muted text-foreground'
            )}
          >
            {m.role === 'assistant' ? (
              <>
                <EchoMessageContent content={m.content} />
                {canInsertInEditor && m.pendingDraft && !m.streaming && (
                  <EchoDraftInsertPrompt
                    prompt={t.echo.insertDraftPrompt}
                    preview={m.pendingDraft.draftText}
                    confirmLabel={t.echo.insertDraftConfirm}
                    dismissLabel={t.echo.insertDraftDismiss}
                    insertedLabel={t.echo.insertDraftDone}
                    applying={m.applyingDraft}
                    inserted={m.draftInserted}
                    onConfirm={() => void confirmInsertDraft(m.id)}
                    onDismiss={() => dismissInsertDraft(m.id)}
                  />
                )}
              </>
            ) : (
              <span className="whitespace-pre-wrap">{m.content}</span>
            )}
            {m.streaming && <Loader className="inline h-3 w-3 ml-1 animate-spin" />}
          </div>
        ))}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        {!historyLoading && !loading && icebreakersVisible && messages.length > 0 && !compact && (
          <div className="px-1">{icebreakersBlock}</div>
        )}
      </div>

      {orbState === 'speaking' && !compact && (
        <EchoSpeakingBanner onStopSpeaking={stopSpeaking} />
      )}

      <div
        className={cn(
          'flex items-end gap-2 border-t shrink-0',
          compact ? 'pt-2 mt-1' : 'pt-3 mt-2'
        )}
      >
        {voiceEnabled && (
          <EchoVoiceSession
            language={language}
            accessToken={session?.access_token}
            disabled={loading}
            onTranscript={(text) => void sendMessage(text)}
            onError={() => {}}
            onOrbStateChange={reportOrbState}
          />
        )}
        <textarea
          ref={inputRef}
          data-tour-id="echo-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
          placeholder={t.echo.inputPlaceholder}
          rows={compact ? 1 : 2}
          className={cn(
            'flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm',
            compact ? 'min-h-[40px]' : 'min-h-[44px]'
          )}
          disabled={loading}
        />
        {voiceEnabled && (
          <>
            {orbState === 'speaking' && (
              <EchoStopSpeakingButton onStopSpeaking={stopSpeaking} compact={compact} />
            )}
            <EchoVoiceOutputButton
              voiceOutputEnabled={voiceOutputEnabled}
              onToggleVoiceOutput={toggleVoiceOutput}
              compact={compact}
            />
          </>
        )}
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
