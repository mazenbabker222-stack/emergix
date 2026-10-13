import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { originGuard } from './csrf';

const guard = originGuard(['https://app.example.test']);

function run(method: string, headers: Record<string, string> = {}) {
  const req = { method, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
  const next = vi.fn();
  guard(req, res, next);
  return { res, next };
}

describe('originGuard (CSRF)', () => {
  it('lets safe methods through', () => {
    expect(run('GET').next).toHaveBeenCalled();
  });
  it('accepts mutations from an allowed origin', () => {
    expect(run('POST', { origin: 'https://app.example.test' }).next).toHaveBeenCalled();
  });
  it('rejects mutations from another origin', () => {
    const { res, next } = run('POST', { origin: 'https://evil.example' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('rejects cookie-bearing mutations without an Origin header', () => {
    expect(run('DELETE', { cookie: 'emergixacademy.session_token=x' }).res.status).toHaveBeenCalledWith(403);
  });
  it('allows origin-less, cookie-less requests (non-browser clients)', () => {
    expect(run('POST').next).toHaveBeenCalled();
  });
});
