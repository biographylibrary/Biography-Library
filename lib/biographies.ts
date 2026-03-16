import { supabase } from './supabase';

export interface Biography {
  id: string;
  user_id: string;
  title: string;
  author_name: string;
  content: Record<string, unknown>;
  privacy: 'private' | 'family' | 'public';
  status: 'draft' | 'completed' | 'sections_complete' | 'final_version' | 'published';
  share_token: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  final_version?: string;
  narrative_order?: string[];
  published_at?: string | null;
  is_locked?: boolean;
}

export async function fetchBiographies(userId: string) {
  const { data, error } = await supabase
    .from('biographies')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  return {
    data: data as Biography[] | null,
    error: error?.message ?? null,
  };
}

export async function createBiography(
  userId: string,
  title: string,
  privacy: 'private' | 'family' | 'public'
) {
  const { data, error } = await supabase
    .from('biographies')
    .insert({
      user_id: userId,
      title,
      privacy,
      status: 'draft',
      content: {},
    })
    .select()
    .maybeSingle();

  return {
    data: data as Biography | null,
    error: error?.message ?? null,
  };
}

export async function deleteBiography(id: string) {
  const { error } = await supabase
    .from('biographies')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
