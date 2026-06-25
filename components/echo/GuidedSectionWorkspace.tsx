'use client';

import { EchoChat } from './EchoChat';
import { EditorPeek } from './EditorPeek';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { Button } from '@/components/ui/button';
import { Pencil, CircleCheck as CheckCircle2, RotateCcw } from 'lucide-react';
import { AiUsageIndicator } from '@/components/editor/ai-usage-indicator';
import { cn } from '@/lib/utils';

interface GuidedSectionWorkspaceProps {
  biographyId: string;
  activeSection: string;
  sectionText: string;
  onSectionTextChange: (html: string) => void;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  editorPeekOpen: boolean;
  onEditorPeekOpenChange: (open: boolean) => void;
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
}

export function GuidedSectionWorkspace({
  biographyId,
  activeSection,
  sectionText,
  onSectionTextChange,
  editorFontSize,
  onEditorFontSizeChange,
  isPublished,
  editorPeekOpen,
  onEditorPeekOpenChange,
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
}: GuidedSectionWorkspaceProps) {
  const { t } = useTranslation();

  const sectionTitle =
    t.sectionTitles[activeSection as keyof typeof t.sectionTitles] ||
    BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection)?.title ||
    activeSection;

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {!editorPeekOpen && (
        <div className="flex items-center justify-between px-3 h-12 border-b border-border/50 shrink-0 gap-2">
          <h2
            className="truncate flex-1 min-w-0 text-primary"
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
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isPublished && onMarkComplete && (
              <Button
                type="button"
                variant={isCompleted ? 'outline' : 'default'}
                size="sm"
                className={cn(
                  'h-8 gap-1 shrink-0 text-xs px-2.5',
                  isCompleted && 'border-primary text-primary hover:bg-primary/10'
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
              variant="outline"
              size="sm"
              className="h-8 gap-1 shrink-0 text-xs px-2.5"
              onClick={() => onEditorPeekOpenChange(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.common.edit}</span>
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden" data-tour-id="echo-panel">
        <EchoChat
          className={cn('flex-1 min-h-0', editorPeekOpen && 'hidden')}
          headerLayout="horizontal"
          showOrb
        />

        <EditorPeek
          open={editorPeekOpen}
          onOpenChange={onEditorPeekOpenChange}
          sectionTitle={sectionTitle}
          text={sectionText}
          onTextChange={onSectionTextChange}
          biographyId={biographyId}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          isPublished={isPublished}
          aiEnabled={aiEnabled}
          aiUsageRefresh={aiUsageRefresh}
          aiLoading={aiLoading}
          onGrammarCheck={onGrammarCheck}
          onGuidedPrompts={onGuidedPrompts}
          onSummarize={onSummarize}
          onReviewWithAi={onReviewWithAi}
          onApertusReview={onApertusReview}
          onMarkComplete={onMarkComplete}
          isCompleted={isCompleted}
        />
      </div>
    </div>
  );
}
