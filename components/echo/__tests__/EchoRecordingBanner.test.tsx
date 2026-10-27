/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EchoRecordingBanner } from '@/components/echo/EchoRecordingBanner';
import { translations } from '@/lib/i18n/translations';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({ language: 'it', t: translations.it }),
}));

describe('EchoRecordingBanner', () => {
  afterEach(() => cleanup());

  it('mostra REC, cronometro e tempo rimasto', () => {
    render(<EchoRecordingBanner elapsedSeconds={65} />);
    expect(screen.getByText('REC')).toBeTruthy();
    expect(screen.getByTestId('echo-recording-elapsed').textContent).toBe('1:05');
    expect(screen.getByTestId('echo-recording-remaining').textContent).toBe('Restano 3:55');
    expect(screen.queryByTestId('echo-recording-warning')).toBeNull();
  });

  it('negli ultimi 30 secondi mostra l’avviso con i secondi rimasti', () => {
    render(<EchoRecordingBanner elapsedSeconds={280} />);
    expect(screen.getByTestId('echo-recording-warning').textContent).toContain('20 secondi');
  });
});
