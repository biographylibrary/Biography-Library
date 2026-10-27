import { describe, expect, it } from 'vitest';
import {
  ECHO_MAX_RECORDING_SECONDS,
  ECHO_RECORDING_WARNING_SECONDS,
  echoRecordingLimitReached,
  echoRecordingRemainingSeconds,
  echoRecordingWarningActive,
  formatEchoClock,
} from '@/lib/echo/recording-limits';

describe('limiti di registrazione Echo', () => {
  it('il limite è di 5 minuti con avviso a 30 secondi dalla fine', () => {
    expect(ECHO_MAX_RECORDING_SECONDS).toBe(300);
    expect(ECHO_RECORDING_WARNING_SECONDS).toBe(30);
  });

  it('calcola il tempo rimasto senza andare sotto zero', () => {
    expect(echoRecordingRemainingSeconds(0)).toBe(300);
    expect(echoRecordingRemainingSeconds(59.9)).toBe(241);
    expect(echoRecordingRemainingSeconds(400)).toBe(0);
  });

  it("l'avviso compare solo negli ultimi 30 secondi", () => {
    expect(echoRecordingWarningActive(269)).toBe(false);
    expect(echoRecordingWarningActive(270)).toBe(true);
    expect(echoRecordingWarningActive(299)).toBe(true);
    expect(echoRecordingWarningActive(300)).toBe(false);
  });

  it('il limite scatta a 300 secondi', () => {
    expect(echoRecordingLimitReached(299.9)).toBe(false);
    expect(echoRecordingLimitReached(300)).toBe(true);
  });

  it('formatta il cronometro come m:ss', () => {
    expect(formatEchoClock(0)).toBe('0:00');
    expect(formatEchoClock(65)).toBe('1:05');
    expect(formatEchoClock(300)).toBe('5:00');
  });
});
