import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requireAuth, requirePermission, requireRole } from './rbac';

function run(handler: (req: Request, res: Response, next: () => void) => unknown, role?: string) {
  const req = { auth: role ? { user: { role } } : undefined } as unknown as Request;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
  const next = vi.fn();
  handler(req, res, next);
  return { res, json, next };
}

describe('rbac middleware', () => {
  it('requireAuth: 401 anonymous, passes signed-in', () => {
    expect(run(requireAuth).res.status).toHaveBeenCalledWith(401);
    expect(run(requireAuth, 'learner').next).toHaveBeenCalled();
  });

  it('requireRole: 401 anonymous, 403 wrong role, passes allowed role', () => {
    const guard = requireRole('admin', 'superadmin');
    expect(run(guard).res.status).toHaveBeenCalledWith(401);
    expect(run(guard, 'learner').res.status).toHaveBeenCalledWith(403);
    expect(run(guard, 'admin').next).toHaveBeenCalled();
  });

  it('requirePermission: learners are denied admin access, staff allowed', () => {
    const guard = requirePermission('admin:access');
    expect(run(guard).res.status).toHaveBeenCalledWith(401);
    expect(run(guard, 'learner').res.status).toHaveBeenCalledWith(403);
    expect(run(guard, 'editor').next).toHaveBeenCalled();
  });

  it('treats an unknown role as unauthorised', () => {
    expect(run(requirePermission('admin:access'), 'root').res.status).toHaveBeenCalledWith(403);
  });
});
