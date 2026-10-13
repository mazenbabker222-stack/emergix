import { describe, expect, it } from 'vitest';
import { PINO_REDACT_PATHS, REDACTED, isSensitiveKey, redactObject, redactString, redactUrl } from './redact';

describe('redactUrl', () => {
  it('redacts signed-URL parameters but keeps harmless ones', () => {
    const url =
      '/media/v1/file.mp4?X-Amz-Signature=abc123&X-Amz-Credential=AKIA%2F2026&page=2&token=t0k&Expires=170';
    expect(redactUrl(url)).toBe(
      `/media/v1/file.mp4?X-Amz-Signature=${REDACTED}&X-Amz-Credential=${REDACTED}&page=2&token=${REDACTED}&Expires=170`,
    );
  });
  it('redacts one-time tokens in the path and drops fragments', () => {
    expect(redactUrl('/reset-password/abcDEF123?x=1#frag')).toBe(`/reset-password/${REDACTED}?x=1`);
    expect(redactUrl('/api/auth/verify-email/tok123')).toBe(`/api/auth/verify-email/${REDACTED}`);
    expect(redactUrl('/a/b#secret')).toBe('/a/b');
  });
  it('handles encoded parameter names and absolute URLs', () => {
    expect(redactUrl('https://cdn.example.com/x?%74oken=zzz&ok=1')).toBe(
      `https://cdn.example.com/x?%74oken=${REDACTED}&ok=1`,
    );
  });
  it('leaves clean urls alone', () => {
    expect(redactUrl('/api/exams?limit=10')).toBe('/api/exams?limit=10');
  });
});

describe('redactString', () => {
  it('scrubs bearer tokens, JWTs and URLs inside text', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';
    const out = redactString(`Authorization: Bearer ${jwt} failed for https://x.test/p?signature=abc&a=1 jwt=${jwt}`);
    expect(out).not.toContain('eyJ');
    expect(out).not.toContain('signature=abc');
    expect(out).toContain('a=1');
    expect(out).toContain(`Bearer ${REDACTED}`);
  });
});

describe('redactObject', () => {
  it('replaces sensitive keys at any depth, case- and separator-insensitively', () => {
    const out = redactObject({
      user: { id: 'u1', Password: 'p', 'set-cookie': ['a=b'] },
      question: { id: 'q1', stem: 'Which?', correct_answer: 'B', correctAnswers: ['B'], isCorrect: true },
      list: [{ signedUrl: 'https://x/y?sig=1' }, { ok: 1 }],
    }) as any;
    expect(out.user).toEqual({ id: 'u1', Password: REDACTED, 'set-cookie': REDACTED });
    expect(out.question).toEqual({
      id: 'q1',
      stem: 'Which?',
      correct_answer: REDACTED,
      correctAnswers: REDACTED,
      isCorrect: REDACTED,
    });
    expect(out.list).toEqual([{ signedUrl: REDACTED }, { ok: 1 }]);
  });
  it('scrubs secrets inside string values and Error messages', () => {
    const out = redactObject({ msg: 'GET https://a.test/f?token=zzz', err: new Error('bad Bearer abc.def') }) as any;
    expect(out.msg).toContain(`token=${REDACTED}`);
    expect(out.err.message).toContain(`Bearer ${REDACTED}`);
  });
  it('does not mutate input and survives cycles and deep nesting', () => {
    const input: any = { password: 'p', a: {} };
    input.a.self = input;
    const out = redactObject(input) as any;
    expect(input.password).toBe('p');
    expect(out.a.self).toBe('[circular]');
    let deep: any = { v: 1 };
    for (let i = 0; i < 30; i++) deep = { child: deep };
    expect(JSON.stringify(redactObject(deep))).toContain('[truncated]');
  });
  it('passes primitives and dates through', () => {
    const d = new Date(0);
    expect(redactObject(5)).toBe(5);
    expect(redactObject(null)).toBeNull();
    expect((redactObject({ d }) as any).d).toBe(d);
  });
});

describe('sensitive keys and pino paths', () => {
  it('classifies keys', () => {
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('api_key')).toBe(true);
    expect(isSensitiveKey('title')).toBe(false);
  });
  it('exposes pino redact paths covering auth headers and answer keys', () => {
    expect(PINO_REDACT_PATHS).toContain('req.headers.authorization');
    expect(PINO_REDACT_PATHS).toContain('*.correctAnswer');
  });
});
