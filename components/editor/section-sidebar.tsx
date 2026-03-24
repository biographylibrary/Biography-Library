'use client';

import { Check, Circle, Flag, ChevronRight, StickyNote, Images, Upload, Download } from 'lucide-react';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getSectionData,
} from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';

interface SectionSidebarProps {
  content: BiographyContent;
  activeSection: string;
  onSectionChange: (key: string) => void;
  globalNotesCount: number;
  globalTodosCount: number;
  onToggleNotesPanel: () => void;
  onTogglePhotosPanel: () => void;
  onToggleImportText: () => void;
  onToggleExportText: () => void;
  showNotesPanel: boolean;
  showPhotosPanel: boolean;
  completedSections?: string[];
}

export function SectionSidebar({
  content,
  activeSection,
  onSectionChange,
  globalNotesCount,
  globalTodosCount,
  onToggleNotesPanel,
  onTogglePhotosPanel,
  onToggleImportText,
  onToggleExportText,
  showNotesPanel,
  showPhotosPanel,
  completedSections = [],
}: SectionSidebarProps) {
  const { t } = useTranslation();

  const totalCount = globalNotesCount + globalTodosCount;

  return (
    <nav className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-3 border-b border-border/50 shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-none">
          {t.biography.sections}
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        {BIOGRAPHY_SECTIONS.map((section) => {
          const data = getSectionData(content, section.key);
          const isActive = activeSection === section.key;
          const hasContent = data.text.trim().length > 0;
          const isTodo = data.todo;
          const isCompleted = completedSections.includes(section.key);
          const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;

          return (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 lg:py-2.5 text-left text-sm transition-colors',
                isCompleted
                  ? 'bg-[#C8DFBE] dark:bg-[#C8DFBE]/20 font-bold text-foreground'
                  : isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <span className="shrink-0">
                {isTodo ? (
                  <Flag className="h-3.5 w-3.5 text-text-primary dark:text-dark-text-primary" />
                ) : hasContent ? (
                  <Check className="h-3.5 w-3.5 text-text-primary dark:text-dark-text-primary" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="truncate flex-1">{sectionTitle}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

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
        <button
          onClick={onToggleImportText}
          className="w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span>{t.notesAndTodos.importText}</span>
        </button>
        <button
          onClick={onToggleExportText}
          className="w-full flex items-center gap-2 px-3 py-1 lg:py-2 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>{t.notesAndTodos.exportText}</span>
        </button>
      </div>
    </nav>
  );
}
