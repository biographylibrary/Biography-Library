'use client';

import { useEffect, useState } from 'react';
import { OPEN_ECHO_PANEL_EVENT } from '@/lib/onboarding/tour-mobile';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EchoChat } from './EchoChat';
import { EditorPeek } from './EditorPeek';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { BIOGRAPHY_SECTIONS } from '@/lib/editor-constants';
import { Button } from '@/components/ui/button';
import { CircleCheck as CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconHint } from '@/components/ui/icon-hint';

interface GuidedSectionWorkspaceProps {
  biographyId: string;
  activeSection: string;
  sectionText: string;
  onSectionTextChange: (html: string) => void;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  isPublished?: boolean;
  aiEnabled?: boolean;
  aiUsageRefresh?: number;
  aiLoading?: boolean;
  onGrammarCheck?: () => void;
  onReviewWithAi?: () => void;
  onApertusReview?: () => void;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  /** One sheet: no preset section title above the text. */
  documentMode?: boolean;
  highlightChange?: { id: number; text: string } | null;
  undoLastChange?: { label: string; hint: string; onUndo: () => void };
}

export function GuidedSectionWorkspace({
  biographyId,
  activeSection,
  sectionText,
  onSectionTextChange,
  editorFontSize,
  onEditorFontSizeChange,
  isPublished,
  aiEnabled,
  aiUsageRefresh,
  aiLoading,
  onGrammarCheck,
  onReviewWithAi,
  onApertusReview,
  onMarkComplete,
  isCompleted = false,
  documentMode = false,
  highlightChange,
  undoLastChange,
}: GuidedSectionWorkspaceProps) {
  const { t } = useTranslation();
  const [echoOpen, setEchoOpen] = useState(true);

  useEffect(() => {
    const open = () => setEchoOpen(true);
    window.addEventListener(OPEN_ECHO_PANEL_EVENT, open);
    return () => window.removeEventListener(OPEN_ECHO_PANEL_EVENT, open);
  }, []);

  const sectionTitle =
    t.sectionTitles[activeSection as keyof typeof t.sectionTitles] ||
    BIOGRAPHY_SECTIONS.find((s) => s.key === activeSection)?.title ||
    activeSection;

  const echoBar = (
    <button
      type="button"
      className="h-8 shrink-0 w-full flex items-center justify-between gap-2 px-3 bg-black text-white text-sm"
      aria-expanded={echoOpen}
      onClick={() => setEchoOpen((open) => !open)}
    >
      <span className="truncate text-left">{t.echo.assistantBar}</span>
      {echoOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronUp className="h-4 w-4 shrink-0" />}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {!documentMode && (
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
        {!isPublished && onMarkComplete && (
            <IconHint
              label={isCompleted ? t.status.markIncomplete : t.status.markComplete}
              maxWidth={639}
            >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1 shrink-0 text-xs px-2.5 border bg-transparent',
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
            </IconHint>
          )}
      </div>
      )}

      <div
        data-tour-id="edit-section-btn"
        className="flex-1 min-h-0 overflow-hidden"
      >
        <EditorPeek
          text={sectionText}
          onTextChange={onSectionTextChange}
          biographyId={biographyId}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          isPublished={isPublished}
          aiEnabled={aiEnabled}
          aiLoading={aiLoading}
          onGrammarCheck={onGrammarCheck}
          onReviewWithAi={onReviewWithAi}
          onApertusReview={onApertusReview}
          aiUsageRefresh={aiUsageRefresh}
          highlightChange={highlightChange}
          undoLastChange={undoLastChange}
        />
      </div>

      <div
        data-tour-id="echo-panel"
        className={cn(
          'shrink-0 flex flex-col',
          echoOpen && 'h-[min(42vh,340px)] min-h-[220px] lg:h-[min(52vh,640px)] lg:min-h-[360px]'
        )}
      >
        {echoBar}
        <EchoChat
          className={cn('min-h-0', echoOpen ? 'flex-1' : 'hidden')}
          headerLayout="horizontal"
          showOrb
          fontSize={editorFontSize ?? 15}
        />
      </div>
    </div>
  );
}
