'use client';

import { useState } from 'react';
import { Check, Circle, Flag, ChevronRight, StickyNote, Images, Upload, Download } from 'lucide-react';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getSectionData,
} from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { BookStructurePanel } from './BookStructurePanel';
import { FreeflowImportModal } from './FreeflowImportModal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  biographyMode: 'sections' | 'freeflow';
  contentFreeflow: string;
  onModeChange: (mode: 'sections' | 'freeflow') => void;
  onFreeflowChange: (value: string) => void;
  biographyId?: string;
  userId?: string;
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
  biographyMode,
  contentFreeflow,
  onModeChange,
  onFreeflowChange,
  biographyId,
  userId,
}: SectionSidebarProps) {
  const { t } = useTranslation();
  const [showFreeflowImport, setShowFreeflowImport] = useState(false);

  const totalCount = globalNotesCount + globalTodosCount;
  const isFreeflow = biographyMode === 'freeflow';

  return (
    <nav className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-border/60 text-xs font-medium">
          <button
            onClick={() => onModeChange('sections')}
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
            onClick={() => onModeChange('freeflow')}
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

            {contentFreeflow.trim().length > 0 && (
              <div className="border-t border-border/50 mt-1">
                <button
                  onClick={() => onModeChange('freeflow')}
                  className="w-full flex items-center px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <span className="font-medium">{t.editor.freeFlowReadOnly}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {isFreeflow && biographyId && (
          <div className="border-b border-border/50 px-3 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t.editor.bookStructureMainText}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => setShowFreeflowImport(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {t.editor.bookStructureImportText}
            </Button>
          </div>
        )}

        {biographyId && userId && (
          <BookStructurePanel biographyId={biographyId} userId={userId} />
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

      {biographyId && (
        <FreeflowImportModal
          open={showFreeflowImport}
          onOpenChange={setShowFreeflowImport}
          currentContent={contentFreeflow}
          onImport={(text) => {
            onFreeflowChange(text);
          }}
        />
      )}
    </nav>
  );
}
