import { ROLES, isRole, type Role } from './roles';

/**
 * THE central permission matrix: one place that says which role may do what.
 * Routes and UI guards ask `hasPermission`; they never compare role names ad hoc.
 * Add a permission here before using it anywhere else.
 */
export const PERMISSION_MATRIX = {
  'account:manage-own': ROLES,
  'admin:access': ['instructor', 'editor', 'admin', 'superadmin'],
  'content:read-drafts': ['instructor', 'editor', 'admin', 'superadmin'],
  'content:write': ['instructor', 'editor', 'admin', 'superadmin'],
  'content:publish': ['editor', 'admin', 'superadmin'],
  'users:read': ['admin', 'superadmin'],
  'users:set-role': ['superadmin'],
  'billing:manage': ['admin', 'superadmin'],
  'audit:read': ['admin', 'superadmin'],
  'system:manage': ['superadmin'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSION_MATRIX;

export function hasPermission(role: unknown, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return (PERMISSION_MATRIX[permission] as readonly Role[]).includes(role);
}

export function permissionsFor(role: unknown): Permission[] {
  return (Object.keys(PERMISSION_MATRIX) as Permission[]).filter((p) => hasPermission(role, p));
}
