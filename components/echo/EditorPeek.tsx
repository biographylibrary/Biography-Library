'use client';

import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import type { EditorAiToolsMenuProps } from '@/components/editor/editor-ai-tools-menu';

interface EditorPeekProps {
  text: string;
  onTextChange: (html: string) => void;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  aiEnabled?: boolean;
  aiLoading?: boolean;
  onGrammarCheck?: () => void;
  onReviewWithAi?: () => void;
  onApertusReview?: () => void;
  aiUsageRefresh?: number;
  highlightChange?: { id: number; text: string } | null;
  undoLastChange?: { label: string; hint: string; onUndo: () => void };
  className?: string;
}

function hasTextContent(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

export function EditorPeek({
  text,
  onTextChange,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  isPublished = false,
  aiEnabled,
  aiLoading,
  onGrammarCheck,
  onReviewWithAi,
  onApertusReview,
  aiUsageRefresh,
  highlightChange,
  undoLastChange,
  className,
}: EditorPeekProps) {
  const aiTools: Omit<EditorAiToolsMenuProps, 'className' | 'buttonClassName'> | undefined =
    aiEnabled
      ? {
          aiEnabled: true,
          aiLoading,
          hasText: hasTextContent(text),
          onGrammarCheck,
          onReviewWithAi,
          onApertusReview,
        }
      : undefined;

  return (
    <div className={cn('h-full min-h-0 overflow-hidden pb-3', className)}>
      <RichTextEditor
        content={text}
        onChange={onTextChange}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
        isPublished={isPublished}
        aiTools={aiTools}
        aiUsageRefresh={aiUsageRefresh}
        highlightChange={highlightChange}
        undoLastChange={undoLastChange}
      />
    </div>
  );
}
