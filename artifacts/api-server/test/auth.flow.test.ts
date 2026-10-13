import { db, sessions, users } from '@workspace/db';
import { eq } from 'drizzle-orm';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { ORIGIN, asPath, describeDb, loadApp, uniqueEmail, waitForLink } from './helpers';
import { totp } from './totp';

process.env.AUTH_STRICT_RATE_LIMIT_MAX = '1000'; // this file signs in many times from one IP

const password = 'correct-horse-battery-staple';

describeDb('auth flow (needs DATABASE_URL_TEST)', () => {
  let app: Express;
  const email = uniqueEmail();
  beforeAll(async () => {
    app = await loadApp();
  });

  const signIn = (agent: ReturnType<typeof request.agent>, pw = password) =>
    agent.post('/api/auth/sign-in/email').set('Origin', ORIGIN).send({ email, password: pw });

  it('signs up and refuses sign-in until the e-mail is verified', async () => {
    const res = await request(app).post('/api/auth/sign-up/email').set('Origin', ORIGIN).send({ name: 'Test Learner', email, password });
    expect(res.status).toBeLessThan(300);
    const blocked = await signIn(request.agent(app));
    expect(blocked.status).toBe(403);
  });

  it('verifies the e-mail, signs in, reads the session and signs out', async () => {
    const link = await waitForLink(app, email, 'verify-email');
    await request(app).get(asPath(link));
    const agent = request.agent(app);
    const login = await signIn(agent);
    expect(login.status).toBe(200);
    const session = await agent.get('/api/auth/get-session');
    expect(session.body?.user?.email).toBe(email);
    expect(session.body?.user?.role).toBe('learner');
    const out = await agent.post('/api/auth/sign-out').set('Origin', ORIGIN).send({});
    expect(out.status).toBe(200);
    const after = await agent.get('/api/auth/get-session');
    expect(after.body).toBeNull();
  });

  it('keeps at most MAX_SESSIONS (default 2) sessions per user', async () => {
    for (let i = 0; i < 3; i++) await signIn(request.agent(app));
    await new Promise((r) => setTimeout(r, 300));
    const [user] = await db.select().from(users).where(eq(users.email, email));
    const rows = await db.select().from(sessions).where(eq(sessions.userId, user!.id));
    expect(rows.length).toBeLessThanOrEqual(2);
  });

  it('resets a forgotten password without revealing whether the account exists', async () => {
    const unknown = await request(app).post('/api/auth/request-password-reset').set('Origin', ORIGIN).send({ email: uniqueEmail('nobody'), redirectTo: `${ORIGIN}/reset-password` });
    const known = await request(app).post('/api/auth/request-password-reset').set('Origin', ORIGIN).send({ email, redirectTo: `${ORIGIN}/reset-password` });
    expect(unknown.status).toBe(known.status);
    const link = await waitForLink(app, email, 'reset-password');
    const redirect = await request(app).get(asPath(link));
    const token = new URL(redirect.headers.location ?? '', ORIGIN).searchParams.get('token');
    expect(token).toBeTruthy();
    const reset = await request(app).post('/api/auth/reset-password').set('Origin', ORIGIN).send({ newPassword: 'a-brand-new-long-passphrase', token });
    expect(reset.status).toBe(200);
    expect((await signIn(request.agent(app), 'a-brand-new-long-passphrase')).status).toBe(200);
    expect((await signIn(request.agent(app), password)).status).toBe(401);
  });

  it('protects staff routes: 401 anonymous, 403 for learners', async () => {
    expect((await request(app).get('/api/admin/ping')).status).toBe(401);
    const agent = request.agent(app);
    await signIn(agent, 'a-brand-new-long-passphrase');
    expect((await agent.get('/api/admin/ping')).status).toBe(403);
    expect((await agent.put('/api/admin/users/x/role').set('Origin', ORIGIN).send({ role: 'admin' })).status).toBe(403);
  });

  it('rejects cookie-authenticated mutations from a foreign origin (CSRF)', async () => {
    const agent = request.agent(app);
    await signIn(agent, 'a-brand-new-long-passphrase');
    const res = await agent.put('/api/account/profile').set('Origin', 'https://evil.example').send({ country: 'UK', specialty: null, targetExam: null, targetExamDate: null });
    expect(res.status).toBe(403);
  });

  it('exports account data without secrets', async () => {
    const agent = request.agent(app);
    await signIn(agent, 'a-brand-new-long-passphrase');
    const res = await agent.get('/api/account/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const body = JSON.stringify(res.body);
    expect(res.body.account.email).toBe(email);
    expect(body).not.toMatch(/"token"|"password"|"secret"/);
  });

  it('schedules and cancels account deletion', async () => {
    const agent = request.agent(app);
    await signIn(agent, 'a-brand-new-long-passphrase');
    const bad = await agent.post('/api/account/deletion').set('Origin', ORIGIN).send({ confirmEmail: 'wrong@example.test' });
    expect(bad.status).toBe(400);
    const ok = await agent.post('/api/account/deletion').set('Origin', ORIGIN).send({ confirmEmail: email });
    expect(ok.body.status).toBe('scheduled');
    const cancel = await agent.delete('/api/account/deletion').set('Origin', ORIGIN);
    expect(cancel.body.status).toBe('cancelled');
  });
  it('enables TOTP 2FA and then requires the code at sign-in', async () => {
    const pw = 'a-brand-new-long-passphrase';
    const agent = request.agent(app);
    await signIn(agent, pw);
    const enable = await agent.post('/api/auth/two-factor/enable').set('Origin', ORIGIN).send({ password: pw });
    expect(enable.status).toBe(200);
    const secret = new URL(enable.body.totpURI).searchParams.get('secret')!;
    expect(enable.body.backupCodes.length).toBeGreaterThan(0);
    const verify = await agent.post('/api/auth/two-factor/verify-totp').set('Origin', ORIGIN).send({ code: totp(secret) });
    expect(verify.status).toBe(200);
    await agent.post('/api/auth/sign-out').set('Origin', ORIGIN).send({});

    const second = request.agent(app);
    const login = await signIn(second, pw);
    expect(login.body.twoFactorRedirect).toBe(true);
    expect((await second.get('/api/auth/get-session')).body).toBeNull();
    const wrong = await second.post('/api/auth/two-factor/verify-totp').set('Origin', ORIGIN).send({ code: '000000' });
    expect(wrong.status).toBeGreaterThanOrEqual(400);
    const ok = await second.post('/api/auth/two-factor/verify-totp').set('Origin', ORIGIN).send({ code: totp(secret) });
    expect(ok.status).toBe(200);
    expect((await second.get('/api/auth/get-session')).body?.user?.email).toBe(email);
  });
});
