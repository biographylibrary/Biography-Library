'use client';

export const SPEECH_LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
] as const;

interface UseSpeechRecognitionOptions {
  language: string;
  onTranscript: (text: string) => void;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isSupported: boolean;
  permissionDenied: boolean;
  interimText: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(
  _options: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  return {
    isRecording: false,
    isSupported: false,
    permissionDenied: false,
    interimText: '',
    error: 'Web Speech API has been replaced by the Whisper transcription service.',
    start: () => {},
    stop: () => {},
  };
}
