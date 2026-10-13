import request from 'supertest';
import { describe } from 'vitest';
import type { Express } from 'express';

export const ORIGIN = 'http://localhost:5173';
export const hasTestDb = !!process.env.DATABASE_URL_TEST;
export const describeDb = hasTestDb ? describe : describe.skip;

export async function loadApp(): Promise<Express> {
  return (await import('../src/app')).default;
}

export const uniqueEmail = (prefix = 'learner') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

/** Poll the test-only outbox for a message and return its first link containing `pathPart`. */
export async function waitForLink(app: Express, to: string, pathPart: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const res = await request(app).get('/api/test/outbox').query({ to });
    for (const mail of res.body as { text: string }[]) {
      const match = mail.text.match(new RegExp(`https?://[^\\s"'<>)\\]]*${pathPart}[^\\s"'<>)\\]]*`));
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No e-mail to ${to} with a link containing "${pathPart}"`);
}

export const asPath = (link: string) => {
  const u = new URL(link);
  return u.pathname + u.search;
};
