/** Single source of truth for platform staff roles (middleware, waitlist, APIs). */

export const PLATFORM_STAFF_ROLES = ['reviewer', 'admin', 'super_admin'] as const;

export type PlatformStaffRole = (typeof PLATFORM_STAFF_ROLES)[number];

export const STAFF_ROLES: ReadonlySet<string> = new Set(PLATFORM_STAFF_ROLES);

export function isPlatformStaffRole(
  role: string | null | undefined
): role is PlatformStaffRole {
  return role != null && STAFF_ROLES.has(role);
}
