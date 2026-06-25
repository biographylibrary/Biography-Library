'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EchoOrbState } from '@/components/echo/EchoOrb';

export interface EchoActivityStatusCopy {
  statusWelcome: string;
  statusReady: string;
  statusVoiceMuted: string;
  statusListening: string;
  statusSpeaking: string;
  statusThinking: string;
  statusFormulatingReply: string;
  statusPreparingReply: string;
  statusReadingMessage: string;
  statusWriting: string;
  statusStillWorking: string;
  statusSlowApology: string;
  statusLoadingHistory: string;
  statusLoadingOlder: string;
}

interface UseEchoActivityStatusParams {
  orbState: EchoOrbState;
  loading: boolean;
  historyLoading: boolean;
  loadingOlder: boolean;
  isStreaming: boolean;
  hasStreamContent: boolean;
  voiceOutputEnabled: boolean;
  hasUserMessages: boolean;
  copy: EchoActivityStatusCopy;
}

const PHASE_MS = {
  preparing: 4_000,
  reading: 8_000,
  stillWorking: 14_000,
} as const;

export function useEchoActivityStatus({
  orbState,
  loading,
  historyLoading,
  loadingOlder,
  isStreaming,
  hasStreamContent,
  voiceOutputEnabled,
  hasUserMessages,
  copy,
}: UseEchoActivityStatusParams): string {
  const [elapsedMs, setElapsedMs] = useState(0);
  const waitStartedAtRef = useRef<number | null>(null);

  const isAwaitingReply = loading && !hasStreamContent;

  useEffect(() => {
    if (!isAwaitingReply) {
      waitStartedAtRef.current = null;
      setElapsedMs(0);
      return;
    }

    if (waitStartedAtRef.current === null) {
      waitStartedAtRef.current = Date.now();
    }

    const tick = () => {
      const started = waitStartedAtRef.current;
      if (started !== null) setElapsedMs(Date.now() - started);
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [isAwaitingReply]);

  return useMemo(() => {
    if (historyLoading) return copy.statusLoadingHistory;
    if (loadingOlder) return copy.statusLoadingOlder;
    if (orbState === 'listening') return copy.statusListening;
    if (orbState === 'speaking') return copy.statusSpeaking;
    if (hasStreamContent && isStreaming) return copy.statusWriting;
    if (isAwaitingReply) {
      if (elapsedMs >= PHASE_MS.stillWorking) return copy.statusSlowApology;
      if (elapsedMs >= PHASE_MS.reading) return copy.statusStillWorking;
      if (elapsedMs >= PHASE_MS.preparing) return copy.statusReadingMessage;
      if (elapsedMs >= 1_500) return copy.statusPreparingReply;
      return copy.statusFormulatingReply;
    }
    if (!voiceOutputEnabled) return copy.statusVoiceMuted;
    if (!hasUserMessages) return copy.statusWelcome;
    return copy.statusReady;
  }, [
    copy,
    elapsedMs,
    hasStreamContent,
    hasUserMessages,
    historyLoading,
    isStreaming,
    isAwaitingReply,
    loadingOlder,
    orbState,
    voiceOutputEnabled,
  ]);
}
