/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GuidedSectionWorkspace } from '@/components/echo/GuidedSectionWorkspace';
import { translations } from '@/lib/i18n/translations';

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('@/components/echo/EditorPeek', () => ({
  EditorPeek: () => <div data-testid="editor-peek" />,
}));

vi.mock('@/components/echo/EchoChat', () => ({
  EchoChat: () => <div data-testid="echo-chat">EchoChat</div>,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ session: null, user: null }),
}));

const baseProps = {
  biographyId: 'bio-1',
  activeSection: 'freeflow',
  sectionText: '<p>Ciao</p>',
  onSectionTextChange: () => {},
  documentMode: true as const,
  showEcho: true,
};

describe('GuidedSectionWorkspace con funzioni IA', () => {
  afterEach(() => cleanup());

  it('aiEnabled false: riquadro informativo, niente chat né suggerimenti', () => {
    render(<GuidedSectionWorkspace {...baseProps} aiEnabled={false} />);
    expect(screen.getByTestId('echo-ai-disabled-notice')).toBeTruthy();
    expect(screen.getByText(translations.it.echo.aiFeaturesDisabled)).toBeTruthy();
    expect(screen.getByText(translations.it.echo.goToSettings)).toBeTruthy();
    expect(screen.queryByTestId('echo-chat')).toBeNull();
  });

  it('aiEnabled true: pannello EchoChat come prima', () => {
    render(<GuidedSectionWorkspace {...baseProps} aiEnabled={true} />);
    expect(screen.getByTestId('echo-chat')).toBeTruthy();
    expect(screen.queryByTestId('echo-ai-disabled-notice')).toBeNull();
  });

  it('aiEnabled null (in lettura): né riquadro né chat (niente lampeggio)', () => {
    render(<GuidedSectionWorkspace {...baseProps} aiEnabled={null} />);
    expect(screen.queryByTestId('echo-ai-disabled-notice')).toBeNull();
    expect(screen.queryByTestId('echo-chat')).toBeNull();
    expect(screen.getByText(translations.it.echo.assistantBar)).toBeTruthy();
  });

  it('prova di rottura: senza ramo aiEnabled false resterebbe EchoChat', () => {
    render(<GuidedSectionWorkspace {...baseProps} aiEnabled={false} />);
    // Se qualcuno rimonta sempre EchoChat, questo fallisce.
    expect(screen.queryByTestId('echo-chat')).toBeNull();
    expect(screen.getByTestId('echo-ai-disabled-notice')).toBeTruthy();
  });
});
