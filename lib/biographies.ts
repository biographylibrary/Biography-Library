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
  is_frozen?: boolean;
  frozen_at?: string | null;
  frozen_reason?: string | null;
  content_language?: string;
  chapters_count?: number;
}

export interface PublishedBiography {
  id: string;
  title: string;
  author_name: string;
  content_language: string;
  frozen_reason: string | null;
  chapters_count: number;
  published_at: string | null;
}

export async function fetchPublishedBiographies() {
  const { data, error } = await supabase
    .from('biographies')
    .select('id, title, author_name, content_language, frozen_reason, chapters_count, published_at')
    .eq('status', 'published')
    .eq('privacy', 'public')
    .order('published_at', { ascending: false });

  return {
    data: data as PublishedBiography[] | null,
    error: error?.message ?? null,
  };
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

export async function deleteBiography(id: string, userId: string) {
  const storagePath = `${userId}/${id}`;
  const { data: files } = await supabase.storage
    .from('biography-photos')
    .list(storagePath);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${storagePath}/${f.name}`);
    await supabase.storage.from('biography-photos').remove(paths);
  }

  const { error } = await supabase
    .from('biographies')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
