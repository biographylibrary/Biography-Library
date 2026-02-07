'use client';

import { Check, Circle, Flag, ChevronRight, ListTodo } from 'lucide-react';
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
  todoCount: number;
  onToggleTodoPanel: () => void;
  showTodoPanel: boolean;
}

export function SectionSidebar({
  content,
  activeSection,
  onSectionChange,
  todoCount,
  onToggleTodoPanel,
  showTodoPanel,
}: SectionSidebarProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t.biography.sections}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {BIOGRAPHY_SECTIONS.map((section) => {
          const data = getSectionData(content, section.key);
          const isActive = activeSection === section.key;
          const hasContent = data.text.trim().length > 0;
          const isTodo = data.todo;
          const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;

          return (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <span className="shrink-0">
                {isTodo ? (
                  <Flag className="h-3.5 w-3.5 text-amber-500" />
                ) : hasContent ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
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

      {todoCount > 0 && (
        <div className="border-t border-border/50 p-2">
          <button
            onClick={onToggleTodoPanel}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              showTodoPanel
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <ListTodo className="h-4 w-4" />
            <span>{t.editor.todoItems}</span>
            <span className="ml-auto text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5">
              {todoCount}
            </span>
          </button>
        </div>
      )}
    </nav>
  );
}
