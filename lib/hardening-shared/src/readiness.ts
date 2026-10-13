/**
 * Readiness aggregation for `/api/readyz`.
 *
 * Runs every dependency check in parallel with a per-check timeout and never leaks
 * internal error text: callers see only `ok`, `fail` or `timeout`. A failing *critical*
 * check makes the service not ready (HTTP 503); a failing optional check only degrades it.
 */

export interface ReadinessCheck {
  run: () => Promise<void>;
  /** Default true. Set false for dependencies the app can run without (e.g. email). */
  critical?: boolean;
}

export type CheckStatus = 'ok' | 'fail' | 'timeout';

export interface CheckReport {
  status: CheckStatus;
  critical: boolean;
  latencyMs: number;
}

export type ReadinessStatus = 'ok' | 'degraded' | 'fail';

export interface ReadinessReport {
  status: ReadinessStatus;
  checks: Record<string, CheckReport>;
}

export interface ReadinessOptions {
  timeoutMs?: number;
  /** Injected for tests. */
  now?: () => number;
  /** Called with the real error so the caller can log it server-side. */
  onError?: (name: string, error: unknown) => void;
}

export async function runReadiness(
  checks: Record<string, ReadinessCheck>,
  options: ReadinessOptions = {},
): Promise<ReadinessReport> {
  const timeoutMs = options.timeoutMs ?? 2000;
  const now = options.now ?? Date.now;

  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, check]): Promise<[string, CheckReport]> => {
      const critical = check.critical ?? true;
      const started = now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let status: CheckStatus = 'ok';

      try {
        const timeout = new Promise<'timeout'>((resolve) => {
          timer = setTimeout(() => resolve('timeout'), timeoutMs);
        });
        const outcome = await Promise.race([check.run().then(() => 'ok' as const), timeout]);
        status = outcome;
      } catch (error) {
        status = 'fail';
        options.onError?.(name, error);
      } finally {
        if (timer) clearTimeout(timer);
      }

      return [name, { status, critical, latencyMs: Math.max(0, now() - started) }];
    }),
  );

  const report = Object.fromEntries(entries);
  const failed = entries.filter(([, r]) => r.status !== 'ok');
  const status: ReadinessStatus = failed.some(([, r]) => r.critical) ? 'fail' : failed.length > 0 ? 'degraded' : 'ok';
  return { status, checks: report };
}

/** 503 only when a critical dependency is down; degraded still serves traffic. */
export function httpStatusForReadiness(report: ReadinessReport): 200 | 503 {
  return report.status === 'fail' ? 503 : 200;
}
