'use client';

import { useEffect, useState } from 'react';
import { StickyNote, ChevronRight } from 'lucide-react';
import {
  BIOGRAPHY_SECTIONS,
  type BiographyContent,
} from '@/lib/editor-constants';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';

interface NotesOverviewPanelProps {
  biographyId: string;
  onSectionChange: (key: string) => void;
}

interface SectionWithNotes {
  sectionKey: string;
  sectionTitle: string;
  notesCount: number;
}

export function NotesOverviewPanel({ biographyId, onSectionChange }: NotesOverviewPanelProps) {
  const { t } = useTranslation();
  const [sectionsWithNotes, setSectionsWithNotes] = useState<SectionWithNotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotesCounts = async () => {
      setLoading(true);
      const sections: SectionWithNotes[] = [];

      for (const section of BIOGRAPHY_SECTIONS) {
        const { data, error } = await supabase
          .from('section_notes')
          .select('id', { count: 'exact' })
          .eq('biography_id', biographyId)
          .eq('section_key', section.key)
          .eq('is_completed', false);

        if (!error && data && data.length > 0) {
          const sectionTitle = t.sectionTitles[section.key as keyof typeof t.sectionTitles] || section.title;
          sections.push({
            sectionKey: section.key,
            sectionTitle,
            notesCount: data.length,
          });
        }
      }

      setSectionsWithNotes(sections);
      setLoading(false);
    };

    fetchNotesCounts();
  }, [biographyId, t]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Loading notes...</p>
      </div>
    );
  }

  if (sectionsWithNotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No notes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sectionsWithNotes.map((section) => (
        <button
          key={section.sectionKey}
          onClick={() => onSectionChange(section.sectionKey)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-left hover:bg-primary/10 transition-colors border border-border/50 hover:border-primary/50"
        >
          <StickyNote className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 font-medium">{section.sectionTitle}</span>
          <span className="text-xs bg-primary/20 text-foreground rounded-full px-2 py-0.5">
            {section.notesCount}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      ))}
    </div>
  );
}
