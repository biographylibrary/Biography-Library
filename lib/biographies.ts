import { supabase } from './supabase';

export interface Biography {
  id: string;
  user_id: string;
  title: string;
  author_name: string;
  content: Record<string, unknown>;
  visibility: 'private' | 'link-only' | 'public';
  status: 'draft' | 'sections_complete' | 'final_version' | 'under_review' | 'published' | 'removed';
  share_token: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  final_version?: string;
  narrative_order?: string[];
  published_at?: string | null;
  is_frozen?: boolean;
  frozen_at?: string | null;
  frozen_reason?: string | null;
  content_language?: string;
  chapters_count?: number;
  biography_mode?: 'sections' | 'freeflow';
  biography_type: 'autobiography' | 'memorial';
  slug: string | null;
  ai_screening_status?: 'pending' | 'passed' | 'flagged' | 'parse_error';
}

export interface PublishedBiography {
  id: string;
  title: string;
  author_name: string;
  content_language: string;
  biography_type: 'autobiography' | 'memorial';
  chapters_count: number;
  published_at: string | null;
  view_count?: number;
  is_featured?: boolean;
  featured_at?: string | null;
  slug: string | null;
}

const PUBLISHED_SELECT = 'id, title, author_name, content_language, biography_type, chapters_count, published_at, view_count, is_featured, featured_at, slug';

export async function fetchPublishedBiographies() {
  const { data, error } = await supabase
    .from('biographies')
    .select(PUBLISHED_SELECT)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false });

  return {
    data: data as PublishedBiography[] | null,
    error: error?.message ?? null,
  };
}

export async function fetchFeaturedBiographies() {
  const { data, error } = await supabase
    .from('biographies')
    .select(PUBLISHED_SELECT)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .eq('is_featured', true)
    .order('featured_at', { ascending: false })
    .limit(6);

  return {
    data: data as PublishedBiography[] | null,
    error: error?.message ?? null,
  };
}

export async function fetchMostReadBiographies() {
  const { data, error } = await supabase
    .from('biographies')
    .select(PUBLISHED_SELECT)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('view_count', { ascending: false })
    .limit(10);

  return {
    data: data as PublishedBiography[] | null,
    error: error?.message ?? null,
  };
}

export async function fetchDiscoverBiographies(excludeIds: string[]) {
  let query = supabase
    .from('biographies')
    .select(PUBLISHED_SELECT)
    .eq('status', 'published')
    .eq('visibility', 'public');

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query.limit(50);

  if (error || !data) {
    return { data: null, error: error?.message ?? null };
  }

  const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 10);
  return { data: shuffled as PublishedBiography[], error: null };
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
  visibility: 'private' | 'link-only' | 'public'
) {
  const { data, error } = await supabase
    .from('biographies')
    .insert({
      user_id: userId,
      title,
      visibility,
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
