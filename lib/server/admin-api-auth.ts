import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildServiceClient } from '@/lib/server/review-submit-pipeline';

export type StaffRole = 'user' | 'reviewer' | 'admin' | 'super_admin';

export function buildUserClient(jwt: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  }) as SupabaseClient;
}

export function getBearerJwt(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
}

/** Returns caller user id and role, or null if not authenticated. */
export async function getCallerStaffContext(
  req: NextRequest
): Promise<{ userId: string; role: StaffRole } | null> {
  const jwt = getBearerJwt(req);
  if (!jwt) return null;

  const userClient = buildUserClient(jwt);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) return null;

  const service = buildServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = ((profile as { role?: string } | null)?.role ?? 'user') as StaffRole;
  return { userId: user.id, role };
}

/** Admin and super_admin may manage accounts; reviewers cannot. */
export function isAdminOrSuperAdmin(role: StaffRole): boolean {
  return role === 'admin' || role === 'super_admin';
}

/** Reviewer, admin, or super_admin — moderation panel access. */
export function isStaffModerator(role: StaffRole): boolean {
  return role === 'reviewer' || role === 'admin' || role === 'super_admin';
}

/**
 * Admins may only act on `user` and `reviewer`. Super admins may act on any account except their own.
 */
export function canManageTargetAccount(
  callerRole: StaffRole,
  callerId: string,
  targetRole: StaffRole,
  targetId: string
): boolean {
  if (callerId === targetId) return false;
  if (callerRole === 'super_admin') return true;
  if (callerRole === 'admin') {
    return targetRole === 'user' || targetRole === 'reviewer';
  }
  return false;
}
