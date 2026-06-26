'use client';

import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { Button } from '@/components/ui/button';
import { X, CircleCheck as CheckCircle2, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { AiUsageIndicator } from '@/components/editor/ai-usage-indicator';
import type { EditorAiToolsMenuProps } from '@/components/editor/editor-ai-tools-menu';

interface EditorPeekProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle: string;
  text: string;
  onTextChange: (html: string) => void;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  aiEnabled?: boolean;
  aiUsageRefresh?: number;
  aiLoading?: boolean;
  onGrammarCheck?: () => void;
  onGuidedPrompts?: () => void;
  onSummarize?: () => void;
  onReviewWithAi?: () => void;
  onApertusReview?: () => void;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  className?: string;
}

function hasTextContent(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

export function EditorPeek({
  open,
  onOpenChange,
  sectionTitle,
  text,
  onTextChange,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  isPublished = false,
  aiEnabled,
  aiUsageRefresh,
  aiLoading,
  onGrammarCheck,
  onGuidedPrompts,
  onSummarize,
  onReviewWithAi,
  onApertusReview,
  onMarkComplete,
  isCompleted = false,
  className,
}: EditorPeekProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const aiTools: Omit<EditorAiToolsMenuProps, 'className' | 'buttonClassName'> | undefined =
    aiEnabled
      ? {
          aiEnabled: true,
          aiLoading,
          hasText: hasTextContent(text),
          onGrammarCheck,
          onGuidedPrompts,
          onSummarize,
          onReviewWithAi,
          onApertusReview,
        }
      : undefined;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex flex-col bg-background shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-border/50 shrink-0 gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
            {t.common.edit}
          </p>
          <h2
            className="truncate text-primary"
            style={{
              fontFamily: "'Noto Serif', Georgia, serif",
              fontWeight: 400,
              fontSize: '1.0625rem',
              lineHeight: '1.2',
              fontSynthesis: 'none',
            }}
          >
            {sectionTitle}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isPublished && onMarkComplete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'gap-1 text-xs h-8 px-2 shrink-0 border bg-transparent',
                'text-brand-ink border-brand-ink',
                'active:bg-brand-blue active:border-brand-blue/60 active:text-brand-ink',
                'dark:text-brand-beigeLight dark:border-brand-beigeLight/30',
                'dark:active:bg-brand-blue/30 dark:active:border-brand-blue/45',
                isCompleted && 'border-primary/60 text-primary'
              )}
              onClick={onMarkComplete}
              title={isCompleted ? t.status.sectionCompletedHint : t.status.markCompleteWhenFinished}
            >
              {isCompleted ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isCompleted ? t.status.markIncomplete : t.status.markComplete}
              </span>
            </Button>
          )}
          {aiEnabled && <AiUsageIndicator refreshTrigger={aiUsageRefresh} />}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 bg-brand-wine text-brand-paper hover:bg-brand-wineDark hover:text-brand-paper"
            title={t.common.close}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-3">
        <RichTextEditor
          content={text}
          onChange={onTextChange}
          biographyId={biographyId}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          isPublished={isPublished}
          aiTools={aiTools}
        />
      </div>
    </div>
  );
}
