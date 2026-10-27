'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, RotateCw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconHint } from '@/components/ui/icon-hint';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { echoOrbStateFromMic } from '@/lib/echo/echo-playback';
import {
  ECHO_MAX_RECORDING_SECONDS,
  ECHO_RECORDING_BITS_PER_SECOND,
  echoRecordingLimitReached,
} from '@/lib/echo/recording-limits';
import { EchoTranscriptionError, transcribeAudioWithWhisper } from '@/lib/echo/whisper-stt';
import type { EchoOrbState } from './EchoOrb';

export type EchoVoiceNotice = { kind: 'error' | 'info'; text: string };

interface EchoVoiceSessionProps {
  language: string;
  accessToken?: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onOrbStateChange?: (state: EchoOrbState) => void;
  /** Secondi trascorsi mentre si registra, `null` quando non si registra. */
  onRecordingElapsed?: (seconds: number | null) => void;
  /** Errori e avvisi già tradotti, da mostrare all'utente. */
  onNotice?: (notice: EchoVoiceNotice | null) => void;
  className?: string;
}

function isMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
}

export function EchoVoiceSession({
  language,
  accessToken,
  disabled,
  onTranscript,
  onOrbStateChange,
  onRecordingElapsed,
  onNotice,
  className,
}: EchoVoiceSessionProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [supported, setSupported] = useState(false);
  /** Registrazione la cui trascrizione è fallita: resta qui per riprovare. */
  const [failedBlob, setFailedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitHitRef = useRef(false);

  useEffect(() => {
    setSupported(isMediaRecorderSupported());
  }, []);

  useEffect(() => {
    onOrbStateChange?.(echoOrbStateFromMic(phase));
  }, [phase, onOrbStateChange]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearTimer]);

  const noticeForError = useCallback(
    (err: unknown): string => {
      if (err instanceof EchoTranscriptionError) {
        switch (err.code) {
          case 'empty':
            return t.echo.voiceErrorEmpty;
          case 'network':
            return t.echo.voiceErrorNetwork;
          case 'unauthorized':
            return t.echo.voiceErrorExpired;
          case 'too_large':
            return t.echo.voiceErrorTooLong;
          default:
            return t.echo.voiceErrorServer;
        }
      }
      return t.echo.voiceErrorServer;
    },
    [t]
  );

  const transcribe = useCallback(
    async (blob: Blob) => {
      if (!accessToken) {
        setPhase('idle');
        return;
      }
      setPhase('transcribing');
      try {
        const text = await transcribeAudioWithWhisper(blob, language, accessToken);
        setFailedBlob(null);
        onTranscript(text);
      } catch (err) {
        const retryable =
          err instanceof EchoTranscriptionError
            ? err.code === 'network' || err.code === 'server'
            : true;
        setFailedBlob(retryable ? blob : null);
        onNotice?.({ kind: 'error', text: noticeForError(err) });
      } finally {
        setPhase('idle');
      }
    },
    [accessToken, language, noticeForError, onNotice, onTranscript]
  );

  const stopRecording = useCallback(() => {
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (!accessToken || disabled || phase !== 'idle') return;

    onNotice?.(null);
    setFailedBlob(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onNotice?.({ kind: 'error', text: t.echo.voiceErrorPermission });
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    limitHitRef.current = false;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: ECHO_RECORDING_BITS_PER_SECOND,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      clearTimer();
      onRecordingElapsed?.(null);
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      chunksRef.current = [];

      if (!blob.size) {
        setPhase('idle');
        return;
      }

      if (limitHitRef.current) {
        onNotice?.({
          kind: 'info',
          text: t.echo.recordingLimitReached.replace(
            '{minutes}',
            String(Math.round(ECHO_MAX_RECORDING_SECONDS / 60))
          ),
        });
      }
      void transcribe(blob);
    };

    // Microfono scollegato o permesso revocato: si invia quello che c'è.
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => stopRecording();
    });

    const startedAt = Date.now();
    onRecordingElapsed?.(0);
    // Si misura con l'orologio, non contando i tick: una scheda in secondo piano
    // rallenta i timer ma non deve allungare il limite.
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      onRecordingElapsed?.(elapsed);
      if (echoRecordingLimitReached(elapsed)) {
        limitHitRef.current = true;
        stopRecording();
      }
    }, 250);

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setPhase('recording');
  }, [
    accessToken,
    clearTimer,
    disabled,
    onNotice,
    onRecordingElapsed,
    phase,
    stopRecording,
    t,
    transcribe,
  ]);

  const toggle = () => {
    if (phase === 'recording') stopRecording();
    else if (phase === 'idle') void startRecording();
  };

  const recording = phase === 'recording';
  const micDisabled = disabled || !supported || !accessToken || phase === 'transcribing';

  return (
    <>
      <IconHint label={recording ? t.echo.recordingStopSend : t.echo.microphone}>
        <Button
          type="button"
          variant={recording ? 'destructive' : 'outline'}
          size="icon"
          className={cn(
            'rounded-full h-11 w-11 shrink-0',
            recording && 'animate-pulse ring-4 ring-destructive/30',
            className
          )}
          disabled={micDisabled}
          onClick={toggle}
          aria-pressed={recording}
          aria-label={recording ? t.echo.recordingStopSend : t.echo.microphone}
          title={
            !supported
              ? 'Voice input needs a modern browser with microphone support'
              : !accessToken
                ? 'Sign in to use voice'
                : recording
                  ? t.echo.recordingStopSend
                  : phase === 'transcribing'
                    ? t.voice.transcribing
                    : t.echo.microphone
          }
        >
          {phase === 'transcribing' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : recording ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      </IconHint>
      {failedBlob && phase === 'idle' && (
        <IconHint label={t.echo.voiceRetryTranscription}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn('rounded-full h-11 w-11 shrink-0', className)}
            disabled={disabled || !accessToken}
            aria-label={t.echo.voiceRetryTranscription}
            onClick={() => {
              onNotice?.(null);
              void transcribe(failedBlob);
            }}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </IconHint>
      )}
    </>
  );
}

export { stopEchoSpeech, speakEchoReply, isEchoTtsAvailable } from '@/lib/echo/echo-playback';
