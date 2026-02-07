'use client';

import { Flag, ChevronRight } from 'lucide-react';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
  getSectionData,
} from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface TodoPanelProps {
  content: BiographyContent;
  onSectionChange: (key: string) => void;
}

export function TodoPanel({ content, onSectionChange }: TodoPanelProps) {
  const { t } = useTranslation();

  const todoSections = BIOGRAPHY_SECTIONS.filter(
    (section) => getSectionData(content, section.key).todo
  );

  if (todoSections.length === 0) return null;

  return (
    <div className="border-t border-border/50 bg-amber-500/5">
      <div className="px-4 sm:px-6 py-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Flag className="h-4 w-4" />
          {t.editor.todoItems} ({todoSections.length})
        </h3>
      </div>
      <div className="px-2 pb-2">
        {todoSections.map((section) => {
          const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;
          return (
            <button
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-amber-500/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="truncate flex-1">{sectionTitle}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
