import { supabase } from './supabase';
import { looksLikeStoredHtml, storedToArchiveMarkdown, storedToSafeHtml } from '@/lib/archive-markdown';

export type SectionStatus = 'in_progress' | 'draft_1' | 'draft_2' | 'draft_3' | 'approved' | 'locked';

export interface RevisionHistoryEntry {
  version: number;
  timestamp: string;
  /** Archive Markdown when present; legacy HTML may remain until migration. */
  content?: string;
  ai_suggestions?: any[];
  user_action?: string;
  changeType?: string;
  description?: string;
  improvementsApplied?: number;
}

export interface SectionStatusData {
  biography_id: string;
  section_key: string;
  status: SectionStatus;
  draft_version: number;
  approved_at: string | null;
  revision_history: RevisionHistoryEntry[];
}

/** Read a history entry body for the editor (Markdown-safe HTML). */
export function revisionHistoryEntryToSafeHtml(entry: RevisionHistoryEntry): string {
  if (!entry.content) return '';
  return storedToSafeHtml(entry.content);
}

/** True when a history entry is still stored as HTML tags (pre-migration). */
export function revisionHistoryEntryLooksLikeHtml(entry: RevisionHistoryEntry): boolean {
  return !!entry.content && looksLikeStoredHtml(entry.content);
}

export async function getSectionStatus(
  biographyId: string,
  sectionKey: string
): Promise<SectionStatusData | null> {
  try {
    const { data, error } = await supabase
      .from('biography_sections')
      .select('*')
      .eq('biography_id', biographyId)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error loading section status:', error);
    return null;
  }
}

export async function updateSectionStatus(
  biographyId: string,
  sectionKey: string,
  updates: Partial<SectionStatusData>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('biography_sections')
      .upsert(
        {
          biography_id: biographyId,
          section_key: sectionKey,
          status: updates.status || 'in_progress',
          draft_version: updates.draft_version || 1,
          approved_at: updates.approved_at || null,
          revision_history: updates.revision_history || [],
          ...updates,
        },
        {
          onConflict: 'biography_id,section_key',
        }
      );

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating section status:', error);
    return false;
  }
}

export async function addRevisionToHistory(
  biographyId: string,
  sectionKey: string,
  revision: {
    version: number;
    content?: string;
    ai_suggestions?: any[];
    user_action?: string;
  }
): Promise<boolean> {
  try {
    const existing = await getSectionStatus(biographyId, sectionKey);
    if (!existing) return false;

    const entry: RevisionHistoryEntry = {
      ...revision,
      timestamp: new Date().toISOString(),
      ...(revision.content !== undefined
        ? { content: storedToArchiveMarkdown(revision.content) }
        : {}),
    };

    const newHistory = [...(existing.revision_history || []), entry];

    return await updateSectionStatus(biographyId, sectionKey, {
      revision_history: newHistory,
    });
  } catch (error) {
    console.error('Error adding revision:', error);
    return false;
  }
}
