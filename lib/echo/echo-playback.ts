'use client';

import type { EchoOrbState } from '@/components/echo/EchoOrb';

export type EchoSpeechBackend = 'kokoro' | 'browser' | 'none';

export interface SpeakEchoReplyOptions {
  accessToken?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

function voiceLang(language: string): string {
  if (language === 'it') return 'it-IT';
  if (language === 'fr') return 'fr-FR';
  if (language === 'de') return 'de-DE';
  return 'en-US';
}

function pickBrowserVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const prefix = lang.slice(0, 2);
  return (
    voices.find((v) => v.lang.startsWith(prefix) && !v.name.toLowerCase().includes('compact')) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    voices[0]
  );
}

let activeAudio: HTMLAudioElement | null = null;

export function stopEchoSpeech(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
}

function speakWithBrowser(
  text: string,
  language: string,
  options?: SpeakEchoReplyOptions
): Promise<EchoSpeechBackend> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve('none');
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 2000));
    utter.lang = voiceLang(language);
    utter.rate = 0.95;
    const voice = pickBrowserVoice(utter.lang);
    if (voice) utter.voice = voice;

    options?.onStart?.();
    utter.onend = () => {
      options?.onEnd?.();
      resolve('browser');
    };
    utter.onerror = () => {
      options?.onEnd?.();
      resolve('none');
    };
    window.speechSynthesis.speak(utter);
  });
}

/**
 * Speak Echo's reply: Kokoro (EU self-hosted) when configured, else browser TTS.
 */
export async function speakEchoReply(
  text: string,
  language: string,
  options?: SpeakEchoReplyOptions
): Promise<EchoSpeechBackend> {
  if (typeof window === 'undefined' || !text.trim()) return 'none';

  stopEchoSpeech();

  if (options?.accessToken) {
    try {
      const res = await fetch('/api/agents/echo/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.slice(0, 4096), language }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudio = audio;

        return await new Promise<EchoSpeechBackend>((resolve) => {
          options?.onStart?.();
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (activeAudio === audio) activeAudio = null;
            options?.onEnd?.();
            resolve('kokoro');
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            if (activeAudio === audio) activeAudio = null;
            void speakWithBrowser(text, language, options).then(resolve);
          };
          void audio.play().catch(() => {
            URL.revokeObjectURL(url);
            void speakWithBrowser(text, language, options).then(resolve);
          });
        });
      }
    } catch {
      // fall through to browser
    }
  }

  return speakWithBrowser(text, language, options);
}

export function isEchoTtsAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/** Map internal mic states to orb animation states */
export function echoOrbStateFromMic(
  phase: 'idle' | 'recording' | 'transcribing'
): EchoOrbState {
  if (phase === 'recording') return 'listening';
  if (phase === 'transcribing') return 'thinking';
  return 'idle';
}
