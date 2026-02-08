import { supabase } from './supabase';

export interface SectionCompletion {
  id: string;
  biography_id: string;
  section_key: string;
  completed_at: string;
  user_id: string;
  created_at: string;
}

export async function markSectionComplete(
  userId: string,
  biographyId: string,
  sectionKey: string
): Promise<void> {
  const { error } = await supabase
    .from('section_completions')
    .upsert({
      user_id: userId,
      biography_id: biographyId,
      section_key: sectionKey,
      completed_at: new Date().toISOString(),
    }, {
      onConflict: 'biography_id,section_key'
    });

  if (error) {
    console.error('Error marking section complete:', error);
    throw error;
  }
}

export async function markSectionIncomplete(
  biographyId: string,
  sectionKey: string
): Promise<void> {
  const { error } = await supabase
    .from('section_completions')
    .delete()
    .eq('biography_id', biographyId)
    .eq('section_key', sectionKey);

  if (error) {
    console.error('Error marking section incomplete:', error);
    throw error;
  }
}

export async function getCompletedSections(
  biographyId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('section_completions')
    .select('section_key')
    .eq('biography_id', biographyId);

  if (error) {
    console.error('Error fetching completed sections:', error);
    return [];
  }

  return data?.map(d => d.section_key) || [];
}

export async function areAllSectionsComplete(
  biographyId: string,
  totalSections: string[]
): Promise<boolean> {
  const completedSections = await getCompletedSections(biographyId);
  return totalSections.every(section => completedSections.includes(section));
}
