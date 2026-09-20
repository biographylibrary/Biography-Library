'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { useEchoChat } from '@/lib/echo/echo-chat-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EchoAvatar } from './EchoAvatar';
import { EchoChatHeader } from './EchoChatHeader';
import { EchoVoiceSession } from './EchoVoiceSession';
import { EchoMessageContent } from './EchoMessageContent';
import {
  EchoSpeakingBanner,
  EchoStopSpeakingButton,
  EchoVoiceOutputButton,
} from './EchoSpeechControls';
import { EchoIcebreakers } from './EchoIcebreakers';
import { EchoDraftInsertPrompt } from './EchoDraftInsertPrompt';
import { EchoDraftInsertedDialog } from './EchoDraftInsertedDialog';
import { useEchoActivityStatus } from '@/lib/echo/use-echo-activity-status';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';

export type { EchoChatMessage } from '@/lib/echo/echo-chat-context';

export interface EchoChatProps {
  className?: string;
  emptyState?: string;
  loadHistory?: boolean;
  showOrb?: boolean;
  orbSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** Compact horizontal header (icon + name side by side) for guided editor workspace. */
  headerLayout?: 'vertical' | 'horizontal';
  voiceEnabled?: boolean;
  compact?: boolean;
}

export function EchoChat({
  className,
  emptyState,
  showOrb = true,
  orbSize = 'lg',
  headerLayout = 'vertical',
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
    pendingDraftCount,
    confirmInsertDraft,
    deferInsertDraft,
    expandInsertDraft,
    insertDialog,
    dismissInsertDialog,
    openEditorForDraft,
    activeSection,
  } = useEchoChat();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suppressAutoScrollUntilRef = useRef(0);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);

  const sectionTitleFor = useCallback(
    (sectionKey?: string) => {
      if (!sectionKey) return '';
      if (sectionKey === 'freeflow') return t.onboardingTour.freeflowEditorTitle;
      return (
        t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] ||
        BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey)?.title ||
        sectionKey
      );
    },
    [t.sectionTitles, t.onboardingTour.freeflowEditorTitle]
  );

  const insertDialogSectionTitle = insertDialog
    ? sectionTitleFor(insertDialog.sectionKey)
    : '';

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

  const streamingMessage = messages.find((m) => m.streaming);
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const activityStatus = useEchoActivityStatus({
    orbState,
    loading,
    historyLoading,
    loadingOlder,
    isStreaming: Boolean(streamingMessage),
    hasStreamContent: Boolean(streamingMessage?.content?.trim()),
    voiceOutputEnabled,
    hasUserMessages,
    copy: t.echo,
  });

  const activityIsActive =
    loading ||
    historyLoading ||
    loadingOlder ||
    orbState !== 'idle' ||
    Boolean(streamingMessage);

  const flushChrome = headerLayout === 'horizontal' && !compact;

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
      {showOrb && !compact && headerLayout === 'horizontal' && (
        <EchoChatHeader
          orbState={orbState}
          activityStatus={activityStatus}
          isActive={activityIsActive}
        />
      )}

      {showOrb && !compact && headerLayout !== 'horizontal' && (
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
          {pendingDraftCount > 0 && (
            <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
              {t.echo.insertDraftPendingBadge.replace('{count}', String(pendingDraftCount))}
            </span>
          )}
        </div>
      )}

      {!compact && pendingDraftCount > 0 && (
        <div
          className={cn(
            'mb-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 text-xs text-primary shrink-0',
            flushChrome ? 'mx-3' : 'mx-2'
          )}
        >
          {t.echo.insertDraftPendingBadge.replace('{count}', String(pendingDraftCount))}
        </div>
      )}

      {activeSectionLabel && !compact && (
        <div
          className={cn(
            'mb-2 px-3 py-2 rounded-lg bg-muted/60 border border-border/50 text-xs text-muted-foreground shrink-0 flex items-center justify-between gap-2 min-w-0 overflow-hidden',
            flushChrome ? 'mx-3' : 'mx-2'
          )}
        >
          <span className="min-w-0 flex-1 truncate">
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
          'flex-1 min-h-0 overflow-y-auto pt-1 pb-1 space-y-2',
          flushChrome ? 'px-3' : 'px-2',
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
                ? 'ml-auto bg-brand-greenLight text-brand-greenDark dark:bg-brand-greenLight/25 dark:text-brand-greenLight'
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
                {canInsertInEditor && m.pendingDraft && (
                  <EchoDraftInsertPrompt
                    sectionTitle={sectionTitleFor(m.pendingDraft.sectionKey)}
                    cardTitle={t.echo.insertDraftCardTitle}
                    cardSubtitle={t.echo.insertDraftCardSubtitle}
                    confirmLabel={t.echo.insertDraftConfirm}
                    laterLabel={t.echo.insertDraftLater}
                    showPreviewLabel={t.echo.insertDraftShowPreview}
                    hidePreviewLabel={t.echo.insertDraftHidePreview}
                    readyLabel={t.echo.insertDraftReady}
                    sectionMismatchWarning={
                      activeSection &&
                      m.pendingDraft.sectionKey !== 'freeflow' &&
                      m.pendingDraft.sectionKey !== activeSection
                        ? t.echo.insertDraftSectionMismatch.replace(
                            '{section}',
                            sectionTitleFor(m.pendingDraft.sectionKey)
                          )
                        : undefined
                    }
                    successTitle={t.echo.insertDraftSuccessTitle}
                    successBody={t.echo.insertDraftSuccessBody}
                    openEditorLabel={t.echo.insertDraftOpenEditor}
                    preview={m.pendingDraft.draftText}
                    deferred={m.draftDeferred}
                    applying={m.applyingDraft}
                    inserted={m.draftInserted}
                    insertError={m.draftInsertError}
                    onConfirm={() => void confirmInsertDraft(m.id)}
                    onDefer={() => deferInsertDraft(m.id)}
                    onExpand={() => expandInsertDraft(m.id)}
                    onOpenEditor={
                      m.insertedSectionKey
                        ? () => openEditorForDraft(m.insertedSectionKey!)
                        : undefined
                    }
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
        <div className={cn('shrink-0', flushChrome && 'px-3')}>
          <EchoSpeakingBanner onStopSpeaking={stopSpeaking} />
        </div>
      )}

      <div
        className={cn(
          'flex items-center gap-2 border-t border-border/50 shrink-0 min-w-0 overflow-hidden',
          flushChrome ? 'px-3 py-3' : compact ? 'px-2 pt-2 mt-1' : 'px-2 pt-3 mt-2'
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
            className="h-11 w-11"
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
          rows={1}
          className={cn(
            'flex-1 min-w-0 resize-none rounded-md border bg-background px-3 py-2 text-sm h-11 min-h-11 max-h-11 overflow-y-auto leading-5',
            compact && 'text-sm'
          )}
          disabled={loading}
        />
        {voiceEnabled && (
          <>
            {orbState === 'speaking' && !compact && (
              <EchoStopSpeakingButton
                onStopSpeaking={stopSpeaking}
                compact={compact}
                className="max-sm:hidden"
              />
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
          variant="ghost"
          className={cn(
            'group shrink-0 h-11 w-11 rounded-md border border-brand-ink',
            'bg-brand-blue text-brand-ink',
            'enabled:hover:bg-brand-ink enabled:hover:border-brand-ink enabled:hover:text-brand-paper',
            'enabled:active:bg-brand-ink/90 enabled:active:text-brand-paper',
            'disabled:opacity-100 disabled:cursor-not-allowed',
            'dark:bg-brand-blue/30 dark:text-brand-beigeLight dark:border-brand-beigeLight/80',
            'dark:enabled:hover:bg-brand-ink dark:enabled:hover:border-brand-ink dark:enabled:hover:text-brand-beigeLight'
          )}
          disabled={loading || !input.trim()}
          onClick={() => void sendMessage(input)}
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <EchoDraftInsertedDialog
        open={insertDialog !== null}
        title={t.echo.insertDraftDialogTitle}
        description={t.echo.insertDraftDialogDescription}
        openEditorLabel={t.echo.insertDraftOpenEditor}
        continueLabel={t.echo.insertDraftContinueChat}
        sectionTitle={insertDialogSectionTitle}
        onOpenEditor={() => {
          if (insertDialog) {
            openEditorForDraft(insertDialog.sectionKey);
          }
          dismissInsertDialog();
        }}
        onContinue={dismissInsertDialog}
      />
    </div>
  );
}
