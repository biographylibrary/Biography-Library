import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnyClient } from '@/lib/server/review-submit-pipeline';

export type BiographyViewAccessType = 'public' | 'share-token' | 'owner-staff';

export interface BiographyViewRow {
  id: string;
  user_id: string;
  title: string;
  author_name: string;
  subject_name?: string | null;
  biography_type?: string | null;
  content: Record<string, { text?: string }>;
  content_freeflow?: string | null;
  content_language: string;
  biography_mode?: string | null;
  visibility: string;
  status: string;
  share_token?: string | null;
  final_pdf_url?: string | null;
}

export type BiographyViewAccessResult =
  | { ok: true; biography: BiographyViewRow; accessType: BiographyViewAccessType }
  | { ok: false; status: 403 | 404 };

const BIO_ACCESS_SELECT =
  'id, user_id, title, author_name, subject_name, biography_type, content, content_freeflow, content_language, biography_mode, visibility, status, share_token, final_pdf_url';

async function isStaffUser(
  serviceClient: AnyClient,
  userId: string
): Promise<boolean> {
  const { data } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === 'reviewer' || role === 'admin' || role === 'super_admin';
}

export async function verifyBiographyViewAccess(
  serviceClient: AnyClient,
  biographyId: string,
  options: { shareToken?: string | null; userId?: string | null }
): Promise<BiographyViewAccessResult> {
  const shareToken = options.shareToken?.trim() || null;
  const userId = options.userId ?? null;

  if (shareToken) {
    const { data: rows, error } = await serviceClient.rpc('get_biography_by_share_token', {
      p_biography_id: biographyId,
      p_token: shareToken,
    });
    if (error || !rows?.length) {
      return { ok: false, status: 403 };
    }
    const row = rows[0] as BiographyViewRow;
    const { data: full } = await serviceClient
      .from('biographies')
      .select(BIO_ACCESS_SELECT)
      .eq('id', biographyId)
      .maybeSingle();
    if (!full) return { ok: false, status: 404 };
    return {
      ok: true,
      biography: full as BiographyViewRow,
      accessType: 'share-token',
    };
  }

  const { data: bio, error } = await serviceClient
    .from('biographies')
    .select(BIO_ACCESS_SELECT)
    .eq('id', biographyId)
    .maybeSingle();

  if (error || !bio) {
    return { ok: false, status: 404 };
  }

  const row = bio as BiographyViewRow;

  if (row.visibility === 'public' && row.status === 'published') {
    return { ok: true, biography: row, accessType: 'public' };
  }

  if (userId) {
    if (row.user_id === userId) {
      return { ok: true, biography: row, accessType: 'owner-staff' };
    }
    if (await isStaffUser(serviceClient, userId)) {
      return { ok: true, biography: row, accessType: 'owner-staff' };
    }
  }

  return { ok: false, status: 403 };
}

export async function resolveBiographyId(
  client: SupabaseClient,
  idOrSlug: string
): Promise<string | null> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(idOrSlug)) return idOrSlug;
  const { data } = await client
    .from('biographies')
    .select('id')
    .eq('slug', idOrSlug)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}
