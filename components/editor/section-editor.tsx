'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from './rich-text-editor';
import { VoiceRecorder } from './voice-recorder';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Sparkles, Mic, Power, CircleCheck as CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import { EditorAiToolsMenu } from './editor-ai-tools-menu';
import { BIOGRAPHY_SECTIONS, type SectionData } from '@/lib/editor-constants';
import { cn } from '@/lib/utils';

interface SectionEditorProps {
  sectionKey: string;
  data: SectionData;
  onTextChange: (text: string) => void;
  onTodoChange: (todo: boolean) => void;
  onAudioTranscriptChange: (transcript: string) => void;
  aiEnabled: boolean;
  onToggleAi: () => void;
  onGrammarCheck: () => void;
  onReviewWithAi?: () => void;
  onApertusReview?: () => void;
  aiLoading: boolean;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  onTogglePhotos?: () => void;
  onToggleNotes?: () => void;
  isPublished?: boolean;
  titleOverride?: string;
  biographyMode?: 'sections' | 'freeflow';
  echoToolbar?: boolean;
}

export function SectionEditor({
  sectionKey,
  data,
  onTextChange,
  onTodoChange,
  onAudioTranscriptChange,
  aiEnabled,
  onToggleAi,
  onGrammarCheck,
  onReviewWithAi,
  onApertusReview,
  aiLoading,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  onMarkComplete,
  isCompleted = false,
  onTogglePhotos,
  onToggleNotes,
  isPublished = false,
  titleOverride,
  biographyMode = 'sections',
  echoToolbar = false,
}: SectionEditorProps) {
  const [showVoice, setShowVoice] = useState(false);
  const section = BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey);
  const { t } = useTranslation();

  const isFreeflow = sectionKey === 'freeflow';

  const sectionTitle = titleOverride || t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] || section?.title || '';

  const handleVoiceTranscript = (transcript: string) => {
    const sep =
      data.text && !data.text.endsWith('\n') && !data.text.endsWith(' ')
        ? ' '
        : '';
    onTextChange(data.text + sep + transcript);
    const audioSep =
      data.audioTranscript &&
      !data.audioTranscript.endsWith('\n') &&
      !data.audioTranscript.endsWith(' ')
        ? ' '
        : '';
    onAudioTranscriptChange(data.audioTranscript + audioSep + transcript);
  };

  const handleClearTranscript = () => {
    if (data.audioTranscript) {
      const cleaned = data.text.replace(data.audioTranscript, '').trim();
      onTextChange(cleaned);
      onAudioTranscriptChange('');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <div className="px-3 sm:px-6 py-3 border-b border-border/50 shrink-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-lg sm:text-xl font-medium leading-tight flex-1 min-w-0 break-words">
            {sectionTitle}
          </h2>
          {!isPublished && !isFreeflow && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0 rounded-full bg-[#A84B2F] hover:bg-[#6B2F1F] hover:text-[#FDFBF7] text-[#FDFBF7]"
              onClick={() => setShowVoice(!showVoice)}
              title={t.notesAndTodos.recordAudio}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {!isPublished && !isFreeflow && aiEnabled && (
            <EditorAiToolsMenu
              aiEnabled={aiEnabled}
              aiLoading={aiLoading}
              hasText={!!data.text.trim()}
              onGrammarCheck={onGrammarCheck}
              onReviewWithAi={onReviewWithAi}
              onApertusReview={onApertusReview}
              buttonClassName="h-7"
            />
          )}
          {!echoToolbar && !isPublished && !isFreeflow && (
            <Button
              variant={aiEnabled ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-1 text-xs h-7 px-2',
                aiEnabled && 'bg-primary hover:bg-primary/90'
              )}
              onClick={onToggleAi}
            >
              {aiEnabled ? <Sparkles className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">
                {aiEnabled ? t.editor.aiOn : t.editor.aiOff}
              </span>
            </Button>
          )}
          {!isPublished && onMarkComplete && !isFreeflow && (
            <Button
              variant={isCompleted ? 'outline' : 'default'}
              size="sm"
              className={cn(
                'gap-1 text-xs h-7 px-2 ml-auto',
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
        </div>
      </div>

      {!isPublished && isCompleted && !isFreeflow && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
          <p>{t.status.sectionCompletedHint}</p>
        </div>
      )}

      {isPublished && (
        <div className="px-4 sm:px-6 py-2.5 border-b border-brand-mustardDark/40 bg-brand-mustardLight/45 dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 shrink-0 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-brand-mustardDark dark:text-brand-mustardLight shrink-0" />
          <p className="text-xs text-brand-ink/85 dark:text-brand-beigeLight/85 font-medium">
            {t.editor.publishedChapterNotice}
          </p>
        </div>
      )}

      {!isPublished && showVoice && (
        <div className="px-4 sm:px-6 py-3 border-b border-border/30 bg-muted/20 shrink-0">
          <VoiceRecorder
            onTranscript={handleVoiceTranscript}
            onClearTranscript={handleClearTranscript}
            audioTranscript={data.audioTranscript}
          />
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex flex-col">
        <RichTextEditor
          content={data.text}
          onChange={onTextChange}
          placeholder={`${t.editor.startWritingAbout} ${sectionTitle.toLowerCase()}...`}
          biographyId={biographyId}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={onEditorFontSizeChange}
          isPublished={isPublished}
        />
      </div>
    </div>
  );
}
