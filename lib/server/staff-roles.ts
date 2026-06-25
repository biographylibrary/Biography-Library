import type { UserRole } from '@/lib/auth-context';

export const PLATFORM_STAFF_ROLES = ['reviewer', 'admin', 'super_admin'] as const;

export type PlatformStaffRole = (typeof PLATFORM_STAFF_ROLES)[number];

export function isPlatformStaffRole(role: UserRole | null | undefined): role is PlatformStaffRole {
  return role != null && (PLATFORM_STAFF_ROLES as readonly string[]).includes(role);
}
