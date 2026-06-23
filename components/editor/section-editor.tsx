'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from './rich-text-editor';
import { VoiceRecorder } from './voice-recorder';
import { ImportTextDialog } from './import-text-dialog';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { Sparkles, Flag, Mic, SpellCheck, MessageSquareText, FileText, Power, Wand as Wand2, CircleCheck as CheckCircle2, Lock, Landmark, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onGuidedPrompts: () => void;
  onSummarize: () => void;
  onReviewWithAi?: () => void;
  onApertusReview?: () => void;
  aiLoading: boolean;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  onImportMultipleSections?: (sections: Array<{ title: string; content: string }>) => void;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  onTogglePhotos?: () => void;
  onToggleNotes?: () => void;
  openImportDialog?: boolean;
  onImportDialogOpenChange?: (open: boolean) => void;
  isPublished?: boolean;
  contentFreeflow?: string;
  onImportedToSection?: (sectionKey: string, newContent: string) => void;
  onImportedToFreeflow?: (newContent: string) => void;
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
  onGuidedPrompts,
  onSummarize,
  onReviewWithAi,
  onApertusReview,
  aiLoading,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  onImportMultipleSections,
  onMarkComplete,
  isCompleted = false,
  onTogglePhotos,
  onToggleNotes,
  openImportDialog,
  onImportDialogOpenChange,
  isPublished = false,
  contentFreeflow = '',
  onImportedToSection,
  onImportedToFreeflow,
  titleOverride,
  biographyMode = 'sections',
  echoToolbar = false,
}: SectionEditorProps) {
  const [showVoice, setShowVoice] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    if (openImportDialog !== undefined) setShowImportDialog(openImportDialog);
  }, [openImportDialog]);
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  <span>{t.echo.aiToolsMenu}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  disabled={aiLoading || !data.text.trim()}
                  onClick={onGrammarCheck}
                >
                  <SpellCheck className="h-3.5 w-3.5 mr-2" />
                  {t.editor.checkGrammar}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={aiLoading} onClick={onGuidedPrompts}>
                  <MessageSquareText className="h-3.5 w-3.5 mr-2" />
                  {t.editor.needHelp}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={aiLoading || !data.text.trim()}
                  onClick={onSummarize}
                >
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  {t.editor.summarize}
                </DropdownMenuItem>
                {onReviewWithAi && (
                  <DropdownMenuItem
                    disabled={aiLoading || !data.text.trim()}
                    onClick={onReviewWithAi}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-2" />
                    {t.aiReview.reviewButton}
                  </DropdownMenuItem>
                )}
                {onApertusReview && (
                  <DropdownMenuItem
                    disabled={aiLoading || !data.text.trim()}
                    onClick={onApertusReview}
                  >
                    <Landmark className="h-3.5 w-3.5 mr-2" />
                    {t.aiReview.apertusButton}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
              variant={isCompleted ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-1 text-xs h-7 px-2 ml-auto',
                isCompleted && 'bg-primary hover:bg-primary/90'
              )}
              onClick={onMarkComplete}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isCompleted ? 'Completed' : t.status.markComplete}
              </span>
            </Button>
          )}
        </div>
      </div>

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

      <RichTextEditor
        content={data.text}
        onChange={onTextChange}
        placeholder={`${t.editor.startWritingAbout} ${sectionTitle.toLowerCase()}...`}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
        isPublished={isPublished}
      />

      {biographyId && (
        <ImportTextDialog
          open={showImportDialog}
          onOpenChange={(v) => { setShowImportDialog(v); onImportDialogOpenChange?.(v); }}
          biographyId={biographyId}
          currentSectionKey={sectionKey}
          currentSectionContent={data.text}
          currentFreeflowContent={contentFreeflow}
          biographyMode={biographyMode}
          onImportedToSection={(key, content) => {
            if (key === sectionKey) onTextChange(content);
            onImportedToSection?.(key, content);
          }}
          onImportedToFreeflow={(content) => {
            onImportedToFreeflow?.(content);
          }}
          onImportMultipleSections={onImportMultipleSections}
        />
      )}

    </div>
  );
}
