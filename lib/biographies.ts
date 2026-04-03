import { supabase } from './supabase';
import type { BiographyPublicationStatus } from './publication-state';

export type { BiographyPublicationStatus } from './publication-state';

export interface Biography {
  id: string;
  user_id: string;
  title: string;
  author_name: string;
  content: Record<string, unknown>;
  visibility: 'private' | 'link-only' | 'public';
  status: BiographyPublicationStatus;
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
  ai_screening_status?: 'pending' | 'passed' | 'flagged' | 'parse_error' | 'ai_error';
  pdf_draft_iteration?: number | null;
  pdf_draft_started_at?: string | null;
  final_pdf_approved_at?: string | null;
  final_pdf_url?: string | null;
  listing_cover_url?: string | null;
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
  /** Raster of PDF page 1 for catalogue cards; falls back to cover photo when null */
  listing_cover_url?: string | null;
}

const PUBLISHED_SELECT =
  'id, title, author_name, content_language, biography_type, chapters_count, published_at, view_count, is_featured, featured_at, slug, listing_cover_url';

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

export async function resolveAuthorName(userId: string, userEmail?: string | null): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.name?.trim()) return profile.name.trim();
  if (userEmail?.trim()) return userEmail.split('@')[0].trim();
  return '';
}

export async function createBiography(
  userId: string,
  title: string,
  visibility: 'private' | 'link-only' | 'public',
  biographyMode: 'sections' | 'freeflow' = 'sections',
  authorName?: string
) {
  const resolvedAuthor = authorName?.trim() || await resolveAuthorName(userId);

  const { data, error } = await supabase
    .from('biographies')
    .insert({
      user_id: userId,
      title,
      visibility,
      status: 'draft',
      content: {},
      biography_mode: biographyMode,
      author_name: resolvedAuthor,
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
