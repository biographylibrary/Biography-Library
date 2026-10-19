/** @vitest-environment jsdom */
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SectionSidebar } from '@/components/editor/section-sidebar';
import {
  VisibilityDialog,
  type BiographyVisibility,
} from '@/components/editor/VisibilityDialog';
import { LicenseChoiceDialog } from '@/components/editor/LicenseChoiceDialog';
import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';
import { EchoChat } from '@/components/echo/EchoChat';
import { getEmptyContent } from '@/lib/editor-constants';
import { translations } from '@/lib/i18n/translations';
import {
  LICENSE_BY_NC_SA_4,
  LICENSE_BY_SA_4,
  type ContentLicenseUri,
} from '@/lib/rights';
import { pickGrammarCheckExcerpt } from '@/lib/ai/grammar';

const updateMock = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    session: { access_token: 'tok' },
    user: { id: 'u1' },
    loading: false,
  }),
}));

vi.mock('@/lib/echo/echo-chat-context', () => ({
  useEchoChat: () => ({
    messages: [],
    loading: false,
    historyLoading: false,
    error: null,
    input: '',
    setInput: vi.fn(),
    orbState: 'idle',
    voiceOutputEnabled: false,
    toggleVoiceOutput: vi.fn(),
    stopSpeaking: vi.fn(),
    sendMessage: vi.fn(),
    activeSectionLabel: null,
    dismissSectionLabel: vi.fn(),
    reportOrbState: vi.fn(),
    icebreakers: [],
    icebreakersVisible: false,
    scrollToMessageId: null,
    clearScrollToMessageId: vi.fn(),
    hasMoreOlder: false,
    loadingOlder: false,
    loadOlderMessages: vi.fn(),
    recallUsageGuide: vi.fn(),
    canInsertInEditor: true,
    pendingDraftCount: 0,
    confirmInsertDraft: vi.fn(),
    deferInsertDraft: vi.fn(),
    expandInsertDraft: vi.fn(),
    activeSection: 'freeflow',
  }),
}));

vi.mock('@/lib/i18n/i18n-context', () => ({
  useTranslation: () => ({
    language: 'it',
    t: translations.it,
    setLanguage: async () => {},
    syncLanguageFromProfile: () => {},
    isLoading: false,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: updateMock,
    }),
  },
}));

vi.mock('@/components/editor/editor-font-size-control', () => ({
  EditorFontSizeControl: () => <div data-testid="font-size" />,
}));

vi.mock('@/components/editor/ai-usage-indicator', () => ({
  AiUsageIndicator: () => <div data-testid="ai-usage-indicator" />,
}));

function mockEditor() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    isActive: () => false,
    chain: () => ({
      setTextSelection: () => ({ focus: () => ({ toggleBold: () => ({ run: () => {} }) }) }),
      focus: () => ({
        toggleBold: () => ({ run: () => {} }),
        toggleItalic: () => ({ run: () => {} }),
        toggleHeading: () => ({ run: () => {} }),
        toggleBulletList: () => ({ run: () => {} }),
        toggleOrderedList: () => ({ run: () => {} }),
        toggleBlockquote: () => ({ run: () => {} }),
      }),
    }),
    storage: { characterCount: { characters: () => 42 } },
  } as never;
}

const sidebarBase = {
  content: getEmptyContent(),
  activeSection: 'freeflow',
  onSectionChange: vi.fn(),
  globalNotesCount: 0,
  globalTodosCount: 0,
  onToggleNotesPanel: vi.fn(),
  onTogglePhotosPanel: vi.fn(),
  onToggleBookStructurePanel: vi.fn(),
  onTogglePermanencePanel: vi.fn(),
  onToggleImportText: vi.fn(),
  onToggleExportText: vi.fn(),
  onToggleReviewPublication: vi.fn(),
  showNotesPanel: false,
  showPhotosPanel: false,
  showBookStructurePanel: false,
  showPermanencePanel: false,
  showImportDialog: false,
  chapters: [] as { index: number; title: string; offset: number }[],
  onSelectChapter: vi.fn(),
  onAddChapter: vi.fn(),
  biographyMode: 'freeflow' as const,
  contentFreeflow: '',
  onModeChange: vi.fn(),
  onFreeflowChange: vi.fn(),
  title: 'Titolo',
  onTitleChange: vi.fn(),
  saveStatus: 'saved' as const,
  privacy: 'private' as const,
};

