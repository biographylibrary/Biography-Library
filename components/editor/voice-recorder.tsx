'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, AlertCircle, MicOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  useSpeechRecognition,
  SPEECH_LANGUAGES,
} from '@/hooks/use-speech-recognition';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onClearTranscript: () => void;
  audioTranscript: string;
}

export function VoiceRecorder({
  onTranscript,
  onClearTranscript,
  audioTranscript,
}: VoiceRecorderProps) {
  const [language, setLanguage] = useState('en-US');
  const { t } = useTranslation();

  const { isRecording, isSupported, permissionDenied, interimText, start, stop } =
    useSpeechRecognition({ language, onTranscript });

  if (!isSupported) {
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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isRecording}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        >
          {SPEECH_LANGUAGES.map((lang) => (
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
            onClick={stop}
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
            onClick={start}
          >
            <Mic className="h-3.5 w-3.5" />
            {t.voice.record}
          </Button>
        )}

        {audioTranscript && !isRecording && (
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
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {t.voice.recording}
            </span>
          </div>

          <div className="flex items-end gap-[3px] h-4 shrink-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-red-500/80"
                style={{
                  animation: `voiceBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                }}
              />
            ))}
          </div>

          {interimText && (
            <span className="text-xs text-muted-foreground italic truncate flex-1 ml-1">
              {interimText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
