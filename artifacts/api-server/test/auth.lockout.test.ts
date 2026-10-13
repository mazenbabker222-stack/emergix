import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { ORIGIN, describeDb, loadApp, uniqueEmail } from './helpers';

process.env.LOCKOUT_THRESHOLD = '3';
process.env.AUTH_STRICT_RATE_LIMIT_MAX = '1000';

describeDb('account lockout (needs DATABASE_URL_TEST)', () => {
  let app: Express;
  beforeAll(async () => {
    app = await loadApp();
  });

  it('locks an e-mail after repeated failures with a generic message', async () => {
    const email = uniqueEmail('lock');
    const attempt = () => request(app).post('/api/auth/sign-in/email').set('Origin', ORIGIN).send({ email, password: 'wrong-password-123' });
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const locked = await attempt();
    expect(locked.status).toBe(429);
    expect(JSON.stringify(locked.body)).not.toContain(email);
  });
});
