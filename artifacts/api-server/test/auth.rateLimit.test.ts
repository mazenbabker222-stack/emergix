import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { ORIGIN, describeDb, loadApp, uniqueEmail } from './helpers';

process.env.AUTH_STRICT_RATE_LIMIT_MAX = '3';
process.env.LOCKOUT_THRESHOLD = '50';

describeDb('auth rate limiting (needs DATABASE_URL_TEST)', () => {
  let app: Express;
  beforeAll(async () => {
    app = await loadApp();
  });

  it('answers 429 after too many credential attempts from one IP', async () => {
    const attempt = () => request(app).post('/api/auth/sign-in/email').set('Origin', ORIGIN).send({ email: uniqueEmail('rl'), password: 'wrong-password-123' });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('rate_limited');
  });
});
