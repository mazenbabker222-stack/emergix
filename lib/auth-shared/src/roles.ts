/** Role hierarchy, lowest to highest privilege. Shared by the API and the web app. */
export const ROLES = ['learner', 'instructor', 'editor', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

/** Roles allowed to enter the admin area (what they may do there is decided by permissions). */
export const STAFF_ROLES: readonly Role[] = ['instructor', 'editor', 'admin', 'superadmin'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Unknown or missing roles are treated as the least privileged role. */
export function normaliseRole(value: unknown): Role {
  return isRole(value) ? value : 'learner';
}

export function hasRole(role: unknown, allowed: readonly Role[]): boolean {
  return isRole(role) && allowed.includes(role);
}