function StatefulVisibilityHarness({
  initialVisibility = 'private',
  initialRightsUri = null,
  initialLicenseView = null,
  licenseBusy = false,
  onLicenseConfirmSpy,
  onLicenseCancelSpy,
}: {
  initialVisibility?: BiographyVisibility;
  initialRightsUri?: string | null;
  initialLicenseView?: null | 'initial' | 'upgrade';
  licenseBusy?: boolean;
  onLicenseConfirmSpy?: (uri: ContentLicenseUri) => void;
  onLicenseCancelSpy?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [visibility, setVisibility] = useState<BiographyVisibility>(initialVisibility);
  const [rightsStatementUri, setRightsStatementUri] = useState<string | null>(initialRightsUri);
  const [licenseView, setLicenseView] = useState<null | 'initial' | 'upgrade'>(initialLicenseView);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const handleVisibilityChange = (next: BiographyVisibility) => {
    if (next === 'public' && !rightsStatementUri?.trim()) {
      setLicenseView('initial');
      setOpen(true);
      return;
    }
    setVisibility(next);
  };

  const handleLicenseConfirm = (uri: ContentLicenseUri) => {
    onLicenseConfirmSpy?.(uri);
    const isUpgrade = licenseView === 'upgrade';
    setRightsStatementUri(uri);
    if (!isUpgrade) {
      setVisibility('public');
    }
    setLicenseView(null);
  };

  const handleLicenseCancel = () => {
    onLicenseCancelSpy?.();
    setLicenseView(null);
  };

  return (
    <VisibilityDialog
      open={open}
      onOpenChange={setOpen}
      biographyId="bio-123"
      visibility={visibility}
      onVisibilityChange={handleVisibilityChange}
      currentShareToken={shareToken}
      onTokenGenerated={setShareToken}
      rightsStatementUri={rightsStatementUri}
      onRequestLicenseUpgrade={() => setLicenseView('upgrade')}
      licenseBusy={licenseBusy}
      licenseView={licenseView}
      onLicenseConfirm={handleLicenseConfirm}
      onLicenseCancel={handleLicenseCancel}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('SectionSidebar — voce Visibilità', () => {
  it('mostra sempre la scritta fissa «Visibilità» (anche in modalità pubblica o famiglia) e al clic apre il popup', () => {
    const onToggleVisibility = vi.fn();
    const { rerender } = render(
      <SectionSidebar
        {...sidebarBase}
        privacy="public"
        onToggleVisibilityPanel={onToggleVisibility}
      />
    );
    fireEvent.click(screen.getByText(translations.it.editor.tools));
    const btn = document.querySelector('[data-tour-id="privacy-btn"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe(translations.it.dashboard.visibility);
    fireEvent.click(btn);
    expect(onToggleVisibility).toHaveBeenCalledTimes(1);

    rerender(
      <SectionSidebar
        {...sidebarBase}
        privacy="link-only"
        showVisibilityPanel
        onToggleVisibilityPanel={onToggleVisibility}
      />
    );
    const btnAfter = document.querySelector('[data-tour-id="privacy-btn"]') as HTMLButtonElement;
    expect(btnAfter.textContent).toBe(translations.it.dashboard.visibility);
  });
});

describe('VisibilityDialog — 3 modalità, link famiglia copiabile, licenza pubblica in finestra unica', () => {
  it('mostra le 3 modalità con spiegazioni e indica Privata come predefinita', () => {
    const onVisibilityChange = vi.fn();
    render(
      <VisibilityDialog
        open
        onOpenChange={vi.fn()}
        biographyId="bio-123"
        visibility="private"
        onVisibilityChange={onVisibilityChange}
        currentShareToken={null}
        onTokenGenerated={vi.fn()}
      />
    );

    expect(screen.getByText(translations.it.share.visibilityDialogSubtitle)).toBeTruthy();
    expect(screen.getByText(translations.it.share.defaultBadge)).toBeTruthy();
    expect(screen.getByText(translations.it.share.privateModeDescription)).toBeTruthy();
    expect(screen.getByText(translations.it.share.familyModeDescription)).toBeTruthy();
    expect(screen.getByText(translations.it.share.publicModeDescription)).toBeTruthy();
  });

  it('in modalità Famiglia mostra il link copiabile e permette di copiarlo', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <VisibilityDialog
        open
        onOpenChange={vi.fn()}
        biographyId="bio-123"
        visibility="link-only"
        onVisibilityChange={vi.fn()}
        currentShareToken="tok-abc-999"
        onTokenGenerated={vi.fn()}
      />
    );

    const input = screen.getByTestId('family-share-url-input') as HTMLInputElement;
    expect(input.value).toContain('/biography/bio-123/view?token=tok-abc-999');

    const copyBtn = screen.getByTestId('family-share-copy-btn');
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(input.value);
    });
  });

  it('(a) scelta di Pubblica senza licenza: mostra data-testid="visibility-license-view", nasconde le tre modalità e mantiene UN SOLO role="dialog"', () => {
    render(<StatefulVisibilityHarness initialVisibility="private" initialRightsUri={null} />);

    const publicRadio = document.getElementById('visibility-public') as HTMLElement;
    fireEvent.click(publicRadio);

    expect(screen.getByTestId('visibility-license-view')).toBeTruthy();
    expect(screen.queryByTestId('visibility-option-private')).toBeNull();
    expect(screen.queryByTestId('visibility-option-family')).toBeNull();
    expect(screen.queryByTestId('visibility-option-public')).toBeNull();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: translations.it.dashboard.visibility })).toBeTruthy();
  });

  it('(b) Annulla nella vista licenza: torna alle tre modalità, il dialog resta aperto e la visibilità resta privata', () => {
    render(<StatefulVisibilityHarness initialVisibility="private" initialRightsUri={null} />);

    fireEvent.click(document.getElementById('visibility-public')!);
    expect(screen.getByTestId('visibility-license-view')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: translations.it.rightsChoice.cancel }));

    expect(screen.queryByTestId('visibility-license-view')).toBeNull();
    expect(screen.getByTestId('visibility-option-private')).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const privateOption = screen.getByTestId('visibility-option-private');
    expect(privateOption.className).toContain('tone-success');
  });

  it('(c) Conferma con BY-NC-SA (default) e con BY-SA selezionata chiama onLicenseConfirm con le rispettive URI', () => {
    const onConfirmDefault = vi.fn();
    const { unmount } = render(
      <StatefulVisibilityHarness
        initialVisibility="private"
        initialRightsUri={null}
        onLicenseConfirmSpy={onConfirmDefault}
      />
    );

    fireEvent.click(document.getElementById('visibility-public')!);
    fireEvent.click(screen.getByRole('button', { name: translations.it.rightsChoice.confirm }));
    expect(onConfirmDefault).toHaveBeenCalledWith(LICENSE_BY_NC_SA_4);
    unmount();

    const onConfirmBySa = vi.fn();
    render(
      <StatefulVisibilityHarness
        initialVisibility="private"
        initialRightsUri={null}
        onLicenseConfirmSpy={onConfirmBySa}
      />
    );

    fireEvent.click(document.getElementById('visibility-public')!);
    fireEvent.click(document.getElementById('license-by-sa')!);
    fireEvent.click(screen.getByRole('button', { name: translations.it.rightsChoice.confirm }));
    expect(onConfirmBySa).toHaveBeenCalledWith(LICENSE_BY_SA_4);
  });

  it('(d) pulsante upgrade BY-SA con licenza BY-NC-SA porta alla vista upgrade sempre con UN SOLO role="dialog"; con BY-SA il pulsante non c’è', () => {
    const { unmount } = render(
      <StatefulVisibilityHarness
        initialVisibility="public"
        initialRightsUri={LICENSE_BY_NC_SA_4}
      />
    );

    expect(screen.getByTestId('public-license-summary')).toBeTruthy();
    const upgradeBtn = screen.getByRole('button', {
      name: translations.it.rightsChoice.upgradeButton,
    });
    fireEvent.click(upgradeBtn);

    expect(screen.getByTestId('visibility-license-view')).toBeTruthy();
    expect(screen.getByText(translations.it.rightsChoice.upgradeTitle)).toBeTruthy();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    unmount();

    render(
      <StatefulVisibilityHarness
        initialVisibility="public"
        initialRightsUri={LICENSE_BY_SA_4}
      />
    );
    expect(screen.getByTestId('public-license-summary')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: translations.it.rightsChoice.upgradeButton })
    ).toBeNull();
  });

  it('(e) chiusura della finestra mentre si è nella vista licenza chiama onLicenseCancel', () => {
    const onCancelSpy = vi.fn();
    render(
      <StatefulVisibilityHarness
        initialVisibility="private"
        initialRightsUri={null}
        initialLicenseView="initial"
        onLicenseCancelSpy={onCancelSpy}
      />
    );

    expect(screen.getByTestId('visibility-license-view')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onCancelSpy).toHaveBeenCalledTimes(1);
  });

  it('(f) licenseBusy true disabilita Annulla e Conferma nella vista licenza', () => {
    render(
      <StatefulVisibilityHarness
        initialVisibility="private"
        initialRightsUri={null}
        initialLicenseView="initial"
        licenseBusy
      />
    );

    const cancelBtn = screen.getByRole('button', {
      name: translations.it.rightsChoice.cancel,
    }) as HTMLButtonElement;
    const confirmBtn = screen.getByRole('button', {
      name: translations.it.rightsChoice.confirm,
    }) as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);
    expect(confirmBtn.disabled).toBe(true);
  });
});

