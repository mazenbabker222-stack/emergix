import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadApp } from './helpers';

describe('GET /api/healthz', () => {
  it('returns ok without needing the database', async () => {
    const app = await loadApp();
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
