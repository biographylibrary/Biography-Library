'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from './rich-text-editor';
import { VoiceRecorder } from './voice-recorder';
import { ImportTextDialog } from './import-text-dialog';
import { SectionNotes } from './SectionNotes';
import { useTranslation } from '@/lib/i18n/i18n-context';
import {
  Sparkles,
  Flag,
  Mic,
  SpellCheck,
  MessageSquareText,
  FileText,
  Power,
  Upload,
  StickyNote,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
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
  aiLoading: boolean;
  biographyId?: string;
  editorFontSize?: number;
  onEditorFontSizeChange?: (size: number) => void;
  onImportMultipleSections?: (sections: Array<{ title: string; content: string }>) => void;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
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
  aiLoading,
  biographyId,
  editorFontSize = 16,
  onEditorFontSizeChange,
  onImportMultipleSections,
  onMarkComplete,
  isCompleted = false,
}: SectionEditorProps) {
  const [showVoice, setShowVoice] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const section = BIOGRAPHY_SECTIONS.find((s) => s.key === sectionKey);
  const { t } = useTranslation();

  const sectionTitle = t.sectionTitles[sectionKey as keyof typeof t.sectionTitles] || section?.title || '';

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

  const handleImportText = (content: string, replace: boolean) => {
    if (replace) {
      onTextChange(content);
    } else {
      const separator = data.text && !data.text.endsWith('</p>') ? '<p></p>' : '';
      onTextChange(data.text + separator + content);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg font-semibold truncate">{sectionTitle}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0 rounded-full bg-[#A84B2F] hover:bg-[#6B2F1F] hover:text-[#FDFBF7] text-[#FDFBF7]"
            onClick={() => setShowVoice(!showVoice)}
            title="Registra audio"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => setShowImportDialog(true)}
            title="Importa testo"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={showNotes ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => setShowNotes(!showNotes)}
            title="Note e promemoria"
          >
            <StickyNote className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 ml-3 shrink-0 flex-wrap justify-end">
          {aiEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                disabled={aiLoading || !data.text.trim()}
                onClick={onGrammarCheck}
              >
                <SpellCheck className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.editor.checkGrammar}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                disabled={aiLoading}
                onClick={onGuidedPrompts}
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.editor.needHelp}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                disabled={aiLoading || !data.text.trim()}
                onClick={onSummarize}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.editor.summarize}</span>
              </Button>
              {onReviewWithAi && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  disabled={aiLoading || !data.text.trim()}
                  onClick={onReviewWithAi}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Review</span>
                </Button>
              )}
            </>
          )}
          <Button
            variant={aiEnabled ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'gap-1.5 text-xs h-8',
              aiEnabled && 'bg-primary hover:bg-primary/90'
            )}
            onClick={onToggleAi}
          >
            {aiEnabled ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {aiEnabled ? t.editor.aiOn : t.editor.aiOff}
            </span>
          </Button>
          {onMarkComplete && (
            <Button
              variant={isCompleted ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'gap-1.5 text-xs h-8',
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

      {showVoice && (
        <div className="px-4 sm:px-6 py-3 border-b border-border/30 bg-muted/20 shrink-0">
          <VoiceRecorder
            onTranscript={handleVoiceTranscript}
            onClearTranscript={handleClearTranscript}
            audioTranscript={data.audioTranscript}
          />
        </div>
      )}

      {showNotes && biographyId && (
        <div className="px-4 sm:px-6 py-3 border-b border-border/30 shrink-0">
          <SectionNotes biographyId={biographyId} sectionKey={sectionKey} />
        </div>
      )}

      <RichTextEditor
        content={data.text}
        onChange={onTextChange}
        placeholder={`${t.editor.startWritingAbout} ${sectionTitle.toLowerCase()}...`}
        biographyId={biographyId}
        editorFontSize={editorFontSize}
        onEditorFontSizeChange={onEditorFontSizeChange}
      />

      <ImportTextDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        sectionName={sectionTitle}
        onImport={handleImportText}
        onImportMultipleSections={onImportMultipleSections}
      />
    </div>
  );
}
