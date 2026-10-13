# @workspace/hardening-shared (Phase 11 — standalone part)

Pure TypeScript, no I/O.

- `uploads.ts` — `validateUpload(input, policy)`: magic-byte sniffing, extension + MIME agreement, size limit; SVG/HTML always rejected. Presets: `IMAGE_POLICY`, `DOCUMENT_POLICY`, `CAPTION_POLICY`, `IMPORT_POLICY`. `safeFileName` for display only.
- `redact.ts` — `redactUrl`, `redactString`, `redactObject`, `PINO_REDACT_PATHS`: keep secrets, signed URLs and correct answers out of logs / Sentry.
- `readiness.ts` — `runReadiness(checks)` + `httpStatusForReadiness` for `/api/readyz` (critical vs optional checks, timeouts, no error leakage).

Wire-up: add `{ "path": "./lib/hardening-shared" }` to root `tsconfig.json` references, `pnpm install`, then `pnpm --filter @workspace/hardening-shared run test`.
