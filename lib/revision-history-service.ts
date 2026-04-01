import { supabase } from './supabase';

export interface RevisionHistoryEntry {
  version: number;
  content: string;
  timestamp: string;
  changeType: 'ai_improvement' | 'ai_rewrite' | 'manual_edit';
  description?: string;
  improvementsApplied?: number;
}

export async function addRevisionToHistory(
  biographyId: string,
  sectionKey: string,
  content: string,
  changeType: RevisionHistoryEntry['changeType'],
  description?: string,
  improvementsApplied?: number
): Promise<void> {
  try {
    const { data: section, error: fetchError } = await supabase
      .from('biography_sections')
      .select('draft_version, revision_history')
      .eq('biography_id', biographyId)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentHistory = (section?.revision_history as RevisionHistoryEntry[]) || [];
    const newVersion = (section?.draft_version || 0) + 1;

    const newEntry: RevisionHistoryEntry = {
      version: newVersion,
      content,
      timestamp: new Date().toISOString(),
      changeType,
      description,
      improvementsApplied,
    };

    const updatedHistory = [...currentHistory, newEntry];

    if (section) {
      const { error: updateError } = await supabase
        .from('biography_sections')
        .update({
          draft_version: newVersion,
          revision_history: updatedHistory,
        })
        .eq('biography_id', biographyId)
        .eq('section_key', sectionKey);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('biography_sections')
        .insert({
          biography_id: biographyId,
          section_key: sectionKey,
          draft_version: newVersion,
          revision_history: updatedHistory,
          content: '',
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error adding revision to history:', error);
    throw error;
  }
}

export async function getRevisionHistory(
  biographyId: string,
  sectionKey: string
): Promise<RevisionHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('biography_sections')
      .select('revision_history')
      .eq('biography_id', biographyId)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (error) throw error;
    if (!data) return [];

    return (data.revision_history as RevisionHistoryEntry[]) || [];
  } catch (error) {
    console.error('Error fetching revision history:', error);
    return [];
  }
}

export async function restoreRevision(
  biographyId: string,
  sectionKey: string,
  version: number
): Promise<string | null> {
  try {
    const history = await getRevisionHistory(biographyId, sectionKey);
    const revision = history.find((r) => r.version === version);

    if (!revision) {
      throw new Error(`Revision version ${version} not found`);
    }

    const { error } = await supabase
      .from('biography_sections')
      .update({
        content: revision.content,
      })
      .eq('biography_id', biographyId)
      .eq('section_key', sectionKey);

    if (error) throw error;

    return revision.content;
  } catch (error) {
    console.error('Error restoring revision:', error);
    throw error;
  }
}

export async function getCurrentVersion(
  biographyId: string,
  sectionKey: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('biography_sections')
      .select('draft_version')
      .eq('biography_id', biographyId)
      .eq('section_key', sectionKey)
      .maybeSingle();

    if (error) throw error;
    if (!data) return 1;

    return data.draft_version || 1;
  } catch (error) {
    console.error('Error fetching current version:', error);
    return 1;
  }
}
