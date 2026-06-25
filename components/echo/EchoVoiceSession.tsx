'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { echoOrbStateFromMic } from '@/lib/echo/echo-playback';
import { EchoTranscriptionError, transcribeAudioWithWhisper } from '@/lib/echo/whisper-stt';
import type { EchoOrbState } from './EchoOrb';

interface EchoVoiceSessionProps {
  language: string;
  accessToken?: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onOrbStateChange?: (state: EchoOrbState) => void;
  onError?: (message: string) => void;
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
  onError,
  className,
}: EchoVoiceSessionProps) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [supported, setSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(isMediaRecorderSupported());
  }, []);

  useEffect(() => {
    onOrbStateChange?.(echoOrbStateFromMic(phase));
  }, [phase, onOrbStateChange]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (!accessToken || disabled || phase !== 'idle') return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError?.('Microphone permission denied');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      chunksRef.current = [];

      if (!blob.size || !accessToken) {
        setPhase('idle');
        return;
      }

      setPhase('transcribing');
      try {
        const text = await transcribeAudioWithWhisper(blob, language, accessToken);
        onTranscript(text);
      } catch (err) {
        if (err instanceof EchoTranscriptionError) {
          onError?.(err.message);
        } else {
          onError?.('Transcription failed');
        }
      } finally {
        setPhase('idle');
      }
    };

    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setPhase('recording');
  }, [accessToken, disabled, language, onError, onTranscript, phase]);

  const toggle = () => {
    if (phase === 'recording') stopRecording();
    else if (phase === 'idle') void startRecording();
  };

  const busy = phase !== 'idle';
  const micDisabled = disabled || !supported || !accessToken || phase === 'transcribing';

  return (
    <Button
      type="button"
      variant={phase === 'recording' ? 'default' : 'outline'}
      size="icon"
      className={cn('rounded-full h-11 w-11 shrink-0', className)}
      disabled={micDisabled}
      onClick={toggle}
      title={
        !supported
          ? 'Voice input needs a modern browser with microphone support'
          : !accessToken
            ? 'Sign in to use voice'
            : phase === 'recording'
              ? 'Stop and send'
              : phase === 'transcribing'
                ? 'Transcribing…'
                : 'Tap to speak (Whisper, EU)'
      }
    >
      {phase === 'transcribing' ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : phase === 'recording' ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}

export { stopEchoSpeech, speakEchoReply, isEchoTtsAvailable } from '@/lib/echo/echo-playback';
