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

  if (todoSections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Flag className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No pending items</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todoSections.map((section) => {
        const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;
        return (
          <button
            key={section.key}
            onClick={() => onSectionChange(section.key)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-left hover:bg-status-warning/20 transition-colors border border-border/50 hover:border-status-warning/50"
          >
            <Flag className="h-4 w-4 text-status-warning shrink-0" />
            <span className="flex-1 font-medium">{sectionTitle}</span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        );
      })}
    </div>
  );
}
