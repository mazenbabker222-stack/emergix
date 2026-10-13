import { describe, expect, it } from 'vitest';
import { zodResolver } from '@/lib/zodResolver';
import { safeNext } from '@/lib/auth-client-pure';
import { resetPasswordSchema, signInSchema, signUpSchema } from './schemas';

describe('auth schemas', () => {
  it('requires a long enough password and matching confirmation on sign-up', async () => {
    const resolve = zodResolver(signUpSchema);
    const short = await resolve({ name: 'A', email: 'a@b.co', password: 'short', confirmPassword: 'short' }, undefined, {} as never);
    expect(Object.keys(short.errors)).toContain('password');
    const mismatch = await resolve({ name: 'A', email: 'a@b.co', password: 'long-enough-password', confirmPassword: 'different-password' }, undefined, {} as never);
    expect(Object.keys(mismatch.errors)).toEqual(['confirmPassword']);
    const ok = await resolve({ name: 'A', email: 'a@b.co', password: 'long-enough-password', confirmPassword: 'long-enough-password' }, undefined, {} as never);
    expect(ok.errors).toEqual({});
  });

  it('rejects malformed e-mail addresses on sign-in', async () => {
    const res = await zodResolver(signInSchema)({ email: 'nope', password: 'x' }, undefined, {} as never);
    expect(Object.keys(res.errors)).toContain('email');
  });

  it('checks reset-password confirmation', async () => {
    const res = await zodResolver(resetPasswordSchema)({ password: 'long-enough-password', confirmPassword: 'x' }, undefined, {} as never);
    expect(Object.keys(res.errors)).toContain('confirmPassword');
  });
});

describe('safeNext', () => {
  it('only allows same-site relative paths', () => {
    expect(safeNext('/app/account')).toBe('/app/account');
    expect(safeNext('//evil.example')).toBe('/app');
    expect(safeNext('https://evil.example')).toBe('/app');
    expect(safeNext('/\\evil')).toBe('/app');
    expect(safeNext(null)).toBe('/app');
  });
});
