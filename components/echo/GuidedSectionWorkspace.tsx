'use client';

import { EchoChat } from './EchoChat';
import { EditorPeek } from './EditorPeek';
import { EchoProvider } from '@/lib/echo/echo-context';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface GuidedSectionWorkspaceProps {
  biographyId: string;
  activeSection: string;
  sectionText: string;
  onSectionTextChange: (html: string) => void;
  onDraftApplied: (sectionKey: string) => void;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  editorPeekOpen: boolean;
  onEditorPeekOpenChange: (open: boolean) => void;
}

export function GuidedSectionWorkspace({
  biographyId,
  activeSection,
  sectionText,
  onSectionTextChange,
  onDraftApplied,
  editorFontSize,
  onEditorFontSizeChange,
  isPublished,
  editorPeekOpen,
  onEditorPeekOpenChange,
}: GuidedSectionWorkspaceProps) {
  const { t, language } = useTranslation();

  const sectionTitle =
    t.sectionTitles[activeSection as keyof typeof t.sectionTitles] ||
    BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection)?.title ||
    activeSection;

  return (
    <EchoProvider
      page="editor_sections"
      biographyId={biographyId}
      sectionKey={activeSection}
      biographyMode="sections"
    >
      <div className="flex flex-col h-full min-h-0 relative">
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <h2 className="font-serif text-base font-medium truncate flex-1">{sectionTitle}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 shrink-0"
            onClick={() => onEditorPeekOpenChange(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.common.edit}</span>
          </Button>
        </div>

        <EchoChat
          echoPage="editor_sections"
          biographyId={biographyId}
          activeSection={activeSection}
          biographyMode="sections"
          className="flex-1 min-h-0 px-2 pb-2"
          orbSize="md"
          showOrb
          onDraftApplied={(key) => {
            onDraftApplied(key);
            onEditorPeekOpenChange(true);
          }}
        />

        <EditorPeek
          open={editorPeekOpen}
          onOpenChange={onEditorPeekOpenChange}
          sectionTitle={sectionTitle}
          text={sectionText}
          onTextChange={onSectionTextChange}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          isPublished={isPublished}
        />
      </div>
    </EchoProvider>
  );
}
