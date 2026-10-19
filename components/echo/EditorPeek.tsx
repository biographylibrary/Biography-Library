'use client';

import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/rich-text-editor';

interface EditorPeekProps {
  text: string;
  onTextChange: (html: string) => void;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  onOpenLanguage?: () => void;
  textLanguageName?: string;
  isPublished?: boolean;
  aiEnabled?: boolean;
  aiUsageRefresh?: number;
  highlightChange?: { id: number; text: string } | null;
  undoLastChange?: { label: string; hint: string; onUndo: () => void };
  className?: string;
}

export function EditorPeek({
  text,
  onTextChange,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  onOpenLanguage,
  textLanguageName,
  isPublished = false,
  aiEnabled,
  aiUsageRefresh,
  highlightChange,
  undoLastChange,
  className,
}: EditorPeekProps) {
  return (
    <div className={cn('h-full min-h-0 overflow-hidden pb-3', className)}>
      <RichTextEditor
        content={text}
        onChange={onTextChange}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
        onOpenLanguage={onOpenLanguage}
        textLanguageName={textLanguageName}
        isPublished={isPublished}
        aiEnabled={aiEnabled}
        aiUsageRefresh={aiUsageRefresh}
        highlightChange={highlightChange}
        undoLastChange={undoLastChange}
      />
    </div>
  );
}
