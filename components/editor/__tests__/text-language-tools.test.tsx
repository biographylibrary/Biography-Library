/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RichTextToolbar } from '@/components/editor/rich-text-toolbar';
import { SectionSidebar } from '@/components/editor/section-sidebar';
import { TextLanguageDialog } from '@/components/editor/TextLanguageDialog';
import { getEmptyContent } from '@/lib/editor-constants';
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

vi.mock('@/components/editor/TextLanguageField', () => ({
  TextLanguageField: ({
    disabled,
    onChange,
  }: {
    disabled?: boolean;
    onChange: (tag: string) => void;
  }) => (
    <div data-testid="text-language-field">
      <button type="button" disabled={disabled} onClick={() => onChange('fr')}>
        field
      </button>
    </div>
  ),
}));

vi.mock('@/components/editor/editor-font-size-control', () => ({
  EditorFontSizeControl: () => <div data-testid="font-size" />,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

vi.mock('@/components/editor/ai-usage-indicator', () => ({
  AiUsageIndicator: () => null,
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
    storage: { characterCount: { characters: () => 0 } },
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
  onPrivacyChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('text language in Tools', () => {
  it('mostra la voce per un originale e apre la finestra', () => {
    const onToggle = vi.fn();
    render(
      <SectionSidebar
        {...sidebarBase}
        isEdition={false}
        isFrozen={false}
        canTranslate
        onToggleTranslate={vi.fn()}
        onToggleTextLanguage={onToggle}
      />
    );
    fireEvent.click(screen.getByText(translations.it.editor.tools));
    const btn = document.querySelector('[data-tour-id="text-language-btn"]');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(onToggle).toHaveBeenCalled();
  });

  it('icone diverse: BookA per Lingua del testo, Languages per Traduci', () => {
    render(
      <SectionSidebar
        {...sidebarBase}
        isEdition={false}
        isFrozen={false}
        canTranslate
        onToggleTranslate={vi.fn()}
        onToggleTextLanguage={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(translations.it.editor.tools));
    const langBtn = document.querySelector('[data-tour-id="text-language-btn"]');
    const translateBtn = document.querySelector('[data-tour-id="translate-btn"]');
    expect(langBtn?.querySelector('svg.lucide-book-a')).toBeTruthy();
    expect(translateBtn?.querySelector('svg.lucide-languages')).toBeTruthy();
  });

  it('non mostra la voce per un\'edizione', () => {
    render(
      <SectionSidebar
        {...sidebarBase}
        isEdition
        isFrozen={false}
        onToggleTextLanguage={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(translations.it.editor.tools));
    expect(document.querySelector('[data-tour-id="text-language-btn"]')).toBeNull();
  });

  it('non mostra la voce a scheda congelata', () => {
    render(
      <SectionSidebar
        {...sidebarBase}
        isEdition={false}
        isFrozen
        onToggleTextLanguage={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(translations.it.editor.tools));
    expect(document.querySelector('[data-tour-id="text-language-btn"]')).toBeNull();
  });

  it('nelle edizioni la voce Foto è un pulsante attivo e non c\'è photosDeferred', () => {
    const onPhotos = vi.fn();
    render(
      <SectionSidebar
        {...sidebarBase}
        isEdition
        isFrozen={false}
        onTogglePhotosPanel={onPhotos}
      />
    );
    fireEvent.click(screen.getByText(translations.it.editor.tools));
    const btn = document.querySelector('[data-tour-id="photos-btn"]');
    expect(btn).toBeTruthy();
    expect(btn?.tagName).toBe('BUTTON');
    fireEvent.click(btn!);
    expect(onPhotos).toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/photosDeferred|secondo momento|will be written later/i);
  });

  it('campo disattivato con statusLocksText (disabled)', () => {
    render(
      <TextLanguageDialog
        open
        onOpenChange={vi.fn()}
        value="it"
        disabled
        onChange={vi.fn()}
      />
    );
    expect(
      (screen.getByRole('button', { name: 'field' }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});

describe('toolbar Language button', () => {
  it('compare solo con onOpenLanguage e il clic la chiama', () => {
    const onOpen = vi.fn();
    const editor = mockEditor();
    const { rerender } = render(
      <RichTextToolbar
        editor={editor}
        biographyId="bio-1"
        editorFontSize={16}
        onEditorFontSizeChange={vi.fn()}
      />
    );
    expect(document.querySelector('[data-tour-id="toolbar-language-btn"]')).toBeNull();

    rerender(
      <RichTextToolbar
        editor={editor}
        biographyId="bio-1"
        editorFontSize={16}
        onEditorFontSizeChange={vi.fn()}
        onOpenLanguage={onOpen}
        textLanguageName="Italiano"
      />
    );
    const btn = document.querySelector(
      '[data-tour-id="toolbar-language-btn"]'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe('Lingua');
    expect(btn.getAttribute('aria-label')).toBe('Lingua del testo: Italiano');
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