describe('(g) LicenseChoiceDialog standalone (usato da onboarding e creazione)', () => {
  it('mostra titolo e i due radio in initial e solo BY-SA in upgrade', () => {
    const { rerender } = render(
      <LicenseChoiceDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        mode="initial"
      />
    );

    expect(screen.getByText(translations.it.rightsChoice.title)).toBeTruthy();
    expect(document.getElementById('license-by-nc-sa')).toBeTruthy();
    expect(document.getElementById('license-by-sa')).toBeTruthy();

    rerender(
      <LicenseChoiceDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        mode="upgrade"
      />
    );

    expect(screen.getByText(translations.it.rightsChoice.upgradeTitle)).toBeTruthy();
    expect(document.getElementById('license-by-nc-sa')).toBeNull();
    expect(document.getElementById('license-by-sa')).toBeNull();
    expect(screen.getByText(translations.it.rightsChoice.optionBySaTitle)).toBeTruthy();
  });
});

describe('Barra di formattazione e controllo grammatica su selezione/paragrafo', () => {
  it('non mostra più il menu «Strumenti AI» nella barra di formattazione ma mantiene il contatore crediti AI', () => {
    render(
      <RichTextToolbar
        editor={mockEditor()}
        biographyId="bio-1"
        editorFontSize={16}
        onEditorFontSizeChange={vi.fn()}
        aiEnabled
      />
    );

    expect(screen.queryByText(translations.it.echo.aiToolsMenu)).toBeNull();
    expect(screen.getByTestId('ai-usage-indicator')).toBeTruthy();
  });

  it('pickGrammarCheckExcerpt preferisce il testo selezionato, altrimenti il paragrafo del cursore, altrimenti stringa vuota', () => {
    expect(
      pickGrammarCheckExcerpt({
        selectedText: '  Frase selezionata dall’utente.  ',
        blockText: 'Intero paragrafo molto più lungo.',
      })
    ).toBe('Frase selezionata dall’utente.');

    expect(
      pickGrammarCheckExcerpt({
        selectedText: '   ',
        blockText: '  Solo questo paragrafo viene controllato. ',
      })
    ).toBe('Solo questo paragrafo viene controllato.');

    expect(
      pickGrammarCheckExcerpt({
        selectedText: '',
        blockText: '   ',
      })
    ).toBe('');
  });

  it('mostra il pulsante Controlla Grammatica nel pannello di Echo e invoca onGrammarCheck al clic', () => {
    const onGrammarCheck = vi.fn();
    render(
      <EchoChat
        headerLayout="horizontal"
        showOrb
        onGrammarCheck={onGrammarCheck}
      />
    );

    const btn = screen.getByTestId('echo-grammar-btn');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toBe(translations.it.editor.checkGrammar);
    fireEvent.click(btn);
    expect(onGrammarCheck).toHaveBeenCalledTimes(1);
  });
});
