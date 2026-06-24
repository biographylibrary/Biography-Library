'use client';

import type { EchoOrbState } from '@/components/echo/EchoOrb';

export type EchoSpeechBackend = 'voxtral' | 'browser' | 'none';

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
let activeOnEnd: (() => void) | null = null;
let activeSpeechResolve: ((backend: EchoSpeechBackend) => void) | null = null;
let speaking = false;
/** Bumped on every stop or new speak request — stale handlers must not start browser TTS. */
let speechGeneration = 0;

function isCurrentSpeech(generation: number): boolean {
  return generation === speechGeneration;
}

function finishSpeech(): void {
  speaking = false;
  const onEnd = activeOnEnd;
  activeOnEnd = null;
  onEnd?.();
}

function resolveActiveSpeech(backend: EchoSpeechBackend): void {
  if (!activeSpeechResolve) return;
  const resolve = activeSpeechResolve;
  activeSpeechResolve = null;
  resolve(backend);
}

function detachAudio(audio: HTMLAudioElement): void {
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.src = '';
}

export function isEchoSpeaking(): boolean {
  return speaking;
}

export function stopEchoSpeech(): void {
  if (typeof window === 'undefined') return;
  speechGeneration += 1;
  window.speechSynthesis?.cancel();
  if (activeAudio) {
    detachAudio(activeAudio);
    activeAudio = null;
  }
  if (speaking) {
    finishSpeech();
  }
  resolveActiveSpeech('none');
}

function speakWithBrowser(
  text: string,
  language: string,
  generation: number,
  options?: SpeakEchoReplyOptions
): Promise<EchoSpeechBackend> {
  return new Promise((resolve) => {
    activeSpeechResolve = resolve;

    if (!isCurrentSpeech(generation)) {
      resolveActiveSpeech('none');
      return;
    }
    if (!window.speechSynthesis) {
      resolveActiveSpeech('none');
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 2000));
    utter.lang = voiceLang(language);
    utter.rate = 0.95;
    const voice = pickBrowserVoice(utter.lang);
    if (voice) utter.voice = voice;

    activeOnEnd = options?.onEnd ?? null;
    speaking = true;
    options?.onStart?.();

    const done = (backend: EchoSpeechBackend) => {
      if (!isCurrentSpeech(generation)) {
        finishSpeech();
        resolveActiveSpeech('none');
        return;
      }
      finishSpeech();
      if (activeSpeechResolve === resolve) {
        activeSpeechResolve = null;
      }
      resolve(backend);
    };

    utter.onend = () => done('browser');
    utter.onerror = () => done('none');
    window.speechSynthesis.speak(utter);
  });
}

/**
 * Speak Echo's reply: Mistral Voxtral TTS when configured, else browser TTS.
 */
export async function speakEchoReply(
  text: string,
  language: string,
  options?: SpeakEchoReplyOptions
): Promise<EchoSpeechBackend> {
  if (typeof window === 'undefined' || !text.trim()) return 'none';

  stopEchoSpeech();
  const generation = speechGeneration;

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

      if (!isCurrentSpeech(generation)) return 'none';

      if (res.ok) {
        const blob = await res.blob();
        if (!isCurrentSpeech(generation)) return 'none';

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudio = audio;
        activeOnEnd = options?.onEnd ?? null;
        speaking = true;

        return await new Promise<EchoSpeechBackend>((resolve) => {
          activeSpeechResolve = resolve;

          const cleanup = () => {
            URL.revokeObjectURL(url);
            if (activeAudio === audio) {
              detachAudio(audio);
              activeAudio = null;
            }
          };

          const done = (backend: EchoSpeechBackend) => {
            cleanup();
            if (activeSpeechResolve === resolve) {
              activeSpeechResolve = null;
            }
            resolve(backend);
          };

          const abandon = () => done('none');

          options?.onStart?.();

          audio.onended = () => {
            if (!isCurrentSpeech(generation) || activeAudio !== audio) {
              abandon();
              return;
            }
            finishSpeech();
            done('voxtral');
          };

          audio.onerror = () => {
            if (!isCurrentSpeech(generation) || activeAudio !== audio) {
              abandon();
              return;
            }
            finishSpeech();
            console.warn('[echo-playback] MP3 playback failed, falling back to browser TTS');
            if (activeSpeechResolve === resolve) {
              activeSpeechResolve = null;
            }
            void speakWithBrowser(text, language, generation, options).then(resolve);
          };

          void audio.play().catch(() => {
            if (!isCurrentSpeech(generation) || activeAudio !== audio) {
              abandon();
              return;
            }
            finishSpeech();
            console.warn('[echo-playback] audio.play() blocked, falling back to browser TTS');
            if (activeSpeechResolve === resolve) {
              activeSpeechResolve = null;
            }
            void speakWithBrowser(text, language, generation, options).then(resolve);
          });
        });
      }

      const errBody = await res.json().catch(() => ({}));
      console.warn(
        `[echo-playback] TTS API ${res.status}:`,
        (errBody as { error?: string; hint?: string }).error ?? res.statusText,
        (errBody as { hint?: string }).hint ?? ''
      );
    } catch (err) {
      if (!isCurrentSpeech(generation)) return 'none';
      console.warn('[echo-playback] TTS fetch failed, falling back to browser TTS:', err);
    }
  }

  if (!isCurrentSpeech(generation)) return 'none';
  return speakWithBrowser(text, language, generation, options);
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
