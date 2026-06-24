'use client';

import { Check, Circle, Flag, ChevronRight, StickyNote, Images, Upload, Download, Lock, BookOpen, FileCheck, RotateCcw, CircleCheck } from 'lucide-react';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getSectionData,
} from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionSidebarProps {
  content: BiographyContent;
  activeSection: string;
  onSectionChange: (key: string) => void;
  globalNotesCount: number;
  globalTodosCount: number;
  onToggleNotesPanel: () => void;
  onTogglePhotosPanel: () => void;
  onToggleBookStructurePanel: () => void;
  onToggleImportText: () => void;
  onToggleExportText: () => void;
  onToggleReviewPublication: () => void;
  /** When true, export control is disabled (e.g. biography under review). */
  exportDisabled?: boolean;
  showNotesPanel: boolean;
  showPhotosPanel: boolean;
  showBookStructurePanel: boolean;
  showImportDialog: boolean;
  showReviewPublicationDialog?: boolean;
  completedSections?: string[];
  onMarkSectionComplete?: (sectionKey: string) => void;
  onMarkSectionIncomplete?: (sectionKey: string) => void;
  biographyMode: 'sections' | 'freeflow';
  contentFreeflow: string;
  onModeChange: (mode: 'sections' | 'freeflow') => void;
  onModeChangeRequest?: (mode: 'sections' | 'freeflow') => void;
  onFreeflowChange: (value: string) => void;
  biographyId?: string;
  userId?: string;
  lockedSectionKeys?: Set<string>;
}

export function SectionSidebar({
  content,
  activeSection,
  onSectionChange,
  globalNotesCount,
  globalTodosCount,
  onToggleNotesPanel,
  onTogglePhotosPanel,
  onToggleBookStructurePanel,
  onToggleImportText,
  onToggleExportText,
  onToggleReviewPublication,
  exportDisabled = false,
  showNotesPanel,
  showPhotosPanel,
  showBookStructurePanel,
  showImportDialog,
  showReviewPublicationDialog = false,
  completedSections = [],
  onMarkSectionComplete,
  onMarkSectionIncomplete,
  biographyMode,
  contentFreeflow,
  onModeChange,
  onModeChangeRequest,
  onFreeflowChange,
  biographyId,
  userId,
  lockedSectionKeys,
}: SectionSidebarProps) {
  const { t } = useTranslation();

  const totalCount = globalNotesCount + globalTodosCount;
  const isFreeflow = biographyMode === 'freeflow';
  const handleModeClick = (mode: 'sections' | 'freeflow') => {
    if (mode === biographyMode) return;
    if (onModeChangeRequest) {
      onModeChangeRequest(mode);
    } else {
      onModeChange(mode);
    }
  };

  return (
    <nav className="flex flex-col h-full overflow-hidden">
      <div className="px-3 h-12 shrink-0 flex items-center border-b border-border/50">
        <div className="flex w-full rounded-lg overflow-hidden border border-border/60 text-xs font-medium">
          <button
            onClick={() => handleModeClick('sections')}
            className={cn(
              'flex-1 py-1.5 px-2 transition-colors',
              biographyMode === 'sections'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {t.editor.sectionsTab}
          </button>
          <button
            onClick={() => handleModeClick('freeflow')}
            className={cn(
              'flex-1 py-1.5 px-2 transition-colors border-l border-border/60',
              biographyMode === 'freeflow'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {t.editor.freeFlowTab}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {!isFreeflow && (
          <div className="py-1">
            {BIOGRAPHY_SECTIONS.map((section) => {
              const data = getSectionData(content, section.key);
              const isActive = activeSection === section.key;
              const hasContent = data.text.trim().length > 0;
              const isTodo = data.todo;
              const isCompleted = completedSections.includes(section.key);
              const isLockedByRevision = lockedSectionKeys?.has(section.key) === false && (lockedSectionKeys?.size ?? 0) > 0;
              const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;

              return (
                <button
                  key={section.key}
                  onClick={() => onSectionChange(section.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 lg:py-2.5 text-left text-sm transition-colors',
                    isCompleted
                      ? 'bg-[#C4DAEB] dark:bg-[#C4DAEB]/20 text-[#121212] dark:text-[#121212]'
                      : isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    isLockedByRevision && 'opacity-50'
                  )}
                  style={!isFreeflow ? {
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontWeight: 400,
                    fontSize: '1.0625rem',
                    lineHeight: '1.2',
                    fontSynthesis: 'none',
                  } : undefined}
                >
                  <span className="shrink-0">
                    {isLockedByRevision ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : isCompleted ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : isTodo ? (
                      <Flag className="h-3.5 w-3.5 text-text-primary dark:text-dark-text-primary" />
                    ) : hasContent ? (
                      <Check className="h-3.5 w-3.5 text-text-primary dark:text-dark-text-primary" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="truncate flex-1">{sectionTitle}</span>
                  {!isCompleted && onMarkSectionComplete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkSectionComplete(section.key);
                      }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                      title={t.status.markCompleteWhenFinished}
                      aria-label={t.status.markComplete}
                    >
                      <CircleCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isCompleted && onMarkSectionIncomplete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkSectionIncomplete(section.key);
                      }}
                      className="shrink-0 rounded p-0.5 text-primary hover:bg-primary/15"
                      title={t.status.markIncomplete}
                      aria-label={t.status.markIncomplete}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  )}
                </button>
              );
            })}

          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border/50 p-1.5 space-y-0.5 shrink-0">
        <button
          onClick={onToggleNotesPanel}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showNotesPanel
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <StickyNote className="h-4 w-4 shrink-0" />
          <span className="truncate">{t.notesAndTodos.notesAndTodosMenuItem}</span>
          {totalCount > 0 && (
            <span className="ml-auto text-xs font-medium bg-primary/20 text-foreground rounded-full px-2 py-0.5 shrink-0">
              {totalCount}
            </span>
          )}
        </button>
        <button
          onClick={onTogglePhotosPanel}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showPhotosPanel
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Images className="h-4 w-4 shrink-0" />
          <span>{t.photos.panelTitle}</span>
        </button>
        {biographyId && userId && (
          <button
            type="button"
            data-tour-id="book-structure-btn"
            onClick={onToggleBookStructurePanel}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
              showBookStructurePanel
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>{t.editor.bookStructureTitle}</span>
          </button>
        )}
        <button
          type="button"
          data-tour-id="import-btn"
          onClick={onToggleImportText}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showImportDialog
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span>{t.notesAndTodos.importText}</span>
        </button>
        <button
          type="button"
          data-tour-id="export-pdf-btn"
          onClick={onToggleExportText}
          disabled={exportDisabled}
          title={
            exportDisabled
              ? 'Export is unavailable while the biography is under review.'
              : undefined
          }
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            exportDisabled
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>{t.notesAndTodos.exportText}</span>
        </button>
        <button
          type="button"
          data-tour-id="review-publication-btn"
          onClick={onToggleReviewPublication}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors',
            showReviewPublicationDialog
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
        >
          <FileCheck className="h-4 w-4 shrink-0" />
          <span>{t.editor.reviewPublication.menuItem}</span>
        </button>
      </div>

    </nav>
  );
}
