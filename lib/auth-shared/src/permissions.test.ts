import { describe, expect, it } from 'vitest';
import { PERMISSION_MATRIX, hasPermission, permissionsFor } from './permissions';
import { ROLES, STAFF_ROLES, hasRole, isRole, normaliseRole } from './roles';

describe('roles', () => {
  it('validates and normalises roles', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('root')).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(normaliseRole('root')).toBe('learner');
    expect(normaliseRole(null)).toBe('learner');
    expect(hasRole('editor', ['admin', 'superadmin'])).toBe(false);
    expect(hasRole('admin', ['admin', 'superadmin'])).toBe(true);
  });

  it('never treats learner as staff', () => {
    expect(STAFF_ROLES).not.toContain('learner');
  });
});

describe('permission matrix', () => {
  it('denies everything to learners except managing their own account', () => {
    expect(permissionsFor('learner')).toEqual(['account:manage-own']);
    expect(hasPermission('learner', 'admin:access')).toBe(false);
  });

  it('denies unknown or missing roles', () => {
    expect(hasPermission(undefined, 'account:manage-own')).toBe(false);
    expect(hasPermission('hacker', 'admin:access')).toBe(false);
  });

  it('only superadmin can change roles or manage the system', () => {
    for (const role of ROLES) {
      expect(hasPermission(role, 'users:set-role')).toBe(role === 'superadmin');
      expect(hasPermission(role, 'system:manage')).toBe(role === 'superadmin');
    }
  });

  it('lets admins read users, billing and audit but not publish-only roles', () => {
    expect(hasPermission('admin', 'users:read')).toBe(true);
    expect(hasPermission('admin', 'audit:read')).toBe(true);
    expect(hasPermission('editor', 'users:read')).toBe(false);
    expect(hasPermission('instructor', 'content:publish')).toBe(false);
    expect(hasPermission('editor', 'content:publish')).toBe(true);
  });

  it('is monotonic: a higher role never has fewer permissions than a lower one', () => {
    const keys = Object.keys(PERMISSION_MATRIX) as (keyof typeof PERMISSION_MATRIX)[];
    for (let i = 1; i < ROLES.length; i++) {
      const lower = ROLES[i - 1]!;
      const higher = ROLES[i]!;
      for (const key of keys) {
        if (hasPermission(lower, key)) expect(hasPermission(higher, key)).toBe(true);
      }
    }
  });
});
