/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EchoVoiceSession } from '@/components/echo/EchoVoiceSession';
import { translations } from '@/lib/i18n/translations';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({ language: 'it', t: translations.it }),
}));

const transcribeMock = vi.fn();
vi.mock('@/lib/echo/whisper-stt', async (orig) => {
  const actual = await orig<typeof import('@/lib/echo/whisper-stt')>();
  return { ...actual, transcribeAudioWithWhisper: (...a: unknown[]) => transcribeMock(...a) };
});

class FakeRecorder {
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: MediaStream) {}
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

describe('EchoVoiceSession: limite di 5 minuti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    transcribeMock.mockReset().mockResolvedValue('testo');
    const track = { stop: vi.fn(), onended: null };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('si ferma da sola a 300 secondi, invia e avvisa', async () => {
    const onTranscript = vi.fn();
    const onNotice = vi.fn();
    const onElapsed = vi.fn();
    render(
      <EchoVoiceSession
        language="it"
        accessToken="tok"
        onTranscript={onTranscript}
        onNotice={onNotice}
        onRecordingElapsed={onElapsed}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onElapsed).toHaveBeenCalledWith(0);

    await act(async () => {
      vi.advanceTimersByTime(299_000);
    });
    expect(transcribeMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_500);
    });
    expect(transcribeMock).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith('testo');
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', text: expect.stringContaining('5 minuti') })
    );
    expect(onElapsed).toHaveBeenLastCalledWith(null);
  });
});
