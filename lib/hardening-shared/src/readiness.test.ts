import { describe, expect, it, vi } from 'vitest';
import { httpStatusForReadiness, runReadiness } from './readiness';

const ok = () => Promise.resolve();
const boom = () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'));
const hang = () => new Promise<void>(() => {});

describe('runReadiness', () => {
  it('is ok when every check passes', async () => {
    const r = await runReadiness({ db: { run: ok }, storage: { run: ok } });
    expect(r.status).toBe('ok');
    expect(r.checks.db).toMatchObject({ status: 'ok', critical: true });
    expect(httpStatusForReadiness(r)).toBe(200);
  });

  it('fails (503) when a critical check fails, without leaking the error text', async () => {
    const onError = vi.fn();
    const r = await runReadiness({ db: { run: boom }, storage: { run: ok } }, { onError });
    expect(r.status).toBe('fail');
    expect(httpStatusForReadiness(r)).toBe(503);
    expect(JSON.stringify(r)).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5/);
    expect(onError).toHaveBeenCalledWith('db', expect.any(Error));
  });

  it('is degraded (still 200) when only an optional check fails', async () => {
    const r = await runReadiness({ db: { run: ok }, email: { run: boom, critical: false } });
    expect(r.status).toBe('degraded');
    expect(r.checks.email).toMatchObject({ status: 'fail', critical: false });
    expect(httpStatusForReadiness(r)).toBe(200);
  });

  it('times out hanging checks and runs checks in parallel', async () => {
    const started = Date.now();
    const r = await runReadiness({ queue: { run: hang }, db: { run: hang } }, { timeoutMs: 30 });
    expect(r.checks.queue!.status).toBe('timeout');
    expect(r.status).toBe('fail');
    expect(Date.now() - started).toBeLessThan(250); // ~30ms, not 60ms+ sequential
  });

  it('reports latency from the injected clock', async () => {
    let t = 1000;
    const now = () => (t += 5);
    const r = await runReadiness({ db: { run: ok } }, { now });
    expect(r.checks.db!.latencyMs).toBe(5);
  });

  it('handles checks that throw synchronously and an empty check list', async () => {
    const sync = { run: (() => { throw new Error('x'); }) as () => Promise<void> };
    expect((await runReadiness({ s: sync })).status).toBe('fail');
    expect((await runReadiness({})).status).toBe('ok');
  });
});
