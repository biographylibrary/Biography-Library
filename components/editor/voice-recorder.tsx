'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, CircleAlert as AlertCircle, MicOff, Loader as Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const WHISPER_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italian' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
] as const;

type WhisperLanguage = typeof WHISPER_LANGUAGES[number]['code'];

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onClearTranscript: () => void;
  audioTranscript: string;
}

function isMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
}

export function VoiceRecorder({
  onTranscript,
  onClearTranscript,
  audioTranscript,
}: VoiceRecorderProps) {
  const [language, setLanguage] = useState<WhisperLanguage>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => {
    const s = isMediaRecorderSupported();
    if (!s) {
      logger.warn('Voice recorder not supported', {
        feature: 'speech-recognition',
        browserSupport: false,
      });
    }
    return s;
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError(t.voice.voiceNetworkError);
        return;
      }

      const form = new FormData();
      form.append('file', blob, 'recording.webm');
      form.append('language', language);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const res = await fetch(`${supabaseUrl}/functions/v1/audio-transcription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Apikey: anonKey,
        },
        body: form,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        logger.error('Audio transcription request failed', {
          feature: 'speech-recognition',
          status: res.status,
          language,
          isListening: isRecording,
        });
        setError(json?.error ?? t.voice.voiceUnknownError);
        return;
      }

      const text: string = json.text ?? '';
      if (text.trim()) {
        onTranscript(text.trim());
      } else {
        logger.warn('No speech detected in recording', {
          feature: 'speech-recognition',
          language,
        });
        setError(t.voice.noSpeechDetected);
      }
    } catch {
      logger.error('Audio transcription network error', {
        feature: 'speech-recognition',
        language,
      });
      setError(t.voice.voiceNetworkError);
    } finally {
      setIsTranscribing(false);
    }
  }, [language, onTranscript, t, isRecording]);

  const startRecording = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: string }).name) : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        logger.warn('Microphone permission denied', {
          feature: 'speech-recognition',
          errorCode: name,
          language,
        });
      } else {
        setError(t.voice.microphoneNotFound);
        logger.error('Microphone access failed', {
          feature: 'speech-recognition',
          errorCode: name || 'unknown',
          language,
        });
      }
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

      await transcribeBlob(blob);
    };

    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [language, t, transcribeBlob]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  if (!supported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{t.voice.notSupported}</span>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
        <MicOff className="h-3.5 w-3.5 shrink-0" />
        <span>{t.voice.permissionDenied}</span>
      </div>
    );
  }

  const busy = isRecording || isTranscribing;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as WhisperLanguage)}
          disabled={busy}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        >
          {WHISPER_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>

        {isRecording ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={stopRecording}
          >
            <Square className="h-3 w-3" />
            {t.voice.stopRecording}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={startRecording}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            {isTranscribing ? t.voice.transcribing : t.voice.record}
          </Button>
        )}

        {audioTranscript && !busy && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={onClearTranscript}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t.voice.clearTranscript}
          </Button>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand-wine/10 border border-brand-wine/25">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-wine opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-wine" />
            </span>
            <span className="text-xs font-medium text-brand-wineDark dark:text-brand-beigeLight">
              {t.voice.recording}
            </span>
          </div>

          <div className="flex items-end gap-[3px] h-4 shrink-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-brand-wine/80"
                style={{
                  animation: `voiceBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>{t.voice.transcribing}</span>
        </div>
      )}

      {error && !busy && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 hover:opacity-70"
            aria-label="Dismiss error"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
